import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  CloudRain,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

type ExpandKey =
  | 'weekdays'
  | 'saturday'
  | 'sunday'
  | 'publicHolidays'
  | 'rainDays'
  | 'breakdown';

export default function BillingConfigurationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>('machine');
  const [globalBillingMethod, setGlobalBillingMethod] = useState<BillingMethod>('PER_HOUR');
  const [expanded, setExpanded] = useState<Set<ExpandKey>>(() => new Set<ExpandKey>(['weekdays', 'saturday']));

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

  const updateDayConfig = useCallback(
    (dayType: keyof Omit<BillingConfig, 'rainDays' | 'breakdown'>, field: keyof DayTypeConfig, value: unknown) => {
      setConfig((prev) => ({
        ...prev,
        [dayType]: {
          ...prev[dayType],
          [field]: value as never,
        },
      }));
    },
    [],
  );

  const updateRainDayConfig = useCallback(
    (field: keyof BillingConfig['rainDays'], value: number | boolean) => {
      setConfig((prev) => ({
        ...prev,
        rainDays: {
          ...prev.rainDays,
          [field]: value as never,
        },
      }));
    },
    [],
  );

  const updateBreakdownConfig = useCallback((field: keyof BillingConfig['breakdown'], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [field]: value,
      },
    }));
  }, []);

  const toggleExpanded = useCallback((key: ExpandKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const applyGlobalBillingMethod = useCallback((method: BillingMethod) => {
    setGlobalBillingMethod(method);
    setConfig((prev) => ({
      ...prev,
      weekdays: { ...prev.weekdays, billingMethod: method },
      saturday: { ...prev.saturday, billingMethod: method },
      sunday: { ...prev.sunday, billingMethod: method },
      publicHolidays: { ...prev.publicHolidays, billingMethod: method },
    }));
  }, []);

  const loadBillingConfig = useCallback(async () => {
    if (!user?.masterAccountId) {
      console.log('[BillingConfiguration] Skipping load: missing masterAccountId');
      return;
    }

    try {
      const configDoc = await getDoc(doc(db, 'masterAccounts', user.masterAccountId, 'billingConfig', 'default'));
      if (!configDoc.exists()) {
        console.log('[BillingConfiguration] No saved billing config found, using defaults');
        return;
      }

      const data = configDoc.data() as Partial<BillingConfig>;

      const loaded: BillingConfig = {
        weekdays: {
          enabled: data.weekdays?.enabled ?? true,
          billingMethod: data.weekdays?.billingMethod ?? 'PER_HOUR',
          minHours: data.weekdays?.minHours ?? 0,
          rateMultiplier: data.weekdays?.rateMultiplier ?? 1.0,
          customRate: data.weekdays?.customRate,
        },
        saturday: {
          enabled: data.saturday?.enabled ?? true,
          billingMethod: data.saturday?.billingMethod ?? 'MINIMUM_BILLING',
          minHours: data.saturday?.minHours ?? 8,
          rateMultiplier: data.saturday?.rateMultiplier ?? 1.5,
          customRate: data.saturday?.customRate,
        },
        sunday: {
          enabled: data.sunday?.enabled ?? true,
          billingMethod: data.sunday?.billingMethod ?? 'MINIMUM_BILLING',
          minHours: data.sunday?.minHours ?? 8,
          rateMultiplier: data.sunday?.rateMultiplier ?? 1.5,
          customRate: data.sunday?.customRate,
        },
        publicHolidays: {
          enabled: data.publicHolidays?.enabled ?? true,
          billingMethod: data.publicHolidays?.billingMethod ?? 'MINIMUM_BILLING',
          minHours: data.publicHolidays?.minHours ?? 8,
          rateMultiplier: data.publicHolidays?.rateMultiplier ?? 2.0,
          customRate: data.publicHolidays?.customRate,
        },
        rainDays: {
          enabled: data.rainDays?.enabled ?? true,
          minHours: data.rainDays?.minHours ?? 4.5,
          thresholdHours: data.rainDays?.thresholdHours ?? 1,
        },
        breakdown: {
          enabled: data.breakdown?.enabled ?? true,
        },
      };

      setConfig(loaded);
      setGlobalBillingMethod(loaded.weekdays.billingMethod);
      console.log('[BillingConfiguration] Loaded billing config from Firestore');
    } catch (error) {
      console.error('[BillingConfiguration] Error loading billing config:', error);
      Alert.alert('Error', 'Failed to load billing configuration');
    }
  }, [user?.masterAccountId]);

  useEffect(() => {
    loadBillingConfig();
  }, [loadBillingConfig]);

  const handleSave = useCallback(async () => {
    console.log('[BillingConfiguration] Save pressed');
    console.log('[BillingConfiguration] User:', user);

    if (!user?.masterAccountId) {
      Alert.alert('Error', 'No master account ID found. Please log in again.');
      return;
    }

    try {
      const docPath = `masterAccounts/${user.masterAccountId}/billingConfig/default`;
      console.log('[BillingConfiguration] Saving to:', docPath);
      await setDoc(doc(db, 'masterAccounts', user.masterAccountId, 'billingConfig', 'default'), config);
      Alert.alert('Saved', 'Billing configuration saved successfully');
    } catch (error) {
      console.error('[BillingConfiguration] Error saving billing config:', error);
      Alert.alert('Error', `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [config, user]);

  const machineSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Weekdays min: ${config.weekdays.minHours ?? 0}h`);
    parts.push(`Sat min: ${config.saturday.minHours ?? 0}h`);
    parts.push(`Rain day min: ${config.rainDays.minHours}h`);
    parts.push(`Breakdown: ${config.breakdown.enabled ? 'bill actual' : 'R0'}`);
    return parts.join(' • ');
  }, [config]);

  const renderExpandableCard = (
    key: ExpandKey,
    title: string,
    left: React.ReactNode,
    content: React.ReactNode,
  ) => {
    const isExpanded = expanded.has(key);

    return (
      <View style={styles.card} key={key} testID={`cfg-card-${key}`}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpanded(key)}
          activeOpacity={0.75}
          testID={`cfg-card-${key}-toggle`}
        >
          <View style={styles.cardTitleRow}>
            {left}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {isExpanded ? <ChevronUp size={22} color="#64748b" /> : <ChevronDown size={22} color="#64748b" />}
        </TouchableOpacity>

        {isExpanded ? <View style={styles.cardContent}>{content}</View> : null}
      </View>
    );
  };

  const renderDayType = (key: ExpandKey, title: string, day: keyof Omit<BillingConfig, 'rainDays' | 'breakdown'>) => {
    const dayConfig = config[day];

    return renderExpandableCard(
      key,
      title,
      <Calendar size={20} color="#0ea5e9" style={{ marginRight: 12 }} />,
      <>
        <View style={styles.formRow}>
          <Text style={styles.label}>Enabled</Text>
          <Switch
            value={dayConfig.enabled}
            onValueChange={(v) => updateDayConfig(day, 'enabled', v)}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
            thumbColor={dayConfig.enabled ? '#ffffff' : '#f3f4f6'}
            testID={`cfg-${String(day)}-enabled`}
          />
        </View>

        {dayConfig.billingMethod === 'MINIMUM_BILLING' ? (
          <View style={styles.formBlock}>
            <Text style={styles.label}>Minimum Hours</Text>
            <TextInput
              style={styles.input}
              value={String(dayConfig.minHours ?? 0)}
              onChangeText={(t) => updateDayConfig(day, 'minHours', parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              testID={`cfg-${String(day)}-minHours`}
            />
          </View>
        ) : null}

        <View style={styles.formBlock}>
          <Text style={styles.label}>Rate Multiplier</Text>
          <View style={styles.inputWithPrefix}>
            <Text style={styles.prefix}>×</Text>
            <TextInput
              style={[styles.input, styles.inputWithPrefixField]}
              value={String(dayConfig.rateMultiplier ?? 1)}
              onChangeText={(t) => updateDayConfig(day, 'rateMultiplier', parseFloat(t) || 1)}
              keyboardType="decimal-pad"
              placeholder="1.0"
              placeholderTextColor="#94a3b8"
              testID={`cfg-${String(day)}-multiplier`}
            />
          </View>
          <Text style={styles.helperText}>Used for estimating cost and billing.</Text>
        </View>
      </>,
    );
  };

  const renderRainDay = () =>
    renderExpandableCard(
      'rainDays',
      'Rain Day Configuration',
      <CloudRain size={20} color="#0ea5e9" style={{ marginRight: 12 }} />,
      <>
        <View style={styles.formRow}>
          <Text style={styles.label}>Enabled</Text>
          <Switch
            value={config.rainDays.enabled}
            onValueChange={(v) => updateRainDayConfig('enabled', v)}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
            thumbColor={config.rainDays.enabled ? '#ffffff' : '#f3f4f6'}
            testID="cfg-rain-enabled"
          />
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.label}>Minimum Billing Hours</Text>
          <TextInput
            style={styles.input}
            value={String(config.rainDays.minHours)}
            onChangeText={(t) => updateRainDayConfig('minHours', parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            placeholder="4.5"
            placeholderTextColor="#94a3b8"
            testID="cfg-rain-minHours"
          />
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.label}>Threshold Hours</Text>
          <TextInput
            style={styles.input}
            value={String(config.rainDays.thresholdHours)}
            onChangeText={(t) => updateRainDayConfig('thresholdHours', parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor="#94a3b8"
            testID="cfg-rain-threshold"
          />
          <Text style={styles.helperText}>If meter reading exceeds this, minimum billing applies.</Text>
        </View>
      </>,
    );

  const renderBreakdown = () =>
    renderExpandableCard(
      'breakdown',
      'Breakdown Configuration',
      <Wrench size={20} color="#0ea5e9" style={{ marginRight: 12 }} />,
      <>
        <View style={styles.formRow}>
          <Text style={styles.label}>Enabled</Text>
          <Switch
            value={config.breakdown.enabled}
            onValueChange={(v) => updateBreakdownConfig('enabled', v)}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
            thumbColor={config.breakdown.enabled ? '#ffffff' : '#f3f4f6'}
            testID="cfg-breakdown-enabled"
          />
        </View>
        <Text style={styles.helperText}>
          When enabled: breakdown days are billed at actual hours. When disabled: breakdown days are billed at R0.
        </Text>
      </>,
    );

  const renderMachine = () => (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      testID="billing-config-scroll"
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Wrench size={22} color="#0ea5e9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Machine Hours</Text>
          <Text style={styles.heroSubtitle}>{machineSummary}</Text>
        </View>
      </View>

      {renderDayType('weekdays', 'Weekdays (Mon–Fri)', 'weekdays')}
      {renderDayType('saturday', 'Saturday', 'saturday')}
      {renderRainDay()}
      {renderBreakdown()}
    </ScrollView>
  );

  const renderMan = () => (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      testID="man-config-scroll"
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Clock size={22} color="#0ea5e9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Man Hours</Text>
          <Text style={styles.heroSubtitle}>Configure billing rules per day type (employee hours).</Text>
        </View>
      </View>

      <View style={styles.methodCard} testID="cfg-billing-method-card">
        <Text style={styles.methodTitle}>Billing Method</Text>
        <Text style={styles.methodSubtitle}>Apply to all day types</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodButton, globalBillingMethod === 'PER_HOUR' && styles.methodButtonActive]}
            onPress={() => applyGlobalBillingMethod('PER_HOUR')}
            activeOpacity={0.8}
            testID="cfg-method-per-hour"
          >
            <Clock size={16} color={globalBillingMethod === 'PER_HOUR' ? '#ffffff' : '#64748b'} />
            <Text style={[styles.methodButtonText, globalBillingMethod === 'PER_HOUR' && styles.methodButtonTextActive]}>
              Per Hour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, globalBillingMethod === 'MINIMUM_BILLING' && styles.methodButtonActive]}
            onPress={() => applyGlobalBillingMethod('MINIMUM_BILLING')}
            activeOpacity={0.8}
            testID="cfg-method-min-billing"
          >
            <Calendar size={16} color={globalBillingMethod === 'MINIMUM_BILLING' ? '#ffffff' : '#64748b'} />
            <Text
              style={[
                styles.methodButtonText,
                globalBillingMethod === 'MINIMUM_BILLING' && styles.methodButtonTextActive,
              ]}
            >
              Minimum Billing
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderDayType('weekdays', 'Weekdays', 'weekdays')}
      {renderDayType('saturday', 'Saturday', 'saturday')}
      {renderDayType('sunday', 'Sunday', 'sunday')}
      {renderDayType('publicHolidays', 'Public Holidays', 'publicHolidays')}
      {renderRainDay()}
    </ScrollView>
  );

  return (
    <View style={styles.container} testID="billing-configuration-screen">
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitleWithSync title="Configuration" />,
          headerStyle: { backgroundColor: '#0b1220' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' as const },
          headerRight: () => (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} testID="cfg-save">
              <Save size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.subTabBar} testID="cfg-subtab-bar">
        <TouchableOpacity
          style={[styles.subTab, configSubTab === 'machine' && styles.subTabActive]}
          onPress={() => setConfigSubTab('machine')}
          activeOpacity={0.8}
          testID="cfg-subtab-machine"
        >
          <Wrench size={18} color={configSubTab === 'machine' ? '#0b1220' : '#64748b'} />
          <Text style={[styles.subTabText, configSubTab === 'machine' && styles.subTabTextActive]}>
            Machine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, configSubTab === 'man' && styles.subTabActive]}
          onPress={() => setConfigSubTab('man')}
          activeOpacity={0.8}
          testID="cfg-subtab-man"
        >
          <Clock size={18} color={configSubTab === 'man' ? '#0b1220' : '#64748b'} />
          <Text style={[styles.subTabText, configSubTab === 'man' && styles.subTabTextActive]}>
            Man
          </Text>
        </TouchableOpacity>
      </View>

      {configSubTab === 'machine' ? renderMachine() : renderMan()}

      {Platform.OS === 'web' ? <View style={{ height: 8 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,165,233,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700' as const,
    fontSize: 13,
  },
  subTabBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#0b1220',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  subTabActive: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.8)',
  },
  subTabText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  subTabTextActive: {
    color: '#0b1220',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(14,165,233,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800' as const,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formBlock: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    color: '#ffffff',
    fontSize: 15,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    position: 'absolute',
    left: 12,
    color: '#94a3b8',
    fontWeight: '800' as const,
    zIndex: 1,
  },
  inputWithPrefixField: {
    paddingLeft: 30,
    flex: 1,
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  methodCard: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    padding: 14,
    gap: 10,
  },
  methodTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800' as const,
  },
  methodSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  methodButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: 'rgba(56,189,248,0.65)',
  },
  methodButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800' as const,
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
});
