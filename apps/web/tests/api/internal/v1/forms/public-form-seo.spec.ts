/**
 * Integration tests for Public Form Page SEO & Slug Routing
 *
 * Tests the public form page functionality:
 * - Finding forms by ID
 * - Finding forms by custom slug
 * - SEO metadata generation
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils";
import { signUpFormFields } from "@/tests/utils/form-fixtures";

let testWorkspace: TestWorkspace;
let publishedFormId: string;
let unpublishedFormId: string;

/**
 * Helper to get published form data (mimics the page.tsx getPublishedForm function)
 */
async function getPublishedForm(idOrSlug: string) {
  // Find the root form by ID or slug using optimized OR query
  const rootForm = await prisma.form.findFirst({
    where: {
      parentId: null, // Must be a root form
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      id: true,
      name: true,
      fields: true,
      settings: true,
      workspaceId: true,
      publishedVersionId: true,
      seoTitle: true,
      seoDescription: true,
      seoImageUrl: true,
      seoFaviconUrl: true,
    },
  });

  if (!rootForm) {
    return null;
  }

  // If there's a published version, use that for fields/settings
  if (rootForm.publishedVersionId) {
    const publishedVersion = await prisma.form.findFirst({
      where: {
        id: rootForm.publishedVersionId,
      },
      select: {
        fields: true,
        settings: true,
        seoTitle: true,
        seoDescription: true,
        seoImageUrl: true,
        seoFaviconUrl: true,
      },
    });

    if (publishedVersion) {
      return {
        id: rootForm.id,
        name: rootForm.name,
        fields: publishedVersion.fields,
        settings: publishedVersion.settings,
        workspaceId: rootForm.workspaceId,
        // Use published version's SEO if set, otherwise fall back to root
        seoTitle: publishedVersion.seoTitle ?? rootForm.seoTitle,
        seoDescription:
          publishedVersion.seoDescription ?? rootForm.seoDescription,
        seoImageUrl: publishedVersion.seoImageUrl ?? rootForm.seoImageUrl,
        seoFaviconUrl: publishedVersion.seoFaviconUrl ?? rootForm.seoFaviconUrl,
      };
    }
  }

  // Fall back to the root form's schema (for preview before publishing)
  return {
    id: rootForm.id,
    name: rootForm.name,
    fields: rootForm.fields,
    settings: rootForm.settings,
    workspaceId: rootForm.workspaceId,
    seoTitle: rootForm.seoTitle,
    seoDescription: rootForm.seoDescription,
    seoImageUrl: rootForm.seoImageUrl,
    seoFaviconUrl: rootForm.seoFaviconUrl,
  };
}

beforeAll(async () => {
  testWorkspace = createTestWorkspace();

  // Create a published form with SEO data
  const publishedForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Public Newsletter Form",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "PUBLISHED",
      version: 1,
      fields: signUpFormFields as never,
      publishedAt: new Date(),
      slug: "newsletter-signup",
      seoTitle: "Subscribe to Our Newsletter",
      seoDescription: "Get the latest updates delivered to your inbox",
      seoImageUrl: "https://cdn.example.com/og-image.png",
      seoFaviconUrl: "https://cdn.example.com/favicon.ico",
    },
  });
  // Update to self-reference as published version
  await prisma.form.update({
    where: { id: publishedForm.id },
    data: { publishedVersionId: publishedForm.id },
  });
  publishedFormId = publishedForm.id;

  // Create an unpublished form with slug
  const unpublishedForm = await prisma.form.create({
    data: {
      workspaceId: testWorkspace.id,
      name: "Draft Form",
      type: "SIGN_UP",
      display: "INLINE_EMBED",
      status: "DRAFT",
      version: 1,
      fields: signUpFormFields as never,
      slug: "draft-form",
    },
  });
  unpublishedFormId = unpublishedForm.id;
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("GET /p/forms/:idOrSlug - ID Lookup", () => {
  test("should find form by ID", async () => {
    const form = await getPublishedForm(publishedFormId);

    expect(form).not.toBeNull();
    expect(form?.id).toBe(publishedFormId);
    expect(form?.name).toBe("Public Newsletter Form");
  });

  test("should return null for non-existent ID", async () => {
    const form = await getPublishedForm("non-existent-id");

    expect(form).toBeNull();
  });
});

describe("GET /p/forms/:idOrSlug - Slug Lookup", () => {
  test("should find form by slug", async () => {
    const form = await getPublishedForm("newsletter-signup");

    expect(form).not.toBeNull();
    expect(form?.id).toBe(publishedFormId);
    expect(form?.name).toBe("Public Newsletter Form");
  });

  test("should return null for non-existent slug", async () => {
    const form = await getPublishedForm("non-existent-slug");

    expect(form).toBeNull();
  });

  test("should prefer exact ID match when both ID and slug exist", async () => {
    // The OR query should work correctly regardless of order
    const formById = await getPublishedForm(publishedFormId);
    const formBySlug = await getPublishedForm("newsletter-signup");

    expect(formById?.id).toBe(formBySlug?.id);
  });
});

