import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AppTheme } from '@/constants/colors';

export default function MasterSignupScreen() {
  const { createMasterAccount } = useAuth();
  const [name, setName] = useState('');
  const [masterId, setMasterId] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!masterId.trim()) {
      Alert.alert('Error', 'Please enter Master User ID');
      return;
    }

    if (!pin.trim()) {
      Alert.alert('Error', 'Please enter PIN');
      return;
    }

    if (pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (!activationCode.trim()) {
      Alert.alert('Error', 'Please enter activation code');
      return;
    }

    setIsLoading(true);
    console.log('[MasterSignup] Starting master account creation...');

    try {
      console.log('[MasterSignup] Calling createMasterAccount with:', {
        name: name.trim(),
        masterId: masterId.trim(),
        activationCode: activationCode.trim().substring(0, 4) + '***'
      });

      const result = await createMasterAccount(
        name.trim(),
        masterId.trim(),
        pin.trim(),
        activationCode.trim()
      );

      console.log('[MasterSignup] Result received:', JSON.stringify(result));

      if (result.success) {
        console.log('[MasterSignup] ✅ SUCCESS - Navigating immediately');
        router.replace('/company-setup');
        console.log('[MasterSignup] ✅ Navigation command executed');
        return;
      }
      
      console.log('[MasterSignup] ❌ Failed:', result.error);
      setIsLoading(false);
      Alert.alert('Account Creation Failed', result.error || 'Failed to create account. Please check your activation code and try again.');
    } catch (error: any) {
      console.error('[MasterSignup] ❌ Exception:', error);
      console.error('[MasterSignup] ❌ Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 200)
      });
      setIsLoading(false);
      Alert.alert(
        'Error',
        error?.message || 'An unexpected error occurred. Please check your internet connection and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <ArrowLeft size={24} color={AppTheme.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Shield size={48} color={AppTheme.accent} strokeWidth={2} />
              </View>
              <Text style={styles.title}>Create Master Account</Text>
              <Text style={styles.subtitle}>
                Create your master account to manage multiple sites
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Master Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={AppTheme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Master User ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter master user ID"
                  placeholderTextColor={AppTheme.textSecondary}
                  value={masterId}
                  onChangeText={setMasterId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Text style={styles.hint}>
                  This ID will be used to sign in (e.g., 3002)
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>PIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 4-6 digit PIN"
                  placeholderTextColor={AppTheme.textSecondary}
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!isLoading}
                />
                <Text style={styles.hint}>
                  Choose a secure PIN for your account
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm PIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter PIN to confirm"
                  placeholderTextColor={AppTheme.textSecondary}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!isLoading}
                />
                <Text style={styles.hint}>
                  Enter the same PIN to confirm
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Activation Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter software activation code"
                  placeholderTextColor={AppTheme.textSecondary}
                  value={activationCode}
                  onChangeText={setActivationCode}
                  autoCapitalize="none"
                  secureTextEntry
                  editable={!isLoading}
                />
                <Text style={styles.hint}>
                  Contact support for your software activation code
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.createButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.buttonLoadingContainer}>
                    <ActivityIndicator color={AppTheme.background} size="small" />
                    <Text style={styles.buttonLoadingText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Create Master Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  gradient: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 40,
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
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: AppTheme.surface,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: AppTheme.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AppTheme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AppTheme.text,
    marginLeft: 4,
  },
  input: {
    backgroundColor: AppTheme.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AppTheme.text,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  hint: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginLeft: 4,
    marginTop: 4,
  },
  createButton: {
    backgroundColor: AppTheme.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonLoadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppTheme.background,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppTheme.background,
  },
});
