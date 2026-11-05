import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeedItem } from '@/api/contracts';
import { feedAdapter } from '@/api/feed';
import { describeError } from '@/api/errors';
import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';

export type ReportReasonPreset =
  | 'spam'
  | 'plagiarism'
  | 'fake'
  | 'inappropriate'
  | 'other';

export const REPORT_REASON_PRESETS: Array<{
  value: ReportReasonPreset;
  label: string;
}> = [
  { value: 'spam', label: 'Spam / promosi ilegal' },
  { value: 'plagiarism', label: 'Plagiarisme / kerja orang lain' },
  { value: 'fake', label: 'Project palsu / tidak ada' },
  { value: 'inappropriate', label: 'Konten tidak pantas' },
  { value: 'other', label: 'Lainnya' },
];

const REASON_PRESET_LABELS: Record<ReportReasonPreset, string> = {
  spam: 'Spam / promosi ilegal',
  plagiarism: 'Plagiarisme / kerja orang lain',
  fake: 'Project palsu / tidak ada',
  inappropriate: 'Konten tidak pantas',
  other: 'Lainnya',
};

export type ReportProjectSheetProps = {
  visible: boolean;
  item: FeedItem | null;
  onReport: (success: boolean, error?: string) => void;
  onClose: () => void;
};

/** C4 — bottom sheet untuk melaporkan project. */
export function ReportProjectSheet({
  visible,
  item,
  onReport,
  onClose,
}: ReportProjectSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReasonPreset | ''>('');
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [charsLeft, setCharsLeft] = useState(500);
  const textInputRef = useRef<TextInput>(null);

  const maxChars = 500;

  const updateCustomText = useCallback(
    (text: string) => {
      setCustomText(text.slice(0, maxChars));
      setCharsLeft(maxChars - text.length);
    },
    [maxChars],
  );

  const handleClose = useCallback(() => {
    setReason('');
    setCustomText('');
    setError('');
    setSubmitting(false);
    setCharsLeft(maxChars);
    onClose();
  }, [maxChars, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!item || !reason) {
      setError('Pilih alasan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Build reason string: preset label + optional custom text
      const presetLabel = REASON_PRESET_LABELS[reason];
      const fullReason = customText.trim()
        ? `${presetLabel} — ${customText.trim()}`
        : presetLabel;

      // Clamp to 500 chars just in case
      const clampedReason = fullReason.slice(0, maxChars);

      await feedAdapter.reportProject(item.id, clampedReason);
      onReport(true);
      handleClose();
    } catch (err) {
      const described = describeError(err);
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'RATE_LIMITED') {
        onReport(false, 'Terlalu banyak laporan. Coba lagi nanti.');
      } else {
        onReport(false, described.message);
      }
      setSubmitting(false);
    }
  }, [item, reason, customText, onReport, handleClose]);

  // Focus text input when sheet opens and "other" is selected
  const handlePresetSelect = useCallback(
    (value: ReportReasonPreset) => {
      setReason(value);
      setError('');
      if (value === 'other') {
        // Small delay to ensure the sheet is rendered
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
    },
    [],
  );

  if (!visible) return null;

  // Hide header when closed
  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.backdrop, opacity: 0.5 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tutup laporan"          onPress={handleClose}
            style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.line,
            marginBottom: Math.max(12, insets.bottom),
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <T size={9} color="muted" style={styles.headerLabel}>
            LAPORan project
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup"
            onPress={handleClose}
            style={styles.closeButton}>
            <Icon name="close" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>

        <T size={11} color="ink" style={styles.title}>
          Laporkan {item?.name ?? 'project'}
        </T>

        <T size={8} color="muted" style={styles.subtitle}>
          Pilih alasan (wajib)
        </T>

        {/* Reason presets */}
        <View style={styles.presetsContainer}>
          {REPORT_REASON_PRESETS.map((preset) => {
            const selected = reason === preset.value;
            return (
              <Pressable
                key={preset.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => handlePresetSelect(preset.value)}
                style={({ pressed }) => [
                  styles.presetRow,
                  selected && { backgroundColor: theme.colors.accentSoft },
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.radioCircle,
                    { borderColor: selected ? theme.colors.greenStrong : theme.colors.line },
                    { backgroundColor: selected ? theme.colors.greenStrong : 'transparent' },
                  ]}
                >
                  {selected && <View style={styles.radioDot} />}
                </View>
                <T size={11} color={selected ? 'accent' : 'ink'}>
                  {preset.label}
                </T>
              </Pressable>
            );
          })}
        </View>

        {/* Custom text input (only when "other" is selected) */}
        {reason === 'other' && (
          <View style={styles.textContainer}>
            <View              style={[styles.textInputWrapper, { backgroundColor: theme.colors.paper }]}>
              <TextInput
                ref={textInputRef}
                style={[styles.textInput, { color: theme.colors.ink }]}
                value={customText}
                onChangeText={updateCustomText}
                placeholder="Tulis alasan tambahan (opsional)"
                placeholderTextColor={theme.colors.muted}
                multiline
                numberOfLines={4}
                maxLength={maxChars}
                textAlignVertical="top"
                editable={!submitting}
                accessibilityLabel="Alasan tambahan"
              />
            </View>
            <T size={7} color={charsLeft < 50 ? 'error' : 'muted'}>
              {charsLeft} karakter tersisa
            </T>
          </View>
        )}

        {/* Error message */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error }]}>
            <T size={9} color="error">
              {error}
            </T>
          </View>
        ) : null}

        {/* Submit button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kirim laporan"
          onPress={handleSubmit}
          disabled={submitting || !reason}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: reason ? theme.colors.greenStrong : theme.colors.line },
            !reason && styles.submitDisabled,
            pressed && styles.pressed,
          ]}>
          {submitting ? (
            <T size={11} color="greenText" style={styles.submitText}>
              Mengirim...
            </T>
          ) : (
            <>
              <T size={11} color="greenText" weight="700">
                Kirim laporan
              </T>
              <Icon name="send" size={14} color="greenText" />
            </>
          )}
        </Pressable>

        <T size={7} color="muted" style={styles.footerNote}>
          Laporan Anda akan ditinjau oleh tim kami.
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 12,
  },
  presetsContainer: {
    gap: 6,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleFilled: {
    backgroundColor: 'transparent',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    marginTop: 12,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  submitButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 8,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  textInputWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 80,
    padding: 12,
  },
});
