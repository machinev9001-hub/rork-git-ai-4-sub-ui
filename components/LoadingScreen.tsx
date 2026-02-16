import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoadingScreen() {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim, fadeAnim, rotateAnim, pulseAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#000000', '#1A1A1A', '#000000']}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate }, { scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.outerRing} />
          <View style={styles.innerRing} />
          <View style={styles.centerDot} />
        </Animated.View>
        
        <Text style={styles.appTitle}>Machine App</Text>
        <Text style={styles.appSubtitle}>Loading...</Text>
        
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFD600',
    opacity: 0.3,
  },
  innerRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFD600',
    opacity: 0.6,
  },
  centerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD600',
  },
  appTitle: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD600',
  },
});
