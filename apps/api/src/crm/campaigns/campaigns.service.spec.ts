import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../database/prisma.service';
import { NodemailerEmailProvider } from './providers/email.provider';

describe('CampaignsService', () => {
  let service: CampaignsService;

  const mockPrismaService = {
    campaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
    },
    campaignRecipient: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailProvider = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NodemailerEmailProvider,
          useValue: mockEmailProvider,
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('enqueueSending', () => {
    const tenantId = 'tenant-123';
    const campaignId = 'campaign-123';
    const userId = 'user-123';

    const mockCampaign = {
      id: campaignId,
      name: 'Test Campaign',
      subject: 'Test Subject',
      bodyHtml: '<p>Test Body</p>',
      status: 'draft',
      tenantId,
    };

    const mockContact1 = {
      id: 'contact-1',
      email: 'contact1@example.com',
      consentStatus: 'granted',
      tenantId,
    };

    const mockContact2 = {
      id: 'contact-2',
      email: 'contact2@example.com',
      consentStatus: 'granted',
      tenantId,
    };

    beforeEach(() => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
    });

    it('should create recipients for all subscribed contacts and exclude revoked', async () => {
      const subscribedContacts = [mockContact1, mockContact2];
      const revokedContact = {
        id: 'contact-3',
        email: 'contact3@example.com',
        consentStatus: 'revoked',
        tenantId,
      };

      // Mock finding all contacts - should only return granted ones
      mockPrismaService.contact.findMany.mockResolvedValue(subscribedContacts);

      // Mock recipient creation
      mockPrismaService.campaignRecipient.create
        .mockResolvedValueOnce({ id: 'recipient-1', campaignId, contactId: 'contact-1' })
        .mockResolvedValueOnce({ id: 'recipient-2', campaignId, contactId: 'contact-2' });

      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: 'scheduled',
      });

      const result = await service.enqueueSending(campaignId, tenantId);

      expect(result.recipientCount).toBe(2);
      expect(result.status).toBe('scheduled');

      // Verify only granted contacts were queried
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          consentStatus: 'granted',
        },
      });

      // Verify recipients were created
      expect(mockPrismaService.campaignRecipient.create).toHaveBeenCalledTimes(2);

      // Verify campaign status was updated
      expect(mockPrismaService.campaign.update).toHaveBeenCalledWith({
        where: { id: campaignId },
        data: { status: 'scheduled' },
      });
    });

    it('should throw BadRequestException if campaign already sent', async () => {
      const sentCampaign = {
        ...mockCampaign,
        status: 'sent',
      };

      mockPrismaService.campaign.findFirst.mockResolvedValue(sentCampaign);

      await expect(
        service.enqueueSending(campaignId, tenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.enqueueSending(campaignId, tenantId),
      ).rejects.toThrow('Campaign has already been sent');

      expect(mockPrismaService.contact.findMany).not.toHaveBeenCalled();
    });

    it('should filter by specific contactIds when provided', async () => {
      const specificContacts = [mockContact1];

      mockPrismaService.contact.findMany.mockResolvedValue(specificContacts);
      mockPrismaService.campaignRecipient.create.mockResolvedValue({
        id: 'recipient-1',
        campaignId,
        contactId: 'contact-1',
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: 'scheduled',
      });

      const result = await service.enqueueSending(campaignId, tenantId, [
        'contact-1',
      ]);

      expect(result.recipientCount).toBe(1);

      // Verify query was scoped to specific contacts AND tenant AND granted
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['contact-1'] },
          tenantId,
          consentStatus: 'granted',
        },
      });
    });

    it('should exclude contacts with revoked consent even if in contactIds', async () => {
      // Even if contactIds includes revoked contacts, they should be filtered out
      const onlyGrantedContacts = [mockContact1]; // contact-2 has revoked consent

      mockPrismaService.contact.findMany.mockResolvedValue(onlyGrantedContacts);
      mockPrismaService.campaignRecipient.create.mockResolvedValue({
        id: 'recipient-1',
        campaignId,
        contactId: 'contact-1',
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: 'scheduled',
      });

      const result = await service.enqueueSending(campaignId, tenantId, [
        'contact-1',
        'contact-revoked', // This should be filtered out
      ]);

      // Should only create recipient for granted contact
      expect(result.recipientCount).toBe(1);
      expect(mockPrismaService.campaignRecipient.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    const tenantId = 'tenant-123';
    const campaignId = 'campaign-123';

    it('should throw NotFoundException if campaign not found', async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(service.findOne(campaignId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(campaignId, tenantId)).rejects.toThrow(
        `Campaign with ID ${campaignId} not found`,
      );
    });

    it('should return campaign if found and tenant matches', async () => {
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        tenantId,
      };

      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);

      const result = await service.findOne(campaignId, tenantId);

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: campaignId,
          tenantId, // Tenant scoped
        },
        include: expect.any(Object),
      });
    });
  });
});
