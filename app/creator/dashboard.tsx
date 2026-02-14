
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useCreatorEarnings } from '@/hooks/useCreatorEarnings';
import CreatorStats from '@/components/CreatorStats';
import Toast from '@/components/ui/Toast';

type TimePeriod = '7d' | '30d' | '90d';

export default function CreatorDashboard() {
  const { dashboardStats, isLoading, error, fetchDashboardStats, fetchApplicationStatus, applicationStatus } = useCreatorEarnings();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    console.log('[CreatorDashboard] Component mounted');
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[CreatorDashboard] Loading data');
    const status = await fetchApplicationStatus();
    
    if (status?.status !== 'approved') {
      console.log('[CreatorDashboard] User is not an approved creator');
      showToast('You need to be an approved creator to access this page', 'error');
      setTimeout(() => {
        router.back();
      }, 2000);
      return;
    }

    await fetchDashboardStats();
  };

  const handleRefresh = async () => {
    console.log('[CreatorDashboard] Refreshing data');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return '$' + amount.toFixed(2);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + 'm ' + secs + 's';
  };

  if (isLoading && !dashboardStats) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Creator Dashboard',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const views = selectedPeriod === '7d' ? dashboardStats?.views7d || 0 :
                selectedPeriod === '30d' ? dashboardStats?.views30d || 0 :
                dashboardStats?.views90d || 0;

  const earnings = selectedPeriod === '7d' ? dashboardStats?.earnings7d || 0 :
                   selectedPeriod === '30d' ? dashboardStats?.earnings30d || 0 :
                   dashboardStats?.earnings90d || 0;

  const rpm = dashboardStats?.rpm || 0;
  const cpm = dashboardStats?.cpm || 0;
  const ctr = dashboardStats?.ctr || 0;
  const avgWatchTime = dashboardStats?.avgWatchTime || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Creator Dashboard',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/creator/earnings')}
              style={styles.headerButton}
            >
              <IconSymbol
                ios_icon_name="dollarsign.circle.fill"
                android_material_icon_name="account-balance-wallet"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === '7d' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('7d')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === '7d' && styles.periodButtonTextActive]}>
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === '30d' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('30d')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === '30d' && styles.periodButtonTextActive]}>
              30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === '90d' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('90d')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === '90d' && styles.periodButtonTextActive]}>
              90 Days
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <CreatorStats
          views={views}
          earnings={earnings}
          rpm={rpm}
          ctr={ctr}
          period={selectedPeriod}
        />

        {/* Additional Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={20}
                color={colors.purple}
              />
              <Text style={styles.metricLabel}>CPM (Cost Per Mille)</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(cpm)}</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="access-time"
                size={20}
                color={colors.turquoise}
              />
              <Text style={styles.metricLabel}>Avg Watch Time</Text>
            </View>
            <Text style={styles.metricValue}>{formatTime(avgWatchTime)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/creator/earnings')}
          >
            <View style={styles.actionLeft}>
              <IconSymbol
                ios_icon_name="dollarsign.circle.fill"
                android_material_icon_name="account-balance-wallet"
                size={24}
                color={colors.purple}
              />
              <Text style={styles.actionText}>View Earnings & Withdraw</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerButton: {
    marginRight: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricLabel: {
    fontSize: 16,
    color: colors.text,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
