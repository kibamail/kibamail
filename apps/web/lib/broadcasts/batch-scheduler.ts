/**
 * Broadcast Batch Scheduler
 *
 * Handles the logic for breaking broadcasts into batches based on domain warmup limits.
 * Distributes batches across days and hours to respect sending limits.
 *
 * Key constraints:
 * - Max batch size: 1,000 contacts (to avoid storing too many IDs in a single job)
 * - Max hourly rate: 2,000 emails (2 batches per hour max)
 * - Batches are scheduled across days based on daily limits
 * - Contact IDs are snapshotted at scheduling time for consistency
 */

/**
 * Sending limits for a domain
 */
export interface SendingLimits {
  maxSendPerDay: number;
  maxSendPerHour: number;
}

/**
 * A scheduled batch of contacts to send
 */
export interface ScheduledBatch {
  /**
   * Unique batch identifier (e.g., "batch_day0_hour0_0")
   */
  batchId: string;

  /**
   * Day offset from now (0 = today, 1 = tomorrow, etc.)
   */
  dayOffset: number;

  /**
   * Hour of day to send (0-23)
   */
  hour: number;

  /**
   * Contact IDs in this batch (snapshotted at scheduling time)
   */
  contactIds: string[];

  /**
   * Number of contacts in this batch
   */
  count: number;

  /**
   * Delay in milliseconds from scheduling time
   */
  delayMs: number;
}

/**
 * Result of scheduling a broadcast
 */
export interface ScheduleResult {
  /**
   * Total number of recipients
   */
  totalRecipients: number;

  /**
   * Total number of batches created
   */
  totalBatches: number;

  /**
   * Total number of days the broadcast will span
   */
  totalDays: number;

  /**
   * Estimated completion date
   */
  estimatedCompletion: Date;

  /**
   * List of scheduled batches with contact IDs
   */
  batches: ScheduledBatch[];
}

/**
 * Configuration for the batch scheduler
 */
export interface BatchSchedulerConfig {
  /**
   * Maximum contacts per batch (default: 1000)
   */
  maxBatchSize?: number;

  /**
   * Maximum batches per hour (default: 2)
   */
  maxBatchesPerHour?: number;

  /**
   * Starting hour of day for sending (default: 8)
   */
  startHour?: number;

  /**
   * Ending hour of day for sending (default: 20)
   */
  endHour?: number;

  /**
   * Reference date for scheduling (default: now)
   */
  referenceDate?: Date;
}

const DEFAULT_CONFIG: Required<BatchSchedulerConfig> = {
  maxBatchSize: 1000,
  maxBatchesPerHour: 2,
  startHour: 8,
  endHour: 20,
  referenceDate: new Date(),
};

/**
 * Calculate the delay in milliseconds for a specific day offset and hour
 */
function calculateDelayMs(
  dayOffset: number,
  hour: number,
  referenceDate: Date
): number {
  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  targetDate.setHours(hour, 0, 0, 0);

  const delayMs = targetDate.getTime() - referenceDate.getTime();

  // If the calculated time is in the past, return 0 (send immediately)
  return Math.max(0, delayMs);
}

/**
 * Schedule a broadcast into batches based on domain sending limits
 *
 * Contact IDs are snapshotted at scheduling time - each batch contains
 * the actual contact IDs to send to, ensuring consistency even if
 * segments change between batch executions.
 *
 * @param contactIds - Array of contact IDs to send to (snapshotted)
 * @param limits - Domain sending limits (maxSendPerDay, maxSendPerHour)
 * @param config - Optional configuration overrides
 * @returns Schedule result with all batches containing contact IDs
 *
 * @example
 * ```ts
 * // Tier 3 domain (250/day, 50/hour) sending to 5,400 contacts
 * const contactIds = await fetchContactIds();
 * const result = scheduleBroadcast(contactIds, { maxSendPerDay: 250, maxSendPerHour: 50 });
 * // Results in 22 days of sending with batches distributed across hours
 * ```
 */
