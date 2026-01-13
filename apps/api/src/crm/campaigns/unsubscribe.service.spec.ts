import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UnsubscribeService } from './unsubscribe.service';
import { PrismaService } from '../../database/prisma.service';

describe('UnsubscribeService', () => {
  let service: UnsubscribeService;

  const mockPrismaService = {
    campaignRecipient: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnsubscribeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UnsubscribeService>(UnsubscribeService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('unsubscribe', () => {
    const token = 'test-unsubscribe-token-123';
    const recipientId = 'recipient-123';
    const contactId = 'contact-123';
    const email = 'test@example.com';

    it('should successfully unsubscribe and revoke consent', async () => {
      const mockRecipient = {
        id: recipientId,
        status: 'pending',
        contact: {
          id: contactId,
          email,
          consentStatus: 'granted',
        },
      };

      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(
        mockRecipient,
      );
      mockPrismaService.contact.update.mockResolvedValue({
        id: contactId,
        consentStatus: 'revoked',
      });
      mockPrismaService.campaignRecipient.update.mockResolvedValue({
        id: recipientId,
        status: 'skipped_unsubscribed',
      });

      const result = await service.unsubscribe(token);

      expect(result.success).toBe(true);
      expect(result.contactEmail).toBe(email);

      // Verify contact consent was revoked
      expect(mockPrismaService.contact.update).toHaveBeenCalledWith({
        where: { id: contactId },
        data: { consentStatus: 'revoked' },
      });

      // Verify recipient was marked as skipped_unsubscribed
      expect(mockPrismaService.campaignRecipient.update).toHaveBeenCalledWith({
        where: { id: recipientId },
        data: {
          status: 'skipped_unsubscribed',
          errorMessage: 'Unsubscribed',
        },
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(null);

      await expect(service.unsubscribe(token)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unsubscribe(token)).rejects.toThrow(
        'Invalid unsubscribe token',
      );

      expect(mockPrismaService.contact.update).not.toHaveBeenCalled();
      expect(mockPrismaService.campaignRecipient.update).not.toHaveBeenCalled();
    });

    it('should not revoke consent if already revoked', async () => {
      const mockRecipient = {
        id: recipientId,
        status: 'pending',
        contact: {
          id: contactId,
          email,
          consentStatus: 'revoked', // Already revoked
        },
      };

      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(
        mockRecipient,
      );
      mockPrismaService.campaignRecipient.update.mockResolvedValue({
        id: recipientId,
        status: 'skipped_unsubscribed',
      });

      const result = await service.unsubscribe(token);

      expect(result.success).toBe(true);

      // Should not update contact if consent already revoked
      expect(mockPrismaService.contact.update).not.toHaveBeenCalled();

      // Should still mark recipient as skipped_unsubscribed
      expect(mockPrismaService.campaignRecipient.update).toHaveBeenCalled();
    });

    it('should not update recipient if status is not pending', async () => {
      const mockRecipient = {
        id: recipientId,
        status: 'sent', // Already sent
        contact: {
          id: contactId,
          email,
          consentStatus: 'granted',
        },
      };

      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(
        mockRecipient,
      );
      mockPrismaService.contact.update.mockResolvedValue({
        id: contactId,
        consentStatus: 'revoked',
      });

      const result = await service.unsubscribe(token);

      expect(result.success).toBe(true);

      // Should revoke consent
      expect(mockPrismaService.contact.update).toHaveBeenCalled();

      // Should not update recipient status if not pending
      expect(mockPrismaService.campaignRecipient.update).not.toHaveBeenCalled();
    });
  });
});
