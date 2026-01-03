/**
 * Unit tests for Broadcast Batch Scheduler
 *
 * Tests the pure scheduling logic for breaking broadcasts into batches
 * based on domain warmup limits.
 */

import { describe, expect, test } from "vitest";
import {
  type BatchSchedulerConfig,
  getBatchesByDay,
  getEmailsPerDay,
  type SendingLimits,
  scheduleBroadcast,
} from "@/lib/broadcasts/batch-scheduler";

/**
 * Helper to generate mock contact IDs
 */
function generateContactIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `contact_${i + 1}`);
}

/**
 * Fixed reference date for consistent test results
 */
const REFERENCE_DATE = new Date("2024-01-15T10:00:00Z");

describe("scheduleBroadcast", () => {
  describe("Tier 3 domain (250/day, 50/hour) with 5,400 recipients", () => {
    const limits: SendingLimits = {
      maxSendPerDay: 250,
      maxSendPerHour: 50,
    };
    const contactIds = generateContactIds(5400);
    const config: BatchSchedulerConfig = { referenceDate: REFERENCE_DATE };

    test("should schedule all 5,400 recipients across multiple days", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      expect(result.totalRecipients).toBe(5400);
      expect(result.batches.length).toBeGreaterThan(0);

      // Verify all contacts are scheduled
      const scheduledContactCount = result.batches.reduce(
        (sum, b) => sum + b.count,
        0,
      );
      expect(scheduledContactCount).toBe(5400);
    });

    test("should not exceed daily limit of 250 on any day", () => {
      const result = scheduleBroadcast(contactIds, limits, config);
      const emailsPerDay = getEmailsPerDay(result.batches);

      for (const [_day, count] of emailsPerDay) {
        expect(count).toBeLessThanOrEqual(250);
      }
    });

    test("should not exceed hourly limit of 50 in any hour", () => {
      const result = scheduleBroadcast(contactIds, limits, config);
      const batchesByDay = getBatchesByDay(result.batches);

      for (const [_day, dayBatches] of batchesByDay) {
        // Group by hour
        const byHour = new Map<number, number>();
        for (const batch of dayBatches) {
          const current = byHour.get(batch.hour) ?? 0;
          byHour.set(batch.hour, current + batch.count);
        }

        for (const [_hour, count] of byHour) {
          expect(count).toBeLessThanOrEqual(50);
        }
      }
    });

    test("should require 22 days to complete", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      // 5400 / 250 = 21.6, so needs 22 days
      expect(result.totalDays).toBe(22);
    });

    test("should have batches with max size 50 (hourly limit)", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      for (const batch of result.batches) {
        expect(batch.count).toBeLessThanOrEqual(50);
      }
    });

    test("should assign correct contact IDs to each batch", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      // Collect all contact IDs from batches
      const allBatchContactIds = result.batches.flatMap((b) => b.contactIds);

      // Should have all original contact IDs
      expect(allBatchContactIds.length).toBe(5400);

      // Each contact should appear exactly once
      const uniqueIds = new Set(allBatchContactIds);
      expect(uniqueIds.size).toBe(5400);

      // Should contain all original contacts
      for (const id of contactIds) {
        expect(uniqueIds.has(id)).toBe(true);
      }
    });

    test("should have increasing delays for later batches", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      // Get batches from different days
      const day0Batches = result.batches.filter((b) => b.dayOffset === 0);
      const day1Batches = result.batches.filter((b) => b.dayOffset === 1);

      if (day0Batches.length > 0 && day1Batches.length > 0) {
        const maxDay0Delay = Math.max(...day0Batches.map((b) => b.delayMs));
        const minDay1Delay = Math.min(...day1Batches.map((b) => b.delayMs));

        expect(minDay1Delay).toBeGreaterThan(maxDay0Delay);
      }
    });
  });

  describe("Tier 8 domain (10,000/day, 2,000/hour) with 2,000 recipients", () => {
    const limits: SendingLimits = {
      maxSendPerDay: 10_000,
      maxSendPerHour: 2_000,
    };
    const contactIds = generateContactIds(2000);
    const config: BatchSchedulerConfig = { referenceDate: REFERENCE_DATE };

    test("should complete in 1 day", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      expect(result.totalDays).toBe(1);
      expect(result.totalRecipients).toBe(2000);
    });

    test("should create 2 batches of 1000 each (max batch size)", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      expect(result.totalBatches).toBe(2);
      expect(result.batches[0].count).toBe(1000);
      expect(result.batches[1].count).toBe(1000);
    });

    test("should schedule all within hourly limit", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      // All batches should be in the same hour since hourly limit is 2000
      // and max batches per hour is 2 (2 * 1000 = 2000)
      const hours = new Set(result.batches.map((b) => b.hour));
      expect(hours.size).toBe(1);
    });

    test("should not exceed max batch size of 1000", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      for (const batch of result.batches) {
        expect(batch.count).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe("Tier 8 domain with 15,000 recipients", () => {
    const limits: SendingLimits = {
      maxSendPerDay: 10_000,
      maxSendPerHour: 2_000,
    };
    const contactIds = generateContactIds(15000);
    const config: BatchSchedulerConfig = { referenceDate: REFERENCE_DATE };

    test("should require 2 days to complete", () => {
      const result = scheduleBroadcast(contactIds, limits, config);

      expect(result.totalDays).toBe(2);
    });

    test("should send 10,000 on day 1 and 5,000 on day 2", () => {
      const result = scheduleBroadcast(contactIds, limits, config);
      const emailsPerDay = getEmailsPerDay(result.batches);

      expect(emailsPerDay.get(0)).toBe(10000);
      expect(emailsPerDay.get(1)).toBe(5000);
    });
  });

  describe("Edge cases", () => {
    test("should handle empty recipient list", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      };

      const result = scheduleBroadcast([], limits, {
        referenceDate: REFERENCE_DATE,
      });

      expect(result.totalRecipients).toBe(0);
      expect(result.totalBatches).toBe(0);
      expect(result.totalDays).toBe(0);
      expect(result.batches).toEqual([]);
    });

    test("should handle single recipient", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      };

      const result = scheduleBroadcast(["contact_1"], limits, {
        referenceDate: REFERENCE_DATE,
      });

      expect(result.totalRecipients).toBe(1);
      expect(result.totalBatches).toBe(1);
      expect(result.totalDays).toBe(1);
      expect(result.batches[0].contactIds).toEqual(["contact_1"]);
    });

    test("should handle recipients equal to daily limit", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 50,
      };
      const contactIds = generateContactIds(100);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
      });

      expect(result.totalDays).toBe(1);
      expect(result.totalRecipients).toBe(100);
    });

    test("should handle recipients just over daily limit", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 50,
      };
      const contactIds = generateContactIds(101);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
      });

      expect(result.totalDays).toBe(2);

      const emailsPerDay = getEmailsPerDay(result.batches);
      expect(emailsPerDay.get(0)).toBe(100);
      expect(emailsPerDay.get(1)).toBe(1);
    });
  });

  describe("Batch ID generation", () => {
    test("should generate unique batch IDs", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      };
      const contactIds = generateContactIds(500);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
      });

      const batchIds = result.batches.map((b) => b.batchId);
      const uniqueIds = new Set(batchIds);

      expect(uniqueIds.size).toBe(batchIds.length);
    });

    test("should include day and hour in batch ID", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 100,
        maxSendPerHour: 10,
      };
      const contactIds = generateContactIds(100);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
      });

      for (const batch of result.batches) {
        expect(batch.batchId).toMatch(/^batch_day\d+_hour\d+_\d+$/);
        expect(batch.batchId).toContain(`day${batch.dayOffset}`);
        expect(batch.batchId).toContain(`hour${batch.hour}`);
      }
    });
  });

  describe("Scheduling hours", () => {
    test("should only schedule during business hours (8-20 by default)", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 1000,
        maxSendPerHour: 100,
      };
      const contactIds = generateContactIds(1000);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
      });

      for (const batch of result.batches) {
        expect(batch.hour).toBeGreaterThanOrEqual(8);
        expect(batch.hour).toBeLessThan(20);
      }
    });

    test("should respect custom start/end hours", () => {
      const limits: SendingLimits = {
        maxSendPerDay: 1000,
        maxSendPerHour: 100,
      };
      const contactIds = generateContactIds(500);

      const result = scheduleBroadcast(contactIds, limits, {
        referenceDate: REFERENCE_DATE,
        startHour: 9,
        endHour: 17,
      });

      for (const batch of result.batches) {
        expect(batch.hour).toBeGreaterThanOrEqual(9);
        expect(batch.hour).toBeLessThan(17);
      }
    });
  });
});

describe("getEmailsPerDay", () => {
  test("should correctly sum emails per day", () => {
    const limits: SendingLimits = {
      maxSendPerDay: 100,
      maxSendPerHour: 50,
    };
    const contactIds = generateContactIds(250);

    const result = scheduleBroadcast(contactIds, limits, {
      referenceDate: REFERENCE_DATE,
    });
    const emailsPerDay = getEmailsPerDay(result.batches);

    expect(emailsPerDay.get(0)).toBe(100);
    expect(emailsPerDay.get(1)).toBe(100);
    expect(emailsPerDay.get(2)).toBe(50);
  });
});

describe("getBatchesByDay", () => {
  test("should correctly group batches by day", () => {
    const limits: SendingLimits = {
      maxSendPerDay: 100,
      maxSendPerHour: 50,
    };
    const contactIds = generateContactIds(250);

    const result = scheduleBroadcast(contactIds, limits, {
      referenceDate: REFERENCE_DATE,
    });
    const batchesByDay = getBatchesByDay(result.batches);

    expect(batchesByDay.size).toBe(3);

    // Each day should have batches
    expect(batchesByDay.get(0)?.length).toBeGreaterThan(0);
    expect(batchesByDay.get(1)?.length).toBeGreaterThan(0);
    expect(batchesByDay.get(2)?.length).toBeGreaterThan(0);

    // Verify day offset matches
    for (const batch of batchesByDay.get(0) ?? []) {
      expect(batch.dayOffset).toBe(0);
    }
    for (const batch of batchesByDay.get(1) ?? []) {
      expect(batch.dayOffset).toBe(1);
    }
  });
});
