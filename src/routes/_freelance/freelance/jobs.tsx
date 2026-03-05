/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import MyJobsTab from "@/components/freelance/MyJobsTab";
import { useUserStore } from "@/stores/useUserStore";
import type {
  DeliveryOrderItem,
  OngoingServiceJobItem,
  PendingHireRequestItem
} from "@/types/freelance";
import type { Service } from "@/types/service";
import { isCompletedOrderStatus } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/jobs")({
  component: JobsRoute
});

const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";

function JobsRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [pendingHireRequests, setPendingHireRequests] = useState<
    PendingHireRequestItem[]
  >([]);
  const [loadingPendingHireRequests, setLoadingPendingHireRequests] =
    useState(false);
  const [acceptingHireRoomId, setAcceptingHireRoomId] = useState<string | null>(
    null
  );
  const [ongoingServiceJobs, setOngoingServiceJobs] = useState<
    OngoingServiceJobItem[]
  >([]);
  const [loadingOngoingServiceJobs, setLoadingOngoingServiceJobs] =
    useState(false);
  const [availableDeliveryOrders, setAvailableDeliveryOrders] = useState<
    DeliveryOrderItem[]
  >([]);
  const [myDeliveryOrders, setMyDeliveryOrders] = useState<DeliveryOrderItem[]>(
    []
  );
  const [loadingDeliveryOrders, setLoadingDeliveryOrders] = useState(false);
  const [refreshingJobBoard, setRefreshingJobBoard] = useState(false);
  const [jobBoardLastUpdatedAt, setJobBoardLastUpdatedAt] = useState<
    string | null
  >(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(
    null
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMyServices = async () => {
    if (!currentUserId) return;
    try {
      setLoadingServices(true);
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("created_by", currentUserId)
        .order("created_at", { ascending: false });
      setServices((data as Service[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  };

  const createMyService = async (formData: any) => {
    if (!currentUserId) return;
    try {
      setCreating(true);
      setError(null);
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category,
        pickup_address: formData.pickupAddress,
        dest_address: formData.destinationAddress,
        image_url: formData.imageUrl,
        created_by: currentUserId
      };
      const { error } = await supabase.from("services").insert([payload]);
      if (error) throw error;
      setSuccess("Service created successfully!");
      await loadMyServices();
    } catch (err: any) {
      setError(err?.message || "Unable to create service.");
    } finally {
      setCreating(false);
    }
  };

  const loadDeliveryOrders = async () => {
    if (!currentUserId) return;
    try {
      setLoadingDeliveryOrders(true);
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (!orders) return;

      const orderIds = orders.map((o) => String(o.order_id));
      const customerIds = Array.from(
        new Set(orders.map((o) => String(o.customer_id || "")).filter(Boolean))
      );
      const productIds = Array.from(
        new Set(orders.map((o) => String(o.product_id || "")).filter(Boolean))
      );
      const addressIds = Array.from(
        new Set(
          orders
            .flatMap((o) => [o.pickup_address_id, o.destination_address_id])
            .filter(Boolean)
        )
      );

      const [profiles, products, addresses, messages] = await Promise.all([
        customerIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", customerIds)
          : { data: [] },
        productIds.length
          ? supabase
              .from("products")
              .select("product_id, name")
              .in("product_id", productIds)
          : { data: [] },
        addressIds.length
          ? supabase
              .from("addresses")
              .select("id, name, address")
              .in("id", addressIds)
          : { data: [] },
        orderIds.length
          ? supabase
              .from("chat_messages")
              .select("order_id, message")
              .in("order_id", orderIds)
          : { data: [] }
      ]);

      const pMap = new Map(
        profiles.data?.map((p) => [
          String(p.id),
          p.full_name || p.email || "Customer"
        ])
      );
      const prMap = new Map(
        products.data?.map((p) => [String(p.product_id), p.name])
      );
      const aMap = new Map(
        addresses.data?.map((a) => [String(a.id), a.name || a.address])
      );
      const doneSet = new Set(
        messages.data
          ?.filter((m) => String(m.message).startsWith(DELIVERY_DONE_PREFIX))
          .map((m) => String(m.order_id))
      );

      const normalized: DeliveryOrderItem[] = orders.map((o) => ({
        orderId: String(o.order_id),
        customerId: String(o.customer_id || ""),
        customerName: pMap.get(String(o.customer_id)) || "Customer",
        productName: prMap.get(String(o.product_id)) || "Order",
        pickupLabel: aMap.get(String(o.pickup_address_id)) || "Pickup",
        destinationLabel:
          aMap.get(String(o.destination_address_id)) || "Destination",
        price: Number(o.price || 0),
        status: String(o.status || "pending"),
        freelancer_id: o.freelancer_id,
        freelance_id: o.freelance_id
      }));

      setAvailableDeliveryOrders(
        normalized.filter((o) => !o.status || o.status === "pending")
      );
      setMyDeliveryOrders(
        normalized.filter(
          (o) =>
            String(o.freelancer_id || o.freelance_id || "") ===
              String(currentUserId) &&
            !doneSet.has(o.orderId) &&
            !isCompletedOrderStatus(o.status)
        )
      );
    } finally {
      setLoadingDeliveryOrders(false);
    }
  };

  const loadPendingHireRequests = async () => {
    if (!currentUserId) return;
    try {
      setLoadingPendingHireRequests(true);
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("freelancer_id", currentUserId)
        .limit(50);
      if (!rooms || rooms.length === 0) {
        setPendingHireRequests([]);
        return;
      }

      const roomIds = rooms.map((r) => r.id);
      const orderIds = Array.from(
        new Set(rooms.map((r) => String(r.order_id)).filter(Boolean))
      );

      const [
        { data: messageRows },
        { data: profileRows },
        { data: serviceRows }
      ] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("*")
          .in("room_id", roomIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in(
            "id",
            rooms.map((r) => r.customer_id)
          ),
        supabase
          .from("services")
          .select("service_id, name")
          .in("service_id", orderIds)
      ]);

      const pMap = new Map(
        (profileRows || []).map((p) => [
          String(p.id),
          p.full_name || p.email || "Customer"
        ])
      );
      const sMap = new Map(
        (serviceRows || []).map((s) => [String(s.service_id), s.name])
      );

      const pending = rooms
        .map((room) => {
          const roomMsgs = (messageRows || []).filter(
            (m) => m.room_id === room.id
          );
          const hasRequest = roomMsgs.some((m) =>
            String(m.message).startsWith("[SYSTEM_HIRE_REQUEST]")
          );
          const hasAccepted = roomMsgs.some((m) =>
            String(m.message).startsWith("[SYSTEM_HIRE_ACCEPTED]")
          );

          if (!hasRequest || hasAccepted) return null;

          const reqMsg = roomMsgs.find((m) =>
            String(m.message).startsWith("[SYSTEM_HIRE_REQUEST]")
          );
          return {
            roomId: room.id,
            serviceId: String(room.order_id),
            customerId: String(room.customer_id),
            customerName: pMap.get(String(room.customer_id)) || "Customer",
            serviceName: sMap.get(String(room.order_id)) || "Service",
            requestMessage: String(reqMsg?.message || "")
              .replace("[SYSTEM_HIRE_REQUEST]", "")
              .trim(),
            requestedAt: reqMsg?.created_at
          };
        })
        .filter(Boolean) as PendingHireRequestItem[];

      setPendingHireRequests(pending);
    } finally {
      setLoadingPendingHireRequests(false);
    }
  };

  const loadOngoingServiceJobs = async () => {
    if (!currentUserId) return;
    try {
      setLoadingOngoingServiceJobs(true);
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("freelancer_id", currentUserId);

      if (!rooms || rooms.length === 0) {
        setOngoingServiceJobs([]);
        return;
      }

      const roomIds = rooms.map((r) => r.id);
      const orderIds = Array.from(
        new Set(rooms.map((r) => String(r.order_id)).filter(Boolean))
      );

      const [
        { data: messageRows },
        { data: profileRows },
        { data: serviceRows }
      ] = await Promise.all([
        supabase.from("chat_messages").select("*").in("room_id", roomIds),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in(
            "id",
            rooms.map((r) => r.customer_id)
          ),
        supabase
          .from("services")
          .select("service_id, name, price")
          .in("service_id", orderIds)
      ]);

      const pMap = new Map(
        (profileRows || []).map((p) => [
          String(p.id),
          p.full_name || p.email || "Customer"
        ])
      );
      const sMap = new Map(
        (serviceRows || []).map((s) => [String(s.service_id), s])
      );

      const ongoing = rooms
        .map((room) => {
          const roomMsgs = (messageRows || []).filter(
            (m) => m.room_id === room.id
          );
          const hasAccepted = roomMsgs.some((m) =>
            String(m.message).startsWith("[SYSTEM_HIRE_ACCEPTED]")
          );

          if (!hasAccepted) return null;

          const acceptMsg = roomMsgs.find((m) =>
            String(m.message).startsWith("[SYSTEM_HIRE_ACCEPTED]")
          );
          const svc = sMap.get(String(room.order_id));

          return {
            roomId: room.id,
            serviceId: String(room.order_id),
            customerId: String(room.customer_id),
            customerName: pMap.get(String(room.customer_id)) || "Customer",
            serviceName: svc?.name || "Service",
            acceptedAt: acceptMsg?.created_at || room.updated_at,
            price: Number(svc?.price || 0)
          };
        })
        .filter(Boolean) as OngoingServiceJobItem[];

      setOngoingServiceJobs(ongoing);
    } finally {
      setLoadingOngoingServiceJobs(false);
    }
  };

  const acceptHireRequest = async (request: PendingHireRequestItem) => {
    if (!currentUserId) return;
    try {
      setAcceptingHireRoomId(request.roomId);
      const systemMessage =
        "[SYSTEM_HIRE_ACCEPTED] Hire request accepted. You can now start chat.";
      const { error: msgError } = await supabase.from("chat_messages").insert([
        {
          room_id: request.roomId,
          order_id: request.serviceId,
          sender_id: currentUserId,
          message: systemMessage
        }
      ]);
      if (msgError) throw msgError;
      await supabase
        .from("chat_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", request.roomId);
      setSuccess("Hire request accepted.");
      await refreshJobBoard();
    } catch (err: any) {
      setError(err?.message || "Unable to accept hire request.");
    } finally {
      setAcceptingHireRoomId(null);
    }
  };

  const acceptDeliveryOrder = async (order: DeliveryOrderItem) => {
    if (!currentUserId) return;
    try {
      setAcceptingOrderId(order.orderId);
      const payload = {
        freelancer_id: currentUserId,
        freelance_id: currentUserId,
        status: "ongoing"
      };
      const { error } = await supabase
        .from("orders")
        .update(payload)
        .eq("order_id", order.orderId);
      if (error) throw error;
      setSuccess(`Accepted order ${order.orderId}`);
      await loadDeliveryOrders();
    } catch (err: any) {
      setError(err?.message || "Unable to accept order.");
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const completeDeliveryOrder = async (order: DeliveryOrderItem) => {
    if (!currentUserId) return;
    try {
      setCompletingOrderId(order.orderId);
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "done" })
        .eq("order_id", order.orderId);
      if (updateError) throw updateError;

      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", order.orderId);
      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map((r) => r.id);
        const doneMessageText = `${DELIVERY_DONE_PREFIX} ORDER:${order.orderId}`;
        for (const roomId of roomIds) {
          await supabase.from("chat_messages").insert([
            {
              room_id: roomId,
              order_id: order.orderId,
              sender_id: currentUserId,
              message: doneMessageText
            }
          ]);
        }
      }
      setSuccess(`Completed order ${order.orderId}`);
      await loadDeliveryOrders();
    } catch (err: any) {
      setError(err?.message || "Unable to complete order.");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const refreshJobBoard = async () => {
    setRefreshingJobBoard(true);
    await Promise.all([
      loadDeliveryOrders(),
      loadMyServices(),
      loadPendingHireRequests(),
      loadOngoingServiceJobs()
    ]);
    setJobBoardLastUpdatedAt(new Date().toISOString());
    setRefreshingJobBoard(false);
  };

  useEffect(() => {
    refreshJobBoard();
  }, [currentUserId]);

  return (
    <MyJobsTab
      services={services}
      loadingServices={loadingServices}
      refreshJobBoard={refreshJobBoard}
      refreshingJobBoard={refreshingJobBoard}
      loadingDeliveryOrders={loadingDeliveryOrders}
      loadingPendingHireRequests={loadingPendingHireRequests}
      loadingOngoingServiceJobs={loadingOngoingServiceJobs}
      jobBoardLastUpdatedAt={jobBoardLastUpdatedAt}
      pendingHireRequests={pendingHireRequests}
      acceptHireRequest={acceptHireRequest}
      acceptingHireRoomId={acceptingHireRoomId}
      ongoingServiceJobs={ongoingServiceJobs}
      availableDeliveryOrders={availableDeliveryOrders}
      acceptDeliveryOrder={acceptDeliveryOrder}
      acceptingOrderId={acceptingOrderId}
      myDeliveryOrders={myDeliveryOrders}
      completeDeliveryOrder={completeDeliveryOrder}
      completingOrderId={completingOrderId}
      createMyService={createMyService}
      creating={creating}
      repairMyServiceLinks={async () => {}}
      repairingLinks={false}
      error={error}
      success={success}
    />
  );
}
