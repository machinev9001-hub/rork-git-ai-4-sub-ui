import { Tabs } from "expo-router";
import { Home, Settings } from "lucide-react-native";
import React, { useRef, useEffect } from "react";
import { StyleSheet, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, getRoleAccentColor } from "@/constants/colors";
import HeaderSyncStatus from "@/components/HeaderSyncStatus";

function AnimatedTabIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate }] }}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const roleAccentColor = getRoleAccentColor(user?.role);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: '#666666',
        headerShown: true,
        tabBarShowLabel: false,

        headerStyle: {
          backgroundColor: Colors.headerBg,
          borderBottomWidth: 2,
          borderBottomColor: roleAccentColor,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600' as const,
          color: Colors.text,
        },
        headerTitleAlign: 'left',
        headerRight: () => <HeaderSyncStatus />,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8),
            height: Platform.OS === 'web' ? 60 : 60 + Math.max(insets.bottom, 0),
          }
        ],
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Settings} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 2,
    borderTopColor: Colors.accent,
    paddingTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tabBarIcon: {
    marginBottom: -4,
  },
});
