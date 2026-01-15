import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function EphMenuScreen() {
  return (
    <View style={styles.container} testID="eph-menu-screen">
      <Stack.Screen
        options={{
          headerTitle: 'Machine Hours (EPH)',
          headerStyle: {
            backgroundColor: '#0b4a6b',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>EPH</Text>
        <Text style={styles.subtitle}>Menu coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 22,
  },
});
