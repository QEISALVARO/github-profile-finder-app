// ---------------------------------------------------------------------------
// FE-2 — query hooks barrel. UI imports hooks from here only; nothing outside
// `src/api` knows which adapter answered.
// ---------------------------------------------------------------------------

export { QueryProvider, createQueryClient } from './client';
export { useFeed, FEED_QUERY_KEY } from './feed';
export { useAnalysis, useAnalyze, ANALYSIS_QUERY_KEY, type AnalysisState } from './analysis';
export { useDiscover, usePipeline, useSetStage, TALENT_QUERY_KEY } from './talent';
export {
  useConversations,
  useFindConversation,
  useMessages,
  useSendMessage,
  useStartConversation,
  CHAT_QUERY_KEY,
} from './chat';
export { useSession, AUTH_QUERY_KEY } from './auth';
export { useExportReport } from './reports';
