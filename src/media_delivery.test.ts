import test from "node:test";
import assert from "node:assert/strict";
import { prepareLessonDelivery, rotateCreatorSession } from "./media_delivery.ts";
import { SessionGateway } from "./session_gateway.ts";

test("rotation returns the new session and never reuses the old refresh token", async () => {
  const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
  let sequence = 0;
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push({ path: new URL(url).pathname, body: JSON.parse(String(init?.body)) });
    sequence += 1;
    const data = sequence === 1
      ? { session_id: "session-old", refresh_token: "refresh-old" }
      : sequence === 2
        ? { session_id: "session-new", refresh_token: "refresh-new" }
        : { session_id: "session-old" };
    return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200 });
  };
  const gateway = new SessionGateway("test-key", fetcher);
  const first = await prepareLessonDelivery(gateway, "creator-7", "lesson-4");
  const rotated = await rotateCreatorSession(gateway, first);
  assert.equal(rotated.sessionId, "session-new");
  assert.equal(rotated.refreshToken, "refresh-new");
  assert.equal(requests[1].body.refresh_token, "refresh-old");
  assert.deepEqual(requests[2].body, { session_id: "session-old" });
});
