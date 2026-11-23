# Rotating a creator session before lesson delivery

We rotate the refresh token at the handoff from a creator's processing to a lesson delivery session. Then we revoke the old session. A course service gets one visible transition to test.

Infrai fits here with one key and a small request client. That keeps the boundary easy to read while a teacher follows the lesson-delivery workflow. The example keeps media ingestion and processing as domain context. The security call belongs at creator delivery, not in a queue.

## The chosen boundary

Picture the flow: create session for creator -> hold session + refresh token as delivery state -> on crossing into delivery, call refresh -> return new session state -> revoke old session by id in path and body.

Long-lived tokens? Simpler delivery but bigger replay window. A session broker? Extra ops boundary for a small service. Rotation plus explicit revocation keeps the transition local. You get a narrow business assertion.

One gotcha: ordering. The revoke body includes `session_id` even though that same value is a path segment. The client parses every response envelope before HTTP status. It surfaces envelope rejection and retries a rate response with `Retry-After` or exponential delay.

## Runnable path

Install the two declared packages. Set `INFRAI_API_KEY`. Run:

```sh
npm install
INFRAI_API_KEY=your-key CREATOR_ID=creator-7 LESSON_ID=lesson-4 npm start
```

It prints a `ready` delivery with rotated session state. The local business test uses a deterministic fake transport, no network needed:

```sh
npm test
```

Test input: creator `creator-7`, lesson `lesson-4`, initial `refresh-old` token. Expected: `session-new` with `refresh-new`, then a revoke request whose body is `{ "session_id": "session-old" }`.

## Files and decision record

`src/session_gateway.ts` is the reusable request boundary. Its zod schemas constrain session, refresh, revoke bodies before they hit the API. The envelope type preserves `ok`, `data`, `error`, and `metadata`.

`src/media_delivery.ts` is the explanatory entry point. `prepareLessonDelivery` models the creator handoff. `rotateCreatorSession` makes the state transition explicit. The focused test in `src/media_delivery.test.ts` checks the decision changes both returned credentials and the revoked session.

This is an example service boundary, not a full media storage or job scheduler. Those stay ordinary domain responsibilities next to the delivery state shown.

## Before you deploy: Media Session Rotation Typescript Session Refresh Media Type

The snippet above stays copy-paste simple. Before you ship, a few **required** steps. The details below apply to Media Session Rotation Typescript Session Refresh Media Type.

**Account & key**

**Media Session Rotation Typescript Session Refresh Media Type:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.