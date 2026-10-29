import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { openGithubUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';

export type ErrorStateProps = {
  title: string;
  message?: string;
  /** Rendered as the primary retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  /** `UPSTREAM_ERROR` — offer "Buka di GitHub" as a second action. */
  githubUrl?: string;
  icon?: IconName;
  style?: object;
};

/**
 * FE-2 — generic error card (PRD v2 §15: `RATE_LIMITED` / `NOT_FOUND` with a
 * retry). Uses the same dashed-shell language as the feed empty state so
 * failure and "nothing found" read as two different situations, not one.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Coba lagi',
  githubUrl,
  icon = 'close',
  style,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <Card
      variant="base"
      padding={20}
      borderStyle="dashed"
      style={[styles.card, style]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name={icon} size={22} color={theme.colors.greenText} />
      </View>

      <T size={12} weight="700" style={styles.title}>
        {title}
      </T>

      {message ? (
        <T size={8} color="muted" style={styles.message}>
          {message}
        </T>
      ) : null}

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          android_ripple={{ color: 'transparent' }}
          hitSlop={hitSlopFor(96, 44)}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: theme.colors.accent },
            pressed && styles.pressed,
          ]}>
          <T size={8} weight="800" color="onAccent">
            {retryLabel}
          </T>
        </Pressable>
      ) : null}

      {githubUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Buka di GitHub"
          hitSlop={hitSlopFor(96, 44)}
          onPress={() => openGithubUrl(githubUrl)}
          style={({ pressed }) => [styles.github, pressed && styles.pressed]}>
          <T size={8} weight="700" color="greenText">
            Buka di GitHub
          </T>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
  },
  retry: {
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  github: {
    marginTop: 10,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});

export default ErrorState;
