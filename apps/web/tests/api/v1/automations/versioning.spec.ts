import { POST as CreateAutomation } from "@/app/(main)/api/v1/automations/route";
import { GET as GetAutomation } from "@/app/(main)/api/v1/automations/[automationId]/route";
import { POST as PublishAutomation } from "@/app/(main)/api/v1/automations/[automationId]/publish/route";
import { POST as ArchiveAutomation } from "@/app/(main)/api/v1/automations/[automationId]/archive/route";
import {
  GET as ListVersions,
  POST as CreateVersion,
} from "@/app/(main)/api/v1/automations/[automationId]/versions/route";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createTestApiKey,
  cleanupWorkspace,
  post,
  get,
  apiRequest,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";
import { ErrorType, ErrorCode } from "@/lib/api/error-codes";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

async function createTestAutomation(apiKey: CreatedApiKey, name: string) {
  const automationData = {
    name,
    trigger: {
      type: "CONTACT_SUBSCRIBED",
      config: {},
    },
    nodes: [
      {
        id: "trigger-1",
        type: "contact-subscribed",
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
  };

  const request = post("/automations", automationData, apiKey.key);
  const response = await CreateAutomation(request);
  return response.json();
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/automations/[automationId]/publish", () => {
  test("should publish a DRAFT automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Publish Test"
    );
    expect(automation.status).toBe("DRAFT");

    const request = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await PublishAutomation(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation");
    expect(responseData.status).toBe("PUBLISHED");
    expect(responseData.publishedAt).toBeDefined();
  });

  test("should reject publishing an already PUBLISHED automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Already Published Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });
    await PublishAutomation(publishRequest, { params });

    const secondRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();

    const response = await PublishAutomation(secondRequest, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.message).toContain("DRAFT");
  });

  test("should reject publishing non-existent automation", async () => {
    const request = apiRequest("/automations/non_existent_id/publish")
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: "non_existent_id" });

    const response = await PublishAutomation(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });

  test("should reject publishing without write:automations scope", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Scope Publish Test"
    );
    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:automations"],
    });

    const request = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(readOnlyKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await PublishAutomation(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("POST /api/v1/automations/[automationId]/archive", () => {
  test("should archive a PUBLISHED automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Archive Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const publishParams = Promise.resolve({ automationId: automation.id });
    await PublishAutomation(publishRequest, { params: publishParams });

    const archiveRequest = apiRequest(`/automations/${automation.id}/archive`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const archiveParams = Promise.resolve({ automationId: automation.id });

    const response = await ArchiveAutomation(archiveRequest, {
      params: archiveParams,
    });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation");
    expect(responseData.status).toBe("ARCHIVED");
  });

  test("should reject archiving a DRAFT automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Archive Draft Test"
    );

    const request = apiRequest(`/automations/${automation.id}/archive`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await ArchiveAutomation(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.message).toContain("PUBLISHED");
  });
});

describe("GET /api/v1/automations/[automationId]/versions", () => {
  test("should list all versions of an automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Versions Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const createVersionRequest = apiRequest(
      `/automations/${automation.id}/versions`
    )
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await CreateVersion(createVersionRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const listRequest = get(
      `/automations/${automation.id}/versions`,
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: automation.id });

    const response = await ListVersions(listRequest, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.object).toBe("automation_list");
    expect(responseData.data.length).toBe(2);
    expect(responseData.data[0].version).toBe(2);
    expect(responseData.data[1].version).toBe(1);
  });

  test("should return 404 for non-existent automation", async () => {
    const request = get(
      "/automations/non_existent_id/versions",
      fullAccessApiKey.key
    );
    const params = Promise.resolve({ automationId: "non_existent_id" });

    const response = await ListVersions(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error.message).toContain("not found");
  });
});

