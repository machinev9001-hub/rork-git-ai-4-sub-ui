import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { X, Save } from 'lucide-react-native';

type TimesheetEntry = {
  id: string;
  date: string;
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  notes?: string;
  operatorName?: string;
  assetType?: string;
  plantNumber?: string;
};

export type EditedValues = {
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  adminNotes: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (editedValues: EditedValues) => Promise<void>;
  timesheet: TimesheetEntry | null;
};

export default function EditEPHHoursModal({ visible, onClose, onSave, timesheet }: Props) {
  const [totalHours, setTotalHours] = useState<string>('0');
  const [openHours, setOpenHours] = useState<string>('00:00');
  const [closeHours, setCloseHours] = useState<string>('00:00');
  const [isBreakdown, setIsBreakdown] = useState<boolean>(false);
  const [isRainDay, setIsRainDay] = useState<boolean>(false);
  const [isStrikeDay, setIsStrikeDay] = useState<boolean>(false);
  const [isPublicHoliday, setIsPublicHoliday] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (timesheet) {
      setTotalHours(timesheet.totalHours.toString());
      setOpenHours(timesheet.openHours || '00:00');
      setCloseHours(timesheet.closeHours || '00:00');
      setIsBreakdown(timesheet.isBreakdown || false);
      setIsRainDay(timesheet.isRainDay || false);
      setIsStrikeDay(timesheet.isStrikeDay || false);
      setIsPublicHoliday(timesheet.isPublicHoliday || false);
      setAdminNotes('');
    }
  }, [timesheet]);

  const handleSave = async () => {
    const totalHoursNum = parseFloat(totalHours);

    if (isNaN(totalHoursNum) || totalHoursNum < 0) {
      Alert.alert('Invalid Hours', 'Please enter valid total hours');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        totalHours: totalHoursNum,
        openHours,
        closeHours,
        isBreakdown,
        isRainDay,
        isStrikeDay,
        isPublicHoliday,
        adminNotes,
      });
      onClose();
    } catch (error) {
      console.error('[EditEPHHoursModal] Error saving:', error);
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!timesheet) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Edit Hours</Text>
              <Text style={styles.modalSubtitle}>
                {timesheet.assetType || 'Asset'} - {timesheet.plantNumber || timesheet.id}
              </Text>
              <Text style={styles.modalDate}>{timesheet.date}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.originalValuesBox}>
              <Text style={styles.sectionLabel}>Plant Manager&apos;s Original Values:</Text>
              <View style={styles.originalRow}>
                <Text style={styles.originalLabel}>Total Hours:</Text>
                <Text style={styles.originalValue}>{timesheet.totalHours}h</Text>
              </View>
              <View style={styles.originalRow}>
                <Text style={styles.originalLabel}>Open Hours:</Text>
                <Text style={styles.originalValue}>{timesheet.openHours}</Text>
              </View>
              <View style={styles.originalRow}>
                <Text style={styles.originalLabel}>Close Hours:</Text>
                <Text style={styles.originalValue}>{timesheet.closeHours}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Edit Total Hours</Text>
              <TextInput
                style={styles.input}
                value={totalHours}
                onChangeText={setTotalHours}
                keyboardType="decimal-pad"
                placeholder="Enter total hours"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Edit Meter Readings</Text>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Open Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={openHours}
                    onChangeText={setOpenHours}
                    placeholder="00:00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Close Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={closeHours}
                    onChangeText={setCloseHours}
                    placeholder="00:00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Day Conditions</Text>
              
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsBreakdown(!isBreakdown)}
              >
                <View style={[styles.checkbox, isBreakdown && styles.checkboxChecked]}>
                  {isBreakdown && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>Breakdown Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsRainDay(!isRainDay)}
              >
                <View style={[styles.checkbox, isRainDay && styles.checkboxChecked]}>
                  {isRainDay && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>Rain Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsStrikeDay(!isStrikeDay)}
              >
                <View style={[styles.checkbox, isStrikeDay && styles.checkboxChecked]}>
                  {isStrikeDay && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>Strike Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsPublicHoliday(!isPublicHoliday)}
              >
                <View style={[styles.checkbox, isPublicHoliday && styles.checkboxChecked]}>
                  {isPublicHoliday && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>Public Holiday</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Admin Notes (Reason for Edit)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Explain reason for editing hours..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Edits'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  modalDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  originalValuesBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  originalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  originalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  originalValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1e293b',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});
