
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal as RNModal,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/ui/Toast';
import { authenticatedPost } from '@/utils/api';

export type ReportTargetType = 'video' | 'user' | 'comment';

export interface ReportSheetProps {
  isVisible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: ReportTargetType;
  targetName?: string;
}

export type ReportReason =
  | 'Spam'
  | 'Contenido inapropiado'
  | 'Acoso o bullying'
  | 'Violencia o contenido peligroso'
  | 'Discurso de odio'
  | 'Violación de derechos de autor'
  | 'Otro';

const REPORT_REASONS: ReportReason[] = [
  'Spam',
  'Contenido inapropiado',
  'Acoso o bullying',
  'Violencia o contenido peligroso',
  'Discurso de odio',
  'Violación de derechos de autor',
  'Otro',
];

type Step = 1 | 2 | 3;

export default function ReportSheet({
  isVisible,
  onClose,
  targetId,
  targetType,
  targetName,
}: ReportSheetProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState<string>('');
  const [wantsToBlock, setWantsToBlock] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const resetState = () => {
    setCurrentStep(1);
    setSelectedReason(null);
    setDescription('');
    setWantsToBlock(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleReasonSelect = (reason: ReportReason) => {
    console.log('User selected report reason:', reason);
    setSelectedReason(reason);
    setCurrentStep(2);
  };

  const handleReportSubmit = async () => {
    if (!selectedReason || !user?.id) {
      console.log('Cannot submit report: missing reason or user');
      return;
    }

    // Prevent self-reports
    if (user.id === targetId) {
      console.log('User attempted to report themselves');
      showToast('No puedes reportarte o bloquearte a ti mismo.', 'error');
      return;
    }

    console.log('Submitting report:', {
      reporterId: user.id,
      targetId,
      targetType,
      reason: selectedReason,
      description,
    });

    setIsSubmitting(true);

    try {
      await authenticatedPost('/api/reports', {
        target_id: targetId,
        target_type: targetType,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      console.log('Report submitted successfully');
      showToast('Reporte enviado con éxito', 'success');

      // If user wants to block and target is a user, go to block confirmation
      if (wantsToBlock && targetType === 'user') {
        setCurrentStep(3);
      } else {
        // Close modal after successful report
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      showToast('Error al enviar el reporte', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockConfirm = async () => {
    if (!user?.id || targetType !== 'user') {
      console.log('Cannot block: missing user or target is not a user');
      return;
    }

    console.log('Blocking user:', { blockerId: user.id, blockedId: targetId });
    setIsSubmitting(true);

    try {
      await authenticatedPost('/api/blocks', {
        blocked_id: targetId,
      });

      console.log('User blocked successfully');
      showToast('Usuario bloqueado con éxito', 'success');

      // Close modal after successful block
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('Error al bloquear usuario', 'error');
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Selecciona un motivo</Text>
        <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
          {REPORT_REASONS.map((reason, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reasonItem}
              onPress={() => handleReasonSelect(reason)}
              activeOpacity={0.7}
            >
              <View style={styles.reasonLeft}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={24}
                  color={colors.secondary}
                />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStep2 = () => {
    const canShowBlock = targetType === 'user';

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Detalles del reporte</Text>
        
        <View style={styles.selectedReasonContainer}>
          <Text style={styles.selectedReasonLabel}>Motivo seleccionado:</Text>
          <Text style={styles.selectedReasonText}>{selectedReason}</Text>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe el problema..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={handleReportSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
            </Text>
          </TouchableOpacity>

          {canShowBlock && (
            <TouchableOpacity
              style={[styles.blockButton, isSubmitting && styles.disabledButton]}
              onPress={() => {
                setWantsToBlock(true);
                handleReportSubmit();
              }}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.blockButtonText}>Bloquear usuario</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(1)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    const displayName = targetName || 'este usuario';

    return (
      <View style={styles.stepContainer}>
        <View style={styles.warningIconContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={48}
            color={colors.secondary}
          />
        </View>

        <Text style={styles.confirmTitle}>
          ¿Estás seguro de que quieres bloquear a {displayName}?
        </Text>
        <Text style={styles.confirmDescription}>
          No podrás ver sus videos ni recibir notificaciones suyas
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.destructiveButton, isSubmitting && styles.disabledButton]}
            onPress={handleBlockConfirm}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.destructiveButtonText}>
              {isSubmitting ? 'Bloqueando...' : 'Sí, bloquear'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <>
      <RNModal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={styles.androidBlur} />
          )}

          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerHandle} />
              <Text style={styles.headerTitle}>Reportar</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
              {targetType === 'user' && (
                <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]} />
              )}
            </View>

            {/* Content */}
            {renderContent()}
          </View>
        </View>
      </RNModal>

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
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerHandle: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  reasonsList: {
    maxHeight: 400,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reasonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  selectedReasonContainer: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedReasonLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  selectedReasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  descriptionInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    marginBottom: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  blockButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  destructiveButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
});
