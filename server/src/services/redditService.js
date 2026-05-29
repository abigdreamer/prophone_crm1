import axios from 'axios';

const REQUEST_TIMEOUT = 15000;

// Rotate user agents to reduce chance of blocking
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Parse Reddit RSS/Atom XML into post objects.
 * Simple regex-based parser — no extra dependency needed.
 */
function parseRSS(xml) {
  const posts = [];
  // Match each <entry> block (Atom feed)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const getAttr = (tag, attr) => {
      const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*/?>`, 'i'));
      return m ? m[1] : '';
    };

    const link = getAttr('link', 'href');
    const title = getTag('title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const content = getTag('content').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
    const author = getTag('name').replace(/\/u\//, '');
    const updated = getTag('updated');

    // Extract reddit ID from link like /r/trucking/comments/abc123/...
    const idMatch = link.match(/\/comments\/([a-z0-9]+)/i);
    if (!idMatch) continue;

    const permalink = link.startsWith('http') ? link : `https://www.reddit.com${link}`;
    // Extract subreddit from link
    const subMatch = link.match(/\/r\/([^/]+)/);
    const subreddit = subMatch ? subMatch[1] : '';

    posts.push({
      redditId: `t3_${idMatch[1]}`,
      subreddit,
      title,
      body: content.substring(0, 5000),
      author: author || '[deleted]',
      permalink,
      redditCreatedAt: updated ? new Date(updated) : new Date(),
      score: 0,
      numComments: 0,
    });
  }
  return posts;
}

/**
 * Try multiple methods to fetch subreddit posts.
 * 1. RSS feed (least likely to be blocked)
 * 2. JSON endpoint via old.reddit.com
 * 3. JSON endpoint via www.reddit.com
 */
export async function fetchSubredditPosts(subreddit, limit = 100) {
  const ua = randomUA();

  // Method 1: RSS/Atom feed
  try {
    const rssUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.rss?limit=${limit}`;
    const { data } = await axios.get(rssUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      timeout: REQUEST_TIMEOUT,
      responseType: 'text',
    });
    const posts = parseRSS(data);
    if (posts.length > 0) return posts;
  } catch (e) {
    // RSS failed, try JSON
  }

  // Method 2: old.reddit.com JSON
  try {
    const url = `https://old.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}&raw_json=1`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,
    });
    if (data?.data?.children) {
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
  } catch (e) {
    // JSON also failed, try www
  }

  // Method 3: www.reddit.com JSON
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}&raw_json=1`;
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'application/json',
    },
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
