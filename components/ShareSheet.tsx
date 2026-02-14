
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Platform,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import Toast from '@/components/ui/Toast';

interface ShareSheetProps {
  isVisible: boolean;
  onClose: () => void;
  videoId: string;
  videoUrl: string;
}

export default function ShareSheet({ isVisible, onClose, videoId, videoUrl }: ShareSheetProps) {
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const shareUrl = `https://vyxo.app/video/${videoId}`;

  const handleNativeShare = async () => {
    console.log('User tapped native share');
    try {
      await Share.share({
        message: `Check out this video on VYXO: ${shareUrl}`,
        url: shareUrl,
      });
      onClose();
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCopyLink = async () => {
    console.log('User tapped copy link');
    await Clipboard.setStringAsync(shareUrl);
    showToast('Link copied to clipboard');
    setTimeout(onClose, 1000);
  };

  const handleSocialShare = (platform: string) => {
    console.log('User tapped share to:', platform);
    showToast(`Share to ${platform} coming soon`);
    setTimeout(onClose, 1000);
  };

  return (
    <>
      <RNModal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.container}>
            <View style={styles.handle} />

            <Text style={styles.title}>Share to</Text>

            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSocialShare('Instagram')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E4405F' }]}>
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="camera"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSocialShare('Twitter')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#1DA1F2' }]}>
                  <IconSymbol
                    ios_icon_name="bird.fill"
                    android_material_icon_name="share"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>Twitter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSocialShare('Facebook')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#4267B2' }]}>
                  <IconSymbol
                    ios_icon_name="f.circle.fill"
                    android_material_icon_name="share"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSocialShare('Telegram')}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#0088CC' }]}>
                  <IconSymbol
                    ios_icon_name="paperplane.fill"
                    android_material_icon_name="send"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>Telegram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSocialShare('SMS')}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.turquoise }]}>
                  <IconSymbol
                    ios_icon_name="message.fill"
                    android_material_icon_name="message"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
                <View style={[styles.iconContainer, { backgroundColor: colors.purple }]}>
                  <IconSymbol
                    ios_icon_name="link"
                    android_material_icon_name="link"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={handleNativeShare}>
                <View style={[styles.iconContainer, { backgroundColor: colors.coral }]}>
                  <IconSymbol
                    ios_icon_name="square.and.arrow.up"
                    android_material_icon_name="share"
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={styles.optionText}>More</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </RNModal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="info"
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  option: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionText: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
