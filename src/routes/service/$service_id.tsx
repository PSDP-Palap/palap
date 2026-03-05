/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { ServiceDetailView } from "@/components/service/ServiceDetailView";
import { useUserStore } from "@/stores/useUserStore";
import type { PendingHireRoomView } from "@/types/service";
import { withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/service/$service_id")({
  loader: async ({ params: { service_id } }) => {
    // 1. Load service
    const { data: serviceData, error: serviceError } = await withTimeout(
      supabase
        .from("services")
        .select("*, freelancer:profiles(*)")
        .eq("service_id", service_id)
        .maybeSingle()
    );

    let service = serviceData;
    let creator = serviceData?.freelancer || null;
    let creatorId =
      serviceData?.freelancer_id ||
      serviceData?.created_by ||
      serviceData?.user_id ||
      serviceData?.profile_id ||
      null;

    if (serviceError || !serviceData) {
      const { data: fallbackData, error: fallbackError } = await withTimeout(
        supabase
          .from("services")
          .select("*")
          .eq("service_id", service_id)
          .maybeSingle()
      );
      if (fallbackError) throw fallbackError;
      if (!fallbackData) throw new Error("Service not found");

      service = fallbackData;
      creatorId =
        fallbackData.freelancer_id ||
        fallbackData.created_by ||
        fallbackData.user_id ||
        fallbackData.profile_id ||
        null;

      if (creatorId) {
        const { data: pData } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", creatorId)
            .maybeSingle()
        );
        if (pData) creator = pData;
      }
    }

    // 2. Load initial hire data if logged in
    const { profile, session } = useUserStore.getState();
    const currentUserId = profile?.id || session?.user?.id || null;

    const initialHireStatus = {
      isHireRequested: false,
      isHireAccepted: false,
      pendingHireRequests: [] as PendingHireRoomView[],
      orderStatus: null as string | null,
      orderId: null as string | null
    };

    if (currentUserId && creatorId) {
      const isServiceOwner = String(currentUserId) === String(creatorId);

      // Find the most recent active order (exclude done, reject, cancelled)
      const { data: activeOrder } = await withTimeout(
        supabase
          .from("orders")
          .select("order_id, status")
          .eq("service_id", service_id)
          .or(`customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`)
          .in("status", ["waiting", "on_my_way", "in_service", "complete"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      if (activeOrder) {
        initialHireStatus.orderId = activeOrder.order_id;
        initialHireStatus.orderStatus = activeOrder.status;
        initialHireStatus.isHireRequested = true;
        initialHireStatus.isHireAccepted = activeOrder.status !== "waiting";
      }

      if (isServiceOwner) {
        const { data: rooms } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select("id, customer_id, freelancer_id")
            .eq("order_id", service_id)
            .eq("freelancer_id", currentUserId)
        );

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map((r: any) => String(r.id)).filter(Boolean);
          const customers = rooms
            .map((r: any) => String(r.customer_id || ""))
            .filter(Boolean);

          const [{ data: profiles }, { data: messageRows }] = await Promise.all(
            [
              withTimeout(
                supabase
                  .from("profiles")
                  .select("id, full_name, avatar_url")
                  .in("id", customers)
              ),
              withTimeout(
                supabase
                  .from("chat_messages")
                  .select("room_id, message, created_at")
                  .in("room_id", roomIds)
                  .order("created_at", { ascending: true })
              )
            ]
          );

          const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          const byRoom = new Map<string, any[]>();
          (messageRows || []).forEach((row: any) => {
            const key = String(row.room_id || "");
            const current = byRoom.get(key) || [];
            current.push(row);
            byRoom.set(key, current);
          });

          initialHireStatus.pendingHireRequests = (rooms as any[])
            .map((room: any) => {
              const roomId = String(room.id || "");
              const roomMessages = byRoom.get(roomId) || [];
              const state = deriveHireStateFromMessages(roomMessages);
              if (!state.requested || state.accepted) return null;

              const customerId = String(room.customer_id || "");
              const p = pMap.get(customerId);

              return {
                room_id: roomId,
                customer_id: customerId,
                customer_name: p?.full_name || "Customer",
                customer_avatar_url: p?.avatar_url || null,
                request_message: state.requestMessage || DEFAULT_HIRE_MESSAGE
              };
            })
            .filter(Boolean) as PendingHireRoomView[];
        }
      }
    }

    return {
      service,
      creator,
      creatorId,
      initialHireStatus
    };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
      <p className="text-red-600 font-bold">
        {error.message || "Failed to load service"}
      </p>
      <a
        href="/service"
        className="bg-[#D35400] text-white px-4 py-2 rounded-lg font-bold"
      >
        Back to Services
      </a>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D35400] font-bold animate-pulse">
          Loading Service...
        </p>
      </div>
    </div>
  )
});

