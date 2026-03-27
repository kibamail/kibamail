import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Forms Resource", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("create", () => {
    it("should create a form with name and fieldMapping", async () => {
      const result = await kibamail.forms.create({
        name: "Newsletter Signup",
        fieldMapping: {
          email: {
            contactPropertyId: "email",
            contactPropertyType: "standard",
            fieldType: "string",
          },
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(201);
    });
  });

  describe("list", () => {
    it("should list all forms", async () => {
      const result = await kibamail.forms.list();

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });

    it("should list forms with pagination", async () => {
      const result = await kibamail.forms.list({
        limit: 20,
        after: "form_abc123",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should retrieve a form by ID", async () => {
      const formId = "form_test_12345";
      const result = await kibamail.forms.get(formId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("update", () => {
    it("should update a form's name", async () => {
      const formId = "form_test_12345";
      const result = await kibamail.forms.update(formId, {
        name: "Updated Form Name",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a form by ID", async () => {
      const formId = "form_test_12345";
      const result = await kibamail.forms.delete(formId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("publish", () => {
    it("should publish a form", async () => {
      const formId = "form_test_12345";
      const result = await kibamail.forms.publish(formId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });

  describe("listVersions", () => {
    it("should list all versions of a form", async () => {
      const formId = "form_test_12345";
      const result = await kibamail.forms.listVersions(formId);

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });
});
