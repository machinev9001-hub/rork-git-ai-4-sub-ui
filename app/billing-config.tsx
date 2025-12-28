import { Stack } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Save, Clock, Calendar, CloudRain, Wrench, ChevronDown, ChevronUp } from 'lucide-react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { HeaderTitleWithSync } from '@/components/HeaderSyncStatus';

type BillingMethod = 'PER_HOUR' | 'MINIMUM_BILLING';

type DayTypeConfig = {
  enabled: boolean;
  billingMethod: BillingMethod;
  minHours?: number;
  rateMultiplier: number;
  customRate?: number;
};

type BillingConfig = {
  weekdays: DayTypeConfig;
  saturday: DayTypeConfig;
  sunday: DayTypeConfig;
  publicHolidays: DayTypeConfig;
  rainDays: {
    enabled: boolean;
    minHours: number;
    thresholdHours: number;
  };
  breakdown: {
    enabled: boolean;
  };
};

type ConfigSubTab = 'machine' | 'man';

export default function BillingConfigScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [config, setConfig] = useState<BillingConfig>({
    weekdays: {
      enabled: true,
      billingMethod: 'PER_HOUR',
      minHours: 0,
      rateMultiplier: 1.0,
    },
    saturday: {
      enabled: true,
      billingMethod: 'MINIMUM_BILLING',
      minHours: 8,
      rateMultiplier: 1.5,
    },
    sunday: {
      enabled: true,
      billingMethod: 'MINIMUM_BILLING',
      minHours: 8,
      rateMultiplier: 1.5,
    },
    publicHolidays: {
      enabled: true,
      billingMethod: 'MINIMUM_BILLING',
      minHours: 8,
      rateMultiplier: 2.0,
    },
    rainDays: {
      enabled: true,
      minHours: 4.5,
      thresholdHours: 1,
    },
    breakdown: {
      enabled: true,
    },
  });
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>('machine');
  const [globalBillingMethod, setGlobalBillingMethod] = useState<BillingMethod>('PER_HOUR');
  const [expandedDayCards, setExpandedDayCards] = useState<Set<string>>(new Set());

  const updateDayConfig = (
    dayType: keyof Omit<BillingConfig, 'rainDays'>,
    field: keyof DayTypeConfig,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [dayType]: {
        ...prev[dayType],
        [field]: value,
      },
    }));
  };

  const toggleDayCard = (dayType: string) => {
    setExpandedDayCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayType)) {
        newSet.delete(dayType);
      } else {
        newSet.add(dayType);
      }
      return newSet;
    });
  };

  const applyGlobalBillingMethod = (method: BillingMethod) => {
    setGlobalBillingMethod(method);
    setConfig(prev => ({
      ...prev,
      weekdays: { ...prev.weekdays, billingMethod: method },
      saturday: { ...prev.saturday, billingMethod: method },
      sunday: { ...prev.sunday, billingMethod: method },
      publicHolidays: { ...prev.publicHolidays, billingMethod: method },
    }));
  };

  const updateRainDayConfig = (field: keyof BillingConfig['rainDays'], value: any) => {
    setConfig(prev => ({
      ...prev,
      rainDays: {
        ...prev.rainDays,
        [field]: value,
      },
    }));
  };

  const loadBillingConfig = useCallback(async () => {
    if (!user?.masterAccountId) return;
    
    try {
      const configDoc = await getDoc(
        doc(db, 'masterAccounts', user.masterAccountId, 'billingConfig', 'default')
      );
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        const loadedConfig = data as BillingConfig;
        
        if (!loadedConfig.breakdown) {
          loadedConfig.breakdown = {
            enabled: true,
          };
        }
        
        setConfig(loadedConfig);
        console.log('Loaded billing config from Firestore');
      } else {
        console.log('No saved billing config found, using defaults');
      }
    } catch (error) {
      console.error('Error loading billing config:', error);
    }
  }, [user?.masterAccountId]);

  useEffect(() => {
    loadBillingConfig();
  }, [loadBillingConfig]);

  const handleSave = async () => {
    console.log('[BILLING] Save button pressed');
    console.log('[BILLING] User:', user);
    console.log('[BILLING] MasterAccountId:', user?.masterAccountId);
    console.log('[BILLING] Config to save:', config);
    
    if (!user?.masterAccountId) {
      console.error('[BILLING] ERROR: No master account ID found');
      alert('Error: No master account ID found. Please log in again.');
      return;
    }

    try {
      const docPath = `masterAccounts/${user.masterAccountId}/billingConfig/default`;
      console.log('[BILLING] Saving to path:', docPath);
      
      await setDoc(
        doc(db, 'masterAccounts', user.masterAccountId, 'billingConfig', 'default'),
        config
      );
      
      console.log('[BILLING] ✅ Billing config saved successfully');
      alert('Billing configuration saved successfully!');
    } catch (error) {
      console.error('[BILLING] ❌ Error saving billing config:', error);
      alert(`Failed to save billing configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderDayTypeCard = (
    title: string,
    dayType: keyof Omit<BillingConfig, 'rainDays'>,
    icon: string,
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    const dayConfig = config[dayType] as DayTypeConfig;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={24} color="#64748b" />
          ) : (
            <ChevronDown size={24} color="#64748b" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enabled</Text>
              <Switch
                value={dayConfig.enabled}
                onValueChange={(value) => updateDayConfig(dayType, 'enabled', value)}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={dayConfig.enabled ? '#ffffff' : '#f3f4f6'}
              />
            </View>

            {dayConfig.billingMethod === 'MINIMUM_BILLING' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Minimum Hours</Text>
                <TextInput
                  style={styles.input}
                  value={dayConfig.minHours?.toString() || '0'}
                  onChangeText={(text) =>
                    updateDayConfig(
                      dayType,
                      'minHours',
                      parseFloat(text) || 0
                    )
                  }
                  keyboardType="numeric"
                  placeholder="Enter minimum hours"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Rate Multiplier</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>×</Text>
                <TextInput
                  style={[styles.input, styles.inputWithIconField]}
                  value={dayConfig.rateMultiplier?.toString() || '1.0'}
                  onChangeText={(text) =>
                    updateDayConfig(
                      dayType,
                      'rateMultiplier',
                      parseFloat(text) || 1.0
                    )
                  }
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <Text style={styles.helperText}>
                {dayConfig.rateMultiplier === 1.0
                  ? 'Standard rate'
                  : dayConfig.rateMultiplier > 1.0
                  ? `${((dayConfig.rateMultiplier - 1) * 100).toFixed(0)}% premium`
                  : dayConfig.rateMultiplier === 0
                  ? 'No billing'
                  : `${((1 - dayConfig.rateMultiplier) * 100).toFixed(0)}% reduced`}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDayTypeCardMachine = (
    title: string,
    dayType: keyof Omit<BillingConfig, 'rainDays'>,
    icon: string,
    isExpanded: boolean,
    onToggle: () => void
  ) => {
    const dayConfig = config[dayType] as DayTypeConfig;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={24} color="#64748b" />
          ) : (
            <ChevronDown size={24} color="#64748b" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Hours</Text>
              <TextInput
                style={styles.input}
                value={dayConfig.minHours?.toString() || '0'}
                onChangeText={(text) =>
                  updateDayConfig(
                    dayType,
                    'minHours',
                    parseFloat(text) || 0
                  )
                }
                keyboardType="numeric"
                placeholder="Enter minimum hours"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderRainDayConfig = () => {
    const isExpanded = expandedDayCards.has('rainDays');
    
    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={() => toggleDayCard('rainDays')}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleRow}>
            <CloudRain size={24} color="#3b82f6" style={{ marginRight: 12 }} />
            <Text style={styles.cardTitle}>Rain Day Configuration</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={24} color="#64748b" />
          ) : (
            <ChevronDown size={24} color="#64748b" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enabled</Text>
              <Switch
                value={config.rainDays.enabled}
                onValueChange={(value) => updateRainDayConfig('enabled', value)}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={config.rainDays.enabled ? '#ffffff' : '#f3f4f6'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Billing Hours (Rain Day)</Text>
              <TextInput
                style={styles.input}
                value={config.rainDays.minHours.toString()}
                onChangeText={(text) => updateRainDayConfig('minHours', parseFloat(text) || 0)}
                keyboardType="decimal-pad"
                placeholder="4.5"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helperText}>
                Minimum hours paid if meter reading exceeds threshold
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Threshold Hours</Text>
              <TextInput
                style={styles.input}
                value={config.rainDays.thresholdHours.toString()}
                onChangeText={(text) => updateRainDayConfig('thresholdHours', parseFloat(text) || 0)}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helperText}>
                If meter reading exceeds this, minimum billing applies. If meter reading exceeds minimum hours, actual hours × rate is paid.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const updateBreakdownConfig = (field: keyof BillingConfig['breakdown'], value: any) => {
    setConfig(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [field]: value,
      },
    }));
  };

  const renderBreakdownConfig = () => {
    const isExpanded = expandedDayCards.has('breakdown');
    
    if (!config.breakdown) {
      console.error('[Breakdown Config] config.breakdown is undefined');
      return null;
    }
    
    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={() => toggleDayCard('breakdown')}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleRow}>
            <Wrench size={24} color="#3b82f6" style={{ marginRight: 12 }} />
            <Text style={styles.cardTitle}>Breakdown Configuration</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={24} color="#64748b" />
          ) : (
            <ChevronDown size={24} color="#64748b" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enabled</Text>
              <Switch
                value={config.breakdown.enabled}
                onValueChange={(value) => updateBreakdownConfig('enabled', value)}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={config.breakdown.enabled ? '#ffffff' : '#f3f4f6'}
              />
              <Text style={styles.helperText}>
                When ENABLED: Breakdown days are billed at actual hours (end time - start time).{"\n"}When DISABLED: Breakdown days are billed at R0 (no charge).
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderMachineHoursConfig = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.infoCard}>
        <Wrench size={24} color="#3b82f6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Billing Rules - Machine Hours</Text>
          <Text style={styles.infoText}>
            Configure minimum hours and billing rules for plant/machine hours. The billing method (Per Hour vs Minimum Billing) is set per asset during plant onboarding. Weekdays, weekends, and public holidays are automatically determined. Event-based conditions (rain days, breakdowns) are marked by operators in the timesheet.
          </Text>
        </View>
      </View>

      {renderDayTypeCardMachine('Weekdays (Monday - Friday)', 'weekdays', '📅', expandedDayCards.has('weekdays'), () => toggleDayCard('weekdays'))}
      {renderDayTypeCardMachine('Weekends (Saturday & Sunday)', 'saturday', '🏖️', expandedDayCards.has('saturday'), () => toggleDayCard('saturday'))}
      {renderRainDayConfig()}
      {renderBreakdownConfig()}
    </ScrollView>
  );

  const renderManHoursConfig = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.infoCard}>
        <Clock size={24} color="#3b82f6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Billing Rules - Man Hours</Text>
          <Text style={styles.infoText}>
            Configure billing methods and rates for different day types for operator man hours. Weekdays,
            weekends, and public holidays are automatically determined. Event-based
            conditions (rain days, strike days, breakdowns) are marked by operators in
            the timesheet.
          </Text>
        </View>
      </View>

      <View style={styles.globalBillingMethodCard}>
        <Text style={styles.globalBillingMethodTitle}>Billing Method</Text>
        <Text style={styles.globalBillingMethodSubtitle}>Select billing method for all day types</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              globalBillingMethod === 'PER_HOUR' && styles.methodButtonActive,
            ]}
            onPress={() => applyGlobalBillingMethod('PER_HOUR')}
          >
            <Clock
              size={18}
              color={
                globalBillingMethod === 'PER_HOUR' ? '#ffffff' : '#64748b'
              }
            />
            <Text
              style={[
                styles.methodButtonText,
                globalBillingMethod === 'PER_HOUR' &&
                  styles.methodButtonTextActive,
              ]}
            >
              Per Hour
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              globalBillingMethod === 'MINIMUM_BILLING' &&
                styles.methodButtonActive,
            ]}
            onPress={() => applyGlobalBillingMethod('MINIMUM_BILLING')}
          >
            <Calendar
              size={18}
              color={
                globalBillingMethod === 'MINIMUM_BILLING'
                  ? '#ffffff'
                  : '#64748b'
              }
            />
            <Text
              style={[
                styles.methodButtonText,
                globalBillingMethod === 'MINIMUM_BILLING' &&
                  styles.methodButtonTextActive,
              ]}
            >
              Minimum Billing
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderDayTypeCard('Weekdays', 'weekdays', '📅', expandedDayCards.has('weekdays'), () => toggleDayCard('weekdays'))}
      {renderDayTypeCard('Saturday', 'saturday', '🏖️', expandedDayCards.has('saturday'), () => toggleDayCard('saturday'))}
      {renderDayTypeCard('Sunday', 'sunday', '☀️', expandedDayCards.has('sunday'), () => toggleDayCard('sunday'))}
      {renderDayTypeCard('Public Holidays', 'publicHolidays', '🎉', expandedDayCards.has('publicHolidays'), () => toggleDayCard('publicHolidays'))}
      {renderRainDayConfig()}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitleWithSync title="Billing Management" />,
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
          headerRight: () => (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.configMainContainer}>
        <View style={styles.configSubTabBar}>
          <TouchableOpacity
            style={[styles.configSubTab, configSubTab === 'machine' && styles.configSubTabActive]}
            onPress={() => setConfigSubTab('machine')}
          >
            <Wrench size={18} color={configSubTab === 'machine' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.configSubTabText, configSubTab === 'machine' && styles.configSubTabTextActive]}>
              Machine Hours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.configSubTab, configSubTab === 'man' && styles.configSubTabActive]}
            onPress={() => setConfigSubTab('man')}
          >
            <Clock size={18} color={configSubTab === 'man' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.configSubTabText, configSubTab === 'man' && styles.configSubTabTextActive]}>
              Man Hours
            </Text>
          </TouchableOpacity>
        </View>
        {configSubTab === 'machine' ? renderMachineHoursConfig() : renderManHoursConfig()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e3a8a',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  cardContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputWithIcon: {
    position: 'relative' as const,
  },
  inputIcon: {
    position: 'absolute' as const,
    left: 12,
    top: 14,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
    zIndex: 1,
  },
  inputWithIconField: {
    paddingLeft: 32,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  configMainContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  configSubTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  configSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  configSubTabActive: {
    borderBottomColor: '#1e3a8a',
  },
  configSubTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  configSubTabTextActive: {
    color: '#1e3a8a',
  },
  globalBillingMethodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  globalBillingMethodTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  globalBillingMethodSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
});
