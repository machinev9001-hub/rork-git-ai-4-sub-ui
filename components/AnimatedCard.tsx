import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  delay?: number;
  elevation?: number;
}

export default function AnimatedCard({ 
  children, 
  onPress, 
  style, 
  disabled = false,
  delay = 0,
  elevation = 2
}: AnimatedCardProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, delay]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [
      { scale: Animated.multiply(scaleAnim, pressScale) }
    ],
  };

  const elevationStyle = elevation === 3 ? styles.cardElevated : styles.card;

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View style={[elevationStyle, animatedStyle, style]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[elevationStyle, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    backgroundColor: Colors.cardBgElevated,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
});
