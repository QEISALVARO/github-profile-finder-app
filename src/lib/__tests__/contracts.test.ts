/**
 * Kontrak-drift guard (PR #5): parse SEMUA fixture dengan skema SP-0.
 * Bila kontrak berubah tanpa memperbarui fixture (atau sebaliknya), test ini
 * gagal duluan sebelum layar sempat membaca bentuk yang salah.
 * Sumber kebenaran: contracts/src/*.ts + contracts/fixtures/*.json.
 */
import { AnalysisVM } from '../../../contracts/src/analysis';
import { ErrorBody } from '../../../contracts/src/common';
import { FeedPage, CountryFacet } from '../../../contracts/src/feed';
import { DiscoverPage, PipelineEntry } from '../../../contracts/src/talent';
import { Message, StartConversationInput } from '../../../contracts/src/chat';

import analysisFixtures from '../../../contracts/fixtures/analysis_vm.json';
import feedFixture from '../../../contracts/fixtures/feed_page.json';
import discoverFixture from '../../../contracts/fixtures/discover_page.json';
import facetsFixture from '../../../contracts/fixtures/country_facets.json';
import errorFixtures from '../../../contracts/fixtures/error_body.json';
import startConversationFixture from '../../../contracts/fixtures/start_conversation.json';
import messageFixture from '../../../contracts/fixtures/message.json';

describe('contracts drift guard', () => {
  it('semua varian AnalysisVM lolos skema', () => {
    expect(Array.isArray(analysisFixtures)).toBe(true);
    for (const item of analysisFixtures as unknown[]) {
      expect(AnalysisVM.safeParse(item).success).toBe(true);
    }
  });

  it('FeedPage lolos skema dengan 2 item', () => {
    const parsed = FeedPage.safeParse(feedFixture);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.items).toHaveLength(2);
  });

  it('DiscoverPage lolos skema dengan 2 item', () => {
    const parsed = DiscoverPage.safeParse(discoverFixture);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.items).toHaveLength(2);
  });

  it('semua facet negara lolos skema termasuk masker <5', () => {
    for (const item of facetsFixture as unknown[]) {
      expect(CountryFacet.safeParse(item).success).toBe(true);
    }
    expect(CountryFacet.safeParse({ iso2: 'NO', count: '<5' }).success).toBe(true);
  });

  it('semua varian ErrorBody lolos skema', () => {
    for (const item of errorFixtures as unknown[]) {
      expect(ErrorBody.safeParse(item).success).toBe(true);
    }
  });

  it('StartConversationInput dan Message lolos skema', () => {
    expect(StartConversationInput.safeParse(startConversationFixture).success).toBe(true);
    expect(Message.safeParse(messageFixture).success).toBe(true);
  });

  it('PipelineEntry menolak stage di luar kontrak', () => {
    expect(
      PipelineEntry.safeParse({
        id: 'x',
        githubLogin: 'octocat',
        stage: 'archived',
        note: null,
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});
