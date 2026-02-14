
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useSubscriptions, UserSubscription } from '@/hooks/useSubscriptions';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ManageSubscriptionsScreen() {
  const { fetchActiveSubscriptions, cancelSubscription, reactivateSubscription, isLoading } = useSubscriptions();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadSubscriptions = async () => {
    try {
      console.log('Loading active subscriptions');
      const activeSubs = await fetchActiveSubscriptions();
      setSubscriptions(activeSubs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      showToast('Failed to load subscriptions', 'error');
    }
  };

  const handleCancelPress = (subscription: UserSubscription) => {
    console.log('User tapped Cancel button for subscription:', subscription.id);
    setSelectedSubscription(subscription);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;

    try {
      console.log('Confirming subscription cancellation');
      await cancelSubscription(selectedSubscription.id);
      
      // Update local state
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === selectedSubscription.id
            ? { ...sub, cancel_at_period_end: true }
            : sub
        )
      );

      setCancelModalVisible(false);
      showToast('Subscription will be canceled at the end of the billing period', 'success');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      showToast('Failed to cancel subscription', 'error');
    }
  };

  const handleReactivate = async (subscription: UserSubscription) => {
    try {
      console.log('User tapped Reactivate button for subscription:', subscription.id);
      await reactivateSubscription(subscription.id);
      
      // Update local state
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscription.id
            ? { ...sub, cancel_at_period_end: false }
            : sub
        )
      );

      showToast('Subscription reactivated successfully', 'success');
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      showToast('Failed to reactivate subscription', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const formatPrice = (cents: number) => {
    const priceDisplay = (cents / 100).toFixed(2);
    return priceDisplay;
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Subscriptions',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.purple} />
        }
      >
        {isLoading && subscriptions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="star.slash"
              android_material_icon_name="star-border"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
            <Text style={styles.emptyText}>
              You don&apos;t have any active subscriptions yet.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/discover')}
              activeOpacity={0.7}
            >
              <Text style={styles.exploreButtonText}>Explore Creators</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.subscriptionsList}>
            {subscriptions.map((subscription) => {
              const priceDisplay = formatPrice(subscription.price_monthly || 0);
              const renewalDate = formatDate(subscription.current_period_end);
              const isPending = subscription.cancel_at_period_end;
              const isPastDue = subscription.status === 'past_due';

              return (
                <View key={subscription.id} style={styles.subscriptionCard}>
                  <TouchableOpacity
                    style={styles.creatorInfo}
                    onPress={() => router.push(`/profile/${subscription.creator_id}`)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={resolveImageSource(subscription.creator_avatar)}
                      style={styles.avatar}
                    />
                    <View style={styles.creatorDetails}>
                      <Text style={styles.creatorUsername}>@{subscription.creator_username}</Text>
                      <Text style={styles.tierName}>{subscription.tier_name}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.subscriptionDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Price</Text>
                      <Text style={styles.detailValue}>${priceDisplay}/month</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={styles.statusContainer}>
                        {isPastDue ? (
                          <>
                            <IconSymbol
                              ios_icon_name="exclamationmark.triangle.fill"
                              android_material_icon_name="warning"
                              size={14}
                              color={colors.coral}
                            />
                            <Text style={[styles.statusText, { color: colors.coral }]}>
                              Payment Failed
                            </Text>
                          </>
                        ) : isPending ? (
                          <>
                            <IconSymbol
                              ios_icon_name="clock.fill"
                              android_material_icon_name="schedule"
                              size={14}
                              color={colors.textSecondary}
                            />
                            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                              Canceling
                            </Text>
                          </>
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="checkmark.circle.fill"
                              android_material_icon_name="check-circle"
                              size={14}
                              color={colors.turquoise}
                            />
                            <Text style={[styles.statusText, { color: colors.turquoise }]}>
                              Active
                            </Text>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {isPending ? 'Ends on' : 'Renews on'}
                      </Text>
                      <Text style={styles.detailValue}>{renewalDate}</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {isPending ? (
                      <TouchableOpacity
                        style={styles.reactivateButton}
                        onPress={() => handleReactivate(subscription)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.reactivateButtonText}>Reactivate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelPress(subscription)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        title="Cancel Subscription?"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Are you sure you want to cancel your subscription? You&apos;ll continue to have access until the end of your billing period.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setCancelModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Keep Subscription</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={handleCancelConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.modalConfirmButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 100,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionsList: {
    padding: 16,
    gap: 16,
  },
  subscriptionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  creatorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  creatorUsername: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  tierName: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  subscriptionDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.coral,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reactivateButton: {
    flex: 1,
    backgroundColor: colors.purple,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reactivateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  modalText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.coral,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
