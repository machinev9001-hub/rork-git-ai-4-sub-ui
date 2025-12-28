import { generateActivationCode, createFreeAccountActivationCode } from '@/utils/activationCode';

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

describe('Activation Code Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateActivationCode', () => {
    it('should generate a code in the correct format', () => {
      const code = generateActivationCode();
      
      // Should be in format XXXX-XXXX-XXXX-XXXX (19 characters total)
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(code.length).toBe(19);
    });

    it('should generate unique codes', () => {
      const code1 = generateActivationCode();
      const code2 = generateActivationCode();
      
      // While theoretically possible to generate the same code twice,
      // it's extremely unlikely with a 16-character code
      expect(code1).not.toBe(code2);
    });

    it('should only use allowed characters', () => {
      const code = generateActivationCode();
      const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      
      // Remove dashes and check each character
      const codeWithoutDashes = code.replace(/-/g, '');
      for (const char of codeWithoutDashes) {
        expect(allowedChars).toContain(char);
      }
    });
  });

  describe('createFreeAccountActivationCode', () => {
    it('should create a free account activation code successfully', async () => {
      const result = await createFreeAccountActivationCode();
      
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.codeId).toBe('test-doc-id');
      expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should call addDoc with correct data structure', async () => {
      const { addDoc } = require('firebase/firestore');
      
      await createFreeAccountActivationCode();
      
      // Verify addDoc was called once
      expect(addDoc).toHaveBeenCalledTimes(1);
      
      // Get the actual call arguments
      const callArgs = addDoc.mock.calls[0];
      const documentData = callArgs[1];
      
      // Verify the document data has required fields
      expect(documentData).toMatchObject({
        companyName: 'Free Account',
        status: 'active',
        expiryDate: null,
        maxRedemptions: 1,
        currentRedemptions: 0,
      });
      
      // Verify code format
      expect(documentData.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      
      // Verify timestamps are present
      expect(documentData.createdAt).toBeDefined();
      expect(documentData.updatedAt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const { addDoc } = require('firebase/firestore');
      addDoc.mockRejectedValueOnce(new Error('Firebase error'));
      
      const result = await createFreeAccountActivationCode();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create activation code');
      expect(result.code).toBeUndefined();
      expect(result.codeId).toBeUndefined();
    });
  });
});
