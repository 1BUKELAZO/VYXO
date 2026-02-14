
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAnalytics, Timeframe } from '@/hooks/useAnalytics';
import AnalyticsChart from '@/components/AnalyticsChart';
import Toast from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboard() {
  const { dashboardData, loading, error, fetchDashboardData } = useAnalytics();
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    console.log('Analytics dashboard mounted, fetching data');
    fetchDashboardData(timeframe);
  }, [timeframe, fetchDashboardData]);

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
    setRefreshing(true);
    await fetchDashboardData(timeframe);
    setRefreshing(false);
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

  const formatCurrency = (amount: number): string => {
    const formatted = amount.toFixed(2);
    return '$' + formatted;
  };

  const renderTimeframeSelector = () => {
    const timeframes: { value: Timeframe; label: string }[] = [
      { value: '7d', label: '7 Days' },
      { value: '30d', label: '30 Days' },
      { value: '90d', label: '90 Days' },
    ];

    return (
      <View style={styles.timeframeContainer}>
        {timeframes.map((tf) => {
          const isSelected = timeframe === tf.value;
          return (
            <TouchableOpacity
              key={tf.value}
              style={[styles.timeframeButton, isSelected && styles.timeframeButtonActive]}
              onPress={() => setTimeframe(tf.value)}
            >
              <Text style={[styles.timeframeText, isSelected && styles.timeframeTextActive]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderOverviewCard = (
    title: string,
    value: string,
    icon: string,
    iconColor: string
  ) => (
    <View style={styles.overviewCard}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <IconSymbol
          ios_icon_name="chart.bar.fill"
          android_material_icon_name={icon}
          size={24}
          color={iconColor}
        />
      </View>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewTitle}>{title}</Text>
    </View>
  );

  const renderTopVideos = () => {
    if (!dashboardData?.topVideos || dashboardData.topVideos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No videos yet</Text>
        </View>
      );
    }

    return dashboardData.topVideos.map((video, index) => {
      const engagementRateFormatted = video.engagementRate.toFixed(1);
      const viewsFormatted = formatNumber(video.views);
      const likesFormatted = formatNumber(video.likes);

      return (
        <TouchableOpacity
          key={video.id}
          style={styles.videoCard}
          onPress={() => router.push(`/analytics/video/${video.id}`)}
        >
          <View style={styles.videoRank}>
            <Text style={styles.videoRankText}>{index + 1}</Text>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoCaption} numberOfLines={2}>
              {video.caption || 'Untitled Video'}
            </Text>
            <View style={styles.videoStats}>
              <View style={styles.videoStat}>
                <IconSymbol
                  ios_icon_name="eye.fill"
                  android_material_icon_name="visibility"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.videoStatText}>{viewsFormatted}</Text>
              </View>
              <View style={styles.videoStat}>
                <IconSymbol
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.videoStatText}>{likesFormatted}</Text>
              </View>
              <View style={styles.videoStat}>
                <Text style={styles.engagementRate}>{engagementRateFormatted}%</Text>
              </View>
            </View>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="arrow-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      );
    });
  };

  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Analytics',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overview = dashboardData?.overview;
  const dailyViews = dashboardData?.dailyViews || [];
  const trafficSources = dashboardData?.trafficSources || [];
  const audienceInsights = dashboardData?.audienceInsights;

  const totalViewsFormatted = overview ? formatNumber(overview.totalViews) : '0';
  const followersGainedFormatted = overview ? formatNumber(overview.followersGained) : '0';
  const totalLikesFormatted = overview ? formatNumber(overview.totalLikes) : '0';
  const totalSharesFormatted = overview ? formatNumber(overview.totalShares) : '0';
  const totalEarningsFormatted = overview ? formatCurrency(overview.totalEarnings) : '$0.00';

  const dailyViewsChartData = dailyViews.map((item) => ({
    x: new Date(item.date).getDate().toString(),
    y: item.views,
  }));

  const trafficSourcesChartData = trafficSources.map((item) => ({
    x: item.source,
    y: item.views,
  }));

  const ageGroupsChartData = audienceInsights?.ageGroups.map((item) => ({
    x: item.range,
    y: item.percentage,
  })) || [];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Analytics',
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
        {renderTimeframeSelector()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.overviewGrid}>
            {renderOverviewCard('Views', totalViewsFormatted, 'visibility', colors.primary)}
            {renderOverviewCard('Followers', followersGainedFormatted, 'person-add', colors.secondary)}
            {renderOverviewCard('Likes', totalLikesFormatted, 'favorite', colors.accent)}
            {renderOverviewCard('Shares', totalSharesFormatted, 'share', '#4CAF50')}
          </View>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsValue}>{totalEarningsFormatted}</Text>
          </View>
        </View>

        {dailyViewsChartData.length > 0 && (
          <View style={styles.section}>
            <AnalyticsChart
              data={dailyViewsChartData}
              type="area"
              xKey="x"
              yKey="y"
              title="Daily Views"
              color={colors.primary}
              height={220}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Videos</Text>
          {renderTopVideos()}
        </View>

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
              title="Audience Age Groups"
              color={colors.secondary}
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
  timeframeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  earningsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  videoRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  videoInfo: {
    flex: 1,
  },
  videoCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
  },
  videoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  engagementRate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
