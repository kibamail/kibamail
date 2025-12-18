/**
 * Queue Type Definitions
 *
 * Define your queues and their jobs here for type safety across the application.
 *
 * Example:
 * ```ts
 * export type QueueJobs = {
 *   'email': {
 *     'send-welcome': { userId: string; email: string };
 *     'send-notification': { userId: string; message: string };
 *   };
 *   'data-processing': {
 *     'import-contacts': { workspaceId: string; fileUrl: string };
 *     'export-data': { workspaceId: string; format: 'csv' | 'json' };
 *   };
 * };
 * ```
 */

/**
 * Queue Jobs Type Map
 *
 * Add your queues and their jobs here. The structure is:
 * {
 *   'queue-name': {
 *     'job-name': JobDataType;
 *   }
 * }
 */
export type QueueJobs = {
  // Example queue - remove or replace with your actual queues
  example: {
    "example-job": { message: string };
  };
  // Segments queue for segment-related background jobs
  segments: {
    "compute-contacts-count": { segmentIds: string[] };
  };
  // Contact imports queue for processing CSV imports
  "contact-imports": {
    "process-import": { contactImportId: string };
  };
  // Broadcasts queue for sending broadcasts
  broadcasts: {
    "send-broadcast": { broadcastId: string };
  };
};

/**
 * Extract queue names from QueueJobs
 */
export type QueueName = keyof QueueJobs;

/**
 * Extract job names for a specific queue
 */
export type JobName<Q extends QueueName> = keyof QueueJobs[Q] & string;

/**
 * Extract job data type for a specific queue and job
 */
export type JobData<
  Q extends QueueName,
  J extends JobName<Q>,
> = QueueJobs[Q][J];

/**
 * Job options that can be passed when pushing a job to the queue
 */
export interface JobOptions {
  /**
   * Job priority (higher number = higher priority)
   */
  priority?: number;

  /**
   * Delay in milliseconds before the job is processed
   */
  delay?: number;

  /**
   * Number of attempts before the job is marked as failed
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };

  /**
   * Remove the job from the queue when it completes
   */
  removeOnComplete?: boolean | number;

  /**
   * Remove the job from the queue when it fails
   */
  removeOnFail?: boolean | number;
}

/**
 * Worker processor function type
 */
export type JobProcessor<Q extends QueueName, J extends JobName<Q>> = (
  data: JobData<Q, J>,
  jobId: string,
) => Promise<void>;

/**
 * Worker configuration
 */
export interface WorkerConfig<Q extends QueueName> {
  /**
   * Job processors map
   */
  processors: {
    [J in JobName<Q>]: JobProcessor<Q, J>;
  };

  /**
   * Number of concurrent jobs to process
   */
  concurrency?: number;

  /**
   * Rate limiter configuration
   */
  rateLimiter?: {
    max: number;
    duration: number;
  };
}
