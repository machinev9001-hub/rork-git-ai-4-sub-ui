/**
 * Tests for Master Account Type Definitions
 * Validates that all required fields are present and correctly typed
 */

import type {
  MasterAccount,
  Company,
  CompanyOwnership,
  CompanyRole,
  MasterIDVerification,
  FraudDispute,
  OwnershipChangeRequest,
  IDVerificationStatus,
  DuplicateIDStatus,
} from '@/types';

describe('Master Account Type Definitions', () => {
  describe('MasterAccount Type', () => {
    it('should have all required fields', () => {
      const mockMasterAccount: MasterAccount = {
        id: 'test-id',
        masterId: 'master-123',
        name: 'John Doe',
        surname: 'Doe',
        username: 'johndoe',
        pin: '1234',
        nationalIdNumber: '1234567890123',
        idVerificationStatus: 'verified',
        idVerifiedAt: new Date(),
        idVerifiedBy: 'admin-123',
        idDocumentUrl: 'https://example.com/id.jpg',
        duplicateIdStatus: 'none',
        canOwnCompanies: true,
        canReceivePayouts: true,
        canApproveOwnershipChanges: true,
        restrictionReason: undefined,
        companyIds: ['company-1', 'company-2'],
        currentCompanyId: 'company-1',
        accountType: 'enterprise',
        vasFeatures: ['analytics', 'reporting'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockMasterAccount.id).toBe('test-id');
      expect(mockMasterAccount.nationalIdNumber).toBe('1234567890123');
      expect(mockMasterAccount.idVerificationStatus).toBe('verified');
      expect(mockMasterAccount.duplicateIdStatus).toBe('none');
      expect(mockMasterAccount.canOwnCompanies).toBe(true);
      expect(mockMasterAccount.surname).toBe('Doe');
      expect(mockMasterAccount.username).toBe('johndoe');
    });

    it('should support optional fields', () => {
      const minimalMasterAccount: MasterAccount = {
        id: 'test-id',
        masterId: 'master-123',
        name: 'Jane Smith',
        pin: '5678',
        companyIds: [],
        createdAt: new Date(),
      };

      expect(minimalMasterAccount.id).toBe('test-id');
      expect(minimalMasterAccount.surname).toBeUndefined();
      expect(minimalMasterAccount.nationalIdNumber).toBeUndefined();
      expect(minimalMasterAccount.canOwnCompanies).toBeUndefined();
    });
  });

  describe('Company Type', () => {
    it('should have multi-owner support fields', () => {
      const mockCompany: Company = {
        id: 'company-1',
        legalEntityName: 'Test Company Ltd',
        alias: 'TestCo',
        address: '123 Test St',
        contactNumber: '+1234567890',
        adminContact: 'Admin Name',
        adminEmail: 'admin@test.com',
        companyRegistrationNr: 'REG123',
        vatNumber: 'VAT456',
        industrySector: 'Construction',
        status: 'Active',
        totalOwnershipPercentage: 100,
        ownerCount: 2,
        createdAt: new Date(),
        createdBy: 'master-123',
      };

      expect(mockCompany.totalOwnershipPercentage).toBe(100);
      expect(mockCompany.ownerCount).toBe(2);
      expect(mockCompany.status).toBe('Active');
    });

    it('should support optional ownership fields', () => {
      const legacyCompany: Company = {
        id: 'company-2',
        legalEntityName: 'Legacy Company',
        alias: 'Legacy',
        address: '456 Old St',
        contactNumber: '+0987654321',
        adminContact: 'Old Admin',
        adminEmail: 'old@legacy.com',
        companyRegistrationNr: 'OLD123',
        vatNumber: 'OLDVAT',
        industrySector: 'Manufacturing',
        status: 'Active',
        createdAt: new Date(),
        createdBy: 'old-master',
      };

      expect(legacyCompany.totalOwnershipPercentage).toBeUndefined();
      expect(legacyCompany.ownerCount).toBeUndefined();
    });
  });

  describe('IDVerificationStatus Type', () => {
    it('should accept valid status values', () => {
      const statuses: IDVerificationStatus[] = [
        'unverified',
        'pending_review',
        'verified',
        'rejected',
        'expired',
      ];

      statuses.forEach(status => {
        expect(['unverified', 'pending_review', 'verified', 'rejected', 'expired']).toContain(status);
      });
    });
  });

  describe('DuplicateIDStatus Type', () => {
    it('should accept valid duplicate status values', () => {
      const statuses: DuplicateIDStatus[] = [
        'none',
        'detected',
        'under_investigation',
        'resolved',
        'blocked',
      ];

      statuses.forEach(status => {
        expect(['none', 'detected', 'under_investigation', 'resolved', 'blocked']).toContain(status);
      });
    });
  });

  describe('CompanyOwnership Type', () => {
    it('should have all required ownership fields', () => {
      const mockOwnership: CompanyOwnership = {
        id: 'ownership-1',
        companyId: 'company-1',
        masterAccountId: 'master-123',
        masterAccountName: 'John Doe',
        ownershipPercentage: 50,
        status: 'active',
        votingRights: true,
        economicRights: true,
        grantedAt: new Date(),
        grantedBy: 'master-456',
        approvedAt: new Date(),
        approvedBy: 'admin-789',
        createdAt: new Date(),
      };

      expect(mockOwnership.ownershipPercentage).toBe(50);
      expect(mockOwnership.status).toBe('active');
      expect(mockOwnership.votingRights).toBe(true);
    });
  });

  describe('CompanyRole Type', () => {
    it('should support different role types', () => {
      const directorRole: CompanyRole = {
        id: 'role-1',
        companyId: 'company-1',
        masterAccountId: 'master-123',
        masterAccountName: 'John Doe',
        role: 'Director',
        permissions: ['manage_company', 'approve_expenses'],
        status: 'active',
        assignedAt: new Date(),
        assignedBy: 'admin-123',
        createdAt: new Date(),
      };

      expect(directorRole.role).toBe('Director');
      expect(directorRole.permissions.length).toBe(2);
    });
  });

  describe('MasterIDVerification Type', () => {
    it('should have all verification fields', () => {
      const verification: MasterIDVerification = {
        id: 'verification-1',
        masterAccountId: 'master-123',
        nationalIdNumber: '1234567890123',
        documentType: 'national_id',
        documentUrl: 'https://example.com/id.jpg',
        storagePath: '/ids/master-123.jpg',
        status: 'verified',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: 'admin-123',
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      expect(verification.nationalIdNumber).toBe('1234567890123');
      expect(verification.status).toBe('verified');
      expect(verification.documentType).toBe('national_id');
    });
  });

  describe('FraudDispute Type', () => {
    it('should have all dispute fields', () => {
      const dispute: FraudDispute = {
        id: 'dispute-1',
        nationalIdNumber: '1234567890123',
        reportedBy: 'master-123',
        reportedByName: 'John Doe',
        newAccountId: 'master-456',
        newAccountName: 'Jane Smith',
        status: 'pending',
        priority: 'high',
        disputeType: 'duplicate_id',
        explanation: 'This ID number is already registered to me',
        reportedAt: new Date(),
        createdAt: new Date(),
      };

      expect(dispute.status).toBe('pending');
      expect(dispute.priority).toBe('high');
      expect(dispute.disputeType).toBe('duplicate_id');
    });
  });

  describe('OwnershipChangeRequest Type', () => {
    it('should have all ownership change request fields', () => {
      const changeRequest: OwnershipChangeRequest = {
        id: 'request-1',
        companyId: 'company-1',
        companyName: 'Test Company',
        requestType: 'add_owner',
        requestedBy: 'master-123',
        requestedByName: 'John Doe',
        status: 'pending',
        targetMasterAccountId: 'master-456',
        targetMasterAccountName: 'Jane Smith',
        proposedOwnershipPercentage: 25,
        requiredApprovals: 2,
        currentApprovals: 0,
        approvers: [],
        reason: 'Adding new partner',
        createdAt: new Date(),
      };

      expect(changeRequest.requestType).toBe('add_owner');
      expect(changeRequest.proposedOwnershipPercentage).toBe(25);
      expect(changeRequest.status).toBe('pending');
    });
  });
});
