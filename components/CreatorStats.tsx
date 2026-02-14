
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface CreatorStatsProps {
  views: number;
  earnings: number;
  rpm: number;
  ctr: number;
  period: '7d' | '30d' | '90d';
}

export default function CreatorStats({ views, earnings, rpm, ctr, period }: CreatorStatsProps) {
  const periodLabel = period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days';

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      const millions = num / 1000000;
      return millions.toFixed(1) + 'M';
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      return thousands.toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return '$' + amount.toFixed(2);
  };

  const formatPercentage = (value: number): string => {
    return value.toFixed(2) + '%';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.periodLabel}>{periodLabel}</Text>
      
      <View style={styles.statsGrid}>
        {/* Views */}
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <IconSymbol
              ios_icon_name="eye.fill"
              android_material_icon_name="visibility"
              size={24}
              color={colors.turquoise}
            />
          </View>
          <Text style={styles.statValue}>{formatNumber(views)}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>

        {/* Earnings */}
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <IconSymbol
              ios_icon_name="dollarsign.circle.fill"
              android_material_icon_name="attach-money"
              size={24}
              color={colors.purple}
            />
          </View>
          <Text style={styles.statValue}>{formatCurrency(earnings)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>

        {/* RPM */}
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <IconSymbol
              ios_icon_name="chart.bar.fill"
              android_material_icon_name="bar-chart"
              size={24}
              color={colors.coral}
            />
          </View>
          <Text style={styles.statValue}>{formatCurrency(rpm)}</Text>
          <Text style={styles.statLabel}>RPM</Text>
        </View>

        {/* CTR */}
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <IconSymbol
              ios_icon_name="hand.tap.fill"
              android_material_icon_name="touch-app"
              size={24}
              color={colors.accent}
            />
          </View>
          <Text style={styles.statValue}>{formatPercentage(ctr)}</Text>
          <Text style={styles.statLabel}>CTR</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
