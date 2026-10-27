// @ts-nocheck
// supabase/functions/_shared/github/facts.ts
// Ekstraksi dan sanitasi fakta (Facts) terstruktur dari respons GraphQL/REST (POL-2, POL-6).

export interface RepoFact {
  databaseId: number;
  name: string;
  description: string | null;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  createdAt: string;
  pushedAt: string;
  stars: number;
  forks: number;
  homepageUrl: string | null;
  url: string;
  diskUsageKb: number;
  spdxLicense: string | null;
  topics: string[];
  languagesBytes: Record<string, number>;
  releasesCount: number;
  hasReadme: boolean;
  readmeBytes: number;
  hasCi: boolean;
  hasTests: boolean;
  demoVerified: boolean;
  manifests: Record<string, string>;
  substance: number; // 0..1
}

export interface DayContribution {
  date: string;
  count: number;
  level: number; // 0..4
}

export interface CalendarFact {
  totalContributions: number;
  weeks: Array<{ days: DayContribution[] }>;
  days84: number[]; // 84 level terakhir
  activeWeeks52: number;
  activeWeeks12: number;
  streakWeeks: number;
}

export interface Facts {
  profile: {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    location: string | null;
    url: string;
    createdAt: string;
    originalPublicCount: number;
    publicReposTotal: number;
  };
  repos: RepoFact[];
  calendar: CalendarFact;
  prToOtherRepos: number;
  reviews: number;
  issues: number;
  contributionsPrev12m: number;
  accountCreatedAt: string;
  fetchedAt: string;
}

/**
 * Sanitasi string untuk memastikan tidak memuat format email (POL-2).
 */
export function sanitizeNoEmail(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
}

/**
 * Menghitung skor substance repo individual (0..1) sesuai rumus v2.0:
 * 0.3 README >= 200 B + 0.25 CI + 0.25 tes + 0.1 lisensi + 0.1 ukuran >= 20 KB
 */
export function calculateRepoSubstance(repo: {
  readmeBytes: number;
  hasCi: boolean;
  hasTests: boolean;
  spdxLicense: string | null;
  diskUsageKb: number;
}): number {
  let score = 0;
  if (repo.readmeBytes >= 200) score += 0.3;
  if (repo.hasCi) score += 0.25;
  if (repo.hasTests) score += 0.25;
  if (repo.spdxLicense) score += 0.1;
  if (repo.diskUsageKb >= 20) score += 0.1;
  return Math.round(score * 100) / 100;
}

/**
 * Memetakan level kontribusi GitHub GraphQL ke integer 0..4
 */
export function mapContributionLevel(levelStr?: string): number {
  switch (levelStr) {
    case "FOURTH_QUARTILE":
      return 4;
    case "THIRD_QUARTILE":
      return 3;
    case "SECOND_QUARTILE":
      return 2;
    case "FIRST_QUARTILE":
      return 1;
    default:
      return 0;
  }
}

/**
 * Membangun objek Facts terstruktur dari query GraphQL yang telah disanitasi.
 */
