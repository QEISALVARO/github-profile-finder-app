import { Redirect } from 'expo-router';

import { DevShowcase } from '@/features/dev/showcase';

/**
 * Internal design-system screen (PRD milestone M1). It is only reachable in
 * development; production builds redirect to the app root.
 */
export default function DevRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <DevShowcase />;
}
