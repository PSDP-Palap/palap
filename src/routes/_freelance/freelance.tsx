import "leaflet/dist/leaflet.css";

import { createFileRoute, Link } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

import { useUserStore } from "@/stores/useUserStore";
import type {
  DashboardTab,
  DeliveryOrderItem,
  FreelanceConversation,
  LocationField,
  OngoingServiceJobItem,
  PendingHireRequestItem
} from "@/types/freelance";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance")({
  component: RouteComponent
});

type MapCenterTrackerProps = {
  onCenterChange: (lat: number, lng: number) => void;
};

const ORDER_COMPLETED_STATUS_SET = new Set([
  "completed",
  "done",
  "delivered",
  "success",
  "finished",
  "closed"
]);
const ORDER_ACCEPT_STATUS_CANDIDATES = [
  "serving",
  "in_progress",
  "processing",
  "ongoing",
  "accepted",
  "assigned"
];
const ORDER_COMPLETE_STATUS_CANDIDATES = [
  "completed",
  "done",
  "delivered",
  "success",
  "finished",
  "closed"
];
const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";

const isInvalidEnumValueError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "22p02" || message.includes("invalid input value for enum");
};

const isCompletedOrderStatus = (status: string | null | undefined) => {
  return ORDER_COMPLETED_STATUS_SET.has(String(status || "").toLowerCase());
};

const getOrderIdFromDeliveryDoneMessage = (message: string) => {
  const match = message.match(/ORDER:([^\s]+)/i);
  return match?.[1] ? String(match[1]) : "";
};

function MapCenterTracker({ onCenterChange }: MapCenterTrackerProps) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
    zoomend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    }
  });

  return null;
}

