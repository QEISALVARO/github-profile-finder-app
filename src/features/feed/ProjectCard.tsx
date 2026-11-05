import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FeedItem } from '@/api/contracts';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Loader } from '@/components/ui/Loader';
import { ScoreCircle } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { availabilityLabel } from '@/lib/availability';
import { compactNumber } from '@/lib/feed';
import { openHttpsUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';
import { flagEmoji } from '@/data/countries';

const FOLDER_SIZE = 39;
const AVATAR_SIZE = 36;
const ANALYZE_MIN_WIDTH = 71;
const ANALYZE_HEIGHT = 32;

export type ProjectCardProps = {
  /** FE-2 — the card renders a contract `FeedItem` from `useFeed`. */
  item: FeedItem;
  index: number;
  /** D2 — true only for the card that is running Analyze. */
  loading: boolean;
  /** D2 — true while another card is loading (blocks this one's button). */
  disabled: boolean;
  onAnalyze: (item: FeedItem) => void;
};

/**
 * FR-E6 — feed project card (design.md §3.6). Memoized on purpose: query /
 * filter changes re-render the screen but must not re-render untouched cards,
 * so every prop here is primitive or a stable callback (PRD §10).
 */
export function ProjectCardComponent({
  item,
  index,
  loading,
  disabled,
  onAnalyze,
  onReport,
}: ProjectCardProps & { onReport?: (item: FeedItem) => void }) {
  const theme = useTheme();
  const developer = item.developer;
  const demoUrl = item.demoUrl ?? `https://github.com/${developer.login}`;
  const location = item.city ?? '';
  const countryFlag = item.countryCode ? flagEmoji(item.countryCode) : '';
  const analyzeDisabled = disabled || loading;

  // Badge: VERIFIED ACTIVE jika active, else VERIFIED
  const badgeText = item.active ? 'VERIFIED ACTIVE' : 'VERIFIED';

  return (
    <Card variant="project" style={styles.card}>
      {/* Left ribbon (4×70 accent) — clipped by the card's rounded corner. */}
      <View
        pointerEvents="none"
        style={[styles.ribbon, { backgroundColor: theme.colors.accent }]}
      />

      <View style={styles.topRow}>
        <T size={9} mono color="line" style={styles.rank}>
          {`0${index + 1}`}
        </T>

        <Badge variant="verified">{badgeText}</Badge>

        <ScoreCircle value={item.score} size={35} style={styles.score} />
      </View>

      <View style={styles.titleRow}>
        <View
          style={[
            styles.folder,
            { backgroundColor: theme.colors.accentSoft },
          ]}>
          <Icon name="repo" size={21} color={theme.colors.greenStrong} />
        </View>
        <View style={styles.titleColumn}>
          <T variant="titleCard" style={styles.title} numberOfLines={1}>
            {item.name}
          </T>
          <T size={8} color="muted" lh={1.55}>
            {item.description}
          </T>
          {location ? (
            <T size={7} color="muted">
              {countryFlag} {location}
            </T>
          ) : null}
        </View>
      </View>

      <View style={styles.stackRow}>
        <Chip variant="accent" size={6} weight="700">
          {item.role}
        </Chip>
        {item.stack.map((tech) => (
          <Chip key={tech.name} variant="default" size={6}>
            {tech.percent > 0 ? `${tech.name} ${tech.percent}%` : tech.name}
          </Chip>
        ))}
      </View>

      <View style={[styles.proofRow, { backgroundColor: theme.colors.paper }]}>
        <Icon name="check" size={12} color={theme.colors.greenText} />
        <T size={7} weight="700" color="greenText">
          Original work
        </T>

        {item.demoUrl && item.demoVerified ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Live demo - buka ${demoUrl}`}
            android_ripple={{ color: 'transparent' }}
            hitSlop={hitSlopFor(90, 24)}
            onPress={() => openHttpsUrl(demoUrl)}
            style={({ pressed }) => [styles.demoLink, pressed && styles.pressed]}>
            <View style={[styles.demoDot, { backgroundColor: theme.colors.greenStrong }]} />
            <T size={7} color="greenText" weight="700">
              Live demo
            </T>
          </Pressable>
        ) : item.demoUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Buka ${demoUrl}`}
            android_ripple={{ color: 'transparent' }}
            hitSlop={hitSlopFor(90, 24)}
            onPress={() => openHttpsUrl(demoUrl)}
            style={({ pressed }) => [styles.demoLink, pressed && styles.pressed]}>
            <View style={[styles.demoDot, { backgroundColor: theme.colors.accent }]} />
            <T size={7} color="greenText">
              Demo
            </T>
          </Pressable>
        ) : null}

        <View style={styles.stars}>
          <Icon name="star" size={12} color={theme.colors.muted} />
          <T size={7} color="muted">
            {compactNumber(item.stars)}
          </T>
        </View>
      </View>

      <View style={[styles.devRow, { borderTopColor: theme.colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Analisis ${developer.name}`}
          android_ripple={{ color: 'transparent' }}
          disabled={analyzeDisabled}
          hitSlop={hitSlopFor(200, 44)}
          onPress={() => onAnalyze(item)}
          style={({ pressed }) => [styles.devInfo, pressed && styles.pressed]}>
          <Avatar
            uri={developer.avatarUrl}
            name={developer.name}
            login={developer.login}
            size={AVATAR_SIZE}
            radius={10}
            dot
          />
          <View style={styles.devColumn}>
            <T size={9} weight="700" numberOfLines={1} style={styles.devName}>
              {developer.name}
            </T>
            <T size={6} color="muted" numberOfLines={1}>
              {`@${developer.login} · ${location}`}
            </T>
            <T size={6} weight="700" color="greenText" style={styles.availability}>
              {availabilityLabel(developer.availability)}
            </T>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Analyze ${developer.name}`}
          android_ripple={{ color: 'transparent' }}
          disabled={analyzeDisabled}
          hitSlop={hitSlopFor(ANALYZE_MIN_WIDTH, ANALYZE_HEIGHT)}
          onPress={() => onAnalyze(item)}
          style={({ pressed }) => [
            styles.analyzeButton,
            { backgroundColor: theme.colors.accent },
            analyzeDisabled && styles.analyzeDisabled,
            pressed && styles.pressed,
          ]}>
          {loading ? (
            <Loader size={13} accessibilityLabel={`Menganalisis ${item.name}`} />
          ) : (
            <>
              <T size={7} weight="800" color="onAccent">
                Analyze
              </T>
              <Icon name="arrow" size={14} color={theme.colors.onAccent} />
            </>
          )}
        </Pressable>

        {onReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Laporkan ${item.name}`}
            android_ripple={{ color: 'transparent' }}
            hitSlop={hitSlopFor(44, 44)}
            onPress={() => onReport(item)}
            style={({ pressed }) => [
              styles.reportButton,
              pressed && styles.pressed,
            ]}>
            <Icon name="flag" size={16} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: 70,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  rank: {
    marginRight: 8,
  },
  score: {
    marginLeft: 'auto',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  folder: {
    width: FOLDER_SIZE,
    height: FOLDER_SIZE,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  stackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 12,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 9,
  },
  demoLink: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  demoDot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  devRow: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devColumn: {
    flex: 1,
  },
  devName: {
    marginBottom: 1,
  },
  availability: {
    marginTop: 2,
  },
  analyzeButton: {
    minWidth: ANALYZE_MIN_WIDTH,
    height: ANALYZE_HEIGHT,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  analyzeDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  reportButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

/** Memoized — see ProjectCardProps (PRD §10 performance). */export const ProjectCard = memo(ProjectCardComponent);
export default ProjectCard;

/** Extended props with report callback for FE-10a C4. */
export type ProjectCardWithReportProps = ProjectCardProps & {
  /** Called when user taps the report button. */
  onReport?: (item: FeedItem) => void;
};
