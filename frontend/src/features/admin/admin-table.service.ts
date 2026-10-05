import { z } from "zod";
import type { AdminTable, TablePayload } from "./admin-table.types";

const tableResponseSchema = z.object({
  id: z.string(), tableNumber: z.string(), capacity: z.number().int().positive(),
  location: z.string().nullable(), isActive: z.boolean(),
  createdAt: z.string(), updatedAt: z.string(),
});

export class AdminTableError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "AdminTableError";
    this.status = status;
  }
}

function failureMessage(status: number, method: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You no longer have access to manage tables.";
  if (status === 409) return "A table with this number already exists. Choose another number.";
  if (status === 404) return "This table could not be found. Refresh the page and try again.";
  if (status === 400) return "Please check the table details and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  return method === "GET" ? "We couldn’t load your tables. Please try again." : "We couldn’t save your changes. Please try again.";
}

async function request<T>(token: string, schema: z.ZodType<T>, method: "GET" | "POST" | "PATCH", id?: string, payload?: Partial<TablePayload>, signal?: AbortSignal): Promise<T> {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new AdminTableError("Table management is temporarily unavailable. Please try again later.");
  if (!token) throw new AdminTableError(failureMessage(401, method), 401);
  let response: Response;
  try {
    response = await fetch(`${base}/api/admin/tables${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { "Content-Type": "application/json" } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AdminTableError("We couldn’t reach Occup. Check your connection and try again.");
  }
  if (!response.ok) throw new AdminTableError(failureMessage(response.status, method), response.status);
  const result = z.object({ success: z.literal(true), data: schema }).safeParse(await response.json().catch(() => null));
  if (!result.success) throw new AdminTableError("We received an unexpected response. Please refresh your tables.");
  return result.data.data;
}

export function getAdminTables(token: string, signal?: AbortSignal): Promise<AdminTable[]> {
  return request(token, z.array(tableResponseSchema), "GET", undefined, undefined, signal);
}
export function createAdminTable(token: string, payload: TablePayload, signal?: AbortSignal): Promise<AdminTable> {
  return request(token, tableResponseSchema, "POST", undefined, payload, signal);
}
export function updateAdminTable(token: string, id: string, payload: Partial<TablePayload>, signal?: AbortSignal): Promise<AdminTable> {
  return request(token, tableResponseSchema, "PATCH", id, payload, signal);
}
export function getTableError(error: unknown): string {
  return error instanceof AdminTableError ? error.message : "Something went wrong. Please try again.";
}
