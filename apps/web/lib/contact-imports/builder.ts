import type { Prisma } from "@prisma/client";
import type { StandardField } from "./types";

export class ContactDataBuilder {
  build(
    standardFields: Partial<Record<StandardField, string>>,
    customProperties: Record<string, string>,
    workspaceId: string,
    email: string,
    autoSubscribe: boolean,
    sourceId: string
  ): Prisma.ContactCreateInput {
    return {
      workspaceId,
      email,
      sourceType: "IMPORT",
      sourceId,
      status: autoSubscribe ? "SUBSCRIBED" : "UNCONFIRMED",
      subscribedAt: autoSubscribe ? new Date() : undefined,
      ...this.buildStandardFields(standardFields),
      ...this.buildCustomProperties(customProperties),
    };
  }

  private buildStandardFields(
    fields: Partial<Record<StandardField, string>>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value) result[key] = value;
    }
    return result;
  }

  private buildCustomProperties(
    properties: Record<string, string>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [slot, value] of Object.entries(properties)) {
      if (slot.startsWith("propertyString")) {
        result[slot] = value.substring(0, 255);
      } else if (slot.startsWith("propertyFloat")) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) result[slot] = parsed;
      }
    }

    return result;
  }
}
