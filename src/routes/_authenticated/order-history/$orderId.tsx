/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import { getOrderIdFromSystemMessage, isCompletedOrderStatus } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/order-history/$orderId")({
  component: RouteComponent
});

type OrderDetail = {
  orderId: string;
  productName: string;
  serviceName: string;
  customerName: string;
  freelancerName: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  pickupName: string;
  pickupDetail: string;
  destinationName: string;
  destinationDetail: string;
};

const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";

function RouteComponent() {
  const { orderId } = Route.useParams();
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!currentUserId || !orderId) return;

      try {
        setLoading(true);
        setError(null);

        const { data: row, error: orderError } = await supabase
          .from("orders")
          .select(
            "order_id, product_id, service_id, customer_id, freelance_id, status, price, created_at, updated_at, pickup_address_id, destination_address_id"
          )
          .eq("order_id", orderId)
          .eq("customer_id", currentUserId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!row) throw new Error("Order not found.");

        const [
          { data: productRow },
          { data: serviceRow },
          { data: customerRow },
          { data: freelancerRow },
          { data: addressRows },
          { data: doneMarkerRow }
        ] = await Promise.all([
          row.product_id
            ? supabase
                .from("products")
                .select("name")
                .eq("product_id", String(row.product_id))
                .maybeSingle()
            : Promise.resolve({ data: null as any }),
          row.service_id
            ? supabase
                .from("services")
                .select("name")
                .eq("service_id", String(row.service_id))
                .maybeSingle()
            : Promise.resolve({ data: null as any }),
          row.customer_id
            ? supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", String(row.customer_id))
                .maybeSingle()
            : Promise.resolve({ data: null as any }),
          row.freelance_id
            ? supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", String(row.freelance_id))
                .maybeSingle()
            : Promise.resolve({ data: null as any }),
          [row.pickup_address_id, row.destination_address_id].filter(Boolean)
            .length > 0
            ? supabase
                .from("addresses")
                .select("id, name, address_detail")
                .in(
                  "id",
                  [row.pickup_address_id, row.destination_address_id].filter(
                    Boolean
                  ) as string[]
                )
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from("chat_messages")
            .select("order_id, message")
            .eq("order_id", orderId)
            .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        const addressMap = new Map(
          ((addressRows as any[]) ?? []).map((item: any) => [
            String(item.id),
            item
          ])
        );

        const rawStatus = String(row.status || "").toLowerCase();
        const doneFromMarker =
          !!doneMarkerRow &&
          (!!String((doneMarkerRow as any)?.order_id || "") ||
            !!getOrderIdFromSystemMessage(String((doneMarkerRow as any)?.message || "")));

        const normalizedStatus =
          doneFromMarker || isCompletedOrderStatus(rawStatus)
            ? "delivered"
            : rawStatus || "waiting";

        setDetail({
          orderId: String(row.order_id),
          productName: productRow?.name || "Product",
          serviceName: serviceRow?.name || "Service",
          customerName: customerRow?.full_name || customerRow?.email || "Customer",
          freelancerName:
            freelancerRow?.full_name || freelancerRow?.email || "Waiting for freelancer",
          status: normalizedStatus,
          price: Number(row.price || 0),
          createdAt: String(row.created_at || ""),
          updatedAt: String(row.updated_at || row.created_at || ""),
          pickupName:
            addressMap.get(String(row.pickup_address_id || ""))?.name || "Pickup",
          pickupDetail:
            addressMap.get(String(row.pickup_address_id || ""))?.address_detail ||
            "No pickup address",
          destinationName:
            addressMap.get(String(row.destination_address_id || ""))?.name ||
            "Destination",
          destinationDetail:
            addressMap.get(String(row.destination_address_id || ""))
              ?.address_detail || "No destination address"
        });
      } catch (err: any) {
        setError(err?.message || "Unable to load order detail.");
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetail();
  }, [currentUserId, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 flex items-center justify-center">
        <p className="text-[#D35400] font-bold">Loading order detail...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 font-semibold">{error || "Order not found."}</p>
        <button
          type="button"
          onClick={() => router.navigate({ to: "/order-history" })}
          className="px-4 py-2 rounded-lg bg-[#A03F00] text-white font-black"
        >
          Back to Order History
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-[#4A2600]">Order Detail</h1>
              <p className="text-sm text-orange-700/80 font-semibold">Order ID: {detail.orderId}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${detail.status === "delivered" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {detail.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">Product</p>
              <p className="font-bold text-[#4A2600] mt-1">{detail.productName}</p>
              <p className="text-sm text-[#4A2600]/80 mt-1">Service: {detail.serviceName}</p>
              <p className="text-sm font-black text-[#5D2611] mt-2">฿ {detail.price.toFixed(2)}</p>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">People</p>
              <p className="text-sm text-[#4A2600] mt-1">Customer: <span className="font-bold">{detail.customerName}</span></p>
              <p className="text-sm text-[#4A2600] mt-1">Freelancer: <span className="font-bold">{detail.freelancerName}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Pickup</p>
              <p className="font-bold text-[#4A2600]">{detail.pickupName}</p>
              <p className="text-sm text-[#4A2600]/80 mt-1">{detail.pickupDetail}</p>
            </section>

            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Destination</p>
              <p className="font-bold text-[#4A2600]">{detail.destinationName}</p>
              <p className="text-sm text-[#4A2600]/80 mt-1">{detail.destinationDetail}</p>
            </section>
          </div>

          <div className="rounded-xl border border-orange-100 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p className="text-gray-600">Created: <span className="font-semibold text-[#4A2600]">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}</span></p>
            <p className="text-gray-600">Updated: <span className="font-semibold text-[#4A2600]">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : "-"}</span></p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.navigate({ to: "/order-history" })}
              className="px-5 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
            >
              Back to Order History
            </button>
            {detail.status !== "delivered" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    useOrderStore.getState().setActiveOrderId(detail.orderId);
                    router.navigate({
                      to: "/order/$order_id" as any,
                      params: { order_id: detail.orderId } as any
                    });
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-100 text-blue-700 font-black hover:bg-blue-200"
                >
                  Open Live Tracking
                </button>
                {detail.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase
                        .from("orders")
                        .update({ status: "cancelled" })
                        .eq("order_id", detail.orderId);
                      window.location.reload();
                    }}
                    className="px-5 py-2 rounded-lg bg-red-100 text-red-700 font-black hover:bg-red-200"
                  >
                    Cancel Delivery
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
