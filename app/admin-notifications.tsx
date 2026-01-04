import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle2, AlertCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AdminNotification, AdminNotificationType } from '@/types';
import { AppTheme } from '@/constants/colors';

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      const notificationsRef = collection(db, 'adminNotifications');
      let q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      if (filter === 'unread') {
        q = query(
          notificationsRef,
          where('isRead', '==', false),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const loadedNotifications: AdminNotification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AdminNotification));

      setNotifications(loadedNotifications);
    } catch (error) {
      console.error('[AdminNotifications] Error loading:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp(),
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('[AdminNotifications] Error marking as read:', error);
    }
  };

  const getTypeIcon = (type: AdminNotificationType) => {
    switch (type) {
      case 'ACTIVATION_CODE_REDEEMED':
        return <CheckCircle2 size={24} color="#10b981" />;
      case 'VAS_SUBSCRIPTION_STARTED':
        return <Clock size={24} color="#3b82f6" />;
      case 'VAS_SUBSCRIPTION_ACTIVATED':
        return <CheckCircle2 size={24} color="#10b981" />;
      case 'VAS_TRIAL_EXPIRING':
        return <AlertCircle size={24} color="#f59e0b" />;
      case 'VAS_TRIAL_EXPIRED':
        return <AlertTriangle size={24} color="#ef4444" />;
      case 'VAS_PAYMENT_PENDING':
        return <Clock size={24} color="#f59e0b" />;
      case 'VAS_SUSPENDED':
        return <AlertTriangle size={24} color="#ef4444" />;
      default:
        return <Bell size={24} color={AppTheme.textSecondary} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return AppTheme.textSecondary;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Admin Notifications',
          headerStyle: { backgroundColor: AppTheme.headerBg },
          headerTintColor: AppTheme.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={AppTheme.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppTheme.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={64} color={AppTheme.textSecondary} />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.notificationCardUnread,
                  ]}
                  onPress={() => notification.id && !notification.isRead && markAsRead(notification.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationIcon}>
                      {getTypeIcon(notification.type)}
                    </View>
                    <View style={styles.notificationHeaderText}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationTime}>
                        {formatDate(notification.createdAt)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(notification.priority) },
                      ]}
                    >
                      <Text style={styles.priorityText}>
                        {notification.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.notificationMessage}>{notification.message}</Text>

                  {notification.masterAccountName && (
                    <View style={styles.notificationMeta}>
                      <Text style={styles.metaLabel}>Account:</Text>
                      <Text style={styles.metaValue}>{notification.masterAccountName}</Text>
                    </View>
                  )}

                  {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                    <View style={styles.metadataContainer}>
                      {notification.metadata.accountType && (
                        <View style={styles.metadataItem}>
                          <Text style={styles.metaLabel}>Type:</Text>
                          <Text style={styles.metaValue}>
                            {notification.metadata.accountType === 'enterprise' ? 'Enterprise' : 'Free'}
                          </Text>
                        </View>
                      )}
                      {notification.metadata.companyName && (
                        <View style={styles.metadataItem}>
                          <Text style={styles.metaLabel}>Company:</Text>
                          <Text style={styles.metaValue}>{notification.metadata.companyName}</Text>
                        </View>
                      )}
                      {notification.metadata.trialEndDate && (
                        <View style={styles.metadataItem}>
                          <Text style={styles.metaLabel}>Trial Ends:</Text>
                          <Text style={styles.metaValue}>
                            {new Date(notification.metadata.trialEndDate).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {notification.metadata.price && (
                        <View style={styles.metadataItem}>
                          <Text style={styles.metaLabel}>Price:</Text>
                          <Text style={styles.metaValue}>
                            ${notification.metadata.price}/{notification.metadata.currency || 'USD'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {!notification.isRead && (
                    <View style={styles.unreadIndicator}>
                      <View style={styles.unreadDot} />
                      <Text style={styles.unreadText}>Tap to mark as read</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AppTheme.cardBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  filterButtonActive: {
    backgroundColor: AppTheme.accent,
    borderColor: AppTheme.accent,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AppTheme.text,
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: AppTheme.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },
  notificationsList: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: AppTheme.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  notificationCardUnread: {
    borderColor: AppTheme.accent,
    backgroundColor: `${AppTheme.accent}10`,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationHeaderText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppTheme.text,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  notificationMessage: {
    fontSize: 14,
    color: AppTheme.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AppTheme.textSecondary,
  },
  metaValue: {
    fontSize: 12,
    color: AppTheme.text,
  },
  metadataContainer: {
    backgroundColor: AppTheme.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.accent,
  },
  unreadText: {
    fontSize: 12,
    color: AppTheme.accent,
    fontWeight: '500' as const,
  },
});
