
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useAds, AdAnalytics } from '@/hooks/useAds';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function AdvertiserDashboardScreen() {
  const { campaigns, loading, error, fetchAdvertiserCampaigns, fetchCampaignAnalytics } = useAds();
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, AdAnalytics>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    console.log('Dashboard mounted, fetching campaigns');
    fetchAdvertiserCampaigns();
  }, [fetchAdvertiserCampaigns]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (campaigns.length === 0) return;
      console.log('Loading analytics for campaigns');
      setLoadingAnalytics(true);
      const analyticsData: Record<string, AdAnalytics> = {};
      for (const campaign of campaigns) {
        try {
          const analytics = await fetchCampaignAnalytics(campaign.id);
          analyticsData[campaign.id] = analytics;
        } catch (err) {
          console.error('Error loading analytics for campaign:', campaign.id, err);
        }
      }
      setAnalyticsMap(analyticsData);
      setLoadingAnalytics(false);
    };

    loadAnalytics();
  }, [campaigns, fetchCampaignAnalytics]);

  const handleRefresh = () => {
    console.log('Refreshing dashboard');
    fetchAdvertiserCampaigns();
  };

  const handleCreateCampaign = () => {
    console.log('Navigating to create campaign');
    router.push('/ads/create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'paused':
        return colors.warning;
      case 'completed':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading && campaigns.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Ad Campaigns',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Ad Campaigns',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Ad Campaigns',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleCreateCampaign} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color={colors.purple}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.purple}
          />
        }
      >
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="megaphone"
              android_material_icon_name="campaign"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No campaigns yet</Text>
            <Text style={styles.emptyStateText}>Create your first ad campaign to get started</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateCampaign}>
              <Text style={styles.createButtonText}>Create Campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          campaigns.map((campaign) => {
            const analytics = analyticsMap[campaign.id];
            const statusColor = getStatusColor(campaign.status);
            const budgetPercentage = (campaign.spent / campaign.budget) * 100;

            return (
              <View key={campaign.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{campaign.status}</Text>
                  </View>
                </View>

                <View style={styles.budgetContainer}>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>Budget</Text>
                    <Text style={styles.budgetValue}>{formatCurrency(campaign.budget)}</Text>
                  </View>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>Spent</Text>
                    <Text style={styles.budgetValue}>{formatCurrency(campaign.spent)}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(budgetPercentage, 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{budgetPercentage.toFixed(1)}% of budget used</Text>
                </View>

                {loadingAnalytics ? (
                  <ActivityIndicator color={colors.purple} style={styles.analyticsLoader} />
                ) : analytics ? (
                  <View style={styles.analyticsContainer}>
                    <View style={styles.metricRow}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Impressions</Text>
                        <Text style={styles.metricValue}>{formatNumber(analytics.impressions)}</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Clicks</Text>
                        <Text style={styles.metricValue}>{formatNumber(analytics.clicks)}</Text>
                      </View>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>CTR</Text>
                        <Text style={styles.metricValue}>{analytics.ctr.toFixed(2)}%</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Conversions</Text>
                        <Text style={styles.metricValue}>{formatNumber(analytics.conversions)}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.targetingContainer}>
                  <Text style={styles.targetingTitle}>Targeting</Text>
                  <Text style={styles.targetingText}>Age: {campaign.target_audience.age_range}</Text>
                  {campaign.target_audience.interests.length > 0 && (
                    <Text style={styles.targetingText}>
                      Interests: {campaign.target_audience.interests.join(', ')}
                    </Text>
                  )}
                  {campaign.target_audience.locations.length > 0 && (
                    <Text style={styles.targetingText}>
                      Locations: {campaign.target_audience.locations.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  contentContainer: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerButton: {
    marginRight: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  createButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  budgetContainer: {
    marginBottom: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  budgetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  analyticsLoader: {
    marginVertical: spacing.md,
  },
  analyticsContainer: {
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.turquoise,
  },
  targetingContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  targetingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  targetingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
});
