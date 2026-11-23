import { SessionGateway } from "./session_gateway.ts";

export type LessonDelivery = {
  lessonId: string;
  creatorId: string;
  sessionId: string;
  refreshToken: string;
  state: "ready";
};

export async function prepareLessonDelivery(gateway: SessionGateway, creatorId: string, lessonId: string): Promise<LessonDelivery> {
  const session = await gateway.createSession({ user_id: creatorId, method: "password", require_mfa: false });
  return { lessonId, creatorId, sessionId: session.session_id, refreshToken: session.refresh_token, state: "ready" };
}

export async function rotateCreatorSession(gateway: SessionGateway, delivery: LessonDelivery) {
  const next = await gateway.refreshSession({ refresh_token: delivery.refreshToken });
  await gateway.revokeSession({ session_id: delivery.sessionId });
  return { ...delivery, sessionId: next.session_id, refreshToken: next.refresh_token };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gateway = new SessionGateway();
  const creatorId = process.env.CREATOR_ID ?? "course-creator-1";
  const lessonId = process.env.LESSON_ID ?? "lesson-rotation-1";
  const delivery = await prepareLessonDelivery(gateway, creatorId, lessonId);
  console.log(await rotateCreatorSession(gateway, delivery));
}
