import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Loader } from '@/components/ui/Loader';
import { ScoreCircle } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import type { FeedProject } from '@/data/seed';
import { compactNumber } from '@/lib/feed';
import { openGithubUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';

const FOLDER_SIZE = 39;
const AVATAR_SIZE = 36;
const ANALYZE_MIN_WIDTH = 71;
const ANALYZE_HEIGHT = 32;

export type ProjectCardProps = {
  project: FeedProject;
  index: number;
  /** D2 — true only for the card that is running Analyze. */
  loading: boolean;
  /** D2 — true while another card is loading (blocks this one's button). */
  disabled: boolean;
  onAnalyze: (project: FeedProject) => void;
};

/**
 * FR-E6 — feed project card (design.md §3.6). Memoized on purpose: query /
 * filter changes re-render the screen but must not re-render untouched cards,
 * so every prop here is primitive or a stable callback (PRD §10).
 */
export function ProjectCardComponent({
  project,
  index,
  loading,
  disabled,
  onAnalyze,
}: ProjectCardProps) {
  const theme = useTheme();
  const demoUrl = `https://github.com/${project.developer.login}`;
  const analyzeDisabled = disabled || loading;

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

        {/* D7 — badge stays "VERIFIED ACTIVE" even for active:false projects. */}
        <Badge variant="verified">VERIFIED ACTIVE</Badge>

        <ScoreCircle value={project.score} size={35} style={styles.score} />
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
            {project.name}
          </T>
          <T size={8} color="muted" lh={1.55}>
            {project.description}
          </T>
        </View>
      </View>

      <View style={styles.stackRow}>
        <Chip variant="accent" size={6} weight="700">
          {project.role}
        </Chip>
        {project.stack.map((tech) => (
          <Chip key={tech} variant="default" size={6}>
            {tech}
          </Chip>
        ))}
      </View>

      <View style={[styles.proofRow, { backgroundColor: theme.colors.paper }]}>
        <Icon name="check" size={12} color={theme.colors.greenText} />
        <T size={7} weight="700" color="greenText">
          Original work
        </T>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Buka ${demoUrl}`}
          android_ripple={{ color: 'transparent' }}
          hitSlop={hitSlopFor(90, 24)}
          onPress={() => openGithubUrl(demoUrl)}
          style={({ pressed }) => [styles.demoLink, pressed && styles.pressed]}>
          <View style={[styles.demoDot, { backgroundColor: theme.colors.accent }]} />
          <T size={7} color="greenText">
            {project.demo}
          </T>
        </Pressable>

        <View style={styles.stars}>
          <Icon name="star" size={12} color={theme.colors.muted} />
          <T size={7} color="muted">
            {compactNumber(project.stars)}
          </T>
        </View>
      </View>

      <View style={[styles.devRow, { borderTopColor: theme.colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Analisis ${project.developer.name}`}
          android_ripple={{ color: 'transparent' }}
          disabled={analyzeDisabled}
          hitSlop={hitSlopFor(200, 44)}
          onPress={() => onAnalyze(project)}
          style={({ pressed }) => [styles.devInfo, pressed && styles.pressed]}>
          <Avatar
            uri={project.developer.avatar}
            name={project.developer.name}
            login={project.developer.login}
            size={AVATAR_SIZE}
            radius={10}
            dot
          />
          <View style={styles.devColumn}>
            <T size={9} weight="700" numberOfLines={1} style={styles.devName}>
              {project.developer.name}
            </T>
            <T size={6} color="muted" numberOfLines={1}>
              {`@${project.developer.login} · ${project.location}`}
            </T>
            <T size={6} weight="700" color="greenText" style={styles.availability}>
              {project.developer.availability}
            </T>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Analyze ${project.developer.name}`}
          android_ripple={{ color: 'transparent' }}
          disabled={analyzeDisabled}
          hitSlop={hitSlopFor(ANALYZE_MIN_WIDTH, ANALYZE_HEIGHT)}
          onPress={() => onAnalyze(project)}
          style={({ pressed }) => [
            styles.analyzeButton,
            { backgroundColor: theme.colors.accent },
            analyzeDisabled && styles.analyzeDisabled,
            pressed && styles.pressed,
          ]}>
          {loading ? (
            <Loader size={13} accessibilityLabel={`Menganalisis ${project.name}`} />
          ) : (
            <>
              <T size={7} weight="800" color="onAccent">
                Analyze
              </T>
              <Icon name="arrow" size={14} color={theme.colors.onAccent} />
            </>
          )}
        </Pressable>
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
});

/** Memoized — see ProjectCardProps (PRD §10 performance). */
export const ProjectCard = memo(ProjectCardComponent);

export default ProjectCard;
