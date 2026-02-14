
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSubscriptions, SubscriptionTier } from '@/hooks/useSubscriptions';
import Modal from '@/components/ui/Modal';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface SubscribeButtonProps {
  creatorId: string;
  onSubscribeSuccess?: () => void;
}

export default function SubscribeButton({ creatorId, onSubscribeSuccess }: SubscribeButtonProps) {
  const {
    tiers,
    userSubscription,
    isLoading,
    createSubscriptionCheckout,
  } = useSubscriptions(creatorId);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  const isSubscribed = userSubscription && userSubscription.status === 'active';
  const isPending = userSubscription && userSubscription.cancel_at_period_end;

  const handleSubscribe = async (tier: SubscriptionTier) => {
    try {
      console.log('User tapped Subscribe button for tier:', tier.name);
      await createSubscriptionCheckout(tier.id);
      setModalVisible(false);
      
      if (onSubscribeSuccess) {
        onSubscribeSuccess();
      }
    } catch (error) {
      console.error('Failed to create subscription checkout:', error);
    }
  };

  const formatPrice = (cents: number) => {
    const priceDisplay = (cents / 100).toFixed(2);
    return priceDisplay;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  if (isSubscribed) {
    const statusText = isPending ? 'Canceling' : 'Subscribed';
    const statusColor = isPending ? colors.coral : colors.purple;
    
    return (
      <View style={[styles.subscribedButton, { backgroundColor: statusColor }]}>
        <IconSymbol
          ios_icon_name="checkmark.circle.fill"
          android_material_icon_name="check-circle"
          size={16}
          color="#fff"
        />
        <Text style={styles.subscribedText}>{statusText}</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name="star.fill"
          android_material_icon_name="star"
          size={16}
          color="#fff"
        />
        <Text style={styles.subscribeText}>Subscribe</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Choose a Subscription Tier"
      >
        <ScrollView style={styles.modalContent}>
          {tiers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                This creator hasn&apos;t set up subscription tiers yet.
              </Text>
            </View>
          ) : (
            tiers.map((tier) => {
              const priceDisplay = formatPrice(tier.price_monthly);
              
              return (
                <View key={tier.id} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceAmount}>${priceDisplay}</Text>
                      <Text style={styles.priceLabel}>/month</Text>
                    </View>
                  </View>

                  <View style={styles.benefitsContainer}>
                    {tier.benefits.map((benefit, index) => (
                      <View key={index} style={styles.benefitRow}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={16}
                          color={colors.turquoise}
                        />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => handleSubscribe(tier)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.selectButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  subscribeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subscribedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  subscribedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 500,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  tierCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    color: colors.purple,
    fontSize: 24,
    fontWeight: '700',
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  benefitsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  selectButton: {
    backgroundColor: colors.purple,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
