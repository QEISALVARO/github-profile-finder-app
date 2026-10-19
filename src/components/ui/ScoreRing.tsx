import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { FontWeight } from '@/theme/typography';
import { T } from './T';

const RING_SIZE = 82;
const RING_RADIUS = 36.25;
const RING_STROKE = 8.5;

export type ScoreRingProps = {
  /** 0–100 authenticity score. */
  value: number;
  size?: number;
  /** Filled centre behind the ring (the score card uses the accent colour). */
  background?: ColorToken;
  trackColor?: ColorToken;
  progressColor?: ColorToken;
  valueColor?: ColorToken;
  showMax?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * design.md §3.11 / R3 — `conic-gradient` replacement built from two SVG
 * circles. Renders 73, 90 and 96 exactly like the prototype.
 */
export function ScoreRing({
  value,
  size = RING_SIZE,
  background = 'accent',
  trackColor = 'ringTrack',
  progressColor = 'onAccent',
  valueColor = 'onAccent',
  showMax = true,
  accessibilityLabel,
  style,
}: ScoreRingProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  const scale = size / RING_SIZE;
  const center = size / 2;
  const radius = RING_RADIUS * scale;
  const strokeWidth = RING_STROKE * scale;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `Authenticity score ${clamped} of 100`}
      style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors[trackColor]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle cx={center} cy={center} r={radius - strokeWidth / 2} fill={theme.colors[background]} />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors[progressColor]}
          strokeWidth={strokeWidth}
          strokeDasharray={[dash, circumference]}
          strokeLinecap="butt"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.ringLabel} pointerEvents="none">
        <T size={25} weight="700" ls={-1} color={valueColor}>
          {clamped}
        </T>
        {showMax ? (
          <T size={8} weight="500" color={valueColor} style={styles.maxLabel}>
            /100
          </T>
        ) : null}
      </View>
    </View>
  );
}

type ScoreCircleDefaults = {
  background: ColorToken | 'transparent';
  bordered: boolean;
  valueSize: number;
  valueWeight: FontWeight;
  label?: string;
  labelSize: number;
};

const CIRCLE_DEFAULTS: Record<number, ScoreCircleDefaults> = {
  35: { background: 'transparent', bordered: true, valueSize: 11, valueWeight: '700', label: 'AUTH', labelSize: 4 },
  43: { background: 'accentSoft', bordered: false, valueSize: 13, valueWeight: '700', label: 'AUTH', labelSize: 5 },
  30: { background: 'accentSoft', bordered: false, valueSize: 8, valueWeight: '700', labelSize: 5 },
  27: { background: 'accentSoft', bordered: false, valueSize: 8, valueWeight: '800', labelSize: 5 },
};

export type ScoreCircleProps = {
  value: number;
  /** 35 (feed), 43 (candidate), 30 (repo pill) or 27 (chat context). */
  size: number;
  label?: string;
  background?: ColorToken | 'transparent';
  bordered?: boolean;
  borderColor?: ColorToken;
  valueSize?: number;
  valueWeight?: FontWeight;
  valueColor?: ColorToken;
  labelColor?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

/** Small static score badge used across feed, talent, repos and chat. */
export function ScoreCircle({
  value,
  size,
  label,
  background,
  bordered,
  borderColor = 'scoreCircleBorder',
  valueSize,
  valueWeight,
  valueColor = 'greenStrong',
  labelColor = 'greenStrong',
  style,
}: ScoreCircleProps) {
  const theme = useTheme();
  const preset = CIRCLE_DEFAULTS[size] ?? {
    background: 'accentSoft' as const,
    bordered: false,
    valueSize: 11,
    valueWeight: '700' as FontWeight,
    labelSize: 5,
  };
  const resolvedBackground = background ?? preset.background;
  const resolvedLabel = label ?? preset.label;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Authenticity ${value}`}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor:
            resolvedBackground === 'transparent' ? 'transparent' : theme.colors[resolvedBackground],
          borderWidth: (bordered ?? preset.bordered) ? 1 : 0,
          borderColor: theme.colors[borderColor],
        },
        style,
      ]}>
      <T size={valueSize ?? preset.valueSize} weight={valueWeight ?? preset.valueWeight} color={valueColor}>
        {value}
      </T>
      {resolvedLabel ? (
        <T size={preset.labelSize} mono ls={0.4} color={labelColor}>
          {resolvedLabel}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ringLabel: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxLabel: {
    marginBottom: 3,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