describe("POST /api/v1/automations/[automationId]/versions", () => {
  test("should create a new version from PUBLISHED automation", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "New Version Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const createRequest = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await CreateVersion(createRequest, { params });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.object).toBe("automation");
    expect(responseData.version).toBe(2);
    expect(responseData.status).toBe("DRAFT");
    expect(responseData.parentId).toBe(automation.id);
    expect(responseData.name).toBe("New Version Test");
  });

  test("should copy nodes and edges from source automation", async () => {
    const automationData = {
      name: "Copy Content Test",
      trigger: {
        type: "CONTACT_SUBSCRIBED",
        config: {},
      },
      nodes: [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 100 },
          data: { subject: "Welcome!" },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "trigger-1",
          target: "email-1",
        },
      ],
    };

    const createRequest = post(
      "/automations",
      automationData,
      fullAccessApiKey.key
    );
    const createResponse = await CreateAutomation(createRequest);
    const automation = await createResponse.json();

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const versionRequest = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const versionResponse = await CreateVersion(versionRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const newVersion = await versionResponse.json();

    expect(newVersion.nodes.length).toBe(2);
    expect(newVersion.edges.length).toBe(1);
    expect(newVersion.nodes[0].type).toBe("contact-subscribed");
    expect(newVersion.nodes[1].type).toBe("send-email");
  });

  test("should reject creating version when DRAFT already exists", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Draft Exists Test"
    );

    const request = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await CreateVersion(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error.type).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(responseData.error.message).toContain("DRAFT");
  });

  test("should allow name override when creating version", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Original Name"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const request = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .body({ name: "Updated Version Name" })
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await CreateVersion(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.name).toBe("Updated Version Name");
  });

  test("should reject creating version without write:automations scope", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Scope Version Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    const readOnlyKey = await createTestApiKey({
      workspaceId: testWorkspace.id,
      scopes: ["read:automations"],
    });

    const request = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(readOnlyKey.key)
      .build();
    const params = Promise.resolve({ automationId: automation.id });

    const response = await CreateVersion(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error.code).toBe(ErrorCode.INSUFFICIENT_SCOPE);
  });
});

