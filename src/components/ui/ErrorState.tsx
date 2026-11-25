import { useEffect, useState } from 'react';
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
  /**
   * `RATE_LIMITED` — seconds until retrying is allowed. Counts down live and
   * keeps the retry button disabled until it reaches 0, so the copy can never
   * promise a wait that has already passed.
   */
  retryAfter?: number;
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
  retryAfter,
  githubUrl,
  icon = 'close',
  style,
}: ErrorStateProps) {
  const theme = useTheme();
  const [cooldown, setCooldown] = useState(() => retryAfter ?? 0);
  const [seenRetryAfter, setSeenRetryAfter] = useState(retryAfter);

  // Error berikutnya datang dengan `retryAfter` baru → reset hitung mundur
  // saat render (pola React "adjusting state when props change"), bukan di
  // effect agar tidak ada setState sinkron yang memicu render berantai.
  if (retryAfter !== seenRetryAfter) {
    setSeenRetryAfter(retryAfter);
    setCooldown(retryAfter ?? 0);
  }

  // Timer = sistem eksternal; setState hanya di callback interval dan
  // berhenti sendiri saat jawaannya habis.
  useEffect(() => {
    const total = retryAfter ?? 0;
    if (total <= 0) return undefined;
    const deadline = Date.now() + total * 1000;
    const timer = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        setCooldown(0);
        clearInterval(timer);
      } else {
        setCooldown(left);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const cooling = cooldown > 0;

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

      {cooling ? (
        <T
          size={8}
          color="error"
          style={styles.countdown}
          accessibilityLiveRegion="polite">
          {`Coba lagi dalam ${cooldown} detik.`}
        </T>
      ) : null}

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityState={{ disabled: cooling }}
          android_ripple={{ color: 'transparent' }}
          disabled={cooling}
          hitSlop={hitSlopFor(96, 44)}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            {
              backgroundColor: theme.colors.accent,
              opacity: cooling ? 0.45 : pressed ? 0.85 : 1,
            },
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
  countdown: {
    marginTop: 6,
    textAlign: 'center',
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
