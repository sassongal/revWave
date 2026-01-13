import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../database/prisma.service';

describe('ContactsService', () => {
  let service: ContactsService;

  const mockPrismaService = {
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = 'tenant-123';
    const validContactData = {
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      source: 'manual',
      consentStatus: 'granted',
      consentTimestamp: new Date(),
      consentSource: 'manual',
      tenantId,
    };

    it('should create a contact with granted consent', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue({
        id: 'contact-123',
        ...validContactData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(validContactData);

      expect(result).toBeDefined();
      expect(mockPrismaService.contact.create).toHaveBeenCalledWith({
        data: validContactData,
      });
    });

    it('should throw BadRequestException if consentStatus is not granted', async () => {
      const invalidData = {
        ...validContactData,
        consentStatus: 'revoked',
      };

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'Cannot create contact without granted consent',
      );
      expect(mockPrismaService.contact.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if consentTimestamp is missing', async () => {
      const invalidData = {
        ...validContactData,
        consentTimestamp: undefined as any,
      };

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'consentTimestamp is required',
      );
      expect(mockPrismaService.contact.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if contact with same email exists', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue({
        id: 'existing-contact',
        email: validContactData.email,
        tenantId,
      });

      await expect(service.create(validContactData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validContactData)).rejects.toThrow(
        'already exists',
      );
      expect(mockPrismaService.contact.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeConsent', () => {
    const tenantId = 'tenant-123';
    const contactId = 'contact-123';

    it('should revoke consent and set status to revoked', async () => {
      const contact = {
        id: contactId,
        email: 'test@example.com',
        consentStatus: 'granted',
        tenantId,
      };

      mockPrismaService.contact.findFirst.mockResolvedValue(contact);
      mockPrismaService.contact.update.mockResolvedValue({
        ...contact,
        consentStatus: 'revoked',
      });

      const result = await service.revokeConsent(contactId, tenantId);

      expect(result.consentStatus).toBe('revoked');
      expect(mockPrismaService.contact.update).toHaveBeenCalledWith({
        where: { id: contactId },
        data: { consentStatus: 'revoked' },
      });
    });
  });
});
