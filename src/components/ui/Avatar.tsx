import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { T } from './T';

export type AvatarProps = {
  uri?: string | null;
  /** Used for the initials fallback and the accessibility label. */
  name?: string | null;
  login?: string | null;
  size: number;
  radius?: number;
  /** Show the green online dot. */
  dot?: boolean;
  dotSize?: number;
  dotBorderColor?: ColorToken;
  dotBorderWidth?: number;
  style?: StyleProp<ViewStyle>;
};

function initialsFor(name?: string | null, login?: string | null): string {
  const source = (name ?? login ?? '?').trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

/** design.md §3.25 — remote avatar with an initials fallback and online dot. */
export function Avatar({
  uri,
  name,
  login,
  size,
  radius = 10,
  dot = false,
  dotSize,
  dotBorderColor = 'surface',
  dotBorderWidth,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const resolvedDotSize = dotSize ?? Math.max(9, Math.round(size * 0.24));
  const resolvedDotBorder = dotBorderWidth ?? (size >= 60 ? 3 : 2);
  const showImage = Boolean(uri) && failedUri !== uri;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ?? login ?? 'Avatar'}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.colors.accentSoft,
        },
        style,
      ]}>
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={150}
          onError={() => setFailedUri(uri ?? null)}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
        />
      ) : (
        <T size={Math.max(11, Math.round(size * 0.36))} weight="800" color="greenStrong">
          {initialsFor(name, login)}
        </T>
      )}

      {dot ? (
        <View
          style={[
            styles.dot,
            {
              width: resolvedDotSize,
              height: resolvedDotSize,
              borderRadius: resolvedDotSize / 2,
              right: -1,
              bottom: -1,
              borderWidth: resolvedDotBorder,
              borderColor: theme.colors[dotBorderColor],
              backgroundColor: theme.colors.accent,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
});
