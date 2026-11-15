import { claimJob, completeJob, createDb, failJob, reclaimExpiredJobs, type ClaimedJob } from "@assay/db";

const db = createDb();
const handlers = new Map<string, (job: ClaimedJob) => Promise<void>>([
  ["healthcheck", async () => undefined],
]);

let running = false;
let timer: NodeJS.Timeout | undefined;

async function tick() {
  await reclaimExpiredJobs(db);
  const job = await claimJob(db);
  if (!job) return;
  const handler = handlers.get(job.jobType);
  if (!handler) {
    await failJob(db, job.id, "NO_HANDLER");
    return;
  }
  try {
    await handler(job);
    await completeJob(db, job.id);
  } catch {
    await failJob(db, job.id, "HANDLER_ERROR");
  }
}

export function startWorker() {
  if (running || process.env.WORKER_ENABLED === "false") return;
  running = true;
  timer = setInterval(() => {
    void tick().catch(() => undefined);
  }, 2_000);
  timer.unref();
}

export function stopWorker() {
  running = false;
  if (timer) clearInterval(timer);
  timer = undefined;
}
