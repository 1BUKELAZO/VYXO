
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import GiftPicker from './GiftPicker';

interface GiftButtonProps {
  videoId: string;
  recipientId: string;
  onGiftSent?: (giftName: string, giftIcon: string) => void;
}

export default function GiftButton({ videoId, recipientId, onGiftSent }: GiftButtonProps) {
  const [showGiftPicker, setShowGiftPicker] = useState(false);

  const handlePress = () => {
    console.log('User tapped Gift button, opening gift picker');
    setShowGiftPicker(true);
  };

  const handleGiftSent = (giftName: string, giftIcon: string) => {
    console.log('Gift sent successfully:', giftName);
    setShowGiftPicker(false);
    if (onGiftSent) {
      onGiftSent(giftName, giftIcon);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.giftButton} onPress={handlePress}>
        <IconSymbol
          ios_icon_name="gift.fill"
          android_material_icon_name="card-giftcard"
          size={32}
          color={colors.coral}
        />
      </TouchableOpacity>

      <GiftPicker
        isVisible={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        videoId={videoId}
        recipientId={recipientId}
        onGiftSent={handleGiftSent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  giftButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
