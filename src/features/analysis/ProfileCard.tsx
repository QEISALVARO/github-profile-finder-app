import { Pressable, StyleSheet, View } from 'react-native';

import type { GithubUser } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { openGithubUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';

export type ProfileCardProps = {
  user: GithubUser;
  role: string;
  primary: string;
  saved: boolean;
  onToggleSaved: () => void;
  onMessage: () => void;
  onExport: () => void;
};

/** FR-A2 + FR-A3 — profile card with bookmark, tags and CTA (design.md §3.8). */
export function ProfileCard({
  user,
  role,
  primary,
  saved,
  onToggleSaved,
  onMessage,
  onExport,
}: ProfileCardProps) {
  const theme = useTheme();
  const displayName = user.name || user.login;

  return (
    <Card variant="profile" style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: theme.colors.accent }]} />

      <View style={styles.mainRow}>
        <Avatar
          uri={user.avatar_url}
          name={displayName}
          login={user.login}
          size={61}
          radius={17}
          dot
          dotSize={15}
          dotBorderColor="surface"
          dotBorderWidth={3}
        />

        <View style={styles.identity}>
          <T size={8} mono ls={1.8} color="greenText" style={styles.matchLabel}>
            CANDIDATE MATCH
          </T>
          <T size={17} weight="700" ls={-0.6} numberOfLines={1} style={styles.name}>
            {displayName}
          </T>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Buka GitHub ${user.login}`}
            hitSlop={hitSlopFor(120, 20)}
            onPress={() => openGithubUrl(user.html_url)}>
            <T size={11} color="muted">
              @{user.login}
            </T>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simpan kandidat"
          accessibilityState={{ selected: saved }}
          hitSlop={hitSlopFor(35, 35)}
          onPress={onToggleSaved}
          style={({ pressed }) => [
            styles.bookmark,
            {
              borderColor: saved ? theme.colors.accent : theme.colors.line,
              backgroundColor: saved ? theme.colors.accentSoft : theme.colors.surface,
            },
            pressed && styles.pressed,
          ]}>
          <Icon name="bookmark" size={17} color={saved ? theme.colors.greenStrong : theme.colors.muted} />
        </Pressable>
      </View>

      <T size={12} lh={1.55} style={styles.bio}>
        {user.bio || 'Developer on GitHub.'}
      </T>

      <View style={styles.tagRow}>
        <Chip variant="default" mono={false} weight="700" size={7}>
          {role}
        </Chip>
        <Chip variant="default" mono={false} weight="700" size={7}>
          {primary}
        </Chip>
        {/* design.md §3.8 — "Open to work" chip: accentSoft bg, greenStrong
            text, accent dot, no border. */}
        <View style={[styles.openToWork, { backgroundColor: theme.colors.accentSoft }]}>
          <View style={[styles.openDot, { backgroundColor: theme.colors.accent }]} />
          <T size={7} weight="700" color="greenStrong">
            Open to work
          </T>
        </View>
      </View>

      <View style={styles.metaRow}>
        {user.location ? (
          <View style={styles.metaItem}>
            <Icon name="location" size={15} color={theme.colors.muted} />
            <T size={10} color="muted">
              {user.location}
            </T>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Icon name="repo" size={15} color={theme.colors.muted} />
          <T size={10} color="muted">
            {user.public_repos} public repos
          </T>
        </View>
      </View>

      <View style={[styles.ctaRow, { borderTopColor: theme.colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Message"
          android_ripple={{ color: 'transparent' }}
          onPress={onMessage}
          style={({ pressed }) => [
            styles.cta,
            styles.ctaPrimary,
            { backgroundColor: theme.colors.ink },
            pressed && styles.pressed,
          ]}>
          <Icon name="message" size={16} color={theme.colors.surface} />
          <T size={9} weight="700" color="surface">
            Message
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export report"
          android_ripple={{ color: 'transparent' }}
          onPress={onExport}
          style={({ pressed }) => [
            styles.cta,
            styles.ctaSecondary,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
            pressed && styles.pressed,
          ]}>
          <Icon name="download" size={16} color={theme.colors.ink} />
          <T size={9} weight="700">
            Export report
          </T>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  identity: {
    flex: 1,
    gap: 0,
  },
  matchLabel: {
    marginBottom: 3,
  },
  name: {
    marginBottom: 2,
  },
  bookmark: {
    width: 35,
    height: 35,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: {
    marginTop: 17,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  openToWork: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  openDot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ctaRow: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  cta: {
    flex: 1,
    height: 37,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaPrimary: {
    borderWidth: 1,
  },
  ctaSecondary: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
