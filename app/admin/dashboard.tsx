
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAdmin } from '@/hooks/useAdmin';
import Toast from '@/components/ui/Toast';

export default function AdminDashboardScreen() {
  const { isLoading, error, dashboardMetrics, fetchDashboardMetrics } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log('Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleRefresh = async () => {
    console.log('Refreshing dashboard...');
    setRefreshing(true);
    try {
      await fetchDashboardMetrics();
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading && !dashboardMetrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  const totalUsersDisplay = dashboardMetrics?.totalUsers?.toLocaleString() || '0';
  const totalVideosDisplay = dashboardMetrics?.totalVideos?.toLocaleString() || '0';
  const pendingReportsDisplay = dashboardMetrics?.pendingReports?.toLocaleString() || '0';
  const dauDisplay = dashboardMetrics?.dau?.toLocaleString() || '0';
  const mauDisplay = dashboardMetrics?.mau?.toLocaleString() || '0';
  const videosTodayDisplay = dashboardMetrics?.videosToday?.toLocaleString() || '0';
  const reportsTodayDisplay = dashboardMetrics?.reportsToday?.toLocaleString() || '0';
  const creatorAppsPendingDisplay = dashboardMetrics?.creatorApplicationsPending?.toLocaleString() || '0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="arrow-back"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
              <IconSymbol
                ios_icon_name="person"
                android_material_icon_name="person"
                size={32}
                color="#fff"
              />
              <Text style={styles.statValue}>{totalUsersDisplay}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
              <IconSymbol
                ios_icon_name="movie"
                android_material_icon_name="movie"
                size={32}
                color="#fff"
              />
              <Text style={styles.statValue}>{totalVideosDisplay}</Text>
              <Text style={styles.statLabel}>Total Videos</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#00D9FF' }]}>
              <IconSymbol
                ios_icon_name="warning"
                android_material_icon_name="warning"
                size={32}
                color="#fff"
              />
              <Text style={styles.statValue}>{pendingReportsDisplay}</Text>
              <Text style={styles.statLabel}>Pending Reports</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <IconSymbol
                ios_icon_name="check-circle"
                android_material_icon_name="check-circle"
                size={32}
                color="#fff"
              />
              <Text style={styles.statValue}>{creatorAppsPendingDisplay}</Text>
              <Text style={styles.statLabel}>Creator Apps</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Activity Metrics</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{dauDisplay}</Text>
              <Text style={styles.metricLabel}>Daily Active Users</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{mauDisplay}</Text>
              <Text style={styles.metricLabel}>Monthly Active Users</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{videosTodayDisplay}</Text>
              <Text style={styles.metricLabel}>Videos Today</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{reportsTodayDisplay}</Text>
              <Text style={styles.metricLabel}>Reports Today</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/users')}
            >
              <IconSymbol
                ios_icon_name="person"
                android_material_icon_name="person"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/videos')}
            >
              <IconSymbol
                ios_icon_name="movie"
                android_material_icon_name="movie"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Manage Videos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/reports')}
            >
              <IconSymbol
                ios_icon_name="warning"
                android_material_icon_name="warning"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Review Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
