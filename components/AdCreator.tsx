
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { useAds } from '@/hooks/useAds';
import Toast from '@/components/ui/Toast';

interface AdCreatorProps {
  onComplete?: () => void;
}

export default function AdCreator({ onComplete }: AdCreatorProps) {
  const { createAdCampaign, loading } = useAds();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [creativeUrl, setCreativeUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [ageRange, setAgeRange] = useState('18-24');
  const [interests, setInterests] = useState('');
  const [locations, setLocations] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const displayToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleSubmit = async () => {
    console.log('Submitting ad campaign');
    if (!name || !budget || !creativeUrl || !ctaText || !ctaUrl) {
      displayToast('Please fill all required fields', 'error');
      return;
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      displayToast('Please enter a valid budget', 'error');
      return;
    }

    try {
      await createAdCampaign({
        name,
        budget: budgetNum,
        creative_url: creativeUrl,
        cta_text: ctaText,
        cta_url: ctaUrl,
        target_audience: {
          age_range: ageRange,
          interests: interests.split(',').map((s) => s.trim()).filter(Boolean),
          locations: locations.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      displayToast('Campaign created successfully!', 'success');
      // Reset form
      setName('');
      setBudget('');
      setCreativeUrl('');
      setCtaText('');
      setCtaUrl('');
      setInterests('');
      setLocations('');
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      displayToast('Failed to create campaign', 'error');
    }
  };

  const ageRangeOptions = ['18-24', '25-34', '35-44', '45+'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Create Ad Campaign</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Campaign Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Summer Sale 2024"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Budget (USD) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 1000.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Creative URL (Video/Image) *</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/video.mp4"
          placeholderTextColor={colors.textSecondary}
          value={creativeUrl}
          onChangeText={setCreativeUrl}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Call to Action Text *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Shop Now"
          placeholderTextColor={colors.textSecondary}
          value={ctaText}
          onChangeText={setCtaText}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Call to Action URL *</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com"
          placeholderTextColor={colors.textSecondary}
          value={ctaUrl}
          onChangeText={setCtaUrl}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.sectionTitle}>Target Audience</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age Range</Text>
        <View style={styles.ageRangeContainer}>
          {ageRangeOptions.map((range) => {
            const isSelected = ageRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[styles.ageRangeButton, isSelected && styles.ageRangeButtonSelected]}
                onPress={() => setAgeRange(range)}
              >
                <Text style={[styles.ageRangeText, isSelected && styles.ageRangeTextSelected]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Interests (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., fashion, travel, tech"
          placeholderTextColor={colors.textSecondary}
          value={interests}
          onChangeText={setInterests}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Locations (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New York, London, Tokyo"
          placeholderTextColor={colors.textSecondary}
          value={locations}
          onChangeText={setLocations}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.submitButtonText}>Create Campaign</Text>
        )}
      </TouchableOpacity>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setShowToast(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageRangeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ageRangeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageRangeButtonSelected: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  ageRangeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  ageRangeTextSelected: {
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
