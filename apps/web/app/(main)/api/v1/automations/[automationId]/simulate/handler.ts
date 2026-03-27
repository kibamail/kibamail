import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { simulateAutomation } from "@/lib/automations/simulate";

const virtualContactSchema = z.object({
  email: z.string().email("Invalid email format"),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z
    .enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"])
    .default("SUBSCRIBED"),
  properties: z.record(z.string(), z.any()).optional(),
  topics: z.array(z.string()).optional(),
});

const simulateSchema = z
  .object({
    contactId: z.string().optional(),
    contact: virtualContactSchema.optional(),
    seed: z.number().int().optional(),
  })
  .refine(
    (data) => {
      const hasId = data.contactId != null && data.contactId !== "";
      const hasContact = data.contact != null;
      return hasId !== hasContact;
    },
    { message: "Provide either contactId or contact, not both and not neither" },
  );

export async function handleSimulate(
  workspaceId: string,
  automationId: string,
  request: NextRequest,
) {
  const body = await validateRequestBody(simulateSchema, request);

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, workspaceId, deletedAt: null },
  });

  if (!automation) {
    throw new NotFoundError(
      `Automation '${automationId}' not found in this workspace`,
      ErrorCode.AUTOMATION_NOT_FOUND,
    );
  }

  // Real contact path
  if (body.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, workspaceId },
    });

    if (!contact) {
      throw new BadRequestError(
        `Contact '${body.contactId}' not found in this workspace`,
        ErrorCode.CONTACT_NOT_FOUND,
      );
    }

    const result = await simulateAutomation(automation, contact, workspaceId, body.seed);
    return responseOk(result);
  }

  // Virtual contact path — create temp contact, simulate, then delete
  const virtualContact = body.contact;
  if (!virtualContact) {
    throw new BadRequestError(
      "Provide either contactId or contact",
      ErrorCode.INVALID_PARAMETER,
    );
  }

  // Validate topics exist
  if (virtualContact.topics && virtualContact.topics.length > 0) {
    const existingTopics = await prisma.topic.findMany({
      where: { id: { in: virtualContact.topics }, workspaceId },
      select: { id: true },
    });
    const existingIds = new Set(existingTopics.map((t) => t.id));
    const missing = virtualContact.topics.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestError(
        `Topic IDs do not exist in this workspace: ${missing.join(", ")}`,
        ErrorCode.TOPIC_NOT_FOUND,
      );
    }
  }

  // Validate properties and map to slots
  const slotData: Record<string, unknown> = {};
  if (virtualContact.properties && Object.keys(virtualContact.properties).length > 0) {
    const props = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true },
    });
    const propMap = new Map(props.map((p) => [p.name, p.slot]));
    for (const key of Object.keys(virtualContact.properties)) {
      const slot = propMap.get(key);
      if (!slot) {
        throw new BadRequestError(
          `Property '${key}' does not exist in this workspace. Available: ${props.map((p) => p.name).join(", ") || "none"}`,
          ErrorCode.CONTACT_PROPERTY_NOT_FOUND,
        );
      }
      slotData[slot] = String(virtualContact.properties[key]);
    }
  }

  // Create temp contact
  const tempContact = await prisma.contact.create({
    data: {
      workspaceId,
      email: virtualContact.email,
      firstName: virtualContact.firstName ?? null,
      lastName: virtualContact.lastName ?? null,
      phone: virtualContact.phone ?? null,
      country: virtualContact.country ?? null,
      timezone: virtualContact.timezone ?? null,
      city: virtualContact.city ?? null,
      status: virtualContact.status as never,
      ...slotData,
    },
  });

  // Create temp topic subscriptions
  if (virtualContact.topics && virtualContact.topics.length > 0) {
    await prisma.contactTopic.createMany({
      data: virtualContact.topics.map((topicId) => ({
        contactId: tempContact.id,
        topicId,
        status: "SUBSCRIBED" as const,
      })),
    });
  }

  try {
    const result = await simulateAutomation(automation, tempContact, workspaceId, body.seed);
    return responseOk(result);
  } finally {
    // Clean up: delete temp topic subscriptions then temp contact
    await prisma.contactTopic.deleteMany({ where: { contactId: tempContact.id } });
    await prisma.contact.delete({ where: { id: tempContact.id } });
  }
}
