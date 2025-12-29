import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Key } from 'lucide-react-native';
import { validateActivationCode, createFreeAccountActivationCode } from '@/utils/activationCode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountType } from '@/types';
import { AppTheme } from '@/constants/colors';

const ACTIVATION_STORAGE_KEY = '@activation_data';
const ACCOUNT_TYPE_STORAGE_KEY = '@selected_account_type';

export default function ActivateScreen() {
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('enterprise');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    // Load the selected account type from storage
    const loadAccountType = async () => {
      try {
        const storedType = await AsyncStorage.getItem(ACCOUNT_TYPE_STORAGE_KEY);
        if (storedType === 'free' || storedType === 'enterprise') {
          setAccountType(storedType);
          
          // Auto-generate activation code for free accounts
          if (storedType === 'free') {
            console.log('[Activate] Free account detected, auto-generating activation code...');
            setIsGeneratingCode(true);
            const result = await createFreeAccountActivationCode();
            
            if (result.success && result.code) {
              console.log('[Activate] Auto-generated activation code:', result.code);
              setActivationCode(result.code);
            } else {
              console.error('[Activate] Failed to generate activation code:', result.error);
              Alert.alert(
                'Error',
                'Failed to generate activation code. Please try again.',
                [
                  {
                    text: 'Retry',
                    onPress: () => router.replace('/account-type-selection'),
                  }
                ]
              );
            }
            setIsGeneratingCode(false);
          }
        }
      } catch (error) {
        console.error('[Activate] Error loading account type:', error);
        setIsGeneratingCode(false);
      }
    };
    loadAccountType();
  }, []);

  const formatActivationCode = (text: string) => {
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const segments = cleaned.match(/.{1,4}/g) || [];
    return segments.join('-').substring(0, 19);
  };

  const handleActivate = async () => {
    const code = activationCode.trim();
    
    if (!code) {
      Alert.alert('Error', 'Please enter an activation code');
      return;
    }

    if (code.replace(/-/g, '').length < 16) {
      Alert.alert('Error', 'Please enter a complete activation code');
      return;
    }

    setIsLoading(true);

    try {
      const result = await validateActivationCode(code);

      if (!result.isValid) {
        Alert.alert('Invalid Code', result.error || 'This activation code is not valid');
        return;
      }

      await AsyncStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify({
        codeId: result.activationCode?.id,
        code: result.activationCode?.code,
        companyName: result.activationCode?.companyName,
        companyId: result.activationCode?.companyId,
        accountType: accountType, // Store the account type
        validatedAt: new Date().toISOString(),
      }));

      router.push('/setup-master-pin');
    } catch (error) {
      console.error('[Activate] Error:', error);
      Alert.alert('Error', 'Unable to validate activation code. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <ArrowLeft size={24} color={AppTheme.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Key size={48} color={AppTheme.accent} strokeWidth={2} />
              </View>
              <Text style={styles.title}>Activate Your Account</Text>
              <Text style={styles.subtitle}>
                {accountType === 'enterprise' 
                  ? 'Enter the activation code to set up your Enterprise account'
                  : 'Your Free account activation code has been generated'}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Activation Code</Text>
                {isGeneratingCode ? (
                  <View style={styles.generatingContainer}>
                    <ActivityIndicator color={AppTheme.accent} />
                    <Text style={styles.generatingText}>Generating activation code...</Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      testID="activate-code-input"
                      style={[styles.input, accountType === 'free' && styles.inputReadOnly]}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      placeholderTextColor={AppTheme.textSecondary}
                      value={activationCode}
                      onChangeText={(text) => setActivationCode(formatActivationCode(text))}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={19}
                      editable={!isLoading && accountType === 'enterprise'}
                    />
                    <Text style={styles.hint}>
                      {accountType === 'enterprise'
                        ? 'Enter the 16-character code provided by your administrator'
                        : 'Auto-generated activation code for your Free account'}
                    </Text>
                  </>
                )}
              </View>

              <TouchableOpacity
                testID="activate-button"
                style={[styles.button, (isLoading || isGeneratingCode) && styles.buttonDisabled]}
                onPress={handleActivate}
                disabled={isLoading || isGeneratingCode}
              >
                {isLoading ? (
                  <ActivityIndicator color={AppTheme.background} />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {accountType === 'enterprise' && (
                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>
                    Don&apos;t have an activation code?
                  </Text>
                  <Text style={styles.helpText}>
                    Contact your system administrator or support team.
                  </Text>
                </View>
              )}
            </View>
          </View>
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
  mainContainer: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
    marginBottom: 24,
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
    gap: 16,
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
    fontSize: 18,
    color: AppTheme.text,
    fontWeight: '600' as const,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  inputReadOnly: {
    backgroundColor: AppTheme.surface,
    color: AppTheme.textSecondary,
  },
  generatingContainer: {
    backgroundColor: AppTheme.cardBg,
    borderRadius: 12,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  generatingText: {
    fontSize: 16,
    color: AppTheme.text,
    fontWeight: '500' as const,
  },
  hint: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginLeft: 4,
    marginTop: 4,
  },
  button: {
    backgroundColor: AppTheme.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppTheme.background,
  },
  helpContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  helpText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    textAlign: 'center',
  },
});
