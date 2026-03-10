import type { OrderStatus } from "@/types/order";

export const withTimeout = async <T>(
  promiseLike: PromiseLike<T> | (() => Promise<T>),
  timeoutMs = 30000,
  context = "Unknown"
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[Timeout] "${context}" exceeded ${timeoutMs}ms`);
      reject(new Error(`Request timed out (${context}). Please try again.`));
    }, timeoutMs);

    const promise = typeof promiseLike === "function" ? promiseLike() : promiseLike;

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const ORDER_COMPLETED_STATUS_SET: Set<OrderStatus | string> = new Set([
  "COMPLETE",
  "DONE",
  "DELIVERED",
  "SUCCESS",
  "FINISHED",
  "CLOSED",
  "CANCEL",
  "REJECT"
]);

export const isCompletedOrderStatus = (
  status: string | null | undefined,
  paymentId?: string | null | undefined
): boolean => {
  if (paymentId && String(paymentId).trim()) return true;
  const s = String(status || "").trim().toUpperCase();
  return ORDER_COMPLETED_STATUS_SET.has(s);
};

export const getOrderIdFromSystemMessage = (message: string | null | undefined): string => {
  const match = String(message || "").match(/ORDER:([^\s]+)/i);
  return match?.[1] ? String(match[1]) : "";
};

export const cleanPreviewMessage = (
  message: string | null | undefined,
  type?: string | null
): string => {
  if (!message && type !== "IMAGE") return "No message yet";
  const upperType = String(type || "").toUpperCase();
  if (upperType === "IMAGE") return "📷 Image";
  if (message?.startsWith("[CHAT_IMAGE]")) return "📷 Image";

  return message?.trim() || "System message";
};

export const isSystemMessage = (
  type?: string | null
): boolean => {
  const upperType = String(type || "").toUpperCase();
  return upperType === "SYSTEM" || upperType.startsWith("SYSTEM_");
};
