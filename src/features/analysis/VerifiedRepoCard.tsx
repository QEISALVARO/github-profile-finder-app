import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScoreCircle } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { openGithubUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';
import type { AnalysisVM } from '@/api/analysis';

export type VerifiedRepoCardProps = {
  /** FE-2 — the contract repo (id, name, isFork, hasVerifiedDemo, score). */
  repo: AnalysisVM['repos'][number];
  onDiscuss: (repoName: string) => void;
};

/** FR-A8 — verified repo evidence card (design.md §3.14). */
export function VerifiedRepoCard({ repo, onDiscuss }: VerifiedRepoCardProps) {
  const theme = useTheme();
  const score = repo.score;
  const fork = repo.isFork;

  return (
    <Card variant="repo">
      <View style={styles.head}>
        <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name="repo" size={17} color={theme.colors.greenText} />
        </View>
        <View style={styles.headText}>
          <T size={11} weight="700" numberOfLines={1}>
            {repo.name}
          </T>
          <T size={8} color="muted" numberOfLines={1} style={styles.description}>
            {repo.description || 'Open-source project by this developer.'}
          </T>
        </View>
        <ScoreCircle
          value={score}
          size={30}
          background={fork ? 'warnBg' : 'accentSoft'}
          valueColor={fork ? 'warnText' : 'greenStrong'}
        />
      </View>

      <View style={styles.badges}>
        <TagBadge
          icon={<Icon name="check" size={10} color={theme.colors.greenStrong} />}
          label={fork ? 'Fork modified' : 'Original work'}
        />
        {repo.hasVerifiedDemo ? (
          <TagBadge
            icon={<View style={[styles.demoDot, { backgroundColor: theme.colors.accent }]} />}
            label="Live demo"
          />
        ) : null}
        <TagBadge label={repo.language || 'Other'} />
      </View>

      <View style={[styles.actions, { borderTopColor: theme.colors.line }]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View evidence ${repo.name}`}
          hitSlop={hitSlopFor(120, 20)}
          onPress={() => openGithubUrl(repo.htmlUrl)}>
          <T size={8} weight="700" color="greenText">
            View evidence
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Discuss ${repo.name}`}
          hitSlop={hitSlopFor(100, 20)}
          onPress={() => onDiscuss(repo.name)}
          style={({ pressed }) => [styles.discuss, pressed && styles.pressed]}>
          <T size={8} color="muted">
            Discuss
          </T>
          <Icon name="message" size={13} color={theme.colors.muted} />
        </Pressable>
      </View>
    </Card>
  );
}

/** Tag chip from design.md §3.8/§3.14 — paper bg, line border, 700/7 muted. */
function TagBadge({ icon, label }: { icon?: ReactNode; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: theme.colors.paper, borderColor: theme.colors.line },
      ]}>
      {icon}
      <T size={7} weight="700" color="muted">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    gap: 0,
  },
  description: {
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 11,
    marginBottom: 11,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 6,
  },
  demoDot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  actions: {
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discuss: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
