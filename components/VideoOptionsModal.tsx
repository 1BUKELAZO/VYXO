
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface VideoOptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  videoId: string;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
}

export default function VideoOptionsModal({
  isVisible,
  onClose,
  videoId,
  onSave,
  onShare,
  onReport,
}: VideoOptionsModalProps) {
  const handleSave = () => {
    console.log('User selected Save from options');
    onSave();
    onClose();
  };

  const handleShare = () => {
    console.log('User selected Share from options');
    onShare();
    onClose();
  };

  const handleReport = () => {
    console.log('User selected Report from options');
    onReport();
  };

  return (
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

          <TouchableOpacity style={styles.option} onPress={handleSave}>
            <IconSymbol
              ios_icon_name="bookmark"
              android_material_icon_name="bookmark-border"
              size={24}
              color={colors.text}
            />
            <Text style={styles.optionText}>Save video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleShare}>
            <IconSymbol
              ios_icon_name="square.and.arrow.up"
              android_material_icon_name="share"
              size={24}
              color={colors.text}
            />
            <Text style={styles.optionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleReport}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="report"
              size={24}
              color={colors.error}
            />
            <Text style={[styles.optionText, { color: colors.error }]}>
              Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </RNModal>
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
