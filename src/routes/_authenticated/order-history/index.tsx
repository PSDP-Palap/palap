/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import {
  getOrderIdFromSystemMessage,
  isCompletedOrderStatus
} from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/order-history/")({
  component: OrderHistoryPage
});

type OrderHistoryItem = {
  orderId: string;
  productName: string;
  status: string;
  price: number;
  createdAt: string;
  isCompleted: boolean;
};

function OrderHistoryPage() {
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadOrderHistory = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (!currentUserId) {
        setOrderHistory([]);
        return;
      }

      try {
        if (!isBackground) {
          setHistoryLoading(true);
        }

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select("order_id, product_id, service_id, price, status, created_at, payment_id")
          .eq("customer_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (orderError) throw orderError;

        const rows = (orderRows as any[]) ?? [];
        if (rows.length === 0) {
          setOrderHistory([]);
          return;
        }

        const orderIds = rows
          .map((row) => String(row?.order_id || ""))
          .filter(Boolean);
        const productIds = Array.from(
          new Set(
            rows.map((row) => String(row?.product_id || "")).filter(Boolean)
          )
        );
        const serviceIds = Array.from(
          new Set(
            rows.map((row) => String(row?.service_id || "")).filter(Boolean)
          )
        );

        const [{ data: productRows }, { data: serviceRows }, { data: doneRows }] = await Promise.all([
          productIds.length > 0
            ? supabase
                .from("products")
                .select("product_id, name")
                .in("product_id", productIds)
            : Promise.resolve({ data: [] as any[] }),
          serviceIds.length > 0
            ? supabase
                .from("services")
                .select("service_id, name")
                .in("service_id", serviceIds)
            : Promise.resolve({ data: [] as any[] }),
          orderIds.length > 0
            ? supabase
                .from("chat_messages")
                .select("order_id, content, message_type")
                .in("order_id", orderIds)
                .or(
                  "message_type.eq.SYSTEM_DELIVERY_DONE,content.like.[SYSTEM_DELIVERY_DONE] ORDER:%"
                )
                .order("created_at", { ascending: false })
                .limit(500)
            : Promise.resolve({ data: [] as any[] })
        ]);

        const nameMap = new Map();
        ((productRows as any[]) ?? []).forEach((row: any) => {
          nameMap.set(String(row.product_id), String(row.name || "Product"));
        });
        ((serviceRows as any[]) ?? []).forEach((row: any) => {
          nameMap.set(String(row.service_id), String(row.name || "Service"));
        });

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? [])
            .map((row: any) => {
              const directId = String(row?.order_id || "").trim();
              if (directId) return directId;
              return getOrderIdFromSystemMessage(String(row?.content || ""));
            })
            .filter(Boolean)
        );

        const mapped: OrderHistoryItem[] = rows.map((row: any) => {
          const rowOrderId = String(row?.order_id || "");
          const rawStatus = String(row?.status || "").toUpperCase();
          const completed =
            doneOrderSet.has(rowOrderId) || isCompletedOrderStatus(rawStatus, row?.payment_id);
          const normalizedStatus = completed
            ? "COMPLETE"
            : rawStatus || "WAITING";

          return {
            orderId: rowOrderId,
            productName:
              nameMap.get(String(row?.product_id || row?.service_id || "")) || "Order",
            status: normalizedStatus,
            price: Number(row?.price || 0),
            createdAt: String(row?.created_at || ""),
            isCompleted: completed
          };
        });

        setOrderHistory(mapped);
      } catch (err) {
        console.error("Failed to load history", err);
        if (!isBackground) {
          setOrderHistory([]);
        }
      } finally {
        if (!isBackground) {
          setHistoryLoading(false);
        }
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory]);

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-linear-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Order History</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">
            Review and track your previous delivery orders
          </p>
        </div>

        <section className="rounded-xl border border-orange-100 bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-black text-[#4A2600]">
              Track Order History
            </h2>
            <button
              type="button"
              onClick={() => loadOrderHistory()}
              disabled={historyLoading}
              className="px-3 py-1.5 rounded-md text-xs font-black bg-orange-100 text-[#A03F00] disabled:bg-gray-100 disabled:text-gray-400"
            >
              {historyLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {historyLoading && orderHistory.length === 0 ? (
            <p className="text-sm text-gray-500">Loading order history...</p>
          ) : orderHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No orders found yet.</p>
          ) : (
            <div className="space-y-2">
              {orderHistory.map((item) => (
                <div
                  key={item.orderId}
                  className="rounded-lg border border-orange-100 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-black text-[#4A2600] truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      Order: {item.orderId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-[#5D2611]">
                      ฿ {item.price.toFixed(2)}
                    </p>
                    <p
                      className={`text-xs font-bold uppercase ${item.isCompleted ? "text-green-700" : "text-orange-700"}`}
                    >
                      {item.status.replaceAll("_", " ")}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {!item.isCompleted && (
                        <button
                          type="button"
                          onClick={() => {
                            router.navigate({
                              to: "/order/$order_id" as any,
                              params: { order_id: item.orderId } as any
                            });
                          }}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-black"
                        >
                          Track
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          router.navigate({
                            to: "/order-history/$orderId" as any,
                            params: { orderId: item.orderId } as any
                          });
                        }}
                        className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