export function scheduleBroadcast(
  contactIds: string[],
  limits: SendingLimits,
  config?: BatchSchedulerConfig
): ScheduleResult {
  const cfg: Required<BatchSchedulerConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    referenceDate: config?.referenceDate ?? new Date(),
  };

  if (contactIds.length === 0) {
    return {
      totalRecipients: 0,
      totalBatches: 0,
      totalDays: 0,
      estimatedCompletion: cfg.referenceDate,
      batches: [],
    };
  }

  const batches: ScheduledBatch[] = [];
  let currentIndex = 0;
  let dayOffset = 0;

  // Calculate effective hourly limit (respecting both hourly limit and max batches per hour)
  const maxPerHour = Math.min(
    limits.maxSendPerHour,
    cfg.maxBatchesPerHour * cfg.maxBatchSize
  );

  while (currentIndex < contactIds.length) {
    let dailySent = 0;
    const dailyLimit = limits.maxSendPerDay;

    // Iterate through available hours in the day
    for (
      let hour = cfg.startHour;
      hour < cfg.endHour && currentIndex < contactIds.length;
      hour++
    ) {
      // Calculate how many we can send this hour
      const remainingDailyCapacity = dailyLimit - dailySent;
      const hourlyCapacity = Math.min(maxPerHour, remainingDailyCapacity);

      if (hourlyCapacity <= 0) break;

      const remainingContacts = contactIds.length - currentIndex;
      const toSendThisHour = Math.min(hourlyCapacity, remainingContacts);

      // Split into batches of max batch size
      let hourSent = 0;
      let batchIndex = 0;

      while (hourSent < toSendThisHour && currentIndex < contactIds.length) {
        const batchSize = Math.min(cfg.maxBatchSize, toSendThisHour - hourSent);
        const batchContactIds = contactIds.slice(
          currentIndex,
          currentIndex + batchSize
        );

        batches.push({
          batchId: `batch_day${dayOffset}_hour${hour}_${batchIndex}`,
          dayOffset,
          hour,
          contactIds: batchContactIds,
          count: batchContactIds.length,
          delayMs: calculateDelayMs(dayOffset, hour, cfg.referenceDate),
        });

        currentIndex += batchSize;
        hourSent += batchSize;
        dailySent += batchSize;
        batchIndex++;
      }
    }

    // Move to next day if there are still contacts remaining
    if (currentIndex < contactIds.length) {
      dayOffset++;
    }
  }

  // Calculate estimated completion
  const lastBatch = batches[batches.length - 1];
  const estimatedCompletion = new Date(cfg.referenceDate);
  if (lastBatch) {
    estimatedCompletion.setDate(
      estimatedCompletion.getDate() + lastBatch.dayOffset
    );
    estimatedCompletion.setHours(lastBatch.hour + 1, 0, 0, 0);
  }

  return {
    totalRecipients: contactIds.length,
    totalBatches: batches.length,
    totalDays: dayOffset + 1,
    estimatedCompletion,
    batches,
  };
}

/**
 * Get a summary of batches grouped by day
 *
 * Useful for displaying schedule to users
 */
export function getBatchesByDay(
  batches: ScheduledBatch[]
): Map<number, ScheduledBatch[]> {
  const byDay = new Map<number, ScheduledBatch[]>();

  for (const batch of batches) {
    const existing = byDay.get(batch.dayOffset) ?? [];
    existing.push(batch);
    byDay.set(batch.dayOffset, existing);
  }

  return byDay;
}

/**
 * Get count of emails per day
 */
export function getEmailsPerDay(
  batches: ScheduledBatch[]
): Map<number, number> {
  const byDay = getBatchesByDay(batches);
  const countByDay = new Map<number, number>();

  for (const [day, dayBatches] of byDay) {
    const total = dayBatches.reduce((sum, b) => sum + b.count, 0);
    countByDay.set(day, total);
  }

  return countByDay;
}
