/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import MyJobsTab from "@/components/freelance/MyJobsTab";
import { useServiceStore } from "@/stores/useServiceStore";
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

function JobsRoute() {
  const { profile, session } = useUserStore();
  const { uploadServiceImage } = useServiceStore();
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
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMyServices = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoadingServices(true);
      const { data } = await supabase
        .from("services")
        .select("*, pickup_address:addresses!pickup_address_id(*), dest_address:addresses!destination_address_id(*)")
        .eq("created_by", currentUserId)
        .order("created_at", { ascending: false });
      setServices((data as Service[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  }, [currentUserId]);

  const createMyService = async (formData: any) => {
    if (!currentUserId) return;
    try {
      setCreating(true);
      setError(null);

      let pickupAddressId = null;
      let destinationAddressId = null;

      // Upload image if provided
      let finalImageUrl = formData.image_url || "";
      if (formData.imageFile) {
        try {
          finalImageUrl = await uploadServiceImage(formData.imageFile);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          throw new Error("Failed to upload service image.");
        }
      }

      // Create pickup address if provided
      if (formData.pickupAddress) {
        const { data: pAddr, error: pError } = await supabase
          .from("addresses")
          .insert({
            name: formData.pickupAddress,
            address_detail: formData.pickupAddress
          })
          .select("id")
          .single();
        if (pError) throw pError;
        pickupAddressId = pAddr.id;
      }

      // Create destination address if provided
      if (formData.destinationAddress) {
        const { data: dAddr, error: dError } = await supabase
          .from("addresses")
          .insert({
            name: formData.destinationAddress,
            address_detail: formData.destinationAddress
          })
          .select("id")
          .single();
        if (dError) throw dError;
        destinationAddressId = dAddr.id;
      }

      const payload = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category,
        pickup_address_id: pickupAddressId,
        destination_address_id: destinationAddressId,
        image_url: finalImageUrl,
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

  const updateMyService = async (serviceId: string, formData: any) => {
    if (!currentUserId) return;
    try {
      setCreating(true);
      setError(null);

      // Upload image if provided
      let finalImageUrl = formData.image_url;
      if (formData.imageFile) {
        try {
          finalImageUrl = await uploadServiceImage(formData.imageFile);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          throw new Error("Failed to upload service image.");
        }
      }

      const payload = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category,
        image_url: finalImageUrl,
        detail_1: formData.detail_1,
        detail_2: formData.detail_2
      };

      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("service_id", serviceId);

      if (error) throw error;
      toast.success("Service updated successfully!");
      await loadMyServices();
    } catch (err: any) {
      toast.error(err?.message || "Unable to update service.");
    } finally {
      setCreating(false);
    }
  };

  const deleteMyService = async (serviceId: string) => {
    if (!currentUserId) return;
    try {
      setCreating(true);
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("service_id", serviceId);

      if (error) throw error;
      toast.success("Service deleted successfully!");
      await loadMyServices();
    } catch (err: any) {
      toast.error(err?.message || "Unable to delete service.");
    } finally {
      setCreating(false);
    }
  };

  const loadDeliveryOrders = useCallback(async () => {
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
              .select("order_id, content, message_type")
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
          ?.filter(
            (m) =>
              String(m.message_type).toUpperCase() === "SYSTEM_DELIVERY_DONE"
          )
          .map((m) => String(m.order_id))
      );

      const normalized: DeliveryOrderItem[] = orders
        .filter((o) => !!o.product_id) // Only delivery orders have product_id in this context
        .map((o) => ({
          orderId: String(o.order_id),
          customerId: String(o.customer_id || ""),
          customerName: pMap.get(String(o.customer_id)) || "Customer",
          productName: prMap.get(String(o.product_id)) || "Order",
          pickupLabel: aMap.get(String(o.pickup_address_id)) || "Pickup",
          destinationLabel:
            aMap.get(String(o.destination_address_id)) || "Destination",
          price: Number(o.price || 0),
          status: String(o.status || "WAITING"),
          freelancer_id: o.freelancer_id,
          freelance_id: o.freelance_id
        }));

      setAvailableDeliveryOrders(
        normalized.filter((o) => !o.status || o.status === "WAITING")
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
  }, [currentUserId]);

  const loadPendingHireRequests = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoadingPendingHireRequests(true);
      // Fetch orders where status is 'WAITING' and linked service is owned by current user
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, services!inner(name, created_by)")
        .eq("services.created_by", currentUserId)
        .eq("status", "WAITING")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setPendingHireRequests([]);
        return;
      }

      const orderIds = orders.map((o) => o.order_id);
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("order_id", orderIds);

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          orders.map((o) => o.customer_id)
        );

      const pMap = new Map(
        (profileRows || []).map((p) => [
          String(p.id),
          p.full_name || p.email || "Customer"
        ])
      );
      const rMap = new Map(
        (rooms || []).map((r) => [String(r.order_id), r.id])
      );

      const pending = orders.map((order) => ({
        roomId: rMap.get(String(order.order_id)) || "",
        orderId: String(order.order_id),
        serviceId: String(order.service_id),
        customerId: String(order.customer_id),
        customerName: pMap.get(String(order.customer_id)) || "Customer",
        serviceName: order.services?.name || "Service",
        requestMessage: "Customer wants to hire your service",
        requestedAt: order.created_at
      }));

      setPendingHireRequests(pending);
    } finally {
      setLoadingPendingHireRequests(false);
    }
  }, [currentUserId]);

  const loadOngoingServiceJobs = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoadingOngoingServiceJobs(true);
      // Fetch orders where status is 'ON_MY_WAY', 'IN_SERVICE', or 'COMPLETE' (but unpaid)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, services(name)")
        .eq("freelance_id", currentUserId)
        .in("status", ["ON_MY_WAY", "IN_SERVICE", "COMPLETE"])
        .is("payment_id", null) // Filter out orders that have already been paid
        .order("updated_at", { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setOngoingServiceJobs([]);
        return;
      }

      const orderIds = orders.map((o) => o.order_id);
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("order_id", orderIds);

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          orders.map((o) => o.customer_id)
        );

      const pMap = new Map(
        (profileRows || []).map((p) => [
          String(p.id),
          p.full_name || p.email || "Customer"
        ])
      );
      const rMap = new Map(
        (rooms || []).map((r) => [String(r.order_id), r.id])
      );

      const ongoing = orders.map((order) => ({
        roomId: rMap.get(String(order.order_id)) || "",
        orderId: String(order.order_id),
        serviceId: String(order.service_id),
        customerId: String(order.customer_id),
        customerName: pMap.get(String(order.customer_id)) || "Customer",
        serviceName: order.services?.name || "Service",
        acceptedAt: order.created_at,
        lastAt: order.updated_at,
        price: Number(order.price || 0),
        status: order.status
      }));

      setOngoingServiceJobs(ongoing);
    } finally {
      setLoadingOngoingServiceJobs(false);
    }
  }, [currentUserId]);

  const acceptHireRequest = async (request: PendingHireRequestItem) => {
    if (!currentUserId) return;
    try {
      setAcceptingHireRoomId(request.orderId);
      // Update order status to 'ON_MY_WAY' and assign freelance_id
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "ON_MY_WAY",
          freelance_id: currentUserId
        })
        .eq("order_id", request.orderId);

      if (orderError) throw orderError;

      const systemMessage = "Freelancer accepted your request and is on the way!";
      await supabase.from("chat_messages").insert([
        {
          room_id: request.roomId,
          order_id: request.orderId,
          sender_id: currentUserId,
          content: systemMessage,
          message_type: "SYSTEM_HIRE_ACCEPTED"
        }
      ]);

      toast.success("Job accepted!");
      await refreshJobBoard();
    } catch (err: any) {
      toast.error(err?.message || "Unable to accept job.");
    } finally {
      setAcceptingHireRoomId(null);
    }
  };

  const rejectHireRequest = async (request: PendingHireRequestItem) => {
    if (!currentUserId) return;
    try {
      setAcceptingHireRoomId(request.orderId);
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "REJECT" })
        .eq("order_id", request.orderId);

      if (orderError) throw orderError;

      const systemMessage = "Freelancer declined this request.";
      await supabase.from("chat_messages").insert([
        {
          room_id: request.roomId,
          order_id: request.orderId,
          sender_id: currentUserId,
          content: systemMessage,
          message_type: "SYSTEM_HIRE_DECLINED"
        }
      ]);

      toast.success("Job rejected.");
      await refreshJobBoard();
    } catch (err: any) {
      toast.error(err?.message || "Unable to reject job.");
    } finally {
      setAcceptingHireRoomId(null);
    }
  };

  const updateJobStatus = async (orderId: string, nextStatus: string) => {
    if (!currentUserId) return;
    try {
      setUpdatingJobId(orderId);
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("order_id", orderId);

      if (updateError) throw updateError;

      toast.success(`Status updated to ${nextStatus.replace(/_/g, " ")}`);
      await refreshJobBoard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setUpdatingJobId(null);
    }
  };

