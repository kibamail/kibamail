/**
 * Queue Wrapper
 *
 * Type-safe wrapper around BullMQ Queue for pushing jobs
 */

import { Queue } from "bullmq";
import { env } from "@/env/schema";
import { getQueueConnection } from "./connection";
import { createJobLogger, createQueueLogger } from "./logger";
import type { JobData, JobName, JobOptions, QueueName } from "./types";

/**
 * Queue instances cache
 */
const queueInstances = new Map<string, Queue>();

/**
 * Queue Wrapper Class
 *
 * Provides type-safe methods for pushing jobs to a queue
 */
export class QueueWrapper<Q extends QueueName> {
  private queue: Queue;
  private logger;

  constructor(private queueName: Q) {
    this.logger = createQueueLogger(queueName);

    // Reuse existing queue instance or create a new one
    const existingQueue = queueInstances.get(queueName);
    if (existingQueue) {
      this.queue = existingQueue;
      this.logger.debug("Reusing existing queue instance");
    } else {
      // In cluster mode, use hash tags in prefix to ensure all queue keys
      // land on the same Redis Cluster slot. Each queue gets its own prefix
      // for better distribution across cluster nodes.
      // @see https://docs.bullmq.io/bull/patterns/redis-cluster
      const prefix = env.REDIS_CLUSTER_MODE ? `{bull:${queueName}}` : "bull";

      this.queue = new Queue(queueName, {
        connection: getQueueConnection(),
        prefix,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep max 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      });

      queueInstances.set(queueName, this.queue);
      this.logger.info("Queue instance created");

      this.setupEventHandlers();
    }
  }

  /**
   * Set up event handlers for queue events
   */
  private setupEventHandlers() {
    this.queue.on("error", (error: Error) => {
      this.logger.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        "Queue error"
      );
    });
  }

  /**
   * Push a job to the queue
   *
   * @param jobName - The name of the job to push
   * @param data - The job data
   * @param options - Optional job options
   * @returns Promise that resolves to the job ID
   *
   * @example
   * ```ts
   * await queue('email').push('send-welcome', {
   *   userId: '123',
   *   email: 'user@example.com'
   * });
   * ```
   */
  async push<J extends JobName<Q>>(
    jobName: J,
    data: JobData<Q, J>,
    options?: JobOptions
  ): Promise<string> {
    try {
      const job = await this.queue.add(jobName, data, options);

      const jobLogger = createJobLogger(
        this.queueName,
        jobName,
        job.id as string
      );

      jobLogger.info({ data, options }, "Job pushed to queue");

      return job.id as string;
    } catch (error) {
      this.logger.error(
        { error, jobName, data, options },
        "Failed to push job to queue"
      );
      throw error;
    }
  }

  /**
   * Push multiple jobs to the queue in bulk
   *
   * @param jobs - Array of jobs to push
   * @returns Promise that resolves to an array of job IDs
   *
   * @example
   * ```ts
   * await queue('email').pushBulk([
   *   { name: 'send-welcome', data: { userId: '123', email: 'user1@example.com' } },
   *   { name: 'send-welcome', data: { userId: '456', email: 'user2@example.com' } },
   * ]);
   * ```
   */
  async pushBulk<J extends JobName<Q>>(
    jobs: Array<{
      name: J;
      data: JobData<Q, J>;
      options?: JobOptions;
    }>
  ): Promise<string[]> {
    try {
      const bullJobs = await this.queue.addBulk(
        jobs.map((job) => ({
          name: job.name,
          data: job.data,
          opts: job.options,
        }))
      );

      this.logger.info({ count: bullJobs.length }, "Bulk jobs pushed to queue");

      return bullJobs.map((job) => job.id as string);
    } catch (error) {
      this.logger.error({ error, jobs }, "Failed to push bulk jobs to queue");
      throw error;
    }
  }

  /**
   * Get the underlying BullMQ Queue instance
   *
   * Use this for advanced operations not covered by the wrapper
   */
  getQueue(): Queue {
    return this.queue;
  }

  /**
   * Close the queue connection
   *
   * Should be called when shutting down the application
   */
  async close(): Promise<void> {
    await this.queue.close();
    queueInstances.delete(this.queueName);
    this.logger.info("Queue closed");
  }
}