function RouteComponent() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const displayName = profile?.full_name || session?.user?.email || "Freelance";

  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("DELIVERY");
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mapLat, setMapLat] = useState(13.7563);
  const [mapLng, setMapLng] = useState(100.5018);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [activeLocationField, setActiveLocationField] =
    useState<LocationField>("pickup");
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [repairingLinks, setRepairingLinks] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] =
    useState<DashboardTab>("Dashboard");
  const [freelanceChats, setFreelanceChats] = useState<FreelanceConversation[]>(
    []
  );
  const [loadingFreelanceChats, setLoadingFreelanceChats] = useState(false);
  const [chatsRealtimeVersion, setChatsRealtimeVersion] = useState(0);
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
  const [earningSummary, setEarningSummary] = useState({
    totalIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });
  const [loadingEarning, setLoadingEarning] = useState(false);
  const [availableDeliveryOrders, setAvailableDeliveryOrders] = useState<
    DeliveryOrderItem[]
  >([]);
  const [myDeliveryOrders, setMyDeliveryOrders] = useState<DeliveryOrderItem[]>(
    []
  );
  const [loadingDeliveryOrders, setLoadingDeliveryOrders] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(
    null
  );
  const [ordersRealtimeVersion, setOrdersRealtimeVersion] = useState(0);
  const [closedDeliverySessionOrderIds, setClosedDeliverySessionOrderIds] =
    useState<string[]>([]);

  const ownerColumnVariants: string[][] = [
    ["freelancer_id", "freelance_id", "created_by"],
    ["freelancer_id", "created_by"],
    ["freelance_id", "created_by"],
    ["freelancer_id", "freelance_id"],
    ["freelancer_id"],
    ["freelance_id"],
    ["created_by"],
    ["created_by_id"],
    ["user_id"],
    ["owner_id"],
    ["freelancer_user_id"],
    ["profile_id"]
  ];
  const ownerColumns = Array.from(new Set(ownerColumnVariants.flat()));

  const isColumnMissingError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    return (
      message.includes("column") ||
      message.includes("does not exist") ||
      message.includes("could not find") ||
      code === "pgrst204" ||
      code === "42703"
    );
  };

  const isServiceLinkedToCurrentUser = (serviceRow: any) => {
    if (!currentUserId) return false;
    return ownerColumns.some(
      (column) => String(serviceRow?.[column] ?? "") === String(currentUserId)
    );
  };

  const mapBounds = {
    left: mapLng - 0.02,
    right: mapLng + 0.02,
    top: mapLat + 0.02,
    bottom: mapLat - 0.02
  };
  const mapLeafletBounds: [[number, number], [number, number]] = [
    [mapBounds.bottom, mapBounds.left],
    [mapBounds.top, mapBounds.right]
  ];

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resolveAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      setResolvingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) return "";
      const data = await response.json();
      return data?.display_name || "";
    } catch {
      return "";
    } finally {
      setResolvingAddress(false);
    }
  };

  const applyLocationFromPin = async () => {
    const resolved = await resolveAddressFromCoordinates(mapLat, mapLng);
    const fallbackText = `${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}`;
    const addressText = resolved || fallbackText;

    if (activeLocationField === "pickup") {
      setPickupAddress(addressText);
      return;
    }

    setDestinationAddress(addressText);
  };

  const loadMyServices = async () => {
    if (!currentUserId) {
      setServices([]);
      return;
    }

    try {
      setLoadingServices(true);
      const baseSelect =
        "service_id, name, price, category, pickup_address, dest_address, image_url, created_at";

      for (const columns of ownerColumnVariants) {
        const ownerSelect = columns.join(", ");
        const ownerFilter = columns
          .map((column) => `${column}.eq.${currentUserId}`)
          .join(",");

        const { data: linkedRows, error: linkedError } = await supabase
          .from("services")
          .select(`${baseSelect}, ${ownerSelect}`)
          .or(ownerFilter)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!linkedError) {
          setServices((linkedRows as any[]) ?? []);
          return;
        }

        if (!isColumnMissingError(linkedError)) {
          throw linkedError;
        }
      }

      const { data: fallbackRows, error: fallbackError } = await supabase
        .from("services")
        .select(baseSelect)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fallbackError) throw fallbackError;
      setServices((fallbackRows as any[]) ?? []);
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    loadMyServices();
  }, [currentUserId]);

  const mapOrderRows = async (rows: any[]): Promise<DeliveryOrderItem[]> => {
    if (!rows || rows.length === 0) return [];

    const customerIds = Array.from(
      new Set(rows.map((row) => String(row.customer_id || "")).filter(Boolean))
    );
    const productIds = Array.from(
      new Set(rows.map((row) => String(row.product_id || "")).filter(Boolean))
    );
    const addressIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [
            String(row.pickup_address_id || ""),
            String(row.destination_address_id || "")
          ])
          .filter(Boolean)
      )
    );

    const [
      { data: customerRows },
      { data: productRows },
      { data: addressRows }
    ] = await Promise.all([
      customerIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", customerIds)
        : Promise.resolve({ data: [] as any[] }),
      productIds.length > 0
        ? supabase
            .from("products")
            .select("product_id, id, name")
            .in("product_id", productIds)
        : Promise.resolve({ data: [] as any[] }),
      addressIds.length > 0
        ? supabase
            .from("addresses")
            .select("id, name, address_detail")
            .in("id", addressIds)
        : Promise.resolve({ data: [] as any[] })
    ]);

    const customerMap = new Map(
      (customerRows ?? []).map((row: any) => [
        String(row.id),
        row.full_name || row.email || "Customer"
      ])
    );
    const productMap = new Map(
      (productRows ?? []).map((row: any) => [
        String(row.product_id ?? row.id),
        row.name || "Product"
      ])
    );
    const addressMap = new Map(
      (addressRows ?? []).map((row: any) => [
        String(row.id),
        row.name || row.address_detail || "Address"
      ])
    );

    return rows.map((row) => ({
      orderId: String(row.order_id),
      serviceId: String(row.service_id || ""),
      customerId: String(row.customer_id || ""),
      customerName:
        customerMap.get(String(row.customer_id || "")) || "Customer",
      productName: productMap.get(String(row.product_id || "")) || "Product",
      pickupLabel:
        addressMap.get(String(row.pickup_address_id || "")) || "Pickup",
      destinationLabel:
        addressMap.get(String(row.destination_address_id || "")) ||
        "Destination",
      price: Number(row.price || 0),
      status: String(row.status || ""),
      createdAt: String(row.created_at || "")
    }));
  };

  const loadDeliveryOrders = async () => {
    if (!currentUserId) {
      setAvailableDeliveryOrders([]);
      setMyDeliveryOrders([]);
      return;
    }

    try {
      setLoadingDeliveryOrders(true);

      const [availableResult, mineResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id"
          )
          .is("freelance_id", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("orders")
          .select(
            "order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id"
          )
          .eq("freelance_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      const availableRows = availableResult.data ?? [];
      const myRows = mineResult.data ?? [];

      const [mappedAvailable, mappedMine, doneMarkerRowsResult] =
        await Promise.all([
          mapOrderRows(availableRows as any[]),
          mapOrderRows(myRows as any[]),
          supabase
            .from("chat_messages")
            .select("message, created_at")
            .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
            .order("created_at", { ascending: false })
            .limit(500)
        ]);

      const doneOrderSet = new Set(
        ((doneMarkerRowsResult.data ?? []) as any[])
          .map((row) =>
            getOrderIdFromDeliveryDoneMessage(String(row?.message || ""))
          )
          .filter(Boolean)
      );

      const closedOrderSet = new Set(
        closedDeliverySessionOrderIds.map((id) => String(id))
      );
      setAvailableDeliveryOrders(
        mappedAvailable.filter(
          (row) =>
            !isCompletedOrderStatus(row.status) &&
            !closedOrderSet.has(String(row.orderId)) &&
            !doneOrderSet.has(String(row.orderId))
        )
      );
      setMyDeliveryOrders(
        mappedMine.filter(
          (row) =>
            !isCompletedOrderStatus(row.status) &&
            !closedOrderSet.has(String(row.orderId)) &&
            !doneOrderSet.has(String(row.orderId))
        )
      );
    } catch {
      setAvailableDeliveryOrders([]);
      setMyDeliveryOrders([]);
    } finally {
      setLoadingDeliveryOrders(false);
    }
  };

  useEffect(() => {
    loadDeliveryOrders();
  }, [currentUserId, ordersRealtimeVersion, closedDeliverySessionOrderIds]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`freelance-orders-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        () => {
          setOrdersRealtimeVersion((value) => value + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const ensureDeliveryChatRoom = async (order: DeliveryOrderItem) => {
    if (!currentUserId || !order.customerId)
      return { roomId: null as string | null, createdByDelivery: false };

    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("order_id", order.orderId)
      .eq("customer_id", order.customerId)
      .eq("freelancer_id", currentUserId)
      .maybeSingle();

    if (existingRoom?.id) {
      return { roomId: String(existingRoom.id), createdByDelivery: false };
    }

    const { data: createdRoom, error: createRoomError } = await supabase
      .from("chat_rooms")
      .insert([
        {
          order_id: order.orderId,
          customer_id: order.customerId,
          freelancer_id: currentUserId,
          created_by: currentUserId,
          last_message_at: new Date().toISOString()
        }
      ])
      .select("id")
      .single();

    if (createRoomError || !createdRoom?.id) {
      return { roomId: null, createdByDelivery: false };
    }

    return { roomId: String(createdRoom.id), createdByDelivery: true };
  };

  const acceptDeliveryOrder = async (order: DeliveryOrderItem) => {
    if (!currentUserId) return;

    try {
      setAcceptingOrderId(order.orderId);
      setError(null);
      setSuccess(null);

      const nowIso = new Date().toISOString();
      let accepted = false;
      let lastAcceptError: any = null;

      for (const statusCandidate of ORDER_ACCEPT_STATUS_CANDIDATES) {
        const { data: acceptedRow, error: acceptError } = await supabase
          .from("orders")
          .update({
            freelance_id: currentUserId,
            status: statusCandidate,
            updated_at: nowIso
          })
          .eq("order_id", order.orderId)
          .is("freelance_id", null)
          .select("order_id")
          .maybeSingle();

        if (!acceptError && acceptedRow?.order_id) {
          accepted = true;
          break;
        }

        if (!acceptError && !acceptedRow?.order_id) {
          continue;
        }

        if (isInvalidEnumValueError(acceptError)) {
          lastAcceptError = acceptError;
          continue;
        }

        throw acceptError;
      }

      if (!accepted) {
        const fallbackAccept = await supabase
          .from("orders")
          .update({
            freelance_id: currentUserId,
            updated_at: nowIso
          })
          .eq("order_id", order.orderId)
          .is("freelance_id", null)
          .select("order_id")
          .maybeSingle();

        if (fallbackAccept.error) {
          if (lastAcceptError) throw lastAcceptError;
          throw fallbackAccept.error;
        }

        if (!fallbackAccept.data?.order_id) {
          const { data: latestOrderRow } = await supabase
            .from("orders")
            .select("freelance_id")
            .eq("order_id", order.orderId)
            .maybeSingle();

          const claimedFreelancerId = String(
            (latestOrderRow as any)?.freelance_id || ""
          );
          if (
            claimedFreelancerId &&
            claimedFreelancerId !== String(currentUserId)
          ) {
            throw new Error(
              "This order was already accepted by another freelancer."
            );
          }

          throw new Error("Unable to accept this order right now.");
        }

        accepted = true;
      }

      const { roomId, createdByDelivery } = await ensureDeliveryChatRoom(order);
      if (roomId) {
        const messages: any[] = [
          {
            room_id: roomId,
            order_id: order.orderId,
            sender_id: currentUserId,
            receiver_id: order.customerId,
            message: `[SYSTEM_DELIVERY_ORDER_ACCEPTED] ORDER:${order.orderId} Freelancer accepted delivery order.`
          }
        ];

        if (createdByDelivery) {
          messages.push({
            room_id: roomId,
            order_id: order.orderId,
            sender_id: currentUserId,
            receiver_id: order.customerId,
            message: `[SYSTEM_DELIVERY_ROOM_CREATED] ORDER:${order.orderId} Delivery room created.`
          });
        }

        await supabase.from("chat_messages").insert(messages);
        await supabase
          .from("chat_rooms")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", roomId);
      }

      setSuccess(`Accepted order ${order.orderId}.`);
      await loadDeliveryOrders();
    } catch (err: any) {
      setError(err?.message || "Unable to accept delivery order.");
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const completeDeliveryOrder = async (order: DeliveryOrderItem) => {
    if (!currentUserId) return;

    try {
      setCompletingOrderId(order.orderId);
      setError(null);
      setSuccess(null);

      const nowIso = new Date().toISOString();
      let completed = false;
      let lastCompleteError: any = null;
      const completionCandidates = Array.from(
        new Set([
          ...ORDER_COMPLETE_STATUS_CANDIDATES,
          "done_delivery",
          "completed_delivery"
        ])
      );

      for (const statusCandidate of completionCandidates) {
        const { error: completeError } = await supabase
          .from("orders")
          .update({
            status: statusCandidate,
            updated_at: nowIso
          })
          .eq("order_id", order.orderId)
          .eq("freelance_id", currentUserId);

        if (!completeError) {
          completed = true;
          break;
        }

        if (isInvalidEnumValueError(completeError)) {
          lastCompleteError = completeError;
          continue;
        }

        throw completeError;
      }

      if (!completed) {
        const fallbackComplete = await supabase
          .from("orders")
          .update({ updated_at: nowIso })
          .eq("order_id", order.orderId)
          .eq("freelance_id", currentUserId);

        if (fallbackComplete.error) {
          throw new Error(
            lastCompleteError?.message ||
              fallbackComplete.error.message ||
              "Unable to complete delivery order."
          );
        }
      }

      const { data: roomMarkerRows } = await supabase
        .from("chat_messages")
        .select("room_id")
        .like(
          "message",
          `[SYSTEM_DELIVERY_ROOM_CREATED] ORDER:${order.orderId}%`
        );

      const markerRoomIds = Array.from(
        new Set(
          (roomMarkerRows ?? [])
            .map((row: any) => String(row.room_id || ""))
            .filter(Boolean)
        )
      );

      const { data: orderRoomRows } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", order.orderId)
        .eq("customer_id", order.customerId)
        .eq("freelancer_id", currentUserId)
        .limit(10);

      const roomIds = Array.from(
        new Set([
          ...markerRoomIds,
          ...(orderRoomRows ?? [])
            .map((row: any) => String(row.id || ""))
            .filter(Boolean)
        ])
      );

      if (roomIds.length > 0) {
        const doneMessages = roomIds.map((roomId) => ({
          room_id: roomId,
          order_id: order.orderId,
          sender_id: currentUserId,
          receiver_id: order.customerId,
          message: `${DELIVERY_DONE_PREFIX} ORDER:${order.orderId} Delivery completed.`
        }));

        await supabase.from("chat_messages").insert(doneMessages);

        await supabase
          .from("chat_rooms")
          .update({ last_message_at: new Date().toISOString() })
          .in("id", roomIds);
      }

      setClosedDeliverySessionOrderIds((prev) =>
        prev.includes(order.orderId) ? prev : [...prev, order.orderId]
      );
      setMyDeliveryOrders((prev) =>
        prev.filter((item) => String(item.orderId) !== String(order.orderId))
      );
      setSuccess(
        `Completed order ${order.orderId}. Chat stays available until deleted manually.`
      );
      await loadDeliveryOrders();
    } catch (err: any) {
      setError(err?.message || "Unable to complete delivery order.");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const acceptHireRequest = async (request: PendingHireRequestItem) => {
    if (!currentUserId) return;

    try {
      setAcceptingHireRoomId(request.roomId);
      setError(null);
      setSuccess(null);

      const { error: insertError } = await supabase
        .from("chat_messages")
        .insert([
          {
            room_id: request.roomId,
            order_id: request.serviceId,
            sender_id: currentUserId,
            receiver_id: request.customerId,
            message:
              "[SYSTEM_HIRE_ACCEPTED] Hire request accepted. You can now start chat."
          }
        ]);

      if (insertError) throw insertError;

      await supabase
        .from("chat_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", request.roomId);

      setPendingHireRequests((prev) =>
        prev.filter((item) => String(item.roomId) !== String(request.roomId))
      );
      setSuccess("Hire request accepted.");
      setChatsRealtimeVersion((value) => value + 1);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("service-chat-updated"));
      }
    } catch (err: any) {
      setError(err?.message || "Unable to accept hire request.");
    } finally {
      setAcceptingHireRoomId(null);
    }
  };

  useEffect(() => {
    const loadPendingHireRequests = async () => {
      if (!currentUserId) {
        setPendingHireRequests([]);
        return;
      }

      try {
        setLoadingPendingHireRequests(true);

        const { data: roomRows, error: roomError } = await supabase
          .from("chat_rooms")
          .select("id, order_id, customer_id, freelancer_id, last_message_at")
          .eq("freelancer_id", currentUserId)
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (roomError || !roomRows || roomRows.length === 0) {
          setPendingHireRequests([]);
          return;
        }

        const rooms = roomRows as any[];
        const roomIds = rooms.map((row) => String(row.id));
        const customerIds = Array.from(
          new Set(
            rooms.map((row) => String(row.customer_id || "")).filter(Boolean)
          )
        );
        const orderIds = Array.from(
          new Set(
            rooms.map((row) => String(row.order_id || "")).filter(Boolean)
          )
        );

        const [
          { data: messageRows },
          { data: customerRows },
          { data: serviceRows }
        ] = await Promise.all([
          roomIds.length > 0
            ? supabase
                .from("chat_messages")
                .select("room_id, message, created_at")
                .in("room_id", roomIds)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] as any[] }),
          customerIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", customerIds)
            : Promise.resolve({ data: [] as any[] }),
          orderIds.length > 0
            ? supabase
                .from("services")
                .select("service_id, name")
                .in("service_id", orderIds)
            : Promise.resolve({ data: [] as any[] })
        ]);

        const customerMap = new Map(
          (customerRows ?? []).map((row: any) => [
            String(row.id),
            row.full_name || row.email || "Customer"
          ])
        );
        const serviceMap = new Map(
          (serviceRows ?? []).map((row: any) => [
            String(row.service_id),
            row.name || "Service"
          ])
        );

        const roomMessagesMap = new Map<string, any[]>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          const current = roomMessagesMap.get(key) || [];
          current.push(row);
          roomMessagesMap.set(key, current);
        });

        const pendingRows: PendingHireRequestItem[] = rooms
          .map((room: any) => {
            const roomId = String(room.id);
            const rows = roomMessagesMap.get(roomId) || [];
            const hasRequest = rows.some((row: any) =>
              String(row.message || "").startsWith("[SYSTEM_HIRE_REQUEST]")
            );
            const hasAccepted = rows.some((row: any) =>
              String(row.message || "").startsWith("[SYSTEM_HIRE_ACCEPTED]")
            );
            if (!hasRequest || hasAccepted) return null;

            const firstRequest = rows.find((row: any) =>
              String(row.message || "").startsWith("[SYSTEM_HIRE_REQUEST]")
            );

            return {
              roomId,
              serviceId: String(room.order_id || ""),
              customerId: String(room.customer_id || ""),
              customerName:
                customerMap.get(String(room.customer_id || "")) || "Customer",
              serviceName:
                serviceMap.get(String(room.order_id || "")) || "Service",
              requestedAt: String(
                firstRequest?.created_at || room.last_message_at || ""
              )
            };
          })
          .filter(Boolean) as PendingHireRequestItem[];

        setPendingHireRequests(pendingRows);
      } catch {
        setPendingHireRequests([]);
      } finally {
        setLoadingPendingHireRequests(false);
      }
    };

    loadPendingHireRequests();
  }, [currentUserId, chatsRealtimeVersion]);

  useEffect(() => {
    const loadOngoingServiceJobs = async () => {
      if (!currentUserId) {
        setOngoingServiceJobs([]);
        return;
      }

      try {
        setLoadingOngoingServiceJobs(true);

        const { data: roomRows, error: roomError } = await supabase
          .from("chat_rooms")
          .select("id, order_id, customer_id, freelancer_id, last_message_at")
          .eq("freelancer_id", currentUserId)
          .order("last_message_at", { ascending: false })
          .limit(200);

        if (roomError || !roomRows || roomRows.length === 0) {
          setOngoingServiceJobs([]);
          return;
        }

        const rooms = roomRows as any[];
        const roomIds = rooms.map((row) => String(row.id));
        const customerIds = Array.from(
          new Set(
            rooms.map((row) => String(row.customer_id || "")).filter(Boolean)
          )
        );
        const orderIds = Array.from(
          new Set(
            rooms.map((row) => String(row.order_id || "")).filter(Boolean)
          )
        );

        const [
          { data: messageRows },
          { data: customerRows },
          { data: serviceRows }
        ] = await Promise.all([
          roomIds.length > 0
            ? supabase
                .from("chat_messages")
                .select("room_id, message, created_at")
                .in("room_id", roomIds)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] as any[] }),
          customerIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", customerIds)
            : Promise.resolve({ data: [] as any[] }),
          orderIds.length > 0
            ? supabase
                .from("services")
                .select("service_id, name, category, price")
                .in("service_id", orderIds)
            : Promise.resolve({ data: [] as any[] })
        ]);

        const customerMap = new Map(
          (customerRows ?? []).map((row: any) => [
            String(row.id),
            row.full_name || row.email || "Customer"
          ])
        );
        const serviceMap = new Map(
          (serviceRows ?? []).map((row: any) => [String(row.service_id), row])
        );

        const roomMessagesMap = new Map<string, any[]>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          const current = roomMessagesMap.get(key) || [];
          current.push(row);
          roomMessagesMap.set(key, current);
        });

        const mappedOngoing: OngoingServiceJobItem[] = rooms
          .map((room: any) => {
            const roomId = String(room.id);
            const rows = roomMessagesMap.get(roomId) || [];
            const hasRequest = rows.some((row: any) =>
              String(row.message || "").startsWith("[SYSTEM_HIRE_REQUEST]")
            );
            const acceptedMessage = rows.find((row: any) => {
              const message = String(row.message || "");
              return (
                message.startsWith("[SYSTEM_HIRE_ACCEPTED]") ||
                message.startsWith("[SYSTEM_DELIVERY_ORDER_ACCEPTED]")
              );
            });
            const hasDone = rows.some((row: any) =>
              String(row.message || "").startsWith("[SYSTEM_DELIVERY_DONE]")
            );

            if (hasRequest && !acceptedMessage) return null;
            if (hasDone) return null;

            const serviceId = String(room.order_id || "");
            const serviceRow = serviceMap.get(serviceId) as any;
            const category = String(serviceRow?.category || "").toUpperCase();
            if (category === "DELIVERY_SESSION") return null;

            return {
              roomId,
              serviceId,
              customerId: String(room.customer_id || ""),
              customerName:
                customerMap.get(String(room.customer_id || "")) || "Customer",
              serviceName: String(serviceRow?.name || "Service"),
              acceptedAt: String(
                acceptedMessage?.created_at || room.last_message_at || ""
              ),
              lastAt: String(
                room.last_message_at || acceptedMessage?.created_at || ""
              ),
              price: Number(serviceRow?.price || 0)
            };
          })
          .filter(Boolean)
          .sort(
            (a: any, b: any) =>
              new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
          ) as OngoingServiceJobItem[];

        setOngoingServiceJobs(mappedOngoing);
      } catch {
        setOngoingServiceJobs([]);
      } finally {
        setLoadingOngoingServiceJobs(false);
      }
    };

    loadOngoingServiceJobs();
  }, [currentUserId, chatsRealtimeVersion]);

  useEffect(() => {
    const loadFreelanceChats = async () => {
      if (!currentUserId) {
        setFreelanceChats([]);
        return;
      }

      try {
        setLoadingFreelanceChats(true);

        const { data: roomRows, error: roomError } = await supabase
          .from("chat_rooms")
          .select("id, order_id, customer_id, freelancer_id, last_message_at")
          .eq("freelancer_id", currentUserId)
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (roomError || !roomRows || roomRows.length === 0) {
          setFreelanceChats([]);
          return;
        }

        const rooms = roomRows as any[];
        const roomIds = rooms.map((row) => String(row.id));
        const customerIds = Array.from(
          new Set(rooms.map((row) => String(row.customer_id)))
        );
        const serviceIds = Array.from(
          new Set(rooms.map((row) => String(row.service_id)))
        );

        const { data: messageRows } = await supabase
          .from("chat_messages")
          .select("room_id, message, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false });

        const { data: customerRows } = await supabase
          .from("profiles")
          .select("*")
          .in("id", customerIds);

        const { data: serviceRows } = await supabase
          .from("services")
          .select("service_id, name")
          .in("service_id", serviceIds);

        const customerMap = new Map(
          (customerRows ?? []).map((row: any) => [
            String(row.id),
            {
              name: row.full_name || row.email || "Customer",
              avatar: row.avatar_url || row.image_url || row.photo_url || null
            }
          ])
        );

        const serviceMap = new Map(
          (serviceRows ?? []).map((row: any) => [
            String(row.service_id),
            row.name || "Service"
          ])
        );

        const roomFlags = new Map<
          string,
          {
            hasRequest: boolean;
            hasAccepted: boolean;
            hasDeliveryAccepted: boolean;
          }
        >();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          const current = roomFlags.get(key) || {
            hasRequest: false,
            hasAccepted: false,
            hasDeliveryAccepted: false
          };
          const message = String(row.message || "");

          roomFlags.set(key, {
            hasRequest:
              current.hasRequest || message.startsWith("[SYSTEM_HIRE_REQUEST]"),
            hasAccepted:
              current.hasAccepted ||
              message.startsWith("[SYSTEM_HIRE_ACCEPTED]"),
            hasDeliveryAccepted:
              current.hasDeliveryAccepted ||
              message.startsWith("[SYSTEM_DELIVERY_ORDER_ACCEPTED]")
          });
        });

        const latestByRoom = new Map<
          string,
          { message: string; createdAt: string }
        >();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          if (latestByRoom.has(key)) return;
          const message = String(row.message || "");
          if (
            message.startsWith("[SYSTEM_HIRE_REQUEST]") ||
            message.startsWith("[SYSTEM_HIRE_ACCEPTED]") ||
            message.startsWith("[SYSTEM_DELIVERY_ORDER_ACCEPTED]") ||
            message.startsWith("[SYSTEM_DELIVERY_ROOM_CREATED]") ||
            message.startsWith("[SYSTEM_DELIVERY_DONE]")
          )
            return;
          latestByRoom.set(key, {
            message: message.startsWith("[CHAT_IMAGE]") ? "📷 Image" : message,
            createdAt: String(row.created_at || "")
          });
        });

        const mappedChats: FreelanceConversation[] = rooms
          .map((room: any) => {
            const roomId = String(room.id);
            const customerId = String(room.customer_id);
            const latest = latestByRoom.get(roomId);
            const customer = customerMap.get(customerId);

            return {
              roomId,
              serviceId: String(room.service_id),
              customerId,
              customerName: customer?.name || "Customer",
              customerAvatarUrl: customer?.avatar || null,
              serviceName: serviceMap.get(String(room.service_id)) || "Service",
              lastMessage: latest?.message || "No message yet",
              lastAt: latest?.createdAt || String(room.last_message_at || "")
            };
          })
          .filter((chat) => {
            const flags = roomFlags.get(chat.roomId);
            if (!flags) return true;
            if (
              flags.hasRequest &&
              !flags.hasAccepted &&
              !flags.hasDeliveryAccepted
            )
              return false;
            return true;
          });

        setFreelanceChats(mappedChats);
      } catch {
        setFreelanceChats([]);
      } finally {
        setLoadingFreelanceChats(false);
      }
    };

    loadFreelanceChats();
  }, [currentUserId, chatsRealtimeVersion]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`freelance-chats-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms"
        },
        () => {
          setChatsRealtimeVersion((value) => value + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages"
        },
        () => {
          setChatsRealtimeVersion((value) => value + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    const loadEarningSummary = async () => {
      if (!currentUserId) {
        setEarningSummary({
          totalIncome: 0,
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0
        });
        return;
      }

      try {
        setLoadingEarning(true);

        const { data: orderRows, error } = await supabase
          .from("orders")
          .select("order_id, price, status")
          .eq("freelance_id", currentUserId)
          .limit(500);

        if (error || !orderRows) {
          const fallbackIncome = services.reduce(
            (sum, item) => sum + (Number(item?.price) || 0),
            0
          );
          setEarningSummary({
            totalIncome: fallbackIncome,
            totalOrders: services.length,
            completedOrders: services.length,
            pendingOrders: 0
          });
          return;
        }

        const completedStatuses = ORDER_COMPLETED_STATUS_SET;
        const completedOrders = (orderRows as any[]).filter((row) =>
          completedStatuses.has(String(row?.status || "").toLowerCase())
        );
        const totalIncome = completedOrders.reduce(
          (sum, row) => sum + (Number(row?.price) || 0),
          0
        );

        setEarningSummary({
          totalIncome,
          totalOrders: orderRows.length,
          completedOrders: completedOrders.length,
          pendingOrders: Math.max(orderRows.length - completedOrders.length, 0)
        });
      } catch {
        const fallbackIncome = services.reduce(
          (sum, item) => sum + (Number(item?.price) || 0),
          0
        );
        setEarningSummary({
          totalIncome: fallbackIncome,
          totalOrders: services.length,
          completedOrders: services.length,
          pendingOrders: 0
        });
      } finally {
        setLoadingEarning(false);
      }
    };

    loadEarningSummary();
  }, [currentUserId, services, ordersRealtimeVersion]);

  const createMyService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUserId) {
      setError("Please sign in first.");
      return;
    }

    if (!name.trim()) {
      setError("Service name is required.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: name.trim(),
        price: Number(price) || 0,
        category,
        pickup_address: pickupAddress.trim() || null,
        dest_address: destinationAddress.trim() || null,
        image_url: imageUrl.trim() || null
      };

      let inserted = false;
      let linkedColumns: string[] = [];

      for (const columns of ownerColumnVariants) {
        const linkedPayload = columns.reduce<Record<string, any>>(
          (acc, column) => {
            acc[column] = currentUserId;
            return acc;
          },
          { ...payload }
        );

        const { error: createWithLinkError } = await supabase
          .from("services")
          .insert([linkedPayload]);

        if (!createWithLinkError) {
          inserted = true;
          linkedColumns = columns;
          break;
        }

        if (!isColumnMissingError(createWithLinkError)) {
          throw createWithLinkError;
        }
      }

      if (!inserted) {
        const { error: createFallbackError } = await supabase
          .from("services")
          .insert([payload]);

        if (createFallbackError) throw createFallbackError;
        setSuccess(
          "Service created, but owner column was not found. Add freelancer_id/freelance_id/created_by to link owner."
        );
      } else {
        setSuccess(
          `Service created and linked via ${linkedColumns.join(", ")}.`
        );
      }

      setName("");
      setPrice(0);
      setCategory("DELIVERY");
      setPickupAddress("");
      setDestinationAddress("");
      setImageUrl("");
      setMapLat(13.7563);
      setMapLng(100.5018);
      await loadMyServices();
    } catch (err: any) {
      setError(err?.message || "Unable to create service.");
    } finally {
      setCreating(false);
    }
  };

  const repairMyServiceLinks = async () => {
    if (!currentUserId) {
      setError("Please sign in first.");
      return;
    }

    if (services.length === 0) {
      setError("No services to repair.");
      return;
    }

    try {
      setRepairingLinks(true);
      setError(null);
      setSuccess(null);

      let repaired = 0;
      let skipped = 0;
      let failed = 0;
      let firstFailureMessage: string | null = null;

      for (const serviceRow of services) {
        if (isServiceLinkedToCurrentUser(serviceRow)) {
          skipped += 1;
          continue;
        }

        const rowServiceId = serviceRow?.service_id;
        const rowId = serviceRow?.id;
        if (!rowServiceId && !rowId) {
          failed += 1;
          continue;
        }

        let repairedThisRow = false;

        for (const column of ownerColumns) {
          const payload = { [column]: currentUserId };

          let query = supabase.from("services").update(payload);

          if (rowServiceId) {
            query = query.eq("service_id", rowServiceId);
          } else {
            query = query.eq("id", rowId);
          }

          const { error: repairError } = await query;

          if (!repairError) {
            repaired += 1;
            repairedThisRow = true;
            break;
          }

          if (isColumnMissingError(repairError)) {
            continue;
          }

          if (!firstFailureMessage) {
            firstFailureMessage =
              repairError.message || "Unable to update some services.";
          }
          break;
        }

        if (!repairedThisRow) {
          failed += 1;
        }
      }

      await loadMyServices();

      if (failed > 0) {
        setError(
          firstFailureMessage || `Repair finished with ${failed} failed row(s).`
        );
      }
      setSuccess(
        `Repair complete: ${repaired} linked, ${skipped} already linked, ${failed} failed.`
      );
    } catch (err: any) {
      setError(err?.message || "Unable to repair service links.");
    } finally {
      setRepairingLinks(false);
    }
  };

  const currentEarning = earningSummary.totalIncome;
  const upcomingJobs = services;

  const roleBadges = Array.from(
    new Set(
      [
        (profile?.role || "freelance").toUpperCase(),
        currentUserId ? "FREELANCE" : null,
        services.length > 0 ? "SERVICE" : null
      ].filter(Boolean) as string[]
    )
  );

  const dashboardMenuItems: DashboardTab[] = [
    "Dashboard",
    "My Jobs",
    "Messages",
    "Earning",
    "Account Setting"
  ];

  return (
    <div className="min-h-screen bg-[#FCE6D5] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4 space-y-4">
        <section className="w-full bg-[#e9bc9a] rounded-2xl border border-orange-100 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 md:gap-6">
            <aside className="space-y-3">
              <div className="bg-white rounded-[26px] p-5 flex flex-col items-center shadow-sm border border-gray-100 relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#8E3A19] mb-3 shadow-sm flex items-center justify-center bg-orange-100 text-2xl font-black text-[#5D2611]">
                  {String(displayName).charAt(0).toUpperCase()}
                </div>

                <h3 className="font-bold text-base mb-3 text-gray-800 text-center leading-tight">
                  {displayName}
                </h3>

                <div className="flex flex-col gap-1.5 w-full px-2">
                  {roleBadges.map((role) => (
                    <span
                      key={role}
                      className="bg-[#8E3A19] text-white text-[10px] font-bold py-1 rounded-md text-center tracking-tight uppercase"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <nav className="flex flex-col gap-2">
                {dashboardMenuItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveDashboardTab(item)}
                    className={`py-2.5 px-6 rounded-2xl font-bold text-xs shadow-sm transition-all text-center border-2 ${
                      item === activeDashboardTab
                        ? "bg-[#C04E21] text-white border-[#C04E21]"
                        : "bg-white text-gray-600 border-transparent hover:bg-orange-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="space-y-4 min-w-0">
              {activeDashboardTab === "Dashboard" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
                      <h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
                        ฿ {currentEarning.toLocaleString()}
                      </h3>
                      <p className="text-gray-500 font-medium">
                        Current Earning
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
                      <h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
                        {upcomingJobs.length}
                      </h3>
                      <p className="text-gray-500 font-medium">My Jobs</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm min-w-0 overflow-hidden">
                    <h2 className="text-xl font-black text-[#4A2600] mb-3">
                      Recent Jobs
                    </h2>

                    {loadingServices ? (
                      <p className="text-sm text-gray-500">Loading jobs...</p>
                    ) : upcomingJobs.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No jobs found for this freelance account.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingJobs.slice(0, 5).map((item, index) => (
                          <div
                            key={String(item?.service_id ?? item?.id ?? index)}
                            className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100 min-w-0 overflow-hidden"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                                🐶
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-lg text-gray-800 truncate">
                                  {item?.name || "Service"}
                                </h4>
                                <p className="text-xs text-gray-400 truncate">
                                  {item?.pickup_address || "No pickup"} →{" "}
                                  {item?.dest_address || "No destination"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <span className="text-[10px] text-gray-500">
                                  Category:
                                </span>
                                <span className="bg-[#FFD700] text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  {item?.category || "GENERAL"}
                                </span>
                              </div>
                              <p className="text-xl font-bold text-[#5D2611]">
                                ฿ {Number(item?.price ?? 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeDashboardTab === "My Jobs" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
                    <h2 className="text-xl font-black text-[#4A2600] mb-2">
                      My Jobs
                    </h2>
                    <p className="text-sm text-gray-600">
                      Manage services created and linked to this freelance
                      account below.
                    </p>
                  </div>

                  <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-black text-[#4A2600]">
                        Pending Hire Requests
                      </h3>
                      <span className="px-2 py-1 rounded-full bg-orange-100 text-[#A03F00] text-xs font-black">
                        {pendingHireRequests.length}
                      </span>
                    </div>

                    {loadingPendingHireRequests ? (
                      <p className="text-sm text-gray-500">
                        Loading pending requests...
                      </p>
                    ) : pendingHireRequests.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No pending hire requests right now.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pendingHireRequests.map((request) => (
                          <div
                            key={request.roomId}
                            className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[#4A2600] truncate">
                                {request.customerName}
                              </p>
                              <p className="text-xs text-orange-700 truncate">
                                {request.serviceName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Requested:{" "}
                                {request.requestedAt
                                  ? new Date(
                                      request.requestedAt
                                    ).toLocaleString()
                                  : "-"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => acceptHireRequest(request)}
                                disabled={
                                  acceptingHireRoomId === request.roomId
                                }
                                className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-black disabled:bg-gray-300"
                              >
                                {acceptingHireRoomId === request.roomId
                                  ? "Accepting..."
                                  : "Accept Request"}
                              </button>
                              <Link
                                to="/service/$id"
                                params={{ id: request.serviceId }}
                                hash={`chat:${encodeURIComponent(request.roomId)}`}
                                className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
                              >
                                Open Chat
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-black text-[#4A2600]">
                        Ongoing Jobs
                      </h3>
                      <span className="px-2 py-1 rounded-full bg-orange-100 text-[#A03F00] text-xs font-black">
                        {ongoingServiceJobs.length}
                      </span>
                    </div>

                    {loadingOngoingServiceJobs ? (
                      <p className="text-sm text-gray-500">
                        Loading ongoing jobs...
                      </p>
                    ) : ongoingServiceJobs.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No ongoing jobs yet. Accept a hire request to start one.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {ongoingServiceJobs.map((job) => (
                          <div
                            key={job.roomId}
                            className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[#4A2600] truncate">
                                {job.serviceName}
                              </p>
                              <p className="text-xs text-orange-700 truncate">
                                Customer: {job.customerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Accepted:{" "}
                                {job.acceptedAt
                                  ? new Date(job.acceptedAt).toLocaleString()
                                  : "-"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-500">Price</p>
                              <p className="font-black text-[#5D2611]">
                                ฿ {job.price.toFixed(2)}
                              </p>
                              <Link
                                to="/service/$id"
                                params={{ id: job.serviceId }}
                                hash={`chat:${encodeURIComponent(job.roomId)}`}
                                className="inline-block mt-1 px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
                              >
                                Open Chat
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-black text-[#4A2600]">
                        Delivery Job Board
                      </h3>
                      <button
                        type="button"
                        onClick={loadDeliveryOrders}
                        disabled={loadingDeliveryOrders}
                        className="px-3 py-1.5 rounded-md text-xs font-black bg-orange-100 text-[#A03F00] disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {loadingDeliveryOrders ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
                        <h4 className="font-black text-[#4A2600] mb-2">
                          Waiting Orders
                        </h4>
                        {availableDeliveryOrders.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No waiting delivery orders right now.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {availableDeliveryOrders.map((order) => (
                              <div
                                key={order.orderId}
                                className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                              >
                                <p className="text-xs text-gray-500">
                                  Order: {order.orderId}
                                </p>
                                <p className="font-bold text-[#4A2600]">
                                  {order.productName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Customer: {order.customerName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {order.pickupLabel} → {order.destinationLabel}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="font-black text-[#5D2611]">
                                    ฿ {order.price.toFixed(2)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => acceptDeliveryOrder(order)}
                                    disabled={
                                      acceptingOrderId === order.orderId
                                    }
                                    className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
                                  >
                                    {acceptingOrderId === order.orderId
                                      ? "Accepting..."
                                      : "Accept"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-orange-100 p-4 bg-orange-50/40">
                        <h4 className="font-black text-[#4A2600] mb-2">
                          My Active Deliveries
                        </h4>
                        {myDeliveryOrders.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No active delivery jobs.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {myDeliveryOrders.map((order) => (
                              <div
                                key={order.orderId}
                                className="bg-white border border-orange-100 rounded-lg p-3 space-y-1"
                              >
                                <p className="text-xs text-gray-500">
                                  Order: {order.orderId}
                                </p>
                                <p className="font-bold text-[#4A2600]">
                                  {order.productName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Customer: {order.customerName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Status: {order.status}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {order.pickupLabel} → {order.destinationLabel}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="font-black text-[#5D2611]">
                                    ฿ {order.price.toFixed(2)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => completeDeliveryOrder(order)}
                                    disabled={
                                      completingOrderId === order.orderId
                                    }
                                    className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-black disabled:bg-gray-300"
                                  >
                                    {completingOrderId === order.orderId
                                      ? "Finishing..."
                                      : "Done Delivery"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
                    <h3 className="text-xl font-black text-[#4A2600]">
                      Create Service
                    </h3>

                    <form onSubmit={createMyService} className="mt-4 space-y-3">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Service name"
                        required
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={price}
                          onChange={(e) =>
                            setPrice(Number(e.target.value) || 0)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Price"
                          type="number"
                          min={0}
                        />

                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="DELIVERY">DELIVERY</option>
                          <option value="SHOPPING">SHOPPING</option>
                          <option value="CARE">CARE</option>
                        </select>
                      </div>

                      <input
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Pickup address"
                      />

                      <input
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Destination address"
                      />

                      <input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Image URL"
                      />

                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">
                          Upload Service Image
                        </p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-100 text-orange-700 font-black text-xs uppercase hover:bg-orange-200 cursor-pointer">
                          Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="Service preview"
                            className="w-24 h-24 rounded-md object-cover border border-orange-100"
                          />
                        )}
                      </div>

                      <div className="space-y-2 border border-orange-100 rounded-xl p-3 bg-orange-50/50">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">
                          Select Location by Map
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveLocationField("pickup")}
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase ${activeLocationField === "pickup" ? "bg-[#A03F00] text-white" : "bg-white text-[#4A2600] border border-orange-200"}`}
                          >
                            Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveLocationField("destination")
                            }
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase ${activeLocationField === "destination" ? "bg-[#A03F00] text-white" : "bg-white text-[#4A2600] border border-orange-200"}`}
                          >
                            Destination
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapExpanded((prev) => !prev)}
                            className="px-3 py-1.5 rounded-md bg-white text-[#4A2600] border border-orange-200 font-black text-xs uppercase"
                          >
                            {mapExpanded ? "Collapse Map" : "Expand Map"}
                          </button>
                        </div>

                        <div
                          className={`rounded-md overflow-hidden border border-orange-200 relative ${mapExpanded ? "h-[380px]" : "h-48"}`}
                        >
                          <MapContainer
                            bounds={mapLeafletBounds}
                            className="w-full h-full z-0"
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapCenterTracker
                              onCenterChange={(lat, lng) => {
                                setMapLat(Number(lat.toFixed(6)));
                                setMapLng(Number(lng.toFixed(6)));
                              }}
                            />
                          </MapContainer>

                          <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                              <div className="absolute top-1/2 left-0 right-0 h-px bg-black/20" />
                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/20" />
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-2 w-4 h-1.5 rounded-full bg-black/20 blur-[1px]" />
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90" />
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">
                          Drag and zoom map. The center pin is the selected
                          location.
                        </p>
                        <p className="text-xs text-gray-500">
                          Lat/Lng: {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                        </p>

                        <button
                          type="button"
                          onClick={applyLocationFromPin}
                          disabled={resolvingAddress}
                          className="px-3 py-1.5 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase disabled:bg-gray-300 disabled:text-gray-500"
                        >
                          {resolvingAddress
                            ? "Resolving..."
                            : `Use Pin for ${activeLocationField === "pickup" ? "Pickup" : "Destination"}`}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={creating || !currentUserId}
                        className="px-5 py-2 rounded-md bg-[#A03F00] text-white font-black text-sm disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {creating ? "Creating..." : "Create Service"}
                      </button>
                    </form>

                    {error && (
                      <p className="text-sm text-red-600 font-semibold mt-3">
                        {error}
                      </p>
                    )}
                    {success && (
                      <p className="text-sm text-green-700 font-semibold mt-3">
                        {success}
                      </p>
                    )}
                  </section>

                  <section className="bg-white rounded-xl border border-orange-100 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xl font-black text-[#4A2600]">
                        My Services
                      </h3>
                      <button
                        type="button"
                        onClick={repairMyServiceLinks}
                        disabled={
                          repairingLinks ||
                          loadingServices ||
                          !currentUserId ||
                          services.length === 0
                        }
                        className="px-4 py-2 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {repairingLinks ? "Repairing..." : "Repair Owner Links"}
                      </button>
                    </div>
                    {loadingServices ? (
                      <p className="text-sm text-gray-500 mt-2">
                        Loading services...
                      </p>
                    ) : services.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-2">
                        No services created yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {services.map((service) => (
                          <div
                            key={String(service.service_id)}
                            className="border border-gray-100 rounded-lg p-3 flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-bold text-[#4A2600]">
                                {service.name}
                              </p>
                              <p className="text-gray-500">
                                {service.category} • ฿
                                {Number(service.price ?? 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {service.pickup_address} →{" "}
                                {service.dest_address}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400">
                              {String(service.service_id)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeDashboardTab === "Messages" && (
                <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
                  <h2 className="text-xl font-black text-[#4A2600] mb-3">
                    Messages
                  </h2>

                  {loadingFreelanceChats ? (
                    <p className="text-sm text-gray-500">
                      Loading conversations...
                    </p>
                  ) : freelanceChats.length === 0 ? (
                    <p className="text-sm text-gray-500">No chat found yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {freelanceChats.map((chat) => (
                        <Link
                          key={chat.roomId}
                          to="/service/$id"
                          params={{ id: chat.serviceId }}
                          hash={`chat:${encodeURIComponent(chat.roomId)}`}
                          className="block border border-orange-100 rounded-lg p-3 hover:bg-orange-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-[#4A2600] truncate">
                                {chat.customerName}
                              </p>
                              <p className="text-xs text-orange-700 truncate">
                                {chat.serviceName}
                              </p>
                              <p className="text-sm text-gray-600 truncate">
                                {chat.lastMessage}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">
                              {chat.lastAt
                                ? new Date(chat.lastAt).toLocaleString()
                                : ""}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDashboardTab === "Earning" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
                    <h2 className="text-xl font-black text-[#4A2600] mb-3">
                      Earning Summary
                    </h2>
                    {loadingEarning ? (
                      <p className="text-sm text-gray-500">
                        Loading earning summary...
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">
                            Total Income
                          </p>
                          <p className="text-2xl font-black text-[#5D2611]">
                            ฿ {earningSummary.totalIncome.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">
                            Completed Orders
                          </p>
                          <p className="text-2xl font-black text-[#5D2611]">
                            {earningSummary.completedOrders}
                          </p>
                        </div>
                        <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">
                            Pending Orders
                          </p>
                          <p className="text-2xl font-black text-[#5D2611]">
                            {earningSummary.pendingOrders}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDashboardTab === "Account Setting" && (
                <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm space-y-4">
                  <h2 className="text-xl font-black text-[#4A2600]">
                    Account Setting
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                      <p className="text-xs text-gray-500 uppercase">
                        Full Name
                      </p>
                      <p className="font-bold text-[#4A2600]">
                        {profile?.full_name || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                      <p className="text-xs text-gray-500 uppercase">Email</p>
                      <p className="font-bold text-[#4A2600]">
                        {profile?.email || session?.user?.email || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                      <p className="text-xs text-gray-500 uppercase">Phone</p>
                      <p className="font-bold text-[#4A2600]">
                        {profile?.phone_number || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                      <p className="text-xs text-gray-500 uppercase">Role</p>
                      <p className="font-bold text-[#4A2600]">
                        {profile?.role || "freelance"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/profile"
                      className="px-4 py-2 rounded-md bg-[#A03F00] text-white text-sm font-black"
                    >
                      View Profile
                    </Link>
                    <Link
                      to="/edit-profile"
                      className="px-4 py-2 rounded-md bg-white border border-orange-200 text-[#A03F00] text-sm font-black"
                    >
                      Edit Profile
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
