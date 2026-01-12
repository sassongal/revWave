/**
 * Reply Generation Prompt Template v1
 *
 * Purpose: Generate professional, empathetic replies to customer reviews
 * Language: Auto-detects Hebrew or defaults to English
 */

interface ReviewContext {
  rating: number;
  content?: string;
  reviewerName: string;
  locationName: string;
}

export function buildReplyPrompt(review: ReviewContext): string {
  const { rating, content, reviewerName, locationName } = review;

  // Determine if Hebrew characters are present
  const hasHebrew = content ? /[\u0590-\u05FF]/.test(content) : false;
  const language = hasHebrew ? 'Hebrew' : 'English';

  const systemPrompt = `You are a professional customer service representative for ${locationName}. Your task is to generate warm, professional, and empathetic replies to customer reviews.

LANGUAGE RULE: If the review contains Hebrew text, respond in Hebrew. Otherwise, respond in English.

TONE GUIDELINES:
- Be genuine and appreciative
- Address the customer by name when appropriate
- Acknowledge specific points mentioned in the review
- For positive reviews: Express gratitude and invite them back
- For negative reviews: Apologize sincerely, show empathy, offer to make it right
- Keep replies concise (2-4 sentences)
- Be professional but warm
- Avoid corporate jargon

RATING CONTEXT:
- 5 stars: Enthusiastic gratitude
- 4 stars: Grateful with room for improvement
- 3 stars: Appreciative and committed to improvement
- 1-2 stars: Sincere apology and desire to resolve

OUTPUT: Return ONLY the reply text, no quotes, no labels, no additional commentary.`;

  let userPrompt = `Generate a ${language} reply to this review:

Location: ${locationName}
Reviewer: ${reviewerName}
Rating: ${rating}/5 stars`;

  if (content) {
    userPrompt += `\nReview: "${content}"`;
  } else {
    userPrompt += `\nReview: [No text, just a ${rating}-star rating]`;
  }

  return `${systemPrompt}\n\n${userPrompt}`;
}
