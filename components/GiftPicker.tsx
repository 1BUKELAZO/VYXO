
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal as RNModal,
  Platform,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useGifts, Gift, CoinPackage } from '@/hooks/useGifts';
import Toast from '@/components/ui/Toast';
import GiftAnimation from './GiftAnimation';

interface GiftPickerProps {
  isVisible: boolean;
  onClose: () => void;
  videoId: string;
  recipientId: string;
  onGiftSent?: (giftName: string, giftIcon: string) => void;
}

export default function GiftPicker({
  isVisible,
  onClose,
  videoId,
  recipientId,
  onGiftSent,
}: GiftPickerProps) {
  const { gifts, coinPackages, userCoins, isLoading, sendGift, buyCoins, refetchCoins } = useGifts();
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationGift, setAnimationGift] = useState<{ icon: string; name: string } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showCoinPackages, setShowCoinPackages] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleGiftSelect = (gift: Gift) => {
    console.log('User selected gift:', gift.name);
    setSelectedGift(gift);
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    const userBalance = userCoins?.balance || 0;
    
    if (userBalance < selectedGift.price_coins) {
      console.log('Insufficient coins, showing coin packages');
      showToast(`You need ${selectedGift.price_coins} coins. Buy more coins to send this gift!`, 'error');
      setShowCoinPackages(true);
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending gift to recipient');
      const response = await sendGift(selectedGift.id, videoId, recipientId);
      
      // Show animation
      setAnimationGift({ icon: selectedGift.icon, name: selectedGift.name });
      setShowAnimation(true);
      
      showToast(`${selectedGift.icon} ${selectedGift.name} sent!`, 'success');
      
      if (onGiftSent) {
        onGiftSent(selectedGift.name, selectedGift.icon);
      }
      
      // Close after animation
      setTimeout(() => {
        setShowAnimation(false);
        setAnimationGift(null);
        setSelectedGift(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to send gift:', err);
      if (err.error === 'Insufficient coins') {
        showToast('Insufficient coins. Buy more to send gifts!', 'error');
        setShowCoinPackages(true);
      } else {
        showToast('Failed to send gift. Please try again.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleBuyCoins = async (pkg: CoinPackage) => {
    try {
      console.log('User tapped buy coins package:', pkg.name);
      const checkoutUrl = await buyCoins(pkg.id);
      
      // Open Stripe checkout in browser
      await Linking.openURL(checkoutUrl);
      
      showToast('Opening checkout...', 'info');
      
      // Refresh coins after a delay (user might complete purchase)
      setTimeout(() => {
        refetchCoins();
      }, 5000);
    } catch (err) {
      console.error('Failed to create checkout:', err);
      showToast('Failed to open checkout. Please try again.', 'error');
    }
  };

  const formatPrice = (price: string): string => {
    const priceNum = parseFloat(price);
    return `$${priceNum.toFixed(2)}`;
  };

  const balanceDisplay = userCoins?.balance || 0;

  return (
    <>
      <RNModal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]} />
          )}

          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Send a Gift</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Coin Balance */}
            <View style={styles.balanceContainer}>
              <IconSymbol
                ios_icon_name="dollarsign.circle.fill"
                android_material_icon_name="monetization-on"
                size={20}
                color={colors.turquoise}
              />
              <Text style={styles.balanceText}>{balanceDisplay}</Text>
              <Text style={styles.balanceLabel}>coins</Text>
              <TouchableOpacity
                style={styles.buyCoinsButton}
                onPress={() => setShowCoinPackages(true)}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={20}
                  color={colors.purple}
                />
                <Text style={styles.buyCoinsText}>Buy Coins</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.purple} />
              </View>
            ) : showCoinPackages ? (
              /* Coin Packages View */
              <View style={styles.packagesContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowCoinPackages(false)}
                >
                  <IconSymbol
                    ios_icon_name="chevron.left"
                    android_material_icon_name="arrow-back"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={styles.backButtonText}>Back to Gifts</Text>
                </TouchableOpacity>

                <Text style={styles.packagesTitle}>Buy Coins</Text>
                <ScrollView style={styles.packagesList}>
                  {coinPackages.map((pkg) => {
                    const priceDisplay = formatPrice(pkg.price_usd);
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={styles.packageCard}
                        onPress={() => handleBuyCoins(pkg)}
                      >
                        <View style={styles.packageInfo}>
                          <Text style={styles.packageCoins}>{pkg.coins}</Text>
                          <Text style={styles.packageCoinsLabel}>coins</Text>
                        </View>
                        <View style={styles.packageRight}>
                          <Text style={styles.packageName}>{pkg.name}</Text>
                          <Text style={styles.packagePrice}>{priceDisplay}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              /* Gifts View */
              <>
                <ScrollView style={styles.giftsContainer}>
                  <View style={styles.giftsGrid}>
                    {gifts.map((gift) => {
                      const isSelected = selectedGift?.id === gift.id;
                      const canAfford = (userCoins?.balance || 0) >= gift.price_coins;
                      
                      return (
                        <TouchableOpacity
                          key={gift.id}
                          style={[
                            styles.giftCard,
                            isSelected && styles.giftCardSelected,
                            !canAfford && styles.giftCardDisabled,
                          ]}
                          onPress={() => handleGiftSelect(gift)}
                          disabled={!canAfford}
                        >
                          <Text style={styles.giftIcon}>{gift.icon}</Text>
                          <Text style={styles.giftName}>{gift.name}</Text>
                          <View style={styles.giftPriceContainer}>
                            <IconSymbol
                              ios_icon_name="dollarsign.circle"
                              android_material_icon_name="monetization-on"
                              size={14}
                              color={canAfford ? colors.turquoise : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.giftPrice,
                                !canAfford && styles.giftPriceDisabled,
                              ]}
                            >
                              {gift.price_coins}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Send Button */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!selectedGift || isSending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendGift}
                  disabled={!selectedGift || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>
                        {selectedGift ? `Send ${selectedGift.icon}` : 'Select a Gift'}
                      </Text>
                      {selectedGift && (
                        <Text style={styles.sendButtonPrice}>
                          {selectedGift.price_coins} coins
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </RNModal>

      {/* Gift Animation */}
      {showAnimation && animationGift && (
        <GiftAnimation
          giftIcon={animationGift.icon}
          giftName={animationGift.name}
          onAnimationEnd={() => {
            setShowAnimation(false);
            setAnimationGift(null);
          }}
        />
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.turquoise,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  buyCoinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
  },
  buyCoinsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.purple,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  giftsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  giftCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  giftCardSelected: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  giftCardDisabled: {
    opacity: 0.5,
  },
  giftIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  giftName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  giftPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  giftPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.turquoise,
  },
  giftPriceDisabled: {
    color: colors.textSecondary,
  },
  sendButton: {
    backgroundColor: colors.coral,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sendButtonPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  packagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  packagesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  packagesList: {
    flex: 1,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  packageCoins: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.turquoise,
  },
  packageCoinsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  packageRight: {
    alignItems: 'flex-end',
  },
  packageName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
