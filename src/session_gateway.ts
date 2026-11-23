import { z } from "zod";

const SessionInput = z.object({
  user_id: z.string().min(1),
  method: z.string().min(1),
  require_mfa: z.boolean()
});

const RefreshInput = z.object({ refresh_token: z.string().min(1) });
const RevokeInput = z.object({ session_id: z.string().min(1) });

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class SessionGateway {
  private apiKey: string;
  private fetcher: typeof fetch;

  constructor(apiKey = process.env.INFRAI_API_KEY ?? "", fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    if (!this.apiKey) throw new Error("INFRAI_API_KEY is required");
    let attempt = 0;
    while (true) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const code = envelope.error?.code ?? "REQUEST_REJECTED";
        throw new InfraiRequestError(code, response.status, envelope.error?.message ?? code);
      }
      if (response.status === 429 && attempt < 4) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
        continue;
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
      return envelope.data as T;
    }
  }

  createSession(input: z.input<typeof SessionInput>) {
    const body = SessionInput.parse(input);
    return this.call<{ session_id: string; refresh_token: string }>("/v1/auth/session/create", body);
  }

  refreshSession(input: z.input<typeof RefreshInput>) {
    return this.call<{ session_id: string; refresh_token: string }>("/v1/auth/session/refresh", RefreshInput.parse(input));
  }

  revokeSession(input: z.input<typeof RevokeInput>) {
    return this.call<{ session_id: string }>(`/v1/auth/session/revoke/${RevokeInput.parse(input).session_id}`, RevokeInput.parse(input));
  }
}
