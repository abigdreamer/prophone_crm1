import axios from 'axios';

const PULLPUSH_BASE = 'https://api.pullpush.io/reddit/search/submission';
const REQUEST_TIMEOUT = 60000;
const MAX_RETRIES = 2;

/**
 * Fetch posts from a subreddit using PullPush API.
 */
export async function fetchSubredditPosts(subreddit, { keywords = [], limit = 100 } = {}) {
  const params = {
    subreddit: subreddit.toLowerCase(),
    size: limit,
    sort: 'created_utc',
    sort_type: 'desc',
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get(PULLPUSH_BASE, {
        params,
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const items = data?.data || data || [];
      if (!Array.isArray(items)) return [];

      return items.map(d => ({
        redditId: d.name || `t3_${d.id}`,
        subreddit: d.subreddit || subreddit,
        title: d.title || '',
        body: d.selftext || '',
        author: d.author || '[deleted]',
        permalink: d.permalink
          ? `https://www.reddit.com${d.permalink}`
          : `https://www.reddit.com/r/${subreddit}/comments/${d.id}`,
        redditCreatedAt: d.created_utc ? new Date(d.created_utc * 1000) : new Date(),
        score: d.score || 0,
        numComments: d.num_comments || 0,
      }));
    } catch {
      if (attempt === MAX_RETRIES) return [];
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return [];
}

/**
 * Check if a post matches any of the given keywords.
 * Returns the list of matched keywords.
 */
export function matchKeywords(post, keywords) {
  const text = `${post.title} ${post.body}`.toLowerCase();
  return keywords.filter(kw => text.includes(kw.toLowerCase()));
}
