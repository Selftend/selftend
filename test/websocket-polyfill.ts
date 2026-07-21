// supabase-js >= 2.110 constructs its realtime client eagerly and requires a
// WebSocket implementation at createClient() time; Node < 22 has no global
// WebSocket, so test runs on the engines floor (>= 20.19) polyfill it with
// `ws`. No-op on Node 22+ where the native implementation exists.
//
// Loaded by jest.integration.config.js (setupFiles) and test/e2e/fixtures.ts —
// the two places test code constructs supabase clients in a Node process.
import { WebSocket as NodeWebSocket } from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as Record<string, unknown>).WebSocket = NodeWebSocket;
}
