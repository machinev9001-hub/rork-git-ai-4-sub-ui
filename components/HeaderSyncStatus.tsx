import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Platform } from 'react-native';
import { useOfflineStatus } from '@/utils/hooks/useOfflineStatus';
import { RefreshCw, WifiOff, CheckCircle, AlertCircle, Clock, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { getInitials } from '@/utils/nameHelpers';

export default function HeaderSyncStatus() {
  const { isConnected, syncStatus } = useOfflineStatus();
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (syncStatus.isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      spinValue.setValue(0);
      pulseValue.setValue(1);
    }
  }, [syncStatus.isSyncing, spinValue, pulseValue]);

  useEffect(() => {
    if (syncStatus.pendingCount > 0 || syncStatus.failedCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowValue.setValue(0);
    }
  }, [syncStatus.pendingCount, syncStatus.failedCount, glowValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusIcon = () => {
    if (!isConnected) {
      return (
        <Animated.View style={{ transform: [{ scale: pulseValue }] }}>
          <WifiOff size={16} color="#ef4444" strokeWidth={2.5} />
        </Animated.View>
      );
    }

    if (syncStatus.isSyncing) {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }, { scale: pulseValue }] }}>
          <RefreshCw size={16} color="#FBBC04" strokeWidth={2.5} />
        </Animated.View>
      );
    }

    if (syncStatus.failedCount > 0) {
      return (
        <Animated.View style={{ opacity: glowValue.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>
          <AlertCircle size={16} color="#f59e0b" strokeWidth={2.5} />
        </Animated.View>
      );
    }

    if (syncStatus.pendingCount > 0) {
      return (
        <Animated.View style={{ opacity: glowValue.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }}>
          <Clock size={16} color="#6b7280" strokeWidth={2.5} />
        </Animated.View>
      );
    }

    return <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />;
  };

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={styles.container}>
      {(syncStatus.isSyncing || syncStatus.pendingCount > 0 || syncStatus.failedCount > 0) && (
        <Animated.View 
          style={[
            styles.glow,
            { 
              opacity: glowOpacity,
              backgroundColor: syncStatus.isSyncing ? '#FBBC04' : syncStatus.failedCount > 0 ? '#f59e0b' : '#6b7280',
            }
          ]} 
        />
      )}
      {getStatusIcon()}
    </View>
  );
}

export function HeaderTitleWithSync({ title }: { title: string }) {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.titleText}>{title}</Text>
    </View>
  );
}

export function StandardHeaderRight() {
  const { user } = useAuth();
  
  return (
    <View style={styles.headerRight}>
      <HeaderSyncStatus />
      <View style={styles.userInfo}>
        <Text style={styles.headerUserName}>{getInitials(user?.name || 'User')}</Text>
        <Text style={styles.headerCompanyName}>{user?.companyName || 'Company'}</Text>
      </View>
    </View>
  );
}

export function StandardSiteIndicator() {
  const { user } = useAuth();
  
  if (!user?.siteName) return null;
  
  return (
    <View style={styles.siteIndicator}>
      <MapPin size={12} color={Colors.textSecondary} strokeWidth={2} />
      <Text style={styles.siteIndicatorText}>{user.siteName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  glow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#FBBC04',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerCompanyName: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  siteIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
    backgroundColor: Colors.background,
  },
  siteIndicatorText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
