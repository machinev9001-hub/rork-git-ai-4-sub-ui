import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AdminDisputesVerificationScreen from '../app/admin-disputes-verification';

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: any) => children,
  },
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

// Mock Firebase
jest.mock('@/config/firebase', () => ({
  db: {},
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock utility functions
jest.mock('@/utils/masterIdVerification', () => ({
  approveIdVerification: jest.fn(() => Promise.resolve({ success: true })),
  rejectIdVerification: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

describe('AdminDisputesVerificationScreen', () => {
  it('renders without crashing', async () => {
    const { getByText } = render(<AdminDisputesVerificationScreen />);
    
    await waitFor(() => {
      expect(getByText('Disputes & Verification')).toBeTruthy();
    });
  });

  it('displays disputes tab by default', async () => {
    const { getByText } = render(<AdminDisputesVerificationScreen />);
    
    await waitFor(() => {
      expect(getByText(/Disputes/)).toBeTruthy();
    });
  });

  it('displays verifications tab', async () => {
    const { getByText } = render(<AdminDisputesVerificationScreen />);
    
    await waitFor(() => {
      expect(getByText(/Verifications/)).toBeTruthy();
    });
  });

  it('shows empty state when no disputes exist', async () => {
    const { getByText } = render(<AdminDisputesVerificationScreen />);
    
    await waitFor(() => {
      expect(getByText('No disputes found') || getByText('Loading...')).toBeTruthy();
    });
  });
});
