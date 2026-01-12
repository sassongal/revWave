import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildReplyPrompt } from './prompts/reply-prompt-v1';

interface ReviewForReply {
  rating: number;
  content?: string;
  reviewerName: string;
  locationName: string;
}

interface GenerateDraftResult {
  draftText: string;
  model: string;
  hasHebrew: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. AI features will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
  }

  /**
   * Detect if text contains Hebrew characters
   */
  detectHebrew(text?: string): boolean {
    if (!text) return false;
    return /[\u0590-\u05FF]/.test(text);
  }

  /**
   * Generate a reply draft for a review
   * Automatically detects language (Hebrew or English)
   */
  async generateReplyDraft(review: ReviewForReply): Promise<GenerateDraftResult> {
    this.logger.log(
      `Generating reply draft for review (rating: ${review.rating}, location: ${review.locationName})`,
    );

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const hasHebrew = this.detectHebrew(review.content);
      const prompt = buildReplyPrompt(review);

      const startTime = Date.now();

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const duration = Date.now() - startTime;

      const draftText = completion.choices[0]?.message?.content?.trim() || '';

      if (!draftText) {
        throw new Error('OpenAI returned empty response');
      }

      // Normalize output: remove quotes if wrapped
      const normalizedText = this.normalizeOutput(draftText);

      this.logger.log(
        `Generated draft in ${duration}ms (model: ${this.model}, language: ${hasHebrew ? 'Hebrew' : 'English'}, length: ${normalizedText.length} chars)`,
      );

      return {
        draftText: normalizedText,
        model: this.model,
        hasHebrew,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate reply draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Normalize AI output by removing common artifacts
   */
  private normalizeOutput(text: string): string {
    let normalized = text.trim();

    // Remove surrounding quotes if present
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
    }

    // Remove common prefixes
    const prefixes = [
      'Reply:',
      'Response:',
      'Draft:',
      'תגובה:',
      'מענה:',
    ];

    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length).trim();
      }
    }

    return normalized;
  }

  /**
   * Validate that the generated draft is appropriate
   */
  validateDraft(draftText: string): { valid: boolean; reason?: string } {
    if (!draftText || draftText.length === 0) {
      return { valid: false, reason: 'Draft is empty' };
    }

    if (draftText.length < 10) {
      return { valid: false, reason: 'Draft is too short' };
    }

    if (draftText.length > 1000) {
      return { valid: false, reason: 'Draft is too long' };
    }

    return { valid: true };
  }
}
