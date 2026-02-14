
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAnalytics } from '@/hooks/useAnalytics';
import AnalyticsChart from '@/components/AnalyticsChart';
import Toast from '@/components/ui/Toast';

const { width } = Dimensions.get('window');

export default function VideoAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { videoAnalytics, loading, error, fetchVideoAnalytics } = useAnalytics();
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (id) {
      console.log('Fetching video analytics for video:', id);
      fetchVideoAnalytics(id);
    }
  }, [id, fetchVideoAnalytics]);

  useEffect(() => {
    if (error) {
      showToast(error.message, 'error');
    }
  }, [error]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleRefresh = async () => {
    if (id) {
      setRefreshing(true);
      await fetchVideoAnalytics(id);
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      const formatted = (num / 1000000).toFixed(1);
      return formatted + 'M';
    }
    if (num >= 1000) {
      const formatted = (num / 1000).toFixed(1);
      return formatted + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMetricCard = (
    title: string,
    value: string,
    icon: string,
    iconColor: string
  ) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconColor + '20' }]}>
        <IconSymbol
          ios_icon_name="chart.bar.fill"
          android_material_icon_name={icon}
          size={20}
          color={iconColor}
        />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

  if (loading && !videoAnalytics) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Video Analytics',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading video analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!videoAnalytics) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Video Analytics',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No analytics data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { video, metrics, retentionGraph, trafficSources, demographics, engagement } = videoAnalytics;

  const viewsFormatted = formatNumber(metrics.views);
  const likesFormatted = formatNumber(metrics.likes);
  const commentsFormatted = formatNumber(metrics.comments);
  const sharesFormatted = formatNumber(metrics.shares);
  const avgWatchTimeFormatted = formatDuration(Math.round(metrics.averageWatchTime));
  const completionRateFormatted = metrics.completionRate.toFixed(1);

  const retentionChartData = retentionGraph.map((item) => ({
    x: item.second.toString(),
    y: item.percentage,
  }));

  const trafficSourcesChartData = trafficSources.map((item) => ({
    x: item.source,
    y: item.views,
  }));

  const ageGroupsChartData = demographics.ageGroups.map((item) => ({
    x: item.range,
    y: item.percentage,
  }));

  const likesOverTimeData = engagement.likesOverTime.map((item) => ({
    x: new Date(item.date).getDate().toString(),
    y: item.count,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Video Analytics',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.videoHeader}>
          <Text style={styles.videoCaption} numberOfLines={2}>
            {video.caption || 'Untitled Video'}
          </Text>
          <Text style={styles.videoDate}>
            {new Date(video.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('Views', viewsFormatted, 'visibility', colors.primary)}
            {renderMetricCard('Likes', likesFormatted, 'favorite', colors.secondary)}
            {renderMetricCard('Comments', commentsFormatted, 'comment', colors.accent)}
            {renderMetricCard('Shares', sharesFormatted, 'share', '#4CAF50')}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.watchTimeCard}>
            <View style={styles.watchTimeStat}>
              <Text style={styles.watchTimeLabel}>Avg Watch Time</Text>
              <Text style={styles.watchTimeValue}>{avgWatchTimeFormatted}</Text>
            </View>
            <View style={styles.watchTimeDivider} />
            <View style={styles.watchTimeStat}>
              <Text style={styles.watchTimeLabel}>Completion Rate</Text>
              <Text style={styles.watchTimeValue}>{completionRateFormatted}%</Text>
            </View>
          </View>
        </View>

        {retentionChartData.length > 0 && (
          <View style={styles.section}>
            <AnalyticsChart
              data={retentionChartData}
              type="area"
              xKey="x"
              yKey="y"
              title="Audience Retention"
              color={colors.primary}
              height={220}
            />
          </View>
        )}

        {trafficSourcesChartData.length > 0 && (
          <View style={styles.section}>
            <AnalyticsChart
              data={trafficSourcesChartData}
              type="pie"
              xKey="x"
              yKey="y"
              title="Traffic Sources"
              height={250}
            />
          </View>
        )}

        {ageGroupsChartData.length > 0 && (
          <View style={styles.section}>
            <AnalyticsChart
              data={ageGroupsChartData}
              type="bar"
              xKey="x"
              yKey="y"
              title="Viewer Demographics"
              color={colors.secondary}
              height={220}
            />
          </View>
        )}

        {likesOverTimeData.length > 0 && (
          <View style={styles.section}>
            <AnalyticsChart
              data={likesOverTimeData}
              type="line"
              xKey="x"
              yKey="y"
              title="Likes Over Time"
              color={colors.accent}
              height={220}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  videoHeader: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  videoCaption: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  videoDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  watchTimeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
  },
  watchTimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  watchTimeDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  watchTimeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  watchTimeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
});
