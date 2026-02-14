
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useCreatorEarnings, CreatorEarning, CreatorWithdrawal } from '@/hooks/useCreatorEarnings';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

export default function CreatorEarningsScreen() {
  const {
    earningsSummary,
    withdrawals,
    isLoading,
    fetchEarningsSummary,
    fetchWithdrawals,
    requestWithdrawal,
    fetchApplicationStatus,
  } = useCreatorEarnings();

  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    console.log('[CreatorEarnings] Component mounted');
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[CreatorEarnings] Loading data');
    const status = await fetchApplicationStatus();
    
    if (status?.status !== 'approved') {
      console.log('[CreatorEarnings] User is not an approved creator');
      showToast('You need to be an approved creator to access this page', 'error');
      setTimeout(() => {
        router.back();
      }, 2000);
      return;
    }

    await Promise.all([fetchEarningsSummary(), fetchWithdrawals()]);
  };

  const handleRefresh = async () => {
    console.log('[CreatorEarnings] Refreshing data');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWithdrawPress = () => {
    const balance = earningsSummary?.currentBalance || 0;
    if (balance < 100) {
      showToast('Minimum withdrawal amount is $100', 'error');
      return;
    }
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = async () => {
    const amount = parseFloat(withdrawAmount);
    const balance = earningsSummary?.currentBalance || 0;

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (amount < 100) {
      showToast('Minimum withdrawal amount is $100', 'error');
      return;
    }

    if (amount > balance) {
      showToast('Insufficient balance', 'error');
      return;
    }

    console.log('[CreatorEarnings] Requesting withdrawal:', amount);
    setWithdrawing(true);
    const success = await requestWithdrawal(amount);
    setWithdrawing(false);

    if (success) {
      showToast('Withdrawal request submitted successfully', 'success');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } else {
      showToast('Failed to submit withdrawal request', 'error');
    }
  };

  const formatCurrency = (amount: number): string => {
    return '$' + amount.toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'views':
        return { ios: 'eye.fill', android: 'visibility', color: colors.turquoise };
      case 'gifts':
        return { ios: 'gift.fill', android: 'card-giftcard', color: colors.coral };
      case 'tips':
        return { ios: 'dollarsign.circle.fill', android: 'attach-money', color: colors.purple };
      default:
        return { ios: 'dollarsign.circle.fill', android: 'attach-money', color: colors.primary };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderEarningItem = ({ item }: { item: CreatorEarning }) => {
    const icon = getSourceIcon(item.source);
    const sourceLabel = item.source.charAt(0).toUpperCase() + item.source.slice(1);

    return (
      <View style={styles.earningItem}>
        <View style={styles.earningLeft}>
          <View style={styles.earningIcon}>
            <IconSymbol
              ios_icon_name={icon.ios}
              android_material_icon_name={icon.android}
              size={20}
              color={icon.color}
            />
          </View>
          <View style={styles.earningInfo}>
            <Text style={styles.earningSource}>{sourceLabel}</Text>
            <Text style={styles.earningDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.earningAmount}>+{formatCurrency(item.amount)}</Text>
      </View>
    );
  };

  const renderWithdrawalItem = ({ item }: { item: CreatorWithdrawal }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);

    return (
      <View style={styles.withdrawalItem}>
        <View style={styles.withdrawalLeft}>
          <View style={styles.withdrawalIcon}>
            <IconSymbol
              ios_icon_name="arrow.up.circle.fill"
              android_material_icon_name="arrow-upward"
              size={20}
              color={colors.coral}
            />
          </View>
          <View style={styles.withdrawalInfo}>
            <Text style={styles.withdrawalAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.withdrawalDate}>{formatDate(item.requestedAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  if (isLoading && !earningsSummary) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Earnings',
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

  const currentBalance = earningsSummary?.currentBalance || 0;
  const earningsHistory = earningsSummary?.earningsHistory || [];
  const canWithdraw = currentBalance >= 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Earnings',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
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
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
          <TouchableOpacity
            style={[styles.withdrawButton, !canWithdraw && styles.withdrawButtonDisabled]}
            onPress={handleWithdrawPress}
            disabled={!canWithdraw}
          >
            <IconSymbol
              ios_icon_name="arrow.up.circle.fill"
              android_material_icon_name="arrow-upward"
              size={20}
              color={canWithdraw ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.withdrawButtonText, !canWithdraw && styles.withdrawButtonTextDisabled]}>
              Withdraw
            </Text>
          </TouchableOpacity>
          {!canWithdraw && (
            <Text style={styles.minWithdrawText}>Minimum withdrawal: $100</Text>
          )}
        </View>

        {/* Earnings History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings History</Text>
          {earningsHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="dollarsign.circle"
                android_material_icon_name="attach-money"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No earnings yet</Text>
            </View>
          ) : (
            <FlatList
              data={earningsHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderEarningItem}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Withdrawal History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Withdrawal History</Text>
          {withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="arrow.up.circle"
                android_material_icon_name="arrow-upward"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No withdrawals yet</Text>
            </View>
          ) : (
            <FlatList
              data={withdrawals}
              keyExtractor={(item) => item.id}
              renderItem={renderWithdrawalItem}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        title="Withdraw Funds"
        message=""
        type="info"
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
        }}
      >
        <View style={styles.withdrawModalContent}>
          <Text style={styles.withdrawModalLabel}>Available Balance</Text>
          <Text style={styles.withdrawModalBalance}>{formatCurrency(currentBalance)}</Text>
          
          <Text style={styles.withdrawModalLabel}>Withdrawal Amount</Text>
          <TextInput
            style={styles.withdrawInput}
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
          />
          
          <Text style={styles.withdrawModalNote}>
            Minimum withdrawal: $100
          </Text>

          <TouchableOpacity
            style={[styles.confirmButton, withdrawing && styles.confirmButtonDisabled]}
            onPress={handleWithdrawConfirm}
            disabled={withdrawing}
          >
            {withdrawing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Withdrawal</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

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
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  withdrawButtonDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  withdrawButtonTextDisabled: {
    color: colors.textSecondary,
  },
  minWithdrawText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  earningItem: {
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
  earningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningInfo: {
    gap: 4,
  },
  earningSource: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  earningDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  withdrawalItem: {
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
  withdrawalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  withdrawalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawalInfo: {
    gap: 4,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  withdrawalDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  withdrawModalContent: {
    width: '100%',
    paddingTop: 16,
  },
  withdrawModalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  withdrawModalBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  withdrawInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  withdrawModalNote: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