describe("GET /p/forms/:idOrSlug - SEO Metadata", () => {
  test("should include SEO metadata in response", async () => {
    const form = await getPublishedForm(publishedFormId);

    expect(form).not.toBeNull();
    expect(form?.seoTitle).toBe("Subscribe to Our Newsletter");
    expect(form?.seoDescription).toBe(
      "Get the latest updates delivered to your inbox",
    );
    expect(form?.seoImageUrl).toBe("https://cdn.example.com/og-image.png");
    expect(form?.seoFaviconUrl).toBe("https://cdn.example.com/favicon.ico");
  });

  test("should return SEO metadata when found by slug", async () => {
    const form = await getPublishedForm("newsletter-signup");

    expect(form).not.toBeNull();
    expect(form?.seoTitle).toBe("Subscribe to Our Newsletter");
    expect(form?.seoDescription).toBe(
      "Get the latest updates delivered to your inbox",
    );
    expect(form?.seoImageUrl).toBe("https://cdn.example.com/og-image.png");
    expect(form?.seoFaviconUrl).toBe("https://cdn.example.com/favicon.ico");
  });
});

describe("GET /p/forms/:idOrSlug - Published Version SEO Inheritance", () => {
  test("should use published version SEO when available", async () => {
    // Create root form with default SEO
    const rootForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Versioned Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "ARCHIVED",
        version: 1,
        fields: signUpFormFields as never,
        slug: "versioned-form",
        seoTitle: "Root Form Title",
        seoDescription: "Root form description",
      },
    });

    // Create published version with different SEO
    const publishedVersion = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Versioned Form v2",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 2,
        fields: signUpFormFields as never,
        publishedAt: new Date(),
        seoTitle: "Published Version Title",
        seoDescription: "Published version description",
        seoImageUrl: "https://cdn.example.com/v2-image.png",
      },
    });

    // Point root to published version
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { publishedVersionId: publishedVersion.id },
    });

    try {
      const form = await getPublishedForm("versioned-form");

      expect(form).not.toBeNull();
      expect(form?.seoTitle).toBe("Published Version Title");
      expect(form?.seoDescription).toBe("Published version description");
      expect(form?.seoImageUrl).toBe("https://cdn.example.com/v2-image.png");
    } finally {
      await prisma.form.deleteMany({
        where: { OR: [{ id: rootForm.id }, { parentId: rootForm.id }] },
      });
    }
  });

  test("should fall back to root SEO when published version SEO is null", async () => {
    // Create root form with SEO
    const rootForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Fallback Form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "ARCHIVED",
        version: 1,
        fields: signUpFormFields as never,
        slug: "fallback-form",
        seoTitle: "Root SEO Title",
        seoDescription: "Root description",
        seoImageUrl: "https://cdn.example.com/root-image.png",
      },
    });

    // Create published version WITHOUT SEO
    const publishedVersion = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Fallback Form v2",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 2,
        fields: signUpFormFields as never,
        publishedAt: new Date(),
        // No SEO fields set
      },
    });

    // Point root to published version
    await prisma.form.update({
      where: { id: rootForm.id },
      data: { publishedVersionId: publishedVersion.id },
    });

    try {
      const form = await getPublishedForm("fallback-form");

      expect(form).not.toBeNull();
      // Should fall back to root form's SEO
      expect(form?.seoTitle).toBe("Root SEO Title");
      expect(form?.seoDescription).toBe("Root description");
      expect(form?.seoImageUrl).toBe("https://cdn.example.com/root-image.png");
    } finally {
      await prisma.form.deleteMany({
        where: { OR: [{ id: rootForm.id }, { parentId: rootForm.id }] },
      });
    }
  });
});

describe("GET /p/forms/:idOrSlug - Unpublished Forms", () => {
  test("should return unpublished form data for preview", async () => {
    // Note: In production, the page may choose to not render unpublished forms
    // But the query itself should still find them
    const form = await getPublishedForm(unpublishedFormId);

    expect(form).not.toBeNull();
    expect(form?.id).toBe(unpublishedFormId);
    expect(form?.name).toBe("Draft Form");
  });

  test("should find unpublished form by slug for preview", async () => {
    const form = await getPublishedForm("draft-form");

    expect(form).not.toBeNull();
    expect(form?.id).toBe(unpublishedFormId);
  });
});

describe("GET /p/forms/:idOrSlug - Child Forms", () => {
  test("should not find child forms (versions) directly", async () => {
    // Create a root form
    const rootForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Root Form Only",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "PUBLISHED",
        version: 1,
        fields: signUpFormFields as never,
        publishedAt: new Date(),
      },
    });

    // Create a child version
    const childForm = await prisma.form.create({
      data: {
        workspaceId: testWorkspace.id,
        parentId: rootForm.id,
        name: "Child Version",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        status: "DRAFT",
        version: 2,
        fields: signUpFormFields as never,
        slug: "child-version-slug",
      },
    });

    await prisma.form.update({
      where: { id: rootForm.id },
      data: { publishedVersionId: rootForm.id },
    });

    try {
      // Should not find child form by its ID (because it has a parentId)
      const formById = await getPublishedForm(childForm.id);
      expect(formById).toBeNull();

      // Should not find child form by slug
      const formBySlug = await getPublishedForm("child-version-slug");
      expect(formBySlug).toBeNull();
    } finally {
      await prisma.form.deleteMany({
        where: { OR: [{ id: rootForm.id }, { parentId: rootForm.id }] },
      });
    }
  });
});
