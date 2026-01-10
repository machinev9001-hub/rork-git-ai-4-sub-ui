import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ConflictData, conflictResolver } from '@/utils/conflictResolution';
import { AlertCircle, X, Check } from 'lucide-react-native';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: ConflictData[];
  onClose: () => void;
  onResolved: () => void;
}

export default function ConflictResolutionModal({
  visible,
  conflicts,
  onClose,
  onResolved,
}: ConflictResolutionModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (
    conflict: ConflictData,
    strategy: 'server-wins' | 'client-wins' | 'merge'
  ) => {
    setResolving(true);
    try {
      const result = await conflictResolver.resolveConflict(conflict, strategy);
      
      if (result.success) {
        Alert.alert('Success', 'Conflict resolved successfully');
        onResolved();
      } else {
        Alert.alert('Error', result.error || 'Failed to resolve conflict');
      }
    } catch {
      Alert.alert('Error', 'Failed to resolve conflict');
    } finally {
      setResolving(false);
      setSelectedConflict(null);
    }
  };

  const handleResolveAll = async () => {
    setResolving(true);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const conflict of conflicts) {
        const result = await conflictResolver.resolveConflict(conflict);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      Alert.alert(
        'Conflicts Resolved',
        `${successCount} conflicts resolved successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
      );
      
      onResolved();
    } catch {
      Alert.alert('Error', 'Failed to resolve conflicts');
    } finally {
      setResolving(false);
    }
  };

  const renderConflictItem = (conflict: ConflictData) => {
    const isSelected = selectedConflict?.id === conflict.id;
    
    return (
      <TouchableOpacity
        key={conflict.id}
        style={[styles.conflictItem, isSelected && styles.conflictItemSelected]}
        onPress={() => setSelectedConflict(isSelected ? null : conflict)}
      >
        <View style={styles.conflictHeader}>
          <AlertCircle size={20} color="#f59e0b" />
          <View style={styles.conflictInfo}>
            <Text style={styles.conflictTitle}>{conflict.collection}</Text>
            <Text style={styles.conflictSubtitle}>
              Local: {new Date(conflict.localTimestamp).toLocaleString()}
            </Text>
            <Text style={styles.conflictSubtitle}>
              Server: {new Date(conflict.serverTimestamp).toLocaleString()}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.conflictActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.serverButton]}
              onPress={() => handleResolve(conflict, 'server-wins')}
              disabled={resolving}
            >
              <Text style={styles.actionButtonText}>Use Server Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.clientButton]}
              onPress={() => handleResolve(conflict, 'client-wins')}
              disabled={resolving}
            >
              <Text style={styles.actionButtonText}>Use My Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.mergeButton]}
              onPress={() => handleResolve(conflict, 'merge')}
              disabled={resolving}
            >
              <Text style={styles.actionButtonText}>Merge Both</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertCircle size={24} color="#f59e0b" />
              <Text style={styles.headerTitle}>Data Conflicts</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Some data was modified both online and offline. Choose how to resolve each conflict.
          </Text>

          <ScrollView style={styles.conflictList}>
            {conflicts.map(renderConflictItem)}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerButton, styles.resolveAllButton]}
              onPress={handleResolveAll}
              disabled={resolving || conflicts.length === 0}
            >
              <Check size={20} color="#ffffff" />
              <Text style={styles.resolveAllButtonText}>Auto-Resolve All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    padding: 16,
    paddingTop: 12,
  },
  conflictList: {
    flex: 1,
  },
  conflictItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  conflictItemSelected: {
    backgroundColor: '#fef3c7',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  conflictSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  conflictActions: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  serverButton: {
    backgroundColor: '#3b82f6',
  },
  clientButton: {
    backgroundColor: '#10b981',
  },
  mergeButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  resolveAllButton: {
    backgroundColor: '#10b981',
  },
  resolveAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
