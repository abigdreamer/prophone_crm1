import axios from 'axios';

const REDDIT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT = 15000;

/**
 * Fetch new posts from a subreddit using Reddit's public JSON endpoint.
 * Returns an array of simplified post objects.
 */
export async function fetchSubredditPosts(subreddit, limit = 100) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}&raw_json=1`;

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': REDDIT_USER_AGENT,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    timeout: REQUEST_TIMEOUT,
    // Prevent axios from using cached 304 responses
    validateStatus: (status) => status >= 200 && status < 300,
  });

  if (!data?.data?.children) return [];

  return data.data.children
    .filter(c => c.kind === 't3')
    .map(c => {
      const d = c.data;
      return {
        redditId: `t3_${d.id}`,
        subreddit: d.subreddit,
        title: d.title || '',
        body: d.selftext || '',
        author: d.author || '[deleted]',
        permalink: `https://www.reddit.com${d.permalink}`,
        redditCreatedAt: new Date(d.created_utc * 1000),
        score: d.score || 0,
        numComments: d.num_comments || 0,
      };
    });
}

/**
 * Check if a post matches any of the given keywords.
 * Returns the list of matched keywords.
 */
export function matchKeywords(post, keywords) {
  const text = `${post.title} ${post.body}`.toLowerCase();
  return keywords.filter(kw => text.includes(kw.toLowerCase()));
}
