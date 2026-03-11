/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { DeliveryTrackingView } from "@/components/payment/DeliveryTrackingView";
import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import type { DeliveryTracking } from "@/types/order";
import { isCompletedOrderStatus, toNumber } from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/order/$order_id")({
  component: OrderTrackingPage
});

const WAITING_STATUS_SET = new Set([
  "",
  "WAITING",
  "PENDING",
  "NEW",
  "OPEN",
  "REQUESTED",
  "LOOKING_FREELANCER"
]);

function OrderTrackingPage() {
  const { order_id } = Route.useParams();
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(null);
  const [freelancerCoords, setFreelancerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showDeliveredNotice, setShowDeliveredNotice] = useState(false);

  const lastLoadedOrderIdRef = useRef<string | null>(null);
  const previousTrackingStatusRef = useRef<string | null>(null);

  const loadTracking = useCallback(
    async (orderId: string, options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (!isBackground && lastLoadedOrderIdRef.current === orderId && trackingData) return;
      
      try {
        if (!isBackground) {
          setTrackingLoading(true);
          setTrackingError(null);
        }
        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select("*, payment_id")
          .eq("order_id", orderId)
          .maybeSingle();
        
        if (orderError) throw orderError;
        if (!orderRow) throw new Error("Order not found");

        const pickupAddressId = orderRow.pickup_address_id ? String(orderRow.pickup_address_id) : null;
        const destinationAddressId = orderRow.destination_address_id ? String(orderRow.destination_address_id) : null;
        const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];
        
        const { data: addressRows } = addressIds.length > 0
            ? await supabase.from("addresses").select("*").in("id", addressIds)
            : { data: [] as any[] };
        
        const addressMap = new Map((addressRows ?? []).map((item: any) => [String(item.id), item]));

        const { data: productRow } = orderRow.product_id
          ? await supabase.from("products").select("*").eq("product_id", orderRow.product_id).maybeSingle()
          : { data: null as any };

        const { data: serviceRow } = orderRow.service_id
          ? await supabase.from("services").select("*").eq("service_id", orderRow.service_id).maybeSingle()
          : { data: null as any };

        const freelanceId = orderRow.freelance_id ? String(orderRow.freelance_id) : null;
        const { data: freelanceProfile } = freelanceId && isUuidLike(freelanceId)
            ? await supabase.from("profiles").select("*").eq("id", freelanceId).maybeSingle()
            : { data: null as any };

        // Real-time Freelancer Location
        if (freelanceProfile?.lat && freelanceProfile?.lng) {
          setFreelancerCoords({
            lat: Number(freelanceProfile.lat),
            lng: Number(freelanceProfile.lng)
          });
        }

        const { data: chatRoomRow } = await supabase.from("chat_rooms").select("id").eq("order_id", orderId).maybeSingle();
        const { data: doneMarkerRow } = await supabase.from("chat_messages").select("id").eq("order_id", orderId)
          .or("message_type.eq.SYSTEM_DELIVERY_DONE,content.like.[SYSTEM_DELIVERY_DONE] ORDER:%")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        const rawStatus = String(orderRow.status || "").toUpperCase();
        const normalizedStatus = isCompletedOrderStatus(rawStatus, orderRow.payment_id) || !!doneMarkerRow
            ? "COMPLETE" : rawStatus || "WAITING";

        const tracking: DeliveryTracking = {
          orderId: String(orderRow.order_id),
          serviceId: orderRow.service_id,
          customerId: orderRow.customer_id ? String(orderRow.customer_id) : null,
          roomId: chatRoomRow?.id ? String(chatRoomRow.id) : null,
          status: normalizedStatus,
          createdAt: orderRow.created_at,
          updatedAt: orderRow.updated_at,
          price: Number(orderRow.price ?? 0),
          productName: productRow?.name || serviceRow?.name || "Service",
          pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
          destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
          freelanceName: freelanceProfile?.full_name || freelanceProfile?.email || (freelanceId ? "Freelancer" : "Waiting..."),
          freelanceId,
          freelanceAvatarUrl: freelanceProfile?.avatar_url || null,
          paymentId: orderRow.payment_id
        };
        setTrackingData(tracking);
        lastLoadedOrderIdRef.current = orderId;
      } catch (err: any) {
        if (!isBackground) setTrackingError(err.message);
      } finally {
        if (!isBackground) setTrackingLoading(false);
      }
    },
    [trackingData]
  );

  useEffect(() => {
    if (!order_id) return;
    loadTracking(order_id);
    const channel = supabase.channel(`tracking-page-${order_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `order_id=eq.${order_id}` }, 
        () => loadTracking(order_id, { background: true }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, 
        () => loadTracking(order_id, { background: true }))
      .subscribe();

    const pollingTimer = window.setInterval(() => {
      loadTracking(order_id, { background: true });
    }, 8000);

    return () => {
      window.clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  }, [order_id, loadTracking]);

  useEffect(() => {
    if (!trackingData || !order_id || !currentUserId) return;
    const status = String(trackingData.status || "").toUpperCase();
    const previousStatus = previousTrackingStatusRef.current;
    previousTrackingStatusRef.current = status;

    if (typeof window === "undefined") return;
    const servingNoticeKey = `delivery_notice_serving:${currentUserId}:${order_id}`;
    const deliveredNoticeKey = `delivery_notice_delivered:${currentUserId}:${order_id}`;

    if (status === "ON_MY_WAY" && previousStatus !== "ON_MY_WAY" && !window.sessionStorage.getItem(servingNoticeKey)) {
      toast.success("Your order is now being delivered.");
      window.sessionStorage.setItem(servingNoticeKey, "1");
    }

    if (isCompletedOrderStatus(status)) {
      if (!window.sessionStorage.getItem(deliveredNoticeKey)) {
        setShowDeliveredNotice(true);
        toast.success("Your delivery is complete.");
        window.sessionStorage.setItem(deliveredNoticeKey, "1");
      }
    }
  }, [trackingData, order_id, currentUserId]);

  if (trackingLoading && !trackingData) return <Loading />;

  if (trackingError || !trackingData) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] pt-24 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600 font-bold text-lg">{trackingError || "Order not found"}</p>
        <button onClick={() => router.navigate({ to: "/" })} className="bg-[#A03F00] text-white px-6 py-2 rounded-xl font-black shadow-lg">
          Back to Home
        </button>
      </div>
    );
  }

  const pickupLat = toNumber(trackingData.pickupAddress?.lat || "");
  const pickupLng = toNumber(trackingData.pickupAddress?.lng || "");
  const destinationLat = toNumber(trackingData.destinationAddress?.lat || "");
  const destinationLng = toNumber(trackingData.destinationAddress?.lng || "");

  return (
    <DeliveryTrackingView
      activeOrderId={order_id}
      status={trackingData.status.toUpperCase()}
      accepted={!!trackingData.freelanceId && !WAITING_STATUS_SET.has(trackingData.status.toUpperCase())}
      isDelivered={isCompletedOrderStatus(trackingData.status.toUpperCase())}
      trackingData={trackingData}
      trackingLoading={trackingLoading}
      trackingError={trackingError}
      routeUrl={`https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}`}
      pickupCoords={pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null}
      destinationCoords={destinationLat && destinationLng ? { lat: destinationLat, lng: destinationLng } : null}
      freelancerCoords={freelancerCoords}
      showDeliveredNotice={showDeliveredNotice}
      acknowledgeDeliveredNotice={() => setShowDeliveredNotice(false)}
      loadTracking={loadTracking}
      router={router}
    />
  );
}
