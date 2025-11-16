# Segments Background Jobs

Background job processors for segment-related tasks.

## Jobs

### `compute-contacts-count`

Computes the number of contacts that match each segment's conditions.

**Data:**
```typescript
{
  segmentIds: string[] // Array of segment IDs to process
}
```

**Example:**
```typescript
import { queue } from '@/lib/queue';

await queue('segments').push('compute-contacts-count', {
  segmentIds: ['segment_123', 'segment_456']
});
```

## Running the Worker

Start the segments worker to process jobs:

```bash
bun run jobs/segments/worker.ts
```

The worker will:
- Process `compute-contacts-count` jobs
- Run up to 3 jobs concurrently
- Log all job activity
- Gracefully shutdown on SIGINT/SIGTERM

## Testing

Run the example to push test jobs:

```bash
# Terminal 1 - Start the worker
bun run jobs/segments/worker.ts

# Terminal 2 - Push example jobs
bun run jobs/segments/example.ts
```

## Adding New Jobs

1. **Define the job type** in `lib/queue/types.ts`:
   ```typescript
   export type QueueJobs = {
     segments: {
       'compute-contacts-count': { segmentIds: string[] };
       'your-new-job': { yourData: string }; // Add here
     };
   };
   ```

2. **Create the job processor** in `jobs/segments/your-new-job.ts`:
   ```typescript
   import type { JobProcessor } from '@/lib/queue';

   export const yourNewJob: JobProcessor<'segments', 'your-new-job'> = async (data, jobId) => {
     // Your job logic here
   };
   ```

3. **Export the job** in `jobs/segments/index.ts`:
   ```typescript
   export { yourNewJob } from './your-new-job';
   ```

4. **Register in worker** in `jobs/segments/worker.ts`:
   ```typescript
   configureWorker('segments', {
     processors: {
       'compute-contacts-count': computeContactsCount,
       'your-new-job': yourNewJob, // Add here
     },
     concurrency: 3,
   });
   ```

## Job Structure

```
jobs/segments/
├── README.md                    # This file
├── index.ts                     # Export all jobs
├── worker.ts                    # Worker configuration and startup
├── example.ts                   # Example usage
├── compute-contacts-count.ts    # Job: Compute contacts count
└── your-new-job.ts             # Your new jobs...
```
