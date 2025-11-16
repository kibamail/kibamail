/**
 * Queue System
 *
 * Type-safe wrapper around BullMQ for managing queues and workers
 *
 * @example Push a job to a queue
 * ```ts
 * import { queue } from '@/lib/queue';
 *
 * await queue('email').push('send-welcome', {
 *   userId: '123',
 *   email: 'user@example.com'
 * });
 * ```
 *
 * @example Start a worker
 * ```ts
 * import { queue } from '@/lib/queue';
 *
 * queue('email').start();
 * ```
 */

import { QueueWrapper } from "./queue";
import type { QueueName, WorkerConfig } from "./types";
import { WorkerWrapper } from "./worker";

/**
 * Combined queue interface that supports both pushing jobs and starting workers
 */
interface QueueInterface<Q extends QueueName> {
  /**
   * Push a job to the queue
   */
  push: QueueWrapper<Q>["push"];

  /**
   * Push multiple jobs to the queue
   */
  pushBulk: QueueWrapper<Q>["pushBulk"];

  /**
   * Start a worker for this queue
   */
  start: () => void;

  /**
   * Pause the worker
   */
  pause: () => Promise<void>;

  /**
   * Resume the worker
   */
  resume: () => void;

  /**
   * Close the worker
   */
  close: () => Promise<void>;

  /**
   * Get the underlying queue instance
   */
  getQueue: () => QueueWrapper<Q>;

  /**
   * Get the underlying worker instance
   */
  getWorker: () => WorkerWrapper<Q> | null;
}

/**
 * Queue instances cache
 */
const queueInterfaces = new Map<string, QueueInterface<QueueName>>();

/**
 * Worker configurations cache
 */
const workerConfigs = new Map<string, WorkerConfig<QueueName>>();

/**
 * Main queue function
 *
 * Creates or retrieves a queue interface that can be used to push jobs
 * or start workers
 *
 * @param queueName - The name of the queue
 * @returns Queue interface with push and start methods
 *
 * @example Push a job
 * ```ts
 * await queue('email').push('send-welcome', {
 *   userId: '123',
 *   email: 'user@example.com'
 * });
 * ```
 *
 * @example Start a worker (must configure first)
 * ```ts
 * // Configure the worker
 * configureWorker('email', {
 *   processors: {
 *     'send-welcome': async (data, jobId) => {
 *       // Process the job
 *     }
 *   }
 * });
 *
 * // Start the worker
 * queue('email').start();
 * ```
 */
export function queue<Q extends QueueName>(queueName: Q): QueueInterface<Q> {
  const existing = queueInterfaces.get(queueName);

  if (existing) {
    return existing as QueueInterface<Q>;
  }

  const queueWrapper = new QueueWrapper<Q>(queueName);
  let workerWrapper: WorkerWrapper<Q> | null = null;

  const queueInterface: QueueInterface<Q> = {
    push: (...args) => queueWrapper.push(...args),
    pushBulk: (...args) => queueWrapper.pushBulk(...args),

    start: () => {
      const config = workerConfigs.get(queueName);
      if (!config) {
        throw new Error(
          `Worker configuration not found for queue "${queueName}". ` +
            `Please call configureWorker("${queueName}", config) before starting the worker.`,
        );
      }

      if (!workerWrapper) {
        workerWrapper = new WorkerWrapper<Q>(
          queueName,
          config as WorkerConfig<Q>,
        );
      }

      workerWrapper.start();
    },

    pause: async () => {
      if (!workerWrapper) {
        throw new Error(`Worker not started for queue "${queueName}"`);
      }
      await workerWrapper.pause();
    },

    resume: () => {
      if (!workerWrapper) {
        throw new Error(`Worker not started for queue "${queueName}"`);
      }
      workerWrapper.resume();
    },

    close: async () => {
      if (!workerWrapper) {
        throw new Error(`Worker not started for queue "${queueName}"`);
      }
      await workerWrapper.close();
    },

    getQueue: () => queueWrapper,

    getWorker: () => workerWrapper,
  };

  queueInterfaces.set(queueName, queueInterface as QueueInterface<QueueName>);

  return queueInterface;
}

/**
 * Configure a worker for a queue
 *
 * Must be called before starting a worker
 *
 * @param queueName - The name of the queue
 * @param config - Worker configuration with processors
 *
 * @example
 * ```ts
 * import { configureWorker } from '@/lib/queue';
 *
 * configureWorker('email', {
 *   processors: {
 *     'send-welcome': async (data, jobId) => {
 *       console.log('Sending welcome email to', data.email);
 *       // Send email logic here
 *     },
 *     'send-notification': async (data, jobId) => {
 *       console.log('Sending notification to', data.userId);
 *       // Send notification logic here
 *     }
 *   },
 *   concurrency: 5, // Process up to 5 jobs concurrently
 * });
 * ```
 */
export function configureWorker<Q extends QueueName>(
  queueName: Q,
  config: WorkerConfig<Q>,
): void {
  workerConfigs.set(queueName, config as WorkerConfig<QueueName>);
}

/**
 * Gracefully close all queues and workers
 *
 * Should be called when shutting down the application
 */
export async function closeAll(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const queueInterface of queueInterfaces.values()) {
    const worker = queueInterface.getWorker();
    if (worker?.isRunning()) {
      closePromises.push(queueInterface.close());
    }
  }

  await Promise.all(closePromises);
  queueInterfaces.clear();
  workerConfigs.clear();
}

export { queueLogger } from "./logger";

export type {
  JobData,
  JobName,
  JobOptions,
  JobProcessor,
  QueueJobs,
  QueueName,
  WorkerConfig,
} from "./types";
