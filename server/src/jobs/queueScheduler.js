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

export function startQueueScheduler() {
  if (schedulerTimer) return;
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

    const newTotalSent  = queue.totalSent + result.sent;
    const newCurrentDay = run.dayNumber;

    // Count contacts still pending (includes any that failed all send retries this run)
    const remaining = await prisma.campaignRecipient.count({
      where: { campaignId: queue.campaignId, status: 'pending' },
    });

    console.log(`[queue-scheduler] Run ${run.id} day ${run.dayNumber}: sent=${result.sent} remaining=${remaining}`);

    // Mark run completed (partial success is still "completed" — remaining will be picked up next day)
    await prisma.campaignQueueRun.update({
      where: { id: run.id },
      data:  { status: 'completed', completedAt: new Date(), sentCount: result.sent },
    });

    if (remaining === 0) {
      await prisma.campaignQueue.update({
        where: { id: queue.id },
        data:  { status: 'completed', totalSent: newTotalSent, currentDay: newCurrentDay, estimatedEndAt: new Date() },
      });
      console.log(`[queue-scheduler] Campaign ${queue.campaignId} fully completed — all contacts sent`);
    } else {
      // Schedule next run on the next allowed day at sendTime
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

      await prisma.campaignQueue.update({
        where: { id: queue.id },
        data:  { totalSent: newTotalSent, currentDay: newCurrentDay, status: 'active' },
      });

      console.log(`[queue-scheduler] Next run scheduled for ${nextDate.toISOString()} (${remaining} contacts remaining, allowed days: ${allowedDays})`);
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
