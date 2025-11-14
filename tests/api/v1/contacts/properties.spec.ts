/**
 * Integration tests for Contact Properties in Contact Endpoints
 *
 * Tests that contact properties are correctly included in contact responses
 * and that values are properly mapped from slot columns to property names.
 */

import { GET as GET_CONTACT } from "@/app/api/v1/contacts/[contactId]/route";
import { GET as LIST_CONTACTS } from "@/app/api/v1/contacts/route";
import { POST as CREATE_PROPERTY } from "@/app/api/v1/contact-properties/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  cleanupWorkspace,
  post,
  get,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { prisma } from "@/lib/db";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("Contact Properties in Contact Responses", () => {
  test("should return empty properties object when no properties are defined", async () => {
    // Create a contact
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties).toBeObject();
    expect(Object.keys(responseData.properties)).toHaveLength(0);
  });

  test("should include NUMBER property in contact response", async () => {
    // Create a NUMBER property
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "Age",
        type: "NUMBER",
        defaultValue: "25",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Get the property to find its slot (should be propertyFloat*)
    const propertyRecord = await prisma.contactProperty.findUnique({
      where: { id: property.id },
    });

    // Create a contact with the property value set
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "age-test@example.com",
        firstName: "Alice",
        [propertyRecord!.slot]: 30,
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties.Age).toBe(30);
  });

  test("should include DATE property in contact response", async () => {
    // Create a DATE property
    const timestamp = Date.now();
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "Join Date",
        type: "DATE",
        defaultValue: timestamp.toString(),
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Get the property to find its slot
    const propertyRecord = await prisma.contactProperty.findUnique({
      where: { id: property.id },
    });

    // Create a contact with the property value set
    const joinDate = 1699564800000;
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "date-test@example.com",
        firstName: "Bob",
        [propertyRecord!.slot]: joinDate,
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties["Join Date"]).toBe(joinDate);
  });

  test("should include STRING property in contact response", async () => {
    // Create a STRING property
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "Department",
        type: "STRING",
        defaultValue: "Engineering",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Get the property to find its slot
    const propertyRecord = await prisma.contactProperty.findUnique({
      where: { id: property.id },
    });

    // Create a contact with the property value set
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "string-test@example.com",
        firstName: "Charlie",
        [propertyRecord!.slot]: "Marketing",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties.Department).toBe("Marketing");
  });

  test("should include multiple properties in contact response", async () => {
    // Create multiple properties
    const ageProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: "Years Experience", type: "NUMBER", defaultValue: "5" },
        fullAccessApiKey.key
      )
    );
    const agePropertyData = await ageProperty.json();

    const titleProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: "Job Title", type: "STRING", defaultValue: "Engineer" },
        fullAccessApiKey.key
      )
    );
    const titlePropertyData = await titleProperty.json();

    // Get property slots
    const ageRecord = await prisma.contactProperty.findUnique({
      where: { id: agePropertyData.id },
    });
    const titleRecord = await prisma.contactProperty.findUnique({
      where: { id: titlePropertyData.id },
    });

    // Create a contact with multiple property values
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "multi-prop@example.com",
        firstName: "Diana",
        [ageRecord!.slot]: 7,
        [titleRecord!.slot]: "Senior Engineer",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties["Years Experience"]).toBe(7);
    expect(responseData.properties["Job Title"]).toBe("Senior Engineer");
    expect(Object.keys(responseData.properties).length).toBeGreaterThanOrEqual(
      2
    );
  });

  test("should not include null property values in response", async () => {
    // Create a property
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "Middle Name",
        type: "STRING",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Create a contact without setting the property value (null)
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "null-prop@example.com",
        firstName: "Eve",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    // The property should not be included if its value is null
    expect(responseData.properties["Middle Name"]).toBeUndefined();
  });

  test("should include properties in list contacts response", async () => {
    // Create a property
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "List Test Prop",
        type: "NUMBER",
        defaultValue: "100",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Get property slot
    const propertyRecord = await prisma.contactProperty.findUnique({
      where: { id: property.id },
    });

    // Create a contact with the property value
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "list-prop@example.com",
        firstName: "Frank",
        [propertyRecord!.slot]: 150,
      },
    });

    // List contacts
    const request = get("/contacts", fullAccessApiKey.key);
    const response = await LIST_CONTACTS(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toBeArray();

    // Find our test contact
    const foundContact = responseData.data.find(
      (c: any) => c.id === contact.id
    );
    expect(foundContact).toBeDefined();
    expect(foundContact.properties).toBeDefined();
    expect(foundContact.properties["List Test Prop"]).toBe(150);
  });

  test("should only include properties from the same workspace", async () => {
    // Create another workspace with a property
    const otherWorkspace = createTestWorkspace();
    const otherApiKey = await createFullAccessApiKey(otherWorkspace.id);

    const otherPropertyRequest = post(
      "/contact-properties",
      {
        name: "Other Workspace Prop",
        type: "STRING",
        defaultValue: "test",
      },
      otherApiKey.key
    );
    await CREATE_PROPERTY(otherPropertyRequest);

    // Create a contact in our main workspace
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "workspace-test@example.com",
        firstName: "Grace",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    // Should not include property from other workspace
    expect(responseData.properties["Other Workspace Prop"]).toBeUndefined();

    // Cleanup
    await cleanupWorkspace(otherWorkspace.id);
  });

  test("should include BOOLEAN property in contact response (tag replacement)", async () => {
    // Create a BOOLEAN property (acts as a tag)
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "VIP",
        type: "BOOLEAN",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    const property = await propertyResponse.json();

    // Get the property to find its slot (should be propertyBool*)
    const propertyRecord = await prisma.contactProperty.findUnique({
      where: { id: property.id },
    });

    // Create a contact with the boolean property set to true
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "vip-test@example.com",
        firstName: "Victor",
        [propertyRecord!.slot]: true,
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties.VIP).toBe(true);
  });

  test("should support multiple BOOLEAN properties (multiple tags)", async () => {
    // Create multiple BOOLEAN properties with unique names
    const timestamp = Date.now();
    const vipProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `VIP_${timestamp}_1`, type: "BOOLEAN" },
        fullAccessApiKey.key
      )
    );
    const vipPropertyData = await vipProperty.json();

    const newsletterProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Newsletter_${timestamp}_2`, type: "BOOLEAN" },
        fullAccessApiKey.key
      )
    );
    const newsletterPropertyData = await newsletterProperty.json();

    const premiumProperty = await CREATE_PROPERTY(
      post(
        "/contact-properties",
        { name: `Premium_${timestamp}_3`, type: "BOOLEAN" },
        fullAccessApiKey.key
      )
    );
    const premiumPropertyData = await premiumProperty.json();

    // Get property slots
    const vipRecord = await prisma.contactProperty.findUnique({
      where: { id: vipPropertyData.id },
    });
    const newsletterRecord = await prisma.contactProperty.findUnique({
      where: { id: newsletterPropertyData.id },
    });
    const premiumRecord = await prisma.contactProperty.findUnique({
      where: { id: premiumPropertyData.id },
    });

    // Create a contact with multiple boolean properties (tags)
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "multi-tag@example.com",
        firstName: "Martha",
        [vipRecord!.slot]: true,
        [newsletterRecord!.slot]: true,
        [premiumRecord!.slot]: false, // Explicitly false
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    expect(responseData.properties[`VIP_${timestamp}_1`]).toBe(true);
    expect(responseData.properties[`Newsletter_${timestamp}_2`]).toBe(true);
    expect(responseData.properties[`Premium_${timestamp}_3`]).toBe(false);
  });

  test("should not include false BOOLEAN properties if not set", async () => {
    // Create a BOOLEAN property
    const propertyRequest = post(
      "/contact-properties",
      {
        name: "Active",
        type: "BOOLEAN",
      },
      fullAccessApiKey.key
    );
    const propertyResponse = await CREATE_PROPERTY(propertyRequest);
    await propertyResponse.json();

    // Create a contact without setting the property value (null)
    const contact = await prisma.contact.create({
      data: {
        workspaceId: testWorkspace.id,
        email: "untagged@example.com",
        firstName: "Una",
      },
    });

    // Get the contact
    const request = get(`/contacts/${contact.id}`, fullAccessApiKey.key);
    const response = await GET_CONTACT(request, {
      params: Promise.resolve({ contactId: contact.id }),
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.properties).toBeDefined();
    // The property should not be included if its value is null
    expect(responseData.properties.Active).toBeUndefined();
  });
});