export function extractFactsFromGraphQL(
  q1Data: any,
  q3Data: any,
  q4Data: any,
  manifestsMap: Record<string, Record<string, string>> = {},
  verifiedDemosMap: Record<string, boolean> = {}
): Facts {
  const user = q1Data?.user ?? {};
  const rawRepos = user.repositories?.nodes ?? [];

  const repos: RepoFact[] = rawRepos.map((r: any) => {
    const treeEntries = r.tree?.entries ?? [];
    const hasCi = treeEntries.some(
      (e: any) => e.name === ".github" || e.name === ".gitlab-ci.yml" || e.name === ".circleci"
    );
    const hasTests = treeEntries.some(
      (e: any) =>
        e.name === "test" ||
        e.name === "tests" ||
        e.name === "__tests__" ||
        e.name === "spec" ||
        e.name.includes(".test.") ||
        e.name.includes(".spec.")
    );

    const languagesBytes: Record<string, number> = {};
    for (const edge of r.languages?.edges ?? []) {
      if (edge?.node?.name && typeof edge?.size === "number") {
        languagesBytes[edge.node.name] = edge.size;
      }
    }

    const topics: string[] = (r.repositoryTopics?.nodes ?? [])
      .map((t: any) => t?.topic?.name)
      .filter(Boolean);

    const readmeBytes = r.readme?.byteSize ?? 0;
    const diskUsageKb = r.diskUsage ?? 0;
    const spdxLicense = r.licenseInfo?.spdxId ?? null;

    const substance = calculateRepoSubstance({
      readmeBytes,
      hasCi,
      hasTests,
      spdxLicense,
      diskUsageKb,
    });

    const isDemoVerified = Boolean(verifiedDemosMap[r.name]);

    return {
      databaseId: r.databaseId ?? 0,
      name: r.name ?? "",
      description: sanitizeNoEmail(r.description),
      isFork: Boolean(r.isFork),
      isArchived: Boolean(r.isArchived),
      isTemplate: Boolean(r.isTemplate),
      createdAt: r.createdAt ?? new Date().toISOString(),
      pushedAt: r.pushedAt ?? r.createdAt ?? new Date().toISOString(),
      stars: r.stargazerCount ?? 0,
      forks: r.forkCount ?? 0,
      homepageUrl: r.homepageUrl ?? null,
      url: r.url ?? "",
      diskUsageKb,
      spdxLicense,
      topics,
      languagesBytes,
      releasesCount: r.releases?.totalCount ?? 0,
      hasReadme: readmeBytes > 0,
      readmeBytes,
      hasCi,
      hasTests,
      demoVerified: isDemoVerified,
      manifests: manifestsMap[r.name] ?? {},
      substance,
    };
  });

  // Ekstraksi kalender kontribusi
  const calendarData = q3Data?.user?.contributionsCollection?.contributionCalendar;
  const rawWeeks = calendarData?.weeks ?? [];
  const weeks: Array<{ days: DayContribution[] }> = [];
  const allDays: DayContribution[] = [];

  for (const w of rawWeeks) {
    const days: DayContribution[] = [];
    for (const d of w.contributionDays ?? []) {
      const item: DayContribution = {
        date: d.date,
        count: d.contributionCount ?? 0,
        level: mapContributionLevel(d.contributionLevel),
      };
      days.push(item);
      allDays.push(item);
    }
    weeks.push({ days });
  }

  // Ambil 84 hari terakhir (urut tanggal)
  const last84Days = allDays.slice(-84);
  const days84Levels = last84Days.map((d) => d.level);
  while (days84Levels.length < 84) {
    days84Levels.unshift(0); // Pad awal bila data kurang dari 84 hari
  }

  // Hitung minggu aktif 52 minggu terakhir & 12 minggu terakhir
  const last52Weeks = weeks.slice(-52);
  const activeWeeks52 = last52Weeks.filter((w) =>
    w.days.some((d) => d.count > 0)
  ).length;

  const last12Weeks = weeks.slice(-12);
  const activeWeeks12 = last12Weeks.filter((w) =>
    w.days.some((d) => d.count > 0)
  ).length;

  // Hitung streak minggu berturut-turut (mundur dari minggu terbaru; minggu berjalan kosong tidak memutus)
  let streakWeeks = 0;
  const reversedWeeks = [...weeks].reverse();
  for (let i = 0; i < reversedWeeks.length; i++) {
    const hasContrib = reversedWeeks[i].days.some((d) => d.count > 0);
    if (hasContrib) {
      streakWeeks++;
    } else {
      // Jika minggu berjalan (paling akhir) masih kosong, beri toleransi
      if (i === 0) continue;
      break;
    }
  }

  // Hitung kontribusi ke repo orang lain (PR ke repo eksternal)
  let prToOtherRepos = 0;
  const prRepos = q3Data?.user?.contributionsCollection?.pullRequestContributionsByRepository ?? [];
  for (const prGroup of prRepos) {
    const repoOwner = prGroup?.repository?.owner?.login;
    if (repoOwner && repoOwner.toLowerCase() !== user.login?.toLowerCase()) {
      prToOtherRepos += prGroup.contributions?.totalCount ?? 0;
    }
  }

  const reviews = q3Data?.user?.contributionsCollection?.totalPullRequestReviewContributions ?? 0;
  const issues = q3Data?.user?.contributionsCollection?.totalIssueContributions ?? 0;
  const totalContributions12m = calendarData?.totalContributions ?? 0;
  const contributionsPrev12m =
    q4Data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;

  return {
    profile: {
      login: (user.login ?? "").toLowerCase(),
      name: sanitizeNoEmail(user.name),
      avatarUrl: user.avatarUrl ?? "",
      bio: sanitizeNoEmail(user.bio),
      location: sanitizeNoEmail(user.location),
      url: user.url ?? `https://github.com/${user.login}`,
      createdAt: user.createdAt ?? new Date().toISOString(),
      originalPublicCount: user.originalPublicCount?.totalCount ?? 0,
      publicReposTotal: user.publicReposTotal?.totalCount ?? 0,
    },
    repos,
    calendar: {
      totalContributions: totalContributions12m,
      weeks,
      days84: days84Levels,
      activeWeeks52,
      activeWeeks12,
      streakWeeks,
    },
    prToOtherRepos,
    reviews,
    issues,
    contributionsPrev12m,
    accountCreatedAt: user.createdAt ?? new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  };
}
