/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Package,
  Truck
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Loading from "@/components/shared/Loading";
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
  imageUrl: string | null;
  status: string;
  price: number;
  createdAt: string;
  isCompleted: boolean;
  type: "product" | "service";
  paymentId?: string | null;
};

function OrderHistoryPage() {
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "cancelled"
  >("active");

  const loadOrderHistory = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (!currentUserId) {
        setOrderHistory([]);
        return;
      }

      try {
        if (!isBackground) setHistoryLoading(true);

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select(
            "order_id, product_id, service_id, price, status, created_at, payment_id"
          )
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

        const [
          { data: productRows },
          { data: serviceRows },
          { data: doneRows }
        ] = await Promise.all([
          productIds.length > 0
            ? supabase
                .from("products")
                .select("product_id, name, image_url")
                .in("product_id", productIds)
            : Promise.resolve({ data: [] as any[] }),
          serviceIds.length > 0
            ? supabase
                .from("services")
                .select("service_id, name, image_url")
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
            : Promise.resolve({ data: [] as any[] })
        ]);

        const infoMap = new Map();
        ((productRows as any[]) ?? []).forEach((row: any) => {
          infoMap.set(String(row.product_id), {
            name: row.name,
            image: row.image_url
          });
        });
        ((serviceRows as any[]) ?? []).forEach((row: any) => {
          infoMap.set(String(row.service_id), {
            name: row.name,
            image: row.image_url
          });
        });

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? [])
            .map(
              (row: any) =>
                row?.order_id || getOrderIdFromSystemMessage(row?.content || "")
            )
            .filter(Boolean)
        );

        const mapped: OrderHistoryItem[] = rows.map((row: any) => {
          const rowOrderId = String(row?.order_id || "");
          const rawStatus = String(row?.status || "").toUpperCase();
          const completed =
            doneOrderSet.has(rowOrderId) ||
            isCompletedOrderStatus(rawStatus, row?.payment_id);

          // If completed status but unpaid, keep raw status for display
          // If truly completed (paid or cancelled), normalize to COMPLETE
          const normalizedStatus =
            rawStatus === "CANCEL"
              ? "CANCEL"
              : completed
                ? "COMPLETE"
                : rawStatus || "WAITING";

          const info = infoMap.get(
            String(row?.product_id || row?.service_id || "")
          );

          return {
            orderId: rowOrderId,
            productName: info?.name || "Order #" + rowOrderId.slice(0, 8),
            imageUrl: info?.image || null,
            status: normalizedStatus,
            price: Number(row?.price || 0),
            createdAt: String(row?.created_at || ""),
            isCompleted: completed,
            type: row.product_id ? "product" : "service",
            paymentId: row.payment_id
          };
        });

        setOrderHistory(mapped);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    loadOrderHistory();

    if (!currentUserId) return;

    // Real-time subscription for order updates
    const channel = supabase
      .channel(`order-history-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${currentUserId}`
        },
        () => {
          loadOrderHistory({ background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrderHistory, currentUserId]);

  const filteredOrders = orderHistory.filter((item) => {
    if (activeTab === "active")
      return !item.isCompleted && item.status !== "CANCEL";
    if (activeTab === "completed")
      return item.isCompleted && item.status !== "CANCEL";
    if (activeTab === "cancelled") return item.status === "CANCEL";
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETE":
        return "bg-green-100 text-green-700 border-green-200";
      case "PAID":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CANCEL":
        return "bg-red-100 text-red-700 border-red-200";
      case "PENDING":
      case "WAITING":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "ON_MY_WAY":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "IN_SERVICE":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (historyLoading && orderHistory.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-[#4A2600] tracking-tight">
              Your Orders
            </h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-[0.2em]">
              Manage and track your purchases
            </p>
          </div>
          <button
            onClick={() => loadOrderHistory()}
            className="p-3 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all active:scale-95"
          >
            <Clock
              className={`w-5 h-5 ${historyLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1.5 bg-orange-50/50 rounded-[2rem] border border-orange-100 mb-8">
          {[
            { id: "active", label: "Active", icon: Clock },
            { id: "completed", label: "Past Orders", icon: CheckCircle2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#A03F00] text-white shadow-lg shadow-orange-900/20"
                  : "text-orange-900/40 hover:text-orange-900/60"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-orange-50 shadow-sm">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-orange-200" />
              </div>
              <h3 className="text-xl font-black text-[#4A2600]">
                No {activeTab} orders
              </h3>
              <p className="text-gray-400 text-sm font-bold mt-1">
                Looks like you haven't placed any orders here yet.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="group bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 p-6 hover:border-orange-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-3xl bg-orange-50 overflow-hidden shrink-0 shadow-inner border border-orange-100">
                    <img
                      src={order.imageUrl || "/parrot-eating.png"}
                      alt={order.productName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0">
                          <h3 className="text-xl font-black text-[#4A2600] truncate group-hover:text-orange-600 transition-colors">
                            {order.productName}
                          </h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Order ID: {order.orderId.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-[#4A2600]">
                            ฿{order.price.toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black text-orange-600/60 uppercase tracking-widest">
                            Total Price
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                        <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                          <Clock className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          router.navigate({
                            to: "/order-history/$orderId" as any,
                            params: { orderId: order.orderId } as any
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-50 text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all"
                      >
                        Order Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {order.status === "COMPLETE" && !order.paymentId && (
                        <button
                          onClick={() =>
                            router.navigate({
                              to: "/payment",
                              search: {
                                total: order.price,
                                subtotal: Math.round(order.price / 1.03),
                                tax: Math.round(
                                  order.price - order.price / 1.03
                                ),
                                order_id: order.orderId
                              }
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-900/20 hover:bg-green-700 transition-all active:scale-95 animate-pulse"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay Now
                        </button>
                      )}

                      {!order.isCompleted && order.status !== "CANCEL" && (
                        <button
                          onClick={() =>
                            router.navigate({
                              to: "/order/$order_id" as any,
                              params: { order_id: order.orderId } as any
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#A03F00] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-900/20 hover:bg-orange-800 transition-all active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Live Track
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
