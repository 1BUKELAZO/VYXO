
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import AdCreator from '@/components/AdCreator';

export default function CreateAdCampaignScreen() {
  const handleComplete = () => {
    console.log('Campaign created, navigating back to dashboard');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Create Campaign',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <AdCreator onComplete={handleComplete} />
    </SafeAreaView>
  );
}
