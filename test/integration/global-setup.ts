// Verifies the local Supabase stack is reachable before any integration test
// runs. Fails fast with a helpful message instead of a sea of timeouts.

import { LOCAL_SUPABASE_URL } from "./helpers";

export default async function globalSetup() {
  try {
    const response = await fetch(`${LOCAL_SUPABASE_URL}/auth/v1/health`);
    if (!response.ok) {
      throw new Error(`Auth health check returned ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local Supabase is not reachable at ${LOCAL_SUPABASE_URL}.\n` +
        `Start it with: npm run db:start && npm run db:reset\n` +
        `Underlying error: ${message}`,
    );
  }
}
