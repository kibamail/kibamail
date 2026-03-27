import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import { BadRequestError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { validateRequestBody } from "@/lib/api/validation";
import { dispatchAutomationEvent } from "@/lib/automations/dispatch";
import { createEventSchema } from "./schema";

export async function createEvent(
  workspaceId: string,
  request: NextRequest,
) {
  const body = await validateRequestBody(createEventSchema, request);

  // Validate contact exists in workspace
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, workspaceId },
    select: { id: true },
  });

  if (!contact) {
    throw new BadRequestError(
      "Contact not found in this workspace",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  const eventId = createId();

  // Dispatch automation trigger evaluation
  await dispatchAutomationEvent(workspaceId, "custom_event", {
    contactId: body.contactId,
    eventName: body.eventName,
    properties: body.properties,
  });

  return NextResponse.json(
    {
      object: "event",
      id: eventId,
      eventName: body.eventName,
      contactId: body.contactId,
    },
    { status: 202 },
  );
}
