// ---------------------------------------------------------------------------
// FE-2 — query hook barrel. UI imports hooks from here only; nothing outside
// `src/api` knows which adapter answered.
// ---------------------------------------------------------------------------

export { queryKeys } from '@/api/queryKeys';

export { useFeed, useFeedCountryFacets } from './feed';
export { useAnalysis, useAnalyze, type AnalysisState, type AnalyzeResult } from './analysis';
export { useDiscover, usePipeline, useSetStage } from './talent';
export {
  useConversations,
  useFindConversation,
  useMessages,
  useSendMessage,
  useStartConversation,
} from './chat';
export { useSession, useSignIn, useSignOut, useDeleteAccount } from './auth';
export { useReports, useExportReport } from './reports';
