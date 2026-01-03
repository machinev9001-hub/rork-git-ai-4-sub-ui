import { Stack, router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus, ScanLine } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { isManagementRole, isOperatorRole, isDieselClerkRole } from '@/utils/roles';

export default function LoginScreen() {
  console.log('[Login] LoginScreen component rendering');
  const { loginWithId, isOffline } = useAuth();
  console.log('[Login] Auth hook loaded, isOffline:', isOffline);
  
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      console.log('[Login] Screen focused, isLoading:', isLoading);
      if (!isLoading) {
        console.log('[Login] Clearing form state');
        setUserId('');
        setPin('');
        setVerifyPin('');
        setIsFirstTime(false);
      } else {
        console.log('[Login] Keeping form state during loading');
      }
    }, [isLoading])
  );



  const handleLogin = async () => {
    console.log('[Login] ==========================================');
    console.log('[Login] handleLogin called at:', new Date().toISOString());
    console.log('[Login] Form state:');
    console.log('[Login]   userId raw:', userId);
    console.log('[Login]   pin raw:', pin);
    console.log('[Login]   isFirstTime:', isFirstTime);
    console.log('[Login] ==========================================');
    
    const userIdToUse = userId.trim();
    const pinToUse = pin.trim();
    
    if (!userIdToUse) {
      Alert.alert('Error', 'Please enter your ID number');
      return;
    }

    if (!pinToUse && !isFirstTime) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    if (isFirstTime) {
      if (!pin.trim() || !verifyPin.trim()) {
        Alert.alert('Error', 'Please enter and verify your PIN');
        return;
      }
      if (pin !== verifyPin) {
        Alert.alert('Error', 'PINs do not match');
        return;
      }
    }

    setIsLoading(true);
    console.log('[Login] isLoading set to true');
    
    let loginSuccess = false;

    try {
      const result = await loginWithId(userIdToUse, pinToUse || undefined, isFirstTime);

      if (result.success && result.user) {
        console.log('[Login] Login success! User:', result.user.userId, 'Role:', result.user.role);
        console.log('[Login] Using result.user for routing decision');
        loginSuccess = true;
        
        const isManagement = isManagementRole(result.user.role);
        const isOperator = isOperatorRole(result.user.role);
        const isDieselClerk = isDieselClerkRole(result.user.role);
        const destination = isManagement ? '/(tabs)' : isOperator ? '/operator-home' : isDieselClerk ? '/diesel-clerk-home' : '/employee-timesheet';
        console.log('[Login] Scheduled navigation to:', destination, '(based on role:', result.user.role, ')');
        
        setTimeout(() => {
          console.log('[Login] Executing delayed navigation to:', destination);
          router.replace(destination as any);
        }, 100);
        return
      } else if (result.isFirstTime) {
        console.log('[Login] First time user detected - showing PIN setup');
        setIsFirstTime(true);
        setPin('');
        setVerifyPin('');
        Alert.alert(
          'Welcome!',
          'Please create a PIN to secure your account. You will use this PIN to login in the future.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('[Login] Login failed:', result.error);
        setPin('');
        setVerifyPin('');
        if (result.error && result.error.includes('Incorrect PIN')) {
          Alert.alert('Login Failed', result.error);
        } else if (result.error && !result.error.includes('PIN')) {
          Alert.alert('Login Failed', result.error);
        }
      }
    } catch (error) {
      console.error('[Login] ==========================================');
      console.error('[Login] UNEXPECTED ERROR in handleLogin:');
      console.error('[Login] Error type:', typeof error);
      console.error('[Login] Error:', error);
      console.error('[Login] Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('[Login] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('[Login] ==========================================');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      if (!loginSuccess) {
        console.log('[Login] Login failed, setting isLoading to false');
        setIsLoading(false);
      } else {
        console.log('[Login] Login successful, keeping loading state during navigation');
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <TouchableOpacity
              testID="login-logo-button"
              activeOpacity={0.7}
              onLongPress={() => {
                console.log('[Login] Logo long pressed!');
                console.log('[Login] Navigating to admin-pin-verify');
                try {
                  router.push('/admin-pin-verify');
                  console.log('[Login] Navigation command sent');
                } catch (error) {
                  console.error('[Login] Navigation error:', error);
                  Alert.alert('Error', 'Failed to open admin panel');
                }
              }}
              delayLongPress={2000}
              style={styles.logoPlaceholder}
            >
              <Image
                source={{ uri: 'https://rork.app/pa/a6nricbie4k46krkbi3f1/mounktczoga5o2xw99z4g' }}
                style={styles.logoImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
            <Text style={styles.appTitle}>Machine</Text>
            <Text style={styles.appSubtitle}>business management, Asset, Resource & Workforce Control</Text>
            <View style={styles.accentBar} />
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineText}>● Offline Mode</Text>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ID Number</Text>
              <TextInput
                testID="login-user-id-input"
                style={styles.input}
                placeholder="Enter your National ID number"
                placeholderTextColor={Colors.textSecondary}
                value={userId}
                onChangeText={(text) => {
                  console.log('[Login] ID input changed:', text);
                  setUserId(text);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Text style={styles.hint}>
                Enter your National ID number
              </Text>
            </View>

            {isFirstTime ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Create PIN</Text>
                  <TextInput
                    testID="login-create-pin-input"
                    style={styles.input}
                    placeholder="Enter a 4-6 digit PIN"
                    placeholderTextColor={Colors.textSecondary}
                    value={pin}
                    onChangeText={setPin}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Verify PIN</Text>
                  <TextInput
                    testID="login-verify-pin-input"
                    style={styles.input}
                    placeholder="Re-enter your PIN"
                    placeholderTextColor={Colors.textSecondary}
                    value={verifyPin}
                    onChangeText={setVerifyPin}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>
              </>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>PIN</Text>
                <TextInput
                  ref={pinInputRef}
                  testID="login-pin-input"
                  style={styles.input}
                  placeholder="Enter your PIN"
                  placeholderTextColor={Colors.textSecondary}
                  value={pin}
                  onChangeText={(text) => {
                    console.log('[Login] PIN input changed:', text.length, 'chars');
                    setPin(text);
                  }}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                testID="login-sign-in-button"
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  console.log('[Login] Sign In button pressed');
                  handleLogin();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <>
                    <LogIn size={20} color={Colors.background} />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                testID="login-qr-scan-button"
                style={[styles.button, styles.qrButton, isLoading && styles.buttonDisabled]}
                onPress={() => router.push({ pathname: '/qr-scanner', params: { context: 'login' } })}
                disabled={isLoading}
              >
                <ScanLine size={20} color={Colors.accent} />
                <Text style={styles.qrButtonText}>Scan QR</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              testID="login-activate-button"
              style={styles.activateButton}
              onPress={() => router.push('/account-type-selection')}
              disabled={isLoading}
            >
              <UserPlus size={18} color={Colors.background} />
              <Text style={styles.activateButtonText}>Create New Account</Text>
            </TouchableOpacity>
            
            <Text style={styles.version}>Machine App V1.0.0</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logoPlaceholder: {
    marginBottom: 16,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
  },
  accentBar: {
    width: 60,
    height: 4,
    backgroundColor: Colors.accent,
    marginTop: 12,
    borderRadius: 2,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  offlineBadge: {
    marginTop: 12,
    backgroundColor: Colors.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warningText,
  },
  offlineText: {
    color: Colors.warningText,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  form: {
    gap: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
  },
  qrButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 10,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
    width: '100%',
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  version: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
});
