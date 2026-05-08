/**
 * Tests for automation config helpers (getNodeConfig, isTriggerNode)
 * and data integrity for AUTOMATION_TRIGGERS / ACTIONS / RULES / ALL_NODE_TYPES.
 *
 * These constants are the source of truth wired into:
 *   - React Flow rendering on the frontend,
 *   - validation Zod schemas,
 *   - the simulator (describers / executors).
 *
 * A typo in an `id` or accidental duplicate ID cascades silently through
 * the entire automation pipeline (rendering, validation, execution) — these
 * tests pin down the contract.
 */

import { describe, expect, test } from "vitest";
import {
  ALL_NODE_TYPES,
  AUTOMATION_ACTIONS,
  AUTOMATION_RULES,
  AUTOMATION_TRIGGERS,
  getNodeConfig,
  isTriggerNode,
  TRIGGER_TYPES,
} from "@/lib/automations/config";

describe("AUTOMATION_TRIGGERS / ACTIONS / RULES integrity", () => {
  test("all node IDs are unique across triggers, actions, and rules", () => {
    const ids = [
      ...Object.values(AUTOMATION_TRIGGERS).map((t) => t.id),
      ...Object.values(AUTOMATION_ACTIONS).map((a) => a.id),
      ...Object.values(AUTOMATION_RULES).map((r) => r.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("ALL_NODE_TYPES contains every trigger, action, and rule id", () => {
    const expectedCount =
      Object.keys(AUTOMATION_TRIGGERS).length +
      Object.keys(AUTOMATION_ACTIONS).length +
      Object.keys(AUTOMATION_RULES).length;
    expect(ALL_NODE_TYPES.length).toBe(expectedCount);

    for (const trigger of Object.values(AUTOMATION_TRIGGERS)) {
      expect(ALL_NODE_TYPES).toContain(trigger.id);
    }
    for (const action of Object.values(AUTOMATION_ACTIONS)) {
      expect(ALL_NODE_TYPES).toContain(action.id);
    }
    for (const rule of Object.values(AUTOMATION_RULES)) {
      expect(ALL_NODE_TYPES).toContain(rule.id);
    }
  });

  test("TRIGGER_TYPES exposes a Prisma enum value for every trigger", () => {
    const expectedTypes = Object.values(AUTOMATION_TRIGGERS).map((t) => t.type);
    expect(TRIGGER_TYPES).toEqual(expectedTypes);
  });

  test("PERCENTAGE_SPLIT keeps the 100% / two-branch invariant the validator expects", () => {
    const splitConfig = AUTOMATION_RULES.PERCENTAGE_SPLIT.config.splits;
    expect(splitConfig.validation.length).toBe(2);
    expect(splitConfig.validation.totalPercentage).toBe(100);
    expect(splitConfig.items.percentage.min).toBe(0);
    expect(splitConfig.items.percentage.max).toBe(100);
  });

  test("TIME_DELAY accepts the supported unit options", () => {
    const unitOptions = AUTOMATION_RULES.TIME_DELAY.config.unit.options;
    expect(unitOptions).toEqual(["seconds", "minutes", "hours", "days"]);
  });
});

describe("getNodeConfig", () => {
  test("resolves a trigger by id", () => {
    const cfg = getNodeConfig(AUTOMATION_TRIGGERS.CONTACT_SUBSCRIBED.id);
    expect(cfg).toBeDefined();
    expect(cfg).toBe(AUTOMATION_TRIGGERS.CONTACT_SUBSCRIBED);
  });

  test("resolves an action by id", () => {
    const cfg = getNodeConfig(AUTOMATION_ACTIONS.SEND_EMAIL.id);
    expect(cfg).toBe(AUTOMATION_ACTIONS.SEND_EMAIL);
  });

  test("resolves a rule by id", () => {
    const cfg = getNodeConfig(AUTOMATION_RULES.IF_ELSE.id);
    expect(cfg).toBe(AUTOMATION_RULES.IF_ELSE);
  });

  test("returns undefined for unknown ids", () => {
    expect(getNodeConfig("does-not-exist")).toBeUndefined();
    expect(getNodeConfig("")).toBeUndefined();
  });
});

describe("isTriggerNode", () => {
  test.each(Object.values(AUTOMATION_TRIGGERS).map((t) => [t.id]))(
    "returns true for trigger id %s",
    (id) => {
      expect(isTriggerNode(id)).toBe(true);
    },
  );

  test("returns false for action ids", () => {
    expect(isTriggerNode(AUTOMATION_ACTIONS.SEND_EMAIL.id)).toBe(false);
    expect(isTriggerNode(AUTOMATION_ACTIONS.SEND_WEBHOOK.id)).toBe(false);
  });

  test("returns false for rule ids", () => {
    expect(isTriggerNode(AUTOMATION_RULES.IF_ELSE.id)).toBe(false);
    expect(isTriggerNode(AUTOMATION_RULES.PERCENTAGE_SPLIT.id)).toBe(false);
    expect(isTriggerNode(AUTOMATION_RULES.TIME_DELAY.id)).toBe(false);
  });

  test("returns false for unknown ids", () => {
    expect(isTriggerNode("totally-made-up")).toBe(false);
    expect(isTriggerNode("")).toBe(false);
  });
});
