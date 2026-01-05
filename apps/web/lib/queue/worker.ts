/**
 * Worker Wrapper
 *
 * Type-safe wrapper around BullMQ Worker for processing jobs
 */

import type { Job } from "bullmq";
import { MetricsTime, Worker } from "bullmq";
import { env } from "@/env/schema";
import { getQueueConnection } from "./connection";
import { createJobLogger, createQueueLogger } from "./logger";
import type { JobName, QueueName, WorkerConfig } from "./types";

/**
 * Worker instances cache
 */
const workerInstances = new Map<string, Worker>();

/**
 * Worker Wrapper Class
 *
 * Provides type-safe methods for processing jobs from a queue
 */
export class WorkerWrapper<Q extends QueueName> {
  private worker: Worker | null = null;
  private logger;
  private config: WorkerConfig<Q>;

  constructor(
    private queueName: Q,
    config: WorkerConfig<Q>,
  ) {
    this.logger = createQueueLogger(queueName);
    this.config = config;
  }

  /**
   * Start the worker
   *
   * Begins processing jobs from the queue
   *
   * @example
   * ```ts
   * queue('email').start();
   * ```
   */
  start(): void {
    if (this.worker) {
      this.logger.warn("Worker already started");
      return;
    }

    const existingWorker = workerInstances.get(this.queueName);
    if (existingWorker) {
      this.worker = existingWorker;
      this.logger.warn("Reusing existing worker instance");
      return;
    }

    this.logger.info("Starting worker");

    // In cluster mode, use hash tags in prefix to ensure all queue keys
    // land on the same Redis Cluster slot. Must match the Queue prefix.
    // @see https://docs.bullmq.io/bull/patterns/redis-cluster
    const prefix = env.REDIS_CLUSTER_MODE ? `{bull:${this.queueName}}` : "bull";

    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const jobLogger = createJobLogger(
          this.queueName,
          job.name,
          job.id as string,
          job.data as Record<string, unknown>,
        );

        jobLogger.info("Processing job");

        try {
          const processor = this.config.processors[job.name as JobName<Q>];

          if (!processor) {
            throw new Error(`No processor found for job type: ${job.name}`);
          }

          await processor(job.data, job.id as string);

          jobLogger.info("Job completed successfully");
        } catch (error) {
          jobLogger.error({ error }, "Job processing failed");
          throw error;
        }
      },
      {
        connection: getQueueConnection(),
        prefix,
        concurrency: this.config.concurrency ?? 1,
        limiter: this.config.rateLimiter,
        autorun: true,
        metrics: {
          maxDataPoints: MetricsTime.ONE_WEEK * 2,
        },
      },
    );

    workerInstances.set(this.queueName, this.worker);

    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for worker events
   */
  private setupEventHandlers() {
    if (!this.worker) return;

    this.worker.on("ready", () => {
      this.logger.info("Worker ready");
    });

    this.worker.on("active", (job: Job) => {
      const jobLogger = createJobLogger(
        this.queueName,
        job.name,
        job.id as string,
        job.data as Record<string, unknown>,
      );
      jobLogger.debug({ attemptsMade: job.attemptsMade }, "Job started");
    });

    this.worker.on("completed", (job: Job, result: unknown) => {
      const jobLogger = createJobLogger(
        this.queueName,
        job.name,
        job.id as string,
        job.data as Record<string, unknown>,
      );
      jobLogger.info(
        {
          result,
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        },
        "Job completed",
      );
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      if (!job) {
        this.logger.error({ error }, "Job failed (no job info available)");
        return;
      }

      const jobLogger = createJobLogger(
        this.queueName,
        job.name,
        job.id as string,
        job.data as Record<string, unknown>,
      );

      jobLogger.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
        },
        "Job failed",
      );
    });

    this.worker.on("stalled", (jobId: string) => {
      this.logger.warn({ jobId }, "Job stalled");
    });

    this.worker.on("error", (error: Error) => {
      this.logger.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        "Worker error",
      );
    });

    this.worker.on("closing", () => {
      this.logger.info("Worker closing");
    });

    this.worker.on("closed", () => {
      this.logger.info("Worker closed");
    });

    this.worker.on("paused", () => {
      this.logger.info("Worker paused");
    });

    this.worker.on("resumed", () => {
      this.logger.info("Worker resumed");
    });

    this.worker.on("drained", () => {
      this.logger.debug("Queue drained (all jobs processed)");
    });
  }

  /**
   * Pause the worker
   *
   * Stops processing new jobs but allows currently processing jobs to complete
   */
  async pause(): Promise<void> {
    if (!this.worker) {
      this.logger.warn("Worker not started");
      return;
    }

    await this.worker.pause();
    this.logger.info("Worker paused");
  }

  /**
   * Resume the worker
   *
   * Resumes processing jobs after being paused
   */
  resume(): void {
    if (!this.worker) {
      this.logger.warn("Worker not started");
      return;
    }

    this.worker.resume();
    this.logger.info("Worker resumed");
  }

  /**
   * Close the worker
   *
   * Gracefully shuts down the worker
   */
  async close(): Promise<void> {
    if (!this.worker) {
      this.logger.warn("Worker not started");
      return;
    }

    await this.worker.close();
    workerInstances.delete(this.queueName);
    this.worker = null;
    this.logger.info("Worker closed");
  }

  /**
   * Get the underlying BullMQ Worker instance
   *
   * Use this for advanced operations not covered by the wrapper
   */
  getWorker(): Worker | null {
    return this.worker;
  }

  /**
   * Check if the worker is running
   */
  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }

  /**
   * Check if the worker is paused
   */
  isPaused(): boolean {
    if (!this.worker) return false;
    return this.worker.isPaused();
  }
}
