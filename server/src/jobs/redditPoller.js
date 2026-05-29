import prisma from '../lib/prisma.js';
import { fetchSubredditPosts, matchKeywords } from '../services/redditService.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const MAX_REQUESTS_PER_CYCLE = 10; // Rate limit: max 10 subreddit fetches per cycle

let pollerTimer = null;

export function startRedditPoller() {
  if (pollerTimer) return;
  pollerTimer = setInterval(pollAllMonitors, POLL_INTERVAL_MS);
  // Run once on startup after a short delay
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

    if (monitors.length === 0) {
      console.log('[reddit-poller] No active monitors found');
      return;
    }
    console.log(`[reddit-poller] Polling ${monitors.length} active monitor(s)`);

    // Group monitors by subreddit to avoid duplicate fetches
    const subredditMap = new Map();
    for (const m of monitors) {
      const sub = m.subreddit.toLowerCase();
      if (!subredditMap.has(sub)) subredditMap.set(sub, []);
      subredditMap.get(sub).push(m);
    }

    let requestCount = 0;
    for (const [subreddit, monitorGroup] of subredditMap) {
      if (requestCount >= MAX_REQUESTS_PER_CYCLE) {
        break;
      }

      try {
        console.log(`[reddit-poller] Fetching r/${subreddit}...`);
        const posts = await fetchSubredditPosts(subreddit);
        console.log(`[reddit-poller] r/${subreddit} returned ${posts.length} posts`);
        requestCount++;

        for (const post of posts) {
          // Check each monitor's keywords against this post
          for (const monitor of monitorGroup) {
            const matched = matchKeywords(post, monitor.keywords);
            if (matched.length === 0) continue;
            console.log(`[reddit-poller] Match found: "${post.title.substring(0, 60)}" → [${matched.join(', ')}]`);

            // Skip if already discovered
            const exists = await prisma.redditPost.findUnique({
              where: { redditId: post.redditId },
            });
            if (exists) continue;

            await prisma.redditPost.create({
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
                postId: (await prisma.redditPost.findUnique({ where: { redditId: post.redditId } })).id,
                event: 'discovered',
                metadata: { matchedKeywords: matched, subreddit },
              },
            });

          }
        }
      } catch (err) {
        console.error(`[reddit-poller] All methods failed for r/${subreddit}:`, err.response?.status || err.message);
      }
    }
  } catch (err) {
    console.error('[reddit-poller] Poll cycle failed:', err.message);
  }
}
