import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';

export default function MachineHoursScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/billing-config?tab=eph');
  }, [router]);

  return <View />;
}