const acceptDeliveryOrder = async (order: DeliveryOrderItem) => {
  if (!currentUserId) return;
  try {
    setAcceptingOrderId(order.orderId);
    
    // ตรวจสอบชื่อคอลัมน์ให้ตรงกับ Database ของคุณ!
    // ส่วนใหญ่มักจะเป็น 'freelance_id' หรือ 'freelancer_id' (เลือกตัวใดตัวหนึ่ง)
    const payload = {
      freelance_id: currentUserId, 
      status: "ON_MY_WAY"
    };

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("order_id", order.orderId);

    if (error) {
      console.error("Supabase Update Error:", error); // ดูรายละเอียดใน Console
      throw error;
    }
    
    toast.success("Order accepted!");
    await loadDeliveryOrders();
  } catch (err: any) {
    console.error(err);
    toast.error(err?.message || "Unable to accept order.");
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
        .update({ status: "COMPLETE" })
        .eq("order_id", order.orderId);
      if (updateError) throw updateError;

      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", order.orderId);
      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map((r) => r.id);
        const doneMessageText = `ORDER:${order.orderId}`;
        for (const roomId of roomIds) {
          await supabase.from("chat_messages").insert([
            {
              room_id: roomId,
              order_id: order.orderId,
              sender_id: currentUserId,
              content: doneMessageText,
              message_type: "SYSTEM_DELIVERY_DONE"
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

  const refreshJobBoard = useCallback(async () => {
    setRefreshingJobBoard(true);
    await Promise.all([
      loadDeliveryOrders(),
      loadMyServices(),
      loadPendingHireRequests(),
      loadOngoingServiceJobs()
    ]);
    setJobBoardLastUpdatedAt(new Date().toISOString());
    setRefreshingJobBoard(false);
  }, [
    loadDeliveryOrders,
    loadMyServices,
    loadPendingHireRequests,
    loadOngoingServiceJobs
  ]);

  useEffect(() => {
    refreshJobBoard();
  }, [currentUserId, refreshJobBoard]);

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
      rejectHireRequest={rejectHireRequest}
      acceptingHireRoomId={acceptingHireRoomId}
      ongoingServiceJobs={ongoingServiceJobs}
      updateJobStatus={updateJobStatus}
      updatingJobId={updatingJobId}
      availableDeliveryOrders={availableDeliveryOrders}
      acceptDeliveryOrder={acceptDeliveryOrder}
      acceptingOrderId={acceptingOrderId}
      myDeliveryOrders={myDeliveryOrders}
      completeDeliveryOrder={completeDeliveryOrder}
      completingOrderId={completingOrderId}
      createMyService={createMyService}
      updateMyService={updateMyService}
      deleteMyService={deleteMyService}
      creating={creating}
      error={error}
      success={success}
    />
  );
}
