import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DumbassScreen() {
  return (
    <View style={styles.container} testID="dumbass-screen">
      <Stack.Screen options={{ title: 'Dumbass' }} />
      <View style={styles.card} testID="dumbass-card">
        <Text style={styles.title} testID="dumbass-title">Coming soon</Text>
        <Text style={styles.subtitle} testID="dumbass-subtitle">
          This menu item is intentionally empty for now.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
  },
});
