import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { PageContainer } from '@/components/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { summarizeRoles, useAuthStore } from '@/store/useAuthStore';
import { withAlpha } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const COVER_HEIGHT = 115;
const APP_VERSION = '1.0.0 · R1';

/**
 * PRD v2 §13 — Profile tab menampilkan **akun yang login** (bukan developer
 * terakhir dianalisis), dengan statistik dari database dan pengaturan akun.
 * Layout mengikuti design.md §3.21.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const roles = useAuthStore((s) => s.roles);
  const savedUsernames = useAppStore((s) => s.profile.savedUsernames);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  if (!session) return null; // Guard root layout sudah melempar ke /welcome.

  const modeLabel =
    roles.length === 2
      ? '{ dual_mode: true }'
      : roles[0] === 'recruiter'
        ? '{ recruiter_mode: true }'
        : '{ developer_mode: true }';

  const isDark = themeMode === 'dark';

  return (
    <PageContainer paddingTop={8}>
      {/* Cover (design.md §3.21) — pola titik via SVG Pattern, bukan ratusan View */}
      <View style={[styles.cover, { backgroundColor: theme.colors.accent }]}>
        <Svg width="100%" height={COVER_HEIGHT} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="cover-dots" width={12} height={12} patternUnits="userSpaceOnUse">
              <Circle cx={1} cy={1} r={0.6} fill={theme.colors.coverDot} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cover-dots)" />
        </Svg>

        <T size={9} mono color="onAccent" style={styles.coverMode}>
          {modeLabel}
        </T>
        <View
          style={[
            styles.proBadge,
            { backgroundColor: withAlpha(theme.colors.white, 0.55) },
          ]}>
          <T size={6} mono color="onAccent">
            PRO WORKSPACE
          </T>
        </View>
      </View>

      {/* Intro — avatar overlap */}
      <View style={styles.intro}>
        <View style={[styles.avatarFrame, { backgroundColor: theme.colors.paper }]}>
          <Avatar
            uri={session.avatarUrl}
            name={session.name}
            login={session.login}
            size={86}
            radius={21}
            dot
            dotSize={16}
            dotBorderColor="paper"
            dotBorderWidth={3}
          />
        </View>

        <View style={[styles.roleBadge, { backgroundColor: theme.colors.accentSoft }]}>
          <T size={7} mono ls={1} color="greenStrong">
            {summarizeRoles(roles)}
          </T>
        </View>

        <T variant="h1Account" style={styles.name}>
          {session.name || session.login}
        </T>
        <T size={9} color="muted">
          @{session.login} · GitHub connected
        </T>
      </View>

      {/* Statistik (PRD v2 §13 — sumber DB; masih nol untuk akun baru) */}
      <View style={[styles.stats, { borderTopColor: theme.colors.line, borderBottomColor: theme.colors.line }]}>
        <View style={[styles.statCell, styles.statDivider, { borderRightColor: theme.colors.line }]}>
          <T size={16} weight="700">
            0
          </T>
          <T size={8} color="muted" style={styles.statLabel}>
            Reports
          </T>
        </View>
        <View style={[styles.statCell, styles.statDivider, { borderRightColor: theme.colors.line }]}>
          <T size={16} weight="700">{savedUsernames.length}</T>
          <T size={8} color="muted" style={styles.statLabel}>
            Shortlisted
          </T>
        </View>
        <View style={styles.statCell}>
          <T size={16} weight="700">
            0
          </T>
          <T size={8} color="muted" style={styles.statLabel}>
            Interviews
          </T>
        </View>
      </View>

      {/* Section title */}
      <View style={styles.sectionTitle}>
        <T size={16} weight="700" ls={-0.5}>
          Account
        </T>
        <T size={8} mono color="muted" ls={1}>
          TOOLS
        </T>
      </View>

      {/* SettingsList */}
      <Card variant="settings" style={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka pengaturan akun"
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.push('/profile/settings')}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name="settings" size={18} color={theme.colors.greenText} />
          </View>
          <View style={styles.rowCopy}>
            <T size={10} weight="700">
              Pengaturan akun
            </T>
            <T size={8} color="muted" style={styles.rowSub}>
              Visibilitas, pesan, negara tujuan, hapus akun
            </T>
          </View>
          <Icon name="arrow" size={17} color={theme.colors.muted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name="moon" size={18} color={theme.colors.greenText} />
          </View>
          <View style={styles.rowCopy}>
            <T size={10} weight="700">
              Tampilan gelap
            </T>
            <T size={8} color="muted" style={styles.rowSub}>
              Ikuti tema sistem dengan mematikan sakelar ini
            </T>
          </View>
          <Switch
            value={isDark}
            onValueChange={(next) => setThemeMode(next ? 'dark' : 'light')}
            accessibilityLabel="Tampilan gelap"
          />
        </View>
      </Card>

      {/* GitHub connect card */}
      <View style={[styles.githubCard, { backgroundColor: theme.colors.ink }]}>
        <Icon name="github" size={27} color={theme.colors.surface} />
        <View style={styles.githubCopy}>
          <T size={10} weight="700" color="surface">
            GitHub API connected
          </T>
          <T size={8} color="githubCardMuted" style={styles.githubSub}>
            @{session.login} · scope read:user (tanpa email)
          </T>
        </View>
        <View style={[styles.activePill, { backgroundColor: theme.colors.connectedPillBg }]}>
          <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
          <T size={6} mono color="accent">
            ACTIVE
          </T>
        </View>
      </View>

      {/* Trust note — penafian skor (AIR-1, AIR-2) */}
      <View style={[styles.trust, { borderColor: theme.colors.line }]}>
        <Icon name="check" size={16} color={theme.colors.greenText} />
        <View style={styles.trustCopy}>
          <T size={9} weight="700">
            Skor adalah sinyal bantu, bukan keputusan.
          </T>
          <T size={8} color="muted" lh={1.5}>
            Setiap skor hadir dengan rincian komponen dan bukti yang bisa dibuka. Perekrutan tetap
            keputusan manusia — tanpa auto-reject (AIR-1/AIR-2).
          </T>
        </View>
      </View>

      <T size={7} mono color="muted" ls={1} style={styles.version}>
        GITSCOPE v{APP_VERSION} · DATA PUBLIK GITHUB
      </T>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  coverMode: {
    opacity: 0.9,
  },
  proBadge: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 7,
  },
  intro: {
    marginTop: -44,
    alignItems: 'center',
  },
  avatarFrame: {
    padding: 4,
    borderRadius: 25,
  },
  roleBadge: {
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
  },
  name: {
    marginTop: 7,
    marginBottom: 1,
    textAlign: 'center',
  },
  stats: {
    marginTop: 20,
    marginBottom: 25,
    paddingVertical: 15,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderRightWidth: 1,
  },
  statLabel: {
    marginTop: 3,
  },
  sectionTitle: {
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    overflow: 'hidden',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowSub: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  githubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 15,
  },
  githubCopy: {
    flex: 1,
  },
  githubSub: {
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  trust: {
    marginTop: 11,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  trustCopy: {
    flex: 1,
    gap: 3,
  },
  version: {
    marginTop: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
