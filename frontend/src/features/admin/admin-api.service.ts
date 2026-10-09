import { z } from "zod";

export type AdminApiMethod = "GET" | "POST" | "PATCH";

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

type AdminApiRequestOptions<T> = {
  token: string;
  path: string;
  method: AdminApiMethod;
  responseSchema: z.ZodType<T>;
  payload?: unknown;
  signal?: AbortSignal;
  unavailableMessage: string;
  failureMessage: (status: number, method: AdminApiMethod) => string;
  responseErrorMessage: string;
};

export async function requestAdminApi<T>({
  token,
  path,
  method,
  responseSchema,
  payload,
  signal,
  unavailableMessage,
  failureMessage,
  responseErrorMessage,
}: AdminApiRequestOptions<T>): Promise<T> {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new AdminApiError(unavailableMessage);
  if (!token) throw new AdminApiError(failureMessage(401, method), 401);

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AdminApiError("We couldn’t reach Occup. Check your connection and try again.");
  }

  if (!response.ok) throw new AdminApiError(failureMessage(response.status, method), response.status);

  const envelopeSchema = z.object({ success: z.literal(true), data: responseSchema });
  const result = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new AdminApiError(responseErrorMessage);
  return result.data.data;
}
