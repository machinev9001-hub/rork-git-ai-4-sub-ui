import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronDown, ChevronUp, CloudRain, Save, Wrench } from 'lucide-react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

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

type ConfigTab = 'machine' | 'man';

const DEFAULT_CONFIG: BillingConfig = {
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
};

export default function DumbassScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ConfigTab>('machine');
  const [config, setConfig] = useState<BillingConfig>(DEFAULT_CONFIG);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set(['weekdays', 'saturday']));
  const [globalBillingMethod, setGlobalBillingMethod] = useState<BillingMethod>('PER_HOUR');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const docRef = useMemo(() => {
    const masterAccountId = user?.masterAccountId;
    if (!masterAccountId) return null;
    return doc(db, 'masterAccounts', masterAccountId, 'billingConfig', 'default');
  }, [user?.masterAccountId]);

  const toggleCard = useCallback((key: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const updateDayConfig = useCallback(
    (dayType: keyof Omit<BillingConfig, 'rainDays' | 'breakdown'>, field: keyof DayTypeConfig, value: DayTypeConfig[keyof DayTypeConfig]) => {
      setConfig((prev) => ({
        ...prev,
        [dayType]: {
          ...prev[dayType],
          [field]: value,
        },
      }));
    },
    []
  );

  const updateRainDayConfig = useCallback(
    (field: keyof BillingConfig['rainDays'], value: BillingConfig['rainDays'][keyof BillingConfig['rainDays']]) => {
      setConfig((prev) => ({
        ...prev,
        rainDays: {
          ...prev.rainDays,
          [field]: value,
        },
      }));
    },
    []
  );

  const updateBreakdownConfig = useCallback(
    (field: keyof BillingConfig['breakdown'], value: BillingConfig['breakdown'][keyof BillingConfig['breakdown']]) => {
      setConfig((prev) => ({
        ...prev,
        breakdown: {
          ...prev.breakdown,
          [field]: value,
        },
      }));
    },
    []
  );

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
    if (!docRef) {
      console.log('[DumbassConfig] No docRef (missing masterAccountId)');
      return;
    }

    setLoading(true);
    try {
      console.log('[DumbassConfig] Loading billing config from Firestore...');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<BillingConfig>;
        const loaded: BillingConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          weekdays: { ...DEFAULT_CONFIG.weekdays, ...(data.weekdays ?? {}) },
          saturday: { ...DEFAULT_CONFIG.saturday, ...(data.saturday ?? {}) },
          sunday: { ...DEFAULT_CONFIG.sunday, ...(data.sunday ?? {}) },
          publicHolidays: { ...DEFAULT_CONFIG.publicHolidays, ...(data.publicHolidays ?? {}) },
          rainDays: { ...DEFAULT_CONFIG.rainDays, ...(data.rainDays ?? {}) },
          breakdown: { ...DEFAULT_CONFIG.breakdown, ...(data.breakdown ?? {}) },
        };

        setConfig(loaded);
        setGlobalBillingMethod(loaded.weekdays.billingMethod);
        console.log('[DumbassConfig] Loaded billing config');
      } else {
        console.log('[DumbassConfig] No saved billing config found - using defaults');
        setConfig(DEFAULT_CONFIG);
        setGlobalBillingMethod(DEFAULT_CONFIG.weekdays.billingMethod);
      }
    } catch (e) {
      console.error('[DumbassConfig] Failed to load billing config:', e);
      Alert.alert('Error', 'Failed to load billing config');
    } finally {
      setLoading(false);
    }
  }, [docRef]);

  useEffect(() => {
    loadBillingConfig();
  }, [loadBillingConfig]);

  const handleSave = useCallback(async () => {
    if (!docRef) {
      Alert.alert('Error', 'Missing master account. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      console.log('[DumbassConfig] Saving billing config...');
      await setDoc(docRef, config);
      console.log('[DumbassConfig] ✅ Saved billing config');
      Alert.alert('Saved', 'Billing configuration saved successfully');
    } catch (e) {
      console.error('[DumbassConfig] ❌ Failed to save billing config:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [config, docRef]);

  const renderDayTypeCard = useCallback(
    (args: {
      title: string;
      dayType: keyof Omit<BillingConfig, 'rainDays' | 'breakdown'>;
      icon: string;
      compact?: boolean;
    }) => {
      const { title, dayType, icon, compact } = args;
      const dayConfig = config[dayType];
      const isExpanded = expandedCards.has(dayType);

      return (
        <View style={styles.card} testID={`dumbass-config-card-${dayType}`}> 
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleCard(dayType)}
            activeOpacity={0.8}
            testID={`dumbass-config-card-${dayType}-toggle`}
          >
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={22} color="rgba(255,255,255,0.65)" />
            ) : (
              <ChevronDown size={22} color="rgba(255,255,255,0.65)" />
            )}
          </TouchableOpacity>

          {isExpanded ? (
            <View style={styles.cardContent}>
              {compact ? (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Minimum Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={String(dayConfig.minHours ?? 0)}
                    onChangeText={(t) => updateDayConfig(dayType, 'minHours', Number.parseFloat(t) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    testID={`dumbass-config-${dayType}-minHours`}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Enabled</Text>
                    <TouchableOpacity
                      style={[styles.pill, dayConfig.enabled ? styles.pillOn : styles.pillOff]}
                      onPress={() => updateDayConfig(dayType, 'enabled', !dayConfig.enabled)}
                      testID={`dumbass-config-${dayType}-enabled`}
                    >
                      <Text style={styles.pillText}>{dayConfig.enabled ? 'On' : 'Off'}</Text>
                    </TouchableOpacity>
                  </View>

                  {dayConfig.billingMethod === 'MINIMUM_BILLING' ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Minimum Hours</Text>
                      <TextInput
                        style={styles.input}
                        value={String(dayConfig.minHours ?? 0)}
                        onChangeText={(t) => updateDayConfig(dayType, 'minHours', Number.parseFloat(t) || 0)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        testID={`dumbass-config-${dayType}-minHours`}
                      />
                    </View>
                  ) : null}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Rate Multiplier</Text>
                    <TextInput
                      style={styles.input}
                      value={String(dayConfig.rateMultiplier ?? 1)}
                      onChangeText={(t) => updateDayConfig(dayType, 'rateMultiplier', Number.parseFloat(t) || 1)}
                      keyboardType="decimal-pad"
                      placeholder="1.0"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      testID={`dumbass-config-${dayType}-rateMultiplier`}
                    />
                    <Text style={styles.helperText}>
                      {dayConfig.rateMultiplier === 1
                        ? 'Standard rate'
                        : dayConfig.rateMultiplier > 1
                          ? `${Math.round((dayConfig.rateMultiplier - 1) * 100)}% premium`
                          : dayConfig.rateMultiplier === 0
                            ? 'No billing'
                            : `${Math.round((1 - dayConfig.rateMultiplier) * 100)}% reduced`}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : null}
        </View>
      );
    },
    [config, expandedCards, toggleCard, updateDayConfig]
  );

  const renderRainDayConfig = useCallback(() => {
    const isExpanded = expandedCards.has('rainDays');

    return (
      <View style={styles.card} testID="dumbass-config-card-rainDays">
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleCard('rainDays')}
          activeOpacity={0.8}
          testID="dumbass-config-card-rainDays-toggle"
        >
          <View style={styles.cardTitleRow}>
            <CloudRain size={20} color="#60a5fa" style={{ marginRight: 10 }} />
            <Text style={styles.cardTitle}>Rain Day Configuration</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={22} color="rgba(255,255,255,0.65)" />
          ) : (
            <ChevronDown size={22} color="rgba(255,255,255,0.65)" />
          )}
        </TouchableOpacity>

        {isExpanded ? (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enabled</Text>
              <TouchableOpacity
                style={[styles.pill, config.rainDays.enabled ? styles.pillOn : styles.pillOff]}
                onPress={() => updateRainDayConfig('enabled', !config.rainDays.enabled)}
                testID="dumbass-config-rainDays-enabled"
              >
                <Text style={styles.pillText}>{config.rainDays.enabled ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Billing Hours (Rain Day)</Text>
              <TextInput
                style={styles.input}
                value={String(config.rainDays.minHours)}
                onChangeText={(t) => updateRainDayConfig('minHours', Number.parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                placeholder="4.5"
                placeholderTextColor="rgba(255,255,255,0.35)"
                testID="dumbass-config-rainDays-minHours"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Threshold Hours</Text>
              <TextInput
                style={styles.input}
                value={String(config.rainDays.thresholdHours)}
                onChangeText={(t) => updateRainDayConfig('thresholdHours', Number.parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor="rgba(255,255,255,0.35)"
                testID="dumbass-config-rainDays-thresholdHours"
              />
              <Text style={styles.helperText}>
                If meter reading exceeds this, minimum billing applies.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }, [config.rainDays, expandedCards, toggleCard, updateRainDayConfig]);

  const renderBreakdownConfig = useCallback(() => {
    const isExpanded = expandedCards.has('breakdown');

    return (
      <View style={styles.card} testID="dumbass-config-card-breakdown">
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleCard('breakdown')}
          activeOpacity={0.8}
          testID="dumbass-config-card-breakdown-toggle"
        >
          <View style={styles.cardTitleRow}>
            <Wrench size={20} color="#60a5fa" style={{ marginRight: 10 }} />
            <Text style={styles.cardTitle}>Breakdown Configuration</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={22} color="rgba(255,255,255,0.65)" />
          ) : (
            <ChevronDown size={22} color="rgba(255,255,255,0.65)" />
          )}
        </TouchableOpacity>

        {isExpanded ? (
          <View style={styles.cardContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Enabled</Text>
              <TouchableOpacity
                style={[styles.pill, config.breakdown.enabled ? styles.pillOn : styles.pillOff]}
                onPress={() => updateBreakdownConfig('enabled', !config.breakdown.enabled)}
                testID="dumbass-config-breakdown-enabled"
              >
                <Text style={styles.pillText}>{config.breakdown.enabled ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                When disabled, breakdown days bill at R0.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }, [config.breakdown.enabled, expandedCards, toggleCard, updateBreakdownConfig]);

  return (
    <View style={styles.container} testID="dumbass-config-screen">
      <Stack.Screen
        options={{
          title: 'Dumbass',
          headerStyle: { backgroundColor: '#0b1220' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.topBar} testID="dumbass-config-topbar">
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'machine' && styles.tabActive]}
            onPress={() => setActiveTab('machine')}
            testID="dumbass-config-tab-machine"
          >
            <Text style={[styles.tabText, activeTab === 'machine' && styles.tabTextActive]}>Machine Hours</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'man' && styles.tabActive]}
            onPress={() => setActiveTab('man')}
            testID="dumbass-config-tab-man"
          >
            <Text style={[styles.tabText, activeTab === 'man' && styles.tabTextActive]}>Man Hours</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || loading}
          testID="dumbass-config-save"
        >
          <Save size={18} color="#0b1220" />
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        testID="dumbass-config-scroll"
      >
        <View style={styles.heroCard} testID="dumbass-config-hero">
          <Text style={styles.heroTitle}>Billing Config</Text>
          <Text style={styles.heroSubtitle}>
            Configure site billing rules for {activeTab === 'machine' ? 'machine hours' : 'man hours'}.
          </Text>
          {!user?.masterAccountId ? (
            <Text style={styles.heroWarning} testID="dumbass-config-missing-master">
              Missing masterAccountId. Please log in again.
            </Text>
          ) : null}
        </View>

        {activeTab === 'machine' ? (
          <>
            <View style={styles.infoCard} testID="dumbass-config-info-machine">
              <Wrench size={20} color="#93c5fd" />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>Billing Rules – Machine Hours</Text>
                <Text style={styles.infoText}>
                  Minimum hours, rain day thresholds, and breakdown billing behaviour.
                </Text>
              </View>
            </View>

            {renderDayTypeCard({ title: 'Weekdays (Mon–Fri)', dayType: 'weekdays', icon: '📅', compact: true })}
            {renderDayTypeCard({ title: 'Weekend (Saturday)', dayType: 'saturday', icon: '🏖️', compact: true })}
            {renderRainDayConfig()}
            {renderBreakdownConfig()}
          </>
        ) : (
          <>
            <View style={styles.infoCard} testID="dumbass-config-info-man">
              <Calendar size={20} color="#93c5fd" />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>Billing Rules – Man Hours</Text>
                <Text style={styles.infoText}>
                  Billing method + multipliers for weekdays, weekends, and public holidays.
                </Text>
              </View>
            </View>

            <View style={styles.card} testID="dumbass-config-card-global-method">
              <View style={styles.cardHeaderStatic}>
                <Text style={styles.cardTitle}>Billing Method</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.methodRow}>
                  <TouchableOpacity
                    style={[styles.methodChip, globalBillingMethod === 'PER_HOUR' && styles.methodChipActive]}
                    onPress={() => applyGlobalBillingMethod('PER_HOUR')}
                    testID="dumbass-config-method-per-hour"
                  >
                    <Text style={[styles.methodChipText, globalBillingMethod === 'PER_HOUR' && styles.methodChipTextActive]}>Per Hour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodChip, globalBillingMethod === 'MINIMUM_BILLING' && styles.methodChipActive]}
                    onPress={() => applyGlobalBillingMethod('MINIMUM_BILLING')}
                    testID="dumbass-config-method-minimum"
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        globalBillingMethod === 'MINIMUM_BILLING' && styles.methodChipTextActive,
                      ]}
                    >
                      Minimum Billing
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {renderDayTypeCard({ title: 'Weekdays', dayType: 'weekdays', icon: '📅' })}
            {renderDayTypeCard({ title: 'Saturday', dayType: 'saturday', icon: '🏖️' })}
            {renderDayTypeCard({ title: 'Sunday', dayType: 'sunday', icon: '☀️' })}
            {renderDayTypeCard({ title: 'Public Holidays', dayType: 'publicHolidays', icon: '🎉' })}
            {renderRainDayConfig()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#0b1220',
    fontWeight: '800' as const,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroWarning: {
    marginTop: 10,
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(96,165,250,0.10)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.18)',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  infoText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderStatic: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 22,
    marginRight: 10,
    fontSize: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: -0.1,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  helperText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 16,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(34,197,94,0.30)',
  },
  pillOff: {
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderColor: 'rgba(148,163,184,0.22)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800' as const,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderColor: 'rgba(251,191,36,0.35)',
  },
  methodChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '800' as const,
    fontSize: 13,
  },
  methodChipTextActive: {
    color: '#ffffff',
  },
});
