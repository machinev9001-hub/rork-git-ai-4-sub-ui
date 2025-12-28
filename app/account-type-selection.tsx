import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Building2, Users, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountType } from '@/types';

const ACCOUNT_TYPE_STORAGE_KEY = '@selected_account_type';

export default function AccountTypeSelectionScreen() {
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);

  const handleContinue = async () => {
    if (!selectedType) return;

    // Store the selected account type
    await AsyncStorage.setItem(ACCOUNT_TYPE_STORAGE_KEY, selectedType);

    // Navigate to activation flow
    router.push('/activate');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Choose Account Type</Text>
            <Text style={styles.subtitle}>
              Select the account type that best fits your needs
            </Text>
          </View>

          <View style={styles.cards}>
            {/* Enterprise Account Card */}
            <TouchableOpacity
              style={[
                styles.card,
                selectedType === 'enterprise' && styles.cardSelected,
              ]}
              onPress={() => setSelectedType('enterprise')}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Building2 size={32} color="#3b82f6" strokeWidth={2} />
                </View>
                {selectedType === 'enterprise' && (
                  <CheckCircle2 size={24} color="#10b981" strokeWidth={2} />
                )}
              </View>

              <Text style={styles.cardTitle}>Enterprise Account</Text>
              <Text style={styles.cardDescription}>
                Full-featured account for businesses with complete access to all functionality
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>All features included</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Advanced analytics & reporting</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Data exports & integrations</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Priority support</Text>
                </View>
              </View>

              <Text style={styles.recommended}>Recommended for Enterprises</Text>
            </TouchableOpacity>

            {/* Free Account Card */}
            <TouchableOpacity
              style={[
                styles.card,
                selectedType === 'free' && styles.cardSelected,
              ]}
              onPress={() => setSelectedType('free')}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Users size={32} color="#8b5cf6" strokeWidth={2} />
                </View>
                {selectedType === 'free' && (
                  <CheckCircle2 size={24} color="#10b981" strokeWidth={2} />
                )}
              </View>

              <Text style={styles.cardTitle}>Free Account</Text>
              <Text style={styles.cardDescription}>
                Perfect for subcontractors with essential features and optional upgrades
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Employee management</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Asset management</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>External data reception</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.featureText}>Time tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.vasText}>+ Optional Value-Added Services</Text>
                </View>
              </View>

              <Text style={styles.recommended}>Perfect for Subcontractors</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !selectedType && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedType}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            You can upgrade or change your account type later in settings
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cards: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#f1f5f9',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    gap: 10,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  vasText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600' as const,
    fontStyle: 'italic',
  },
  recommended: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  helpText: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
