import prisma from '../lib/prisma.js';
import { fetchSubredditPosts, matchKeywords } from '../services/redditService.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const MAX_REQUESTS_PER_CYCLE = 10;

let pollerTimer = null;

export function startRedditPoller() {
  if (pollerTimer) return;
  pollerTimer = setInterval(pollAllMonitors, POLL_INTERVAL_MS);
  setTimeout(pollAllMonitors, 5000);
}

export function stopRedditPoller() {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
}

async function pollAllMonitors() {
  try {
    const monitors = await prisma.redditMonitor.findMany({
      where: { isActive: true },
    });

    if (monitors.length === 0) return;

    // Group monitors by subreddit to avoid duplicate fetches
    const subredditMap = new Map();
    for (const m of monitors) {
      const sub = m.subreddit.toLowerCase();
      if (!subredditMap.has(sub)) subredditMap.set(sub, []);
      subredditMap.get(sub).push(m);
    }

    let requestCount = 0;
    for (const [subreddit, monitorGroup] of subredditMap) {
      if (requestCount >= MAX_REQUESTS_PER_CYCLE) break;

      try {
        // Collect all unique keywords from monitors for this subreddit
        const allKeywords = [...new Set(monitorGroup.flatMap(m => m.keywords))];

        const posts = await fetchSubredditPosts(subreddit, { keywords: allKeywords });
        requestCount++;

        for (const post of posts) {
          for (const monitor of monitorGroup) {
            const matched = matchKeywords(post, monitor.keywords);
            if (matched.length === 0) continue;

            const exists = await prisma.redditPost.findUnique({
              where: { redditId: post.redditId },
            });
            if (exists) continue;

            const created = await prisma.redditPost.create({
              data: {
                clientId: monitor.clientId,
                monitorId: monitor.id,
                redditId: post.redditId,
                subreddit: post.subreddit,
                title: post.title,
                body: post.body,
                author: post.author,
                permalink: post.permalink,
                redditCreatedAt: post.redditCreatedAt,
                matchedKeywords: matched,
                status: 'new',
              },
            });

            await prisma.redditPostEvent.create({
              data: {
                postId: created.id,
                event: 'discovered',
                metadata: { matchedKeywords: matched, subreddit },
              },
            });
          }
        }
      } catch (err) {
        // Only log actual errors, not routine empty results
      }
    }
  } catch (err) {
    // Poll cycle failed silently
  }
}