const DEFAULT_DESCRIPTION =
  "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_HIRE_MESSAGE =
  "Hi, I want to hire this service. Could you share more details before we proceed?";
const SYSTEM_REQUEST_PREFIX = "[SYSTEM_HIRE_REQUEST]";
const SYSTEM_ACCEPT_PREFIX = "[SYSTEM_HIRE_ACCEPTED]";
const SYSTEM_DECLINE_PREFIX = "[SYSTEM_HIRE_DECLINED]";

const getRoleValue = (value: any) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
};

const toSystemRequestMessage = (text: string) =>
  `${SYSTEM_REQUEST_PREFIX} ${text}`;
const toSystemAcceptMessage = (text: string) =>
  `${SYSTEM_ACCEPT_PREFIX} ${text}`;
const toSystemDeclineMessage = (text: string) =>
  `${SYSTEM_DECLINE_PREFIX} ${text}`;
const stripSystemPrefix = (message: string | null | undefined) =>
  (message || "")
    .replace(SYSTEM_REQUEST_PREFIX, "")
    .replace(SYSTEM_ACCEPT_PREFIX, "")
    .replace(SYSTEM_DECLINE_PREFIX, "")
    .replace(/\b(SERVICE|PRICE|CUSTOMER|FREELANCER):[^\s]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const deriveHireStateFromMessages = (rows: any[]) => {
  let nextState: "idle" | "requested" | "accepted" = "idle";
  let requestMessage = "";

  for (const row of rows || []) {
    const message = String(row?.message || "");
    if (message.startsWith(SYSTEM_REQUEST_PREFIX)) {
      nextState = "requested";
      requestMessage = stripSystemPrefix(message);
      continue;
    }
    if (message.startsWith(SYSTEM_ACCEPT_PREFIX)) {
      nextState = "accepted";
      continue;
    }
    if (message.startsWith(SYSTEM_DECLINE_PREFIX)) {
      nextState = "idle";
    }
  }

  return {
    requested: nextState !== "idle",
    accepted: nextState === "accepted",
    requestMessage
  };
};

function RouteComponent() {
  const {
    service: initialService,
    creator: initialCreator,
    creatorId: initialCreatorId,
    initialHireStatus
  } = Route.useLoaderData();
  const { service_id } = Route.useParams();
  const router = useRouter();

  const [service, setService] = useState<any>(initialService);
  const [creator, setCreator] = useState<any>(initialCreator);
  const [creatorId, setCreatorId] = useState<string | null>(initialCreatorId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startingChat, setStartingChat] = useState(false);

  const [isHireRequested, setIsHireRequested] = useState(
    initialHireStatus.isHireRequested
  );
  const [isHireAccepted, setIsHireAccepted] = useState(
    initialHireStatus.isHireAccepted
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(
    initialHireStatus.orderId
  );

  const [hireRequestMessage, setHireRequestMessage] =
    useState(DEFAULT_HIRE_MESSAGE);
  const [sendingHireRequest, setSendingHireRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingHireRequests, setPendingHireRequests] = useState<
    PendingHireRoomView[]
  >(initialHireStatus.pendingHireRequests);
  const [acceptingRequestRoomId, setAcceptingRequestRoomId] = useState<
    string | null
  >(null);
  const [decliningRequestRoomId, setDecliningRequestRoomId] = useState<
    string | null
  >(null);

  const { profile, session } = useUserStore();

  const currentUserId = profile?.id || session?.user?.id || null;
  const isServiceOwner = !!(
    currentUserId &&
    creatorId &&
    String(currentUserId) === String(creatorId)
  );

  const isDeliverySessionService =
    service?.category === "DELIVERY" ||
    (service?.name || "").toLowerCase().includes("order session");

  const canTryHire = !!(
    currentUserId &&
    !isServiceOwner &&
    !isDeliverySessionService
  );

  const canOpenDeliverySessionChat = !!(
    currentUserId && isDeliverySessionService
  );

  const canRequestHire = !!(canTryHire && !!creatorId);
  const hasAcceptedHire = isHireAccepted;
  const hasPendingHire = isHireRequested && !isHireAccepted;

  const loadService = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const { data: serviceData, error: serviceError } = await withTimeout(
          supabase
            .from("services")
            .select("*, freelancer:profiles(*)")
            .eq("service_id", service_id)
            .maybeSingle()
        );

        if (serviceError) {
          const { data: fallbackData, error: fallbackError } =
            await withTimeout(
              supabase
                .from("services")
                .select("*")
                .eq("service_id", service_id)
                .maybeSingle()
            );
          if (fallbackError) throw fallbackError;
          if (!fallbackData) throw new Error("Service not found");

          setService(fallbackData);
          const fId =
            fallbackData.freelancer_id ||
            fallbackData.created_by ||
            fallbackData.user_id ||
            fallbackData.profile_id ||
            null;
          setCreatorId(fId);

          if (fId) {
            const { data: pData } = await withTimeout(
              supabase.from("profiles").select("*").eq("id", fId).maybeSingle()
            );
            if (pData) setCreator(pData);
          }
        } else {
          if (!serviceData) throw new Error("Service not found");
          setService(serviceData);
          setCreator(serviceData.freelancer || null);
          setCreatorId(
            serviceData.freelancer_id ||
              serviceData.created_by ||
              serviceData.user_id ||
              serviceData.profile_id ||
              null
          );
        }

        if (silent) {
          setError(null);
        }
      } catch (err: any) {
        if (!silent) {
          setError(err.message || "Failed to load service");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [service_id]
  );

  // Initial load handled by TanStack Router loader
  useEffect(() => {
    if (!service) {
      loadService();
    }
  }, [loadService, service]);

  const loadHireRequestData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!currentUserId || !creatorId) return;

      try {
        if (!silent) {
          setRequestLoading(true);
        }

        // Also fetch the most recent active order status
        const { data: orderRow } = await withTimeout(
          supabase
            .from("orders")
            .select("order_id, status")
            .eq("service_id", service_id)
            .or(`customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`)
            .in("status", ["waiting", "on_my_way", "in_service", "complete"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        );

        if (orderRow) {
          setActiveOrderId(orderRow.order_id);
          setIsHireRequested(true);
          setIsHireAccepted(orderRow.status !== "waiting");
        } else {
          setActiveOrderId(null);
          setIsHireRequested(false);
          setIsHireAccepted(false);
        }

        if (isServiceOwner) {
          const { data: rooms, error: roomsError } = await withTimeout(
            supabase
              .from("chat_rooms")
              .select("id, customer_id, freelancer_id")
              .eq("order_id", service_id)
              .eq("freelancer_id", currentUserId)
          );

          if (roomsError) throw roomsError;

          if (!rooms || rooms.length === 0) {
            setPendingHireRequests([]);
            return;
          }

          const roomIds = rooms.map((r: any) => String(r.id)).filter(Boolean);
          const customers = rooms
            .map((r: any) => String(r.customer_id || ""))
            .filter(Boolean);

          const [{ data: profiles, error: pError }, { data: messageRows }] =
            await Promise.all([
              withTimeout(
                supabase
                  .from("profiles")
                  .select("id, full_name, avatar_url")
                  .in("id", customers)
              ),
              roomIds.length > 0
                ? withTimeout(
                    supabase
                      .from("chat_messages")
                      .select("room_id, message, created_at")
                      .in("room_id", roomIds)
                      .order("created_at", { ascending: true })
                  )
                : Promise.resolve({ data: [] as any[] })
            ]);

          if (pError) throw pError;

          const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          const byRoom = new Map<string, any[]>();
          (messageRows || []).forEach((row: any) => {
            const key = String(row.room_id || "");
            const current = byRoom.get(key) || [];
            current.push(row);
            byRoom.set(key, current);
          });

          const views: PendingHireRoomView[] = (rooms as any[])
            .map((room: any) => {
              const roomId = String(room.id || "");
              const roomMessages = byRoom.get(roomId) || [];
              const state = deriveHireStateFromMessages(roomMessages);
              if (!state.requested || state.accepted) return null;

              const customerId = String(room.customer_id || "");
              const profile = pMap.get(customerId);

              return {
                room_id: roomId,
                customer_id: customerId,
                customer_name: profile?.full_name || "Customer",
                customer_avatar_url: profile?.avatar_url || null,
                request_message: state.requestMessage || DEFAULT_HIRE_MESSAGE
              };
            })
            .filter(Boolean) as PendingHireRoomView[];

          setPendingHireRequests(views);
          return;
        }
      } catch (e) {
        console.error("Load hire data error", e);
      } finally {
        if (!silent) {
          setRequestLoading(false);
        }
      }
    },
    [currentUserId, creatorId, service_id, isServiceOwner]
  );

  // Initial hire data handled by loader
  useEffect(() => {
    if (
      creatorId &&
      currentUserId &&
      !isHireRequested &&
      pendingHireRequests.length === 0
    ) {
      loadHireRequestData();
    }
  }, [
    loadHireRequestData,
    creatorId,
    currentUserId,
    isHireRequested,
    pendingHireRequests.length
  ]);

  useEffect(() => {
    const refreshSilently = () => {
      loadService({ silent: true });
      loadHireRequestData({ silent: true });
    };

    const onFocusRefresh = () => {
      refreshSilently();
    };

    const onVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        refreshSilently();
      }
    };

    window.addEventListener("focus", onFocusRefresh);
    document.addEventListener("visibilitychange", onVisibilityRefresh);

    const serviceChannel = supabase
      .channel(`service_detail_${service_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services"
        },
        (payload) => {
          const nextServiceId = String((payload.new as any)?.service_id || "");
          const prevServiceId = String((payload.old as any)?.service_id || "");
          if (nextServiceId === String(service_id) || prevServiceId === String(service_id)) {
            refreshSilently();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        (payload) => {
          const nextOrderId = String((payload.new as any)?.order_id || "");
          const prevOrderId = String((payload.old as any)?.order_id || "");
          if (nextOrderId === String(activeOrderId) || prevOrderId === String(activeOrderId)) {
            loadHireRequestData({ silent: true });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages"
        },
        (payload) => {
          const nextOrderId = String((payload.new as any)?.order_id || "");
          if (nextOrderId === String(service_id)) {
            loadHireRequestData({ silent: true });
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocusRefresh);
      document.removeEventListener("visibilitychange", onVisibilityRefresh);
      supabase.removeChannel(serviceChannel);
    };
  }, [service_id, activeOrderId, loadHireRequestData, loadService]);

  const sendHireRequest = async () => {
    if (!currentUserId || !creatorId) return;

    try {
      setSendingHireRequest(true);
      setRequestError(null);

      // Check for unpaid orders
      const { data: unpaidOrders } = await supabase
        .from("orders")
        .select("order_id")
        .eq("customer_id", currentUserId)
        .eq("status", "complete")
        .is("payment_id", null)
        .limit(1);

      if (unpaidOrders && unpaidOrders.length > 0) {
        toast.error("Please pay for your completed orders before hiring again.");
        return;
      }

      // 1. Create order first
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: currentUserId,
          freelance_id: creatorId,
          service_id: service_id,
          price: service.price || 0,
          status: "waiting"
        })
        .select("order_id")
        .single();

      if (orderError) throw orderError;
      setActiveOrderId(newOrder.order_id);

      // 2. Create chat room linked to the order
      const { data: newRoom, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          order_id: newOrder.order_id,
          customer_id: currentUserId,
          freelancer_id: creatorId,
          created_by: currentUserId
        })
        .select("id")
        .single();

      if (roomError) throw roomError;

      const systemMsg = toSystemRequestMessage(
        hireRequestMessage || DEFAULT_HIRE_MESSAGE
      );

      await supabase.from("chat_messages").insert({
        room_id: newRoom.id,
        order_id: service_id,
        sender_id: currentUserId,
        message: systemMsg
      });

      setIsHireRequested(true);
      setIsHireAccepted(false);
      toast.success("Hire request sent!");
    } catch (err: any) {
      setRequestError(err.message || "Failed to send hire request");
    } finally {
      setSendingHireRequest(false);
    }
  };

  const acceptHireRequest = async (request: PendingHireRoomView) => {
    try {
      setAcceptingRequestRoomId(request.room_id);

      // Update order status
      const { data: order } = await supabase
        .from("orders")
        .select("order_id")
        .eq("service_id", service_id)
        .eq("customer_id", request.customer_id)
        .eq("status", "waiting")
        .maybeSingle();

      if (order) {
        await supabase
          .from("orders")
          .update({ status: "on_my_way" })
          .eq("order_id", order.order_id);
      }

      const systemMsg = toSystemAcceptMessage(
        "Freelancer accepted your hire request. You can now chat!"
      );

      await supabase.from("chat_messages").insert({
        room_id: request.room_id,
        order_id: service_id,
        sender_id: currentUserId,
        message: systemMsg
      });

      setPendingHireRequests((prev) =>
        prev.filter((r) => r.room_id !== request.room_id)
      );
      toast.success("Accepted hire request!");
      await loadHireRequestData({ silent: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to accept");
    } finally {
      setAcceptingRequestRoomId(null);
    }
  };

  const declineHireRequest = async (request: PendingHireRoomView) => {
    try {
      setDecliningRequestRoomId(request.room_id);

      // Update order status
      const { data: order } = await supabase
        .from("orders")
        .select("order_id")
        .eq("service_id", service_id)
        .eq("customer_id", request.customer_id)
        .eq("status", "waiting")
        .maybeSingle();

      if (order) {
        await supabase
          .from("orders")
          .update({ status: "reject" })
          .eq("order_id", order.order_id);
      }

      const systemMsg = toSystemDeclineMessage(
        "Freelancer declined your hire request."
      );

      await supabase.from("chat_messages").insert({
        room_id: request.room_id,
        order_id: service_id,
        sender_id: currentUserId,
        message: systemMsg
      });

      setPendingHireRequests((prev) =>
        prev.filter((r) => r.room_id !== request.room_id)
      );
      toast.success("Declined hire request.");
      await loadHireRequestData({ silent: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to decline");
    } finally {
      setDecliningRequestRoomId(null);
    }
  };

  const openChat = async () => {
    if (!currentUserId || !creatorId || !service) {
      if (!currentUserId) toast.error("Please login to contact freelancer");
      return;
    }

    try {
      setStartingChat(true);

      // 0. Check for any 'complete' orders that are not yet paid
      const { data: unpaidOrders } = await supabase
        .from("orders")
        .select("order_id")
        .eq("customer_id", currentUserId)
        .eq("status", "complete")
        .is("payment_id", null)
        .limit(1);

      if (unpaidOrders && unpaidOrders.length > 0) {
        toast.error("Please pay for your completed orders before hiring again.");
        setStartingChat(false);
        return;
      }

      // 1. Check for existing active order for this service and customer
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("order_id, status")
        .eq("customer_id", currentUserId)
        .eq("service_id", service_id)
        .in("status", ["waiting", "on_my_way", "in_service", "complete"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let targetOrderId: string;

      if (existingOrder) {
        targetOrderId = existingOrder.order_id;
      } else {
        // 2. Create new order if none active
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            customer_id: currentUserId,
            freelance_id: creatorId,
            service_id: service_id,
            price: service.price || 0,
            status: "waiting"
          })
          .select("order_id")
          .single();

        if (orderError) throw orderError;
        targetOrderId = newOrder.order_id;
        toast.success("Order request created!");
      }

      // 3. Resolve chat room for this order
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", targetOrderId)
        .eq("customer_id", currentUserId)
        .eq("freelancer_id", creatorId)
        .maybeSingle();

      let rId: string;

      if (existingRoom) {
        rId = existingRoom.id;
      } else {
        // Create new chat room linked to the order
        const { data: newRoom, error: roomError } = await supabase
          .from("chat_rooms")
          .insert({
            order_id: targetOrderId,
            customer_id: currentUserId,
            freelancer_id: creatorId,
            created_by: currentUserId
          })
          .select("id")
          .single();

        if (roomError) throw roomError;
        rId = newRoom.id;
      }

      // 4. Navigate to the chat page
      router.navigate({
        to: "/chat/$id" as any,
        params: { id: rId } as any
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to open chat");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">
            Loading Service...
          </p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-red-600 font-bold">{error || "Service not found"}</p>
        <button
          className="bg-[#D35400] text-white px-4 py-2 rounded-lg font-bold"
          onClick={() => router.navigate({ to: "/service" })}
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <ServiceDetailView
      service={service}
      creator={creator}
      defaultImage={DEFAULT_IMAGE}
      defaultDescription={DEFAULT_DESCRIPTION}
      defaultHireMessage={DEFAULT_HIRE_MESSAGE}
      canOpenDeliverySessionChat={canOpenDeliverySessionChat}
      openChat={openChat}
      startingChat={startingChat}
      canTryHire={canTryHire}
      isHireRequested={isHireRequested}
      hireRequestMessage={hireRequestMessage}
      setHireRequestMessage={setHireRequestMessage}
      sendHireRequest={sendHireRequest}
      sendingHireRequest={sendingHireRequest}
      requestLoading={requestLoading}
      canRequestHire={canRequestHire}
      hasPendingHire={hasPendingHire}
      hasAcceptedHire={hasAcceptedHire}
      isServiceOwner={isServiceOwner}
      pendingHireRequests={pendingHireRequests}
      acceptHireRequest={acceptHireRequest}
      acceptingRequestRoomId={acceptingRequestRoomId}
      declineHireRequest={declineHireRequest}
      decliningRequestRoomId={decliningRequestRoomId}
      chatError={null}
      requestError={requestError}
      activeOrderId={activeOrderId}
      hasActiveOrder={!!activeOrderId}
    />
  );
}
