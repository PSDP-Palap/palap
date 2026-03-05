export const withTimeout = async <T>(
  promiseLike: PromiseLike<T> | (() => Promise<T>),
  timeoutMs = 30000
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timed out. Please try again."));
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

export const ORDER_COMPLETED_STATUS_SET = new Set([
  "completed",
  "done",
  "delivered",
  "success",
  "finished",
  "closed"
]);

export const isCompletedOrderStatus = (status: string | null | undefined): boolean => {
  return ORDER_COMPLETED_STATUS_SET.has(String(status || "").toLowerCase());
};

export const getOrderIdFromSystemMessage = (message: string | null | undefined): string => {
  const match = String(message || "").match(/ORDER:([^\s]+)/i);
  return match?.[1] ? String(match[1]) : "";
};

export const cleanPreviewMessage = (message: string | null | undefined): string => {
  if (!message) return "No message yet";
  if (message.startsWith("[CHAT_IMAGE]")) return "📷 Image";
  return message
    .replace("[SYSTEM_HIRE_REQUEST]", "")
    .replace("[SYSTEM_HIRE_ACCEPTED]", "")
    .replace("[SYSTEM_HIRE_DECLINED]", "")
    .replace("[SYSTEM_DELIVERY_ORDER_ACCEPTED]", "")
    .replace("[SYSTEM_DELIVERY_ROOM_CREATED]", "")
    .replace("[SYSTEM_DELIVERY_DONE]", "")
    .trim() || "No message yet";
};

export const isSystemMessage = (message: string | null | undefined): boolean => {
  if (!message) return false;
  return (
    message.startsWith("[SYSTEM_HIRE_REQUEST]") ||
    message.startsWith("[SYSTEM_HIRE_ACCEPTED]") ||
    message.startsWith("[SYSTEM_HIRE_DECLINED]") ||
    message.startsWith("[SYSTEM_DELIVERY_ORDER_ACCEPTED]") ||
    message.startsWith("[SYSTEM_DELIVERY_ROOM_CREATED]") ||
    message.startsWith("[SYSTEM_DELIVERY_DONE]")
  );
};
