import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-key';
              if (key === 'OPENAI_MODEL') return 'gpt-4o-mini';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectHebrew', () => {
    it('should detect Hebrew characters', () => {
      expect(service.detectHebrew('שלום')).toBe(true);
      expect(service.detectHebrew('תודה רבה')).toBe(true);
      expect(service.detectHebrew('Hello שלום')).toBe(true);
    });

    it('should return false for English text', () => {
      expect(service.detectHebrew('Hello')).toBe(false);
      expect(service.detectHebrew('Thank you')).toBe(false);
      expect(service.detectHebrew('Great service!')).toBe(false);
    });

    it('should return false for empty or undefined text', () => {
      expect(service.detectHebrew('')).toBe(false);
      expect(service.detectHebrew(undefined)).toBe(false);
    });

    it('should detect Hebrew in mixed content', () => {
      expect(service.detectHebrew('123 שלום 456')).toBe(true);
      expect(service.detectHebrew('Great! תודה')).toBe(true);
    });
  });

  describe('normalizeOutput', () => {
    it('should remove surrounding double quotes', () => {
      const input = '"Thank you for your review!"';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you for your review!');
    });

    it('should remove surrounding single quotes', () => {
      const input = "'Thank you for your review!'";
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you for your review!');
    });

    it('should remove "Reply:" prefix', () => {
      const input = 'Reply: Thank you!';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you!');
    });

    it('should remove "Response:" prefix', () => {
      const input = 'Response: Thank you!';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you!');
    });

    it('should remove Hebrew prefix "תגובה:"', () => {
      const input = 'תגובה: תודה רבה';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('תודה רבה');
    });

    it('should handle text without quotes or prefixes', () => {
      const input = 'Thank you for your review!';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you for your review!');
    });

    it('should handle multiple normalizations', () => {
      const input = '"Reply: Thank you!"';
      const result = service['normalizeOutput'](input);
      expect(result).toBe('Thank you!');
    });
  });

  describe('validateDraft', () => {
    it('should validate a good draft', () => {
      const draft = 'Thank you for your wonderful review!';
      const result = service.validateDraft(draft);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject empty drafts', () => {
      const result = service.validateDraft('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Draft is empty');
    });

    it('should reject very short drafts', () => {
      const result = service.validateDraft('Thanks');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Draft is too short');
    });

    it('should reject very long drafts', () => {
      const longDraft = 'a'.repeat(1001);
      const result = service.validateDraft(longDraft);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Draft is too long');
    });

    it('should accept drafts at boundary lengths', () => {
      const minDraft = 'a'.repeat(10);
      const maxDraft = 'a'.repeat(1000);

      expect(service.validateDraft(minDraft).valid).toBe(true);
      expect(service.validateDraft(maxDraft).valid).toBe(true);
    });

    it('should validate Hebrew drafts', () => {
      const hebrewDraft = 'תודה רבה על הביקורת הנפלאה שלך!';
      const result = service.validateDraft(hebrewDraft);
      expect(result.valid).toBe(true);
    });
  });
});
