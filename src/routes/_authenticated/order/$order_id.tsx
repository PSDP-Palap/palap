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

  component: OrderTrackingPage,

});



const WAITING_STATUS_SET = new Set([

  "",

  "WAITING",

  "PENDING",

  "NEW",

  "OPEN",

  "REQUESTED",

  "LOOKING_FREELANCER",

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



  const loadTracking = useCallback(

    async (orderId: string, options?: { background?: boolean }) => {

      const isBackground = options?.background ?? false;

      if (!isBackground && lastLoadedOrderIdRef.current === orderId && trackingData) return;



      try {

        if (!isBackground) {

          setTrackingLoading(true);

          setTrackingError(null);

        }



        // 1. ดึงข้อมูล Order หลัก

        const { data: orderRow, error: orderError } = await supabase

          .from("orders")

          .select("*, payment_id")

          .eq("order_id", orderId)

          .maybeSingle();



        if (orderError) throw orderError;

        if (!orderRow) throw new Error("Order not found");



        // 2. ดึงข้อมูล Product และ Service

        const { data: productRow } = orderRow.product_id

          ? await supabase.from("products").select("*").eq("product_id", orderRow.product_id).maybeSingle()

          : { data: null as any };



        const { data: serviceRow } = orderRow.service_id

          ? await supabase.from("services").select("*").eq("service_id", orderRow.service_id).maybeSingle()

          : { data: null as any };



        // 3. เตรียมตัวแปรที่อยู่ (สำหรับปักหมุดและโชว์ชื่อด้านล่าง)

        let pLat: number | null = null;

        let pLng: number | null = null;

        let dLat: number | null = null;

        let dLng: number | null = null;

       

        // Priority 1: ใช้ข้อความจาก Service มาเป็นชื่อเบื้องต้นก่อน

        let pName: string = serviceRow?.detail_1 || "Pickup Location";

        let dName: string = serviceRow?.detail_2 || "Destination Location";



        // 4. ค้นหา UUID เพื่อดึงพิกัด (Priority: Order > Product > Service)

        const pUuid = orderRow.pickup_address_id || productRow?.pickup_address_id || serviceRow?.pickup_address_id;

        const dUuid = orderRow.destination_address_id || productRow?.destination_address_id || serviceRow?.destination_address_id;



        if (pUuid || dUuid) {

          const ids = [pUuid, dUuid].filter(Boolean);

          const { data: addrRows } = await supabase.from("addresses").select("*").in("id", ids);

          const addrMap = new Map((addrRows ?? []).map((i: any) => [String(i.id), i]));



          if (pUuid && addrMap.has(String(pUuid))) {

            const a = addrMap.get(String(pUuid));

            pLat = toNumber(a.lat);

            pLng = toNumber(a.lng);

            if (a.name || a.address_detail) pName = a.name || a.address_detail;

          }

          if (dUuid && addrMap.has(String(dUuid))) {

            const a = addrMap.get(String(dUuid));

            dLat = toNumber(a.lat);

            dLng = toNumber(a.lng);

            if (a.name || a.address_detail) dName = a.name || a.address_detail;

          }

        }



        // 5. ข้อมูล Freelancer (คนขับ)

        const freelanceId = orderRow.freelance_id ? String(orderRow.freelance_id) : null;

        const { data: fProfile } = freelanceId && isUuidLike(freelanceId)

          ? await supabase.from("profiles").select("*").eq("id", freelanceId).maybeSingle()

          : { data: null as any };



        if (fProfile?.lat && fProfile?.lng) {

          setFreelancerCoords({ lat: Number(fProfile.lat), lng: Number(fProfile.lng) });

        }



        // 6. เช็คสถานะการส่ง

        const { data: doneMsg } = await supabase.from("chat_messages").select("id").eq("order_id", orderId)

          .eq("message_type", "SYSTEM_DELIVERY_DONE").limit(1).maybeSingle();



        const rawStatus = String(orderRow.status || "").toUpperCase();

        const normalizedStatus = isCompletedOrderStatus(rawStatus, orderRow.payment_id) || !!doneMsg ? "COMPLETE" : rawStatus || "WAITING";



        // 7. ดึงห้องแชท

        const { data: chatRoom } = await supabase.from("chat_rooms").select("id").eq("order_id", orderId).maybeSingle();



        // 8. ประกอบร่างข้อมูล Tracking ทั้งหมด

        const tracking: DeliveryTracking = {

          orderId: String(orderRow.order_id),

          serviceId: orderRow.service_id,

          customerId: orderRow.customer_id ? String(orderRow.customer_id) : null,

          roomId: chatRoom?.id ? String(chatRoom.id) : null,

          status: normalizedStatus,

          createdAt: orderRow.created_at,

          updatedAt: orderRow.updated_at,

          price: Number(orderRow.price ?? 0),

          productName: productRow?.name || serviceRow?.name || "Order",

          // 🚨 สำคัญ: ส่ง pName, dName ไปแสดง Your Address ด้านล่าง

          pickupAddress: { name: pName, lat: pLat, lng: pLng } as any,

          destinationAddress: { name: dName, lat: dLat, lng: dLng } as any,

          freelanceName: fProfile?.full_name || fProfile?.email || (freelanceId ? "Freelancer" : "Waiting..."),

          freelanceId,

          freelanceAvatarUrl: fProfile?.avatar_url || null,

          paymentId: orderRow.payment_id,

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

      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `order_id=eq.${order_id}` }, () => loadTracking(order_id, { background: true }))

      .subscribe();

    const pollingTimer = window.setInterval(() => loadTracking(order_id, { background: true }), 10000);

    return () => { window.clearInterval(pollingTimer); supabase.removeChannel(channel); };

  }, [order_id, loadTracking]);



  if (trackingLoading && !trackingData) return <Loading />;

  if (trackingError || !trackingData) return <div className="p-20 text-center font-black text-red-600">{trackingError || "Order not found"}</div>;



  const finalDLat = trackingData.destinationAddress?.lat;

  const finalDLng = trackingData.destinationAddress?.lng;



  return (

    <DeliveryTrackingView

      activeOrderId={order_id}

      status={trackingData.status.toUpperCase()}

      accepted={!!trackingData.freelanceId && !WAITING_STATUS_SET.has(trackingData.status.toUpperCase())}

      isDelivered={isCompletedOrderStatus(trackingData.status.toUpperCase())}

      trackingData={trackingData}

      trackingLoading={trackingLoading}

      trackingError={trackingError}

      // ลิงก์สำหรับปุ่มด้านล่าง

      routeUrl={finalDLat ? `https://www.google.com/maps/dir/?api=1&destination=${finalDLat},${finalDLng}` : "#"}

      pickupCoords={trackingData.pickupAddress?.lat ? { lat: trackingData.pickupAddress.lat, lng: trackingData.pickupAddress.lng } : null}

      destinationCoords={finalDLat ? { lat: finalDLat, lng: finalDLng } : null}

      freelancerCoords={freelancerCoords}

      showDeliveredNotice={showDeliveredNotice}

      acknowledgeDeliveredNotice={() => setShowDeliveredNotice(false)}

      loadTracking={loadTracking}

      router={router}

    />

  );

}



export default OrderTrackingPage;