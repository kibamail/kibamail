/**
 * Test Data Factories
 *
 * Factory functions for generating test data using Faker.
 * Provides consistent, realistic test data across all tests.
 */

import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type {
  ContactStatus,
  SegmentType,
  TopicVisibility,
} from "@prisma/client";

/**
 * Contact status options
 */
const CONTACT_STATUSES: ContactStatus[] = [
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINED",
  "ARCHIVED",
];

/**
 * Generate fake contact data
 *
 * @param overrides - Optional field overrides
 * @returns Fake contact data
 *
 * @example
 * ```ts
 * const contact = fakeContact();
 * const specificContact = fakeContact({
 *   email: 'test@example.com',
 *   status: 'SUBSCRIBED'
 * });
 * ```
 */
export function fakeContact(
  overrides: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    timezone: string;
    city: string;
    status: ContactStatus;
  }> = {},
) {
  return {
    email: overrides.email || faker.internet.email(),
    firstName: overrides.firstName || faker.person.firstName(),
    lastName: overrides.lastName || faker.person.lastName(),
    phone: overrides.phone || faker.phone.number(),
    country: overrides.country || faker.location.countryCode(),
    timezone: overrides.timezone || faker.location.timeZone(),
    city: overrides.city || faker.location.city(),
    status: overrides.status || faker.helpers.arrayElement(CONTACT_STATUSES),
  };
}

/**
 * Generate minimal contact data (only required fields)
 *
 * @param overrides - Optional field overrides
 * @returns Minimal contact data
 */
export function fakeMinimalContact(
  overrides: Partial<{
    email: string;
  }> = {},
) {
  return {
    email: overrides.email || faker.internet.email(),
  };
}

/**
 * Generate fake tag data
 *
 * @param overrides - Optional field overrides
 * @returns Fake tag data
 */
function _fakeTag(
  overrides: Partial<{
    name: string;
    color: string;
  }> = {},
) {
  return {
    name: overrides.name || `${faker.word.adjective()} ${faker.word.noun()}`,
    color: overrides.color || faker.color.rgb(),
  };
}

/**
 * Generate fake topic data
 *
 * @param overrides - Optional field overrides
 * @returns Fake topic data
 */
function _fakeTopic(
  overrides: Partial<{
    name: string;
    description: string;
    visibility: TopicVisibility;
  }> = {},
) {
  const name = overrides.name || faker.word.words(2);
  return {
    name,
    description: overrides.description || faker.lorem.sentence(),
    visibility:
      overrides.visibility ||
      faker.helpers.arrayElement(["PUBLIC", "PRIVATE"] as TopicVisibility[]),
  };
}

/**
 * Generate fake segment data
 *
 * @param overrides - Optional field overrides
 * @returns Fake segment data
 */
function _fakeSegment(
  overrides: Partial<{
    name: string;
    description: string;
    type: SegmentType;
    conditions: object;
  }> = {},
) {
  return {
    name: overrides.name || `${faker.word.words(2)} Segment`,
    description: overrides.description || faker.lorem.sentence(),
    type:
      overrides.type ||
      faker.helpers.arrayElement(["DYNAMIC", "STATIC"] as SegmentType[]),
    conditions: overrides.conditions || {
      and: [
        {
          field: "status",
          operator: "equals",
          value: "SUBSCRIBED",
        },
      ],
    },
  };
}

/**
 * Generate fake API key data
 *
 * @param overrides - Optional field overrides
 * @returns Fake API key data
 */
function _fakeApiKey(
  overrides: Partial<{
    name: string;
    scopes: string[];
  }> = {},
) {
  return {
    name: overrides.name || `${faker.company.name()} API Key`,
    scopes: overrides.scopes || ["read:contacts", "write:contacts"],
  };
}

/**
 * Generate a fake workspace ID
 *
 * @returns Random UUID for workspace
 */
export function fakeWorkspaceId(): string {
  return randomUUID();
}

/**
 * Generate multiple fake contacts
 *
 * @param count - Number of contacts to generate
 * @param overrides - Optional field overrides applied to all contacts
 * @returns Array of fake contacts
 */
export function fakeContacts(
  count: number,
  overrides: Parameters<typeof fakeContact>[0] = {},
) {
  return Array.from({ length: count }, () => fakeContact(overrides));
}