describe("Editing Published Automation - Version Creation", () => {
  test("should find existing DRAFT when trying to edit PUBLISHED automation", async () => {
    // Create and publish automation
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Find Draft Test"
    );

    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    // Create a draft version
    const createRequest = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const createResponse = await CreateVersion(createRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const draftVersion = await createResponse.json();

    expect(draftVersion.status).toBe("DRAFT");
    expect(draftVersion.version).toBe(2);
    expect(draftVersion.parentId).toBe(automation.id);

    // List versions should show both
    const listRequest = get(
      `/automations/${automation.id}/versions`,
      fullAccessApiKey.key
    );
    const listResponse = await ListVersions(listRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const versions = await listResponse.json();

    const draftExists = versions.data.some(
      (v: any) => v.status === "DRAFT" && v.version === 2
    );
    const publishedExists = versions.data.some(
      (v: any) => v.status === "PUBLISHED" && v.version === 1
    );

    expect(draftExists).toBe(true);
    expect(publishedExists).toBe(true);
  });

  test("should create new version from child version (not root)", async () => {
    // Create v1 and publish
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Child Version Test"
    );

    const publishV1 = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishV1, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    // Create v2 draft and publish
    const createV2 = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const v2Response = await CreateVersion(createV2, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const v2 = await v2Response.json();

    const publishV2 = apiRequest(`/automations/${v2.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishV2, {
      params: Promise.resolve({ automationId: v2.id }),
    });

    // Create v3 from v2 (which is a child version)
    const createV3 = apiRequest(`/automations/${v2.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const v3Response = await CreateVersion(createV3, {
      params: Promise.resolve({ automationId: v2.id }),
    });
    const v3 = await v3Response.json();

    expect(v3.version).toBe(3);
    expect(v3.status).toBe("DRAFT");
    // parentId should still point to root (v1)
    expect(v3.parentId).toBe(automation.id);
  });

  test("should preserve all node data when creating version", async () => {
    const automationData = {
      name: "Preserve Data Test",
      trigger: {
        type: "CONTACT_SUBSCRIBED",
        config: {},
      },
      nodes: [
        {
          id: "trigger-1",
          type: "contact-subscribed",
          position: { x: 0, y: 0 },
          data: {
            conditions: {
              field: "email",
              operator: "contains",
              value: "@company.com",
            },
          },
        },
        {
          id: "delay-1",
          type: "time-delay",
          position: { x: 0, y: 100 },
          data: { duration: 3, unit: "days" },
        },
        {
          id: "email-1",
          type: "send-email",
          position: { x: 0, y: 200 },
          data: { subject: "Welcome!", templateId: "tpl-123" },
        },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "delay-1" },
        { id: "e2", source: "delay-1", target: "email-1" },
      ],
    };

    const createRequest = post(
      "/automations",
      automationData,
      fullAccessApiKey.key
    );
    const createResponse = await CreateAutomation(createRequest);
    const automation = await createResponse.json();

    // Publish
    const publishRequest = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    await PublishAutomation(publishRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });

    // Create version
    const versionRequest = apiRequest(`/automations/${automation.id}/versions`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const versionResponse = await CreateVersion(versionRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const newVersion = await versionResponse.json();

    // Verify all data is preserved
    expect(newVersion.nodes.length).toBe(3);
    expect(newVersion.edges.length).toBe(2);

    const triggerNode = newVersion.nodes.find(
      (n: any) => n.id === "trigger-1"
    );
    expect(triggerNode.data.conditions).toEqual({
      field: "email",
      operator: "contains",
      value: "@company.com",
    });

    const delayNode = newVersion.nodes.find((n: any) => n.id === "delay-1");
    expect(delayNode.data.duration).toBe(3);
    expect(delayNode.data.unit).toBe("days");

    const emailNode = newVersion.nodes.find((n: any) => n.id === "email-1");
    expect(emailNode.data.subject).toBe("Welcome!");
    expect(emailNode.data.templateId).toBe("tpl-123");
  });
});

describe("Full Versioning Workflow", () => {
  test("should complete full publish-version-publish cycle", async () => {
    const automation = await createTestAutomation(
      fullAccessApiKey,
      "Full Workflow Test"
    );
    expect(automation.version).toBe(1);
    expect(automation.status).toBe("DRAFT");

    const publish1Request = apiRequest(`/automations/${automation.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const publish1Response = await PublishAutomation(publish1Request, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const published1 = await publish1Response.json();
    expect(published1.status).toBe("PUBLISHED");

    const version2Request = apiRequest(
      `/automations/${automation.id}/versions`
    )
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const version2Response = await CreateVersion(version2Request, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const v2 = await version2Response.json();
    expect(v2.version).toBe(2);
    expect(v2.status).toBe("DRAFT");

    const publish2Request = apiRequest(`/automations/${v2.id}/publish`)
      .method("POST")
      .auth(fullAccessApiKey.key)
      .build();
    const publish2Response = await PublishAutomation(publish2Request, {
      params: Promise.resolve({ automationId: v2.id }),
    });
    const published2 = await publish2Response.json();
    expect(published2.status).toBe("PUBLISHED");

    const getV1Request = get(
      `/automations/${automation.id}`,
      fullAccessApiKey.key
    );
    const getV1Response = await GetAutomation(getV1Request, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const v1Final = await getV1Response.json();
    expect(v1Final.status).toBe("ARCHIVED");

    const listRequest = get(
      `/automations/${automation.id}/versions`,
      fullAccessApiKey.key
    );
    const listResponse = await ListVersions(listRequest, {
      params: Promise.resolve({ automationId: automation.id }),
    });
    const versions = await listResponse.json();
    expect(versions.data.length).toBe(2);

    const statuses = versions.data.map((v: any) => v.status);
    expect(statuses).toContain("PUBLISHED");
    expect(statuses).toContain("ARCHIVED");
  });
});
