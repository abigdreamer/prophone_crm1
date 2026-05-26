import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

/**
 * Generate an AI comment draft for a Reddit post.
 * The draft should be helpful, not overtly promotional.
 */
export async function generateCommentDraft(post, companyContext = {}) {
  const { companyName = 'ProPhone', industry = 'towing/roadside assistance' } = companyContext;

  const prompt = `You are a helpful community member who works in the ${industry} industry.
A user on Reddit posted the following in r/${post.subreddit}:

Title: ${post.title}
${post.body ? `Body: ${post.body}` : '(no body text)'}

Write a helpful, genuine Reddit comment that:
1. Directly addresses the poster's question or concern
2. Provides real value and practical advice
3. Is conversational and authentic (not corporate/salesy)
4. If naturally relevant, briefly mentions ${companyName} as something worth looking into — but only if it fits organically
5. Keeps it concise (2-4 paragraphs max)
6. Does NOT use emojis or excessive formatting

Return ONLY the comment text, no preamble or explanation.`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content;
}
