// @ts-nocheck
// supabase/functions/_shared/github/queries.ts
// Query GraphQL teroptimasi untuk ekstraksi data publik GitHub tanpa scraping (POL-6).

export const PROFILE_AND_REPOS_QUERY = `
query ProfileAndRepos($login: String!) {
  rateLimit {
    cost
    remaining
    resetAt
  }
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    location
    url
    createdAt
    originalPublicCount: repositories(isFork: false, ownerAffiliations: OWNER, privacy: PUBLIC) {
      totalCount
    }
    publicReposTotal: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) {
      totalCount
    }
    repositories(
      first: 30
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      nodes {
        databaseId
        name
        description
        isFork
        isArchived
        isTemplate
        createdAt
        pushedAt
        stargazerCount
        forkCount
        homepageUrl
        url
        diskUsage
        licenseInfo {
          spdxId
        }
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
            }
          }
        }
        releases {
          totalCount
        }
        tree: object(expression: "HEAD:") {
          ... on Tree {
            entries {
              name
              type
            }
          }
        }
        readme: object(expression: "HEAD:README.md") {
          ... on Blob {
            byteSize
          }
        }
      }
    }
  }
}
`;

export const CONTRIBUTIONS_12M_QUERY = `
query Contributions12m($login: String!, $from: DateTime!, $to: DateTime!) {
  rateLimit {
    cost
    remaining
    resetAt
  }
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
      pullRequestContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
          owner {
            login
          }
        }
        contributions {
          totalCount
        }
      }
      totalIssueContributions
      totalPullRequestReviewContributions
    }
  }
}
`;

export const CONTRIBUTIONS_PREV_12M_QUERY = `
query ContributionsPrev12m($login: String!, $from: DateTime!, $to: DateTime!) {
  rateLimit {
    cost
    remaining
    resetAt
  }
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
      }
    }
  }
}
`;

export const REPO_MANIFEST_QUERY = `
query RepoManifests($owner: String!, $name: String!) {
  rateLimit {
    cost
    remaining
    resetAt
  }
  repository(owner: $owner, name: $name) {
    packageJson: object(expression: "HEAD:package.json") {
      ... on Blob {
        text
      }
    }
    pubspecYaml: object(expression: "HEAD:pubspec.yaml") {
      ... on Blob {
        text
      }
    }
    goMod: object(expression: "HEAD:go.mod") {
      ... on Blob {
        text
      }
    }
    requirementsTxt: object(expression: "HEAD:requirements.txt") {
      ... on Blob {
        text
      }
    }
    pyprojectToml: object(expression: "HEAD:pyproject.toml") {
      ... on Blob {
        text
      }
    }
    cargoToml: object(expression: "HEAD:Cargo.toml") {
      ... on Blob {
        text
      }
    }
  }
}
`;
