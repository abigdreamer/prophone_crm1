import prisma from '../lib/prisma.js';
import { executeCampaignBatch } from '../services/queueService.js';

const POLL_INTERVAL_MS = 60_000;
const RETRY_DELAYS_MS  = [5_000, 20_000, 60_000]; // 5s, 20s, 60s between attempts
let schedulerTimer = null;

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt <= RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        console.warn(`[queue-scheduler] ${label} attempt ${attempt} failed (${err.message}) — retrying in ${delay / 1000}s…`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export async function startQueueScheduler() {
  if (schedulerTimer) return;

  // Any run left in 'running' status means the previous process was killed mid-batch.
  // Reset them to 'pending' scheduled for now so they resume on the next tick.
  try {
    const orphaned = await prisma.campaignQueueRun.updateMany({
      where: { status: 'running' },
      data:  { status: 'pending', scheduledAt: new Date() },
    });
    if (orphaned.count > 0) {
      console.log(`[queue-scheduler] Recovered ${orphaned.count} orphaned run(s) from previous process — will resume shortly`);
    }
  } catch (err) {
    console.warn('[queue-scheduler] Could not recover orphaned runs:', err.message);
  }

  schedulerTimer = setInterval(tickQueueScheduler, POLL_INTERVAL_MS);
  setTimeout(tickQueueScheduler, 5000);
}

export function stopQueueScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

async function tickQueueScheduler() {
  try {
    const dueRuns = await prisma.campaignQueueRun.findMany({
      where: {
        status:      'pending',
        scheduledAt: { lte: new Date() },
        queue:       { status: 'active' },
      },
      include: { queue: true },
    });

    if (!dueRuns.length) return;
    console.log(`[queue-scheduler] ${dueRuns.length} due run(s) found`);

    for (const run of dueRuns) {
      await processRun(run);
    }
  } catch (err) {
    console.error('[queue-scheduler] tick error:', err.message);
  }
}

async function processRun(run) {
  const { queue } = run;
  console.log(`[queue-scheduler] Processing run ${run.id} (day ${run.dayNumber}, campaign ${queue.campaignId})`);

  // Mark run as running
  await prisma.campaignQueueRun.update({
    where: { id: run.id },
    data:  { status: 'running', startedAt: new Date() },
  });

  try {
    const result = await withRetry(
      () => executeCampaignBatch(queue.campaignId, {
        limit:          queue.dailyLimit,
        queueRunId:     run.id,
        label:          `Day ${run.dayNumber}`,
        sendGapSeconds: queue.sendGapSeconds ?? 5,
      }),
      `run ${run.id} (day ${run.dayNumber})`
    );

    // Always read totalSent from actual DB records — never rely on the incremental counter,
    // which becomes stale when runs are interrupted and retried.
    const [totalSentFromDB, remaining] = await Promise.all([
      prisma.campaignRecipient.count({
        where: { campaignId: queue.campaignId, status: { notIn: ['pending', 'skipped'] } },
      }),
      prisma.campaignRecipient.count({
        where: { campaignId: queue.campaignId, status: 'pending' },
      }),
    ]);

    console.log(`[queue-scheduler] Run ${run.id} day ${run.dayNumber}: sent=${result.sent} totalSent=${totalSentFromDB} remaining=${remaining}`);

    // Mark run completed — use actual per-run sent count from DB for accuracy
    const runSentCount = await prisma.campaignRecipient.count({
      where: { queueRunId: run.id, status: { notIn: ['pending', 'skipped'] } },
    });
    await prisma.campaignQueueRun.update({
      where: { id: run.id },
      data:  { status: 'completed', completedAt: new Date(), sentCount: runSentCount },
    });

    if (remaining === 0) {
      await prisma.campaignQueue.update({
        where: { id: queue.id },
        data:  { status: 'completed', totalSent: totalSentFromDB, currentDay: run.dayNumber, estimatedEndAt: new Date() },
      });
      console.log(`[queue-scheduler] Campaign ${queue.campaignId} fully completed — all contacts sent`);
    } else {
      // Schedule next run on the next allowed day at sendTime — but only if one doesn't exist yet
      const existingNext = await prisma.campaignQueueRun.findFirst({
        where: { queueId: queue.id, dayNumber: run.dayNumber + 1 },
      });

      if (!existingNext) {
        const [h, m] = queue.sendTime.split(':').map(Number);
        const allowedDays = (Array.isArray(queue.sendDays) && queue.sendDays.length)
          ? queue.sendDays : [0, 1, 2, 3, 4, 5, 6];
        const now = new Date();
        let nextDate = new Date(now);
        for (let offset = 1; offset <= 7; offset++) {
          nextDate = new Date(now);
          nextDate.setUTCDate(now.getUTCDate() + offset);
          if (allowedDays.includes(nextDate.getUTCDay())) break;
        }
        nextDate.setUTCHours(h, m, 0, 0);

        await prisma.campaignQueueRun.create({
          data: { queueId: queue.id, dayNumber: run.dayNumber + 1, scheduledAt: nextDate, status: 'pending' },
        });
        console.log(`[queue-scheduler] Next run scheduled for ${nextDate.toISOString()} (${remaining} contacts remaining, allowed days: ${allowedDays})`);
      } else {
        console.log(`[queue-scheduler] Next run (day ${run.dayNumber + 1}) already exists — skipping duplicate creation`);
      }

      await prisma.campaignQueue.update({
        where: { id: queue.id },
        data:  { totalSent: totalSentFromDB, currentDay: run.dayNumber, status: 'active' },
      });
    }
  } catch (err) {
    console.error(`[queue-scheduler] Run ${run.id} failed after all retries:`, err.message);
    await prisma.campaignQueueRun.update({
      where: { id: run.id },
      data:  {
        status:       'failed',
        errorMessage: `Failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${err.message}`,
        completedAt:  new Date(),
      },
    }).catch(() => {});
  }
}
