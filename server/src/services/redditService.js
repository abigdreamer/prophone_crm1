import axios from 'axios';

const REDDIT_USER_AGENT = 'ProPhoneCRM/1.0 (Reddit Monitor)';
const REQUEST_TIMEOUT = 10000;

/**
 * Fetch new posts from a subreddit using Reddit's public JSON endpoint.
 * Returns an array of simplified post objects.
 */
export async function fetchSubredditPosts(subreddit, limit = 100) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': REDDIT_USER_AGENT },
    timeout: REQUEST_TIMEOUT,
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
