/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { ServiceChat } from "@/components/service/ServiceChat";
import { ServiceDetailView } from "@/components/service/ServiceDetailView";
import { useUserStore } from "@/stores/useUserStore";
import type { ChatRoomListItem, PendingHireRoomView } from "@/types/service";
import { withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/service/$id")({
  loader: async ({ params: { id } }) => {
    // 1. Load service
    const { data: serviceData, error: serviceError } = await withTimeout(
      supabase
        .from("services")
        .select("*, freelancer:profiles(*)")
        .eq("service_id", id)
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
        supabase.from("services").select("*").eq("service_id", id).maybeSingle()
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
          supabase.from("profiles").select("*").eq("id", creatorId).maybeSingle()
        );
        if (pData) creator = pData;
      }
    }

    // 2. Load initial hire data if logged in
    const { profile, session } = useUserStore.getState();
    const currentUserId = profile?.id || session?.user?.id || null;

    let initialHireStatus = {
      isHireRequested: false,
      isHireAccepted: false,
      pendingHireRequests: [] as PendingHireRoomView[]
    };

    if (currentUserId && creatorId) {
      const isServiceOwner = String(currentUserId) === String(creatorId);

      if (isServiceOwner) {
        const { data: rooms } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select("id, customer_id, freelancer_id")
            .eq("order_id", id)
            .eq("freelancer_id", currentUserId)
        );

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map((r: any) => String(r.id)).filter(Boolean);
          const customers = rooms
            .map((r: any) => String(r.customer_id || ""))
            .filter(Boolean);

          const [{ data: profiles }, { data: messageRows }] = await Promise.all([
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
          ]);

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
      } else {
        const { data: myRoom } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select("id")
            .eq("order_id", id)
            .eq("customer_id", currentUserId)
            .eq("freelancer_id", creatorId)
            .maybeSingle()
        );

        if (myRoom?.id) {
          const { data: myMessages } = await withTimeout(
            supabase
              .from("chat_messages")
              .select("message, created_at")
              .eq("room_id", String(myRoom.id))
              .order("created_at", { ascending: true })
          );

          const state = deriveHireStateFromMessages(myMessages || []);
          initialHireStatus.isHireRequested = state.requested;
          initialHireStatus.isHireAccepted = state.accepted;
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
      <p className="text-red-600 font-bold">{error.message || "Failed to load service"}</p>
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
        <p className="text-[#D35400] font-bold animate-pulse">Loading Service...</p>
      </div>
    </div>
  ),
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
const CHAT_IMAGE_PREFIX = "[CHAT_IMAGE]";
const SYSTEM_WORK_PRICE_PREFIX = "[SYSTEM_WORK_PRICE_AGREED]";
const SYSTEM_WORK_PAYMENT_HELD_PREFIX = "[SYSTEM_WORK_PAYMENT_HELD]";
const SYSTEM_WORK_SUBMITTED_PREFIX = "[SYSTEM_WORK_SUBMITTED]";
const SYSTEM_WORK_REVISION_PREFIX = "[SYSTEM_WORK_REVISION_REQUESTED]";
const SYSTEM_WORK_APPROVED_PREFIX = "[SYSTEM_WORK_APPROVED]";
const SYSTEM_WORK_RELEASED_PREFIX = "[SYSTEM_WORK_RELEASED]";

const getRoleValue = (value: any) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
};

const extractImageUrl = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(CHAT_IMAGE_PREFIX)
    ? (message || "").replace(CHAT_IMAGE_PREFIX, "").trim()
    : null;

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
    .replace(SYSTEM_WORK_PRICE_PREFIX, "")
    .replace(SYSTEM_WORK_PAYMENT_HELD_PREFIX, "")
    .replace(SYSTEM_WORK_SUBMITTED_PREFIX, "")
    .replace(SYSTEM_WORK_REVISION_PREFIX, "")
    .replace(SYSTEM_WORK_APPROVED_PREFIX, "")
    .replace(SYSTEM_WORK_RELEASED_PREFIX, "")
    .replace(/\b(SERVICE|PRICE|CUSTOMER|FREELANCER):[^\s]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
const toImageMessage = (url: string) => `${CHAT_IMAGE_PREFIX} ${url}`;
const isImageMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(CHAT_IMAGE_PREFIX);
const isUuidLike = (value: string | null | undefined) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

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

const getTagValue = (message: string, tag: string) => {
  const match = String(message || "").match(new RegExp(`${tag}:([^\\s]+)`, "i"));
  return match?.[1] ? String(match[1]) : "";
};

const getPriceFromMessage = (message: string) => {
  const raw = getTagValue(message, "PRICE");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

function RouteComponent() {
  const {
    service: initialService,
    creator: initialCreator,
    creatorId: initialCreatorId,
    initialHireStatus
  } = Route.useLoaderData();
  const { id } = Route.useParams();
  const router = useRouter();

  const [service, setService] = useState<any>(initialService);
  const [creator, setCreator] = useState<any>(initialCreator);
  const [creatorId, setCreatorId] = useState<string | null>(initialCreatorId);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hashRoomId, setHashRoomId] = useState<string | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<{
    customer?: string;
    freelancer?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    return hash.startsWith("#chat");
  });

  const [startingChat, setStartingChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  const [chatRoomList, setChatRoomList] = useState<ChatRoomListItem[]>([]);
  const [loadingChatRoomList, setLoadingChatRoomList] = useState(false);
  const [chatRoomSearch, setChatRoomSearch] = useState("");

  const [isHireRequested, setIsHireRequested] = useState(initialHireStatus.isHireRequested);
  const [isHireAccepted, setIsHireAccepted] = useState(initialHireStatus.isHireAccepted);
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
  const [workflowBusyAction, setWorkflowBusyAction] = useState<
    "pay" | "submit" | "approve" | "decline" | null
  >(null);
  const [chatCounterpartProfile, setChatCounterpartProfile] = useState<any>(
    null
  );

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const { profile, session } = useUserStore();

  const currentUserId = profile?.id || session?.user?.id || null;
  const isServiceOwner = !!(
    currentUserId &&
    creatorId &&
    String(currentUserId) === String(creatorId)
  );

  const isDeliverySessionService =
    service?.category === "DELIVERY_SESSION" ||
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

        // Optimize: Join profile in a single query if freelancer_id column name is known
        // We'll try a common join or just keep it simple but with timeout
        const { data: serviceData, error: serviceError } = await withTimeout(
          supabase
            .from("services")
            .select("*, freelancer:profiles(*)")
            .eq("service_id", id)
            .maybeSingle()
        );

        if (serviceError) {
          // Fallback if the join fails due to schema naming
          const { data: fallbackData, error: fallbackError } = await withTimeout(
            supabase
              .from("services")
              .select("*")
              .eq("service_id", id)
              .maybeSingle()
          );
          if (fallbackError) throw fallbackError;
          if (!fallbackData) throw new Error("Service not found");

          setService(fallbackData);
          const fId = fallbackData.freelancer_id || fallbackData.created_by || fallbackData.user_id || fallbackData.profile_id || null;
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
    [id]
  );

  // Initial load handled by TanStack Router loader
  useEffect(() => {
    // Only fetch if data is missing (e.g. after some client-side navigation that skips loader)
    if (!service) {
      loadService();
    }
  }, [loadService, service]);

  const getParticipantPair = useCallback(() => {
    if (!activeRoomParticipants) return null;
    const { customer, freelancer } = activeRoomParticipants;
    if (!customer || !freelancer) return null;

    const isCustomer = String(currentUserId) === String(customer);
    const isFreelancer = String(currentUserId) === String(freelancer);

    if (isCustomer) {
      return { me: customer, other: freelancer, myRole: "customer" as const };
    }
    if (isFreelancer) {
      return { me: freelancer, other: customer, myRole: "freelancer" as const };
    }

    return null;
  }, [activeRoomParticipants, currentUserId]);

  const readHashState = useCallback(() => {
    const hash = window.location.hash || "";
    if (hash.startsWith("#chat")) {
      const open = true;
      const parts = hash.split(":");
      const rId = parts.length > 1 ? decodeURIComponent(parts[1]) : null;

      setIsChatOpen(open);
      if (rId && isUuidLike(rId)) {
        setHashRoomId(rId);
      } else {
        setHashRoomId(null);
      }
    } else {
      setIsChatOpen(false);
      setHashRoomId(null);
    }
  }, []);

  useEffect(() => {
    readHashState();
    window.addEventListener("hashchange", readHashState);
    return () => window.removeEventListener("hashchange", readHashState);
  }, [readHashState]);

  const loadRoomParticipants = useCallback(async (targetRoomId: string) => {
    try {
      const { data, error: roomError } = await withTimeout(
        supabase
          .from("chat_rooms")
          .select("customer_id, freelancer_id")
          .eq("id", targetRoomId)
          .maybeSingle()
      );

      if (roomError) throw roomError;
      if (data) {
        setActiveRoomParticipants({
          customer: getRoleValue(data.customer_id),
          freelancer: getRoleValue(data.freelancer_id)
        });
      }
    } catch (e) {
      console.error("Failed to load participants", e);
    }
  }, []);

  const resolveChatRoom = useCallback(
    async (createIfMissing: boolean) => {
      if (!currentUserId || !creatorId) return null;

      try {
        const { data: existing, error: existingError } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select("id, customer_id, freelancer_id")
            .eq("order_id", id)
            .or(
              `and(customer_id.eq.${currentUserId},freelancer_id.eq.${creatorId}),and(customer_id.eq.${creatorId},freelancer_id.eq.${currentUserId})`
            )
            .maybeSingle()
        );

        if (existingError) throw existingError;
        if (existing) {
          setActiveRoomParticipants({
            customer: getRoleValue(existing.customer_id),
            freelancer: getRoleValue(existing.freelancer_id)
          });
          return existing.id;
        }

        if (!createIfMissing) return null;

        const { data: created, error: createError } = await withTimeout(
          supabase
            .from("chat_rooms")
            .insert({
              order_id: id,
              customer_id: currentUserId,
              freelancer_id: creatorId,
              created_by: currentUserId
            })
            .select()
            .single()
        );

        if (createError) throw createError;
        if (created) {
          setActiveRoomParticipants({
            customer: getRoleValue(created.customer_id),
            freelancer: getRoleValue(created.freelancer_id)
          });
          return created.id;
        }

        return null;
      } catch (e) {
        console.error("Resolve room failed", e);
        return null;
      }
    },
    [currentUserId, creatorId, id]
  );

  const loadHireRequestData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!currentUserId || !creatorId) return;

    try {
      if (!silent) {
        setRequestLoading(true);
      }

      if (isServiceOwner) {
        const { data: rooms, error: roomsError } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select("id, customer_id, freelancer_id")
            .eq("order_id", id)
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

      const { data: myRoom, error: myRoomError } = await withTimeout(
        supabase
          .from("chat_rooms")
          .select("id")
          .eq("order_id", id)
          .eq("customer_id", currentUserId)
          .eq("freelancer_id", creatorId)
          .maybeSingle()
      );

      if (myRoomError) throw myRoomError;

      if (!myRoom?.id) {
        setIsHireRequested(false);
        setIsHireAccepted(false);
        return;
      }

      const { data: myMessages, error: myMsgError } = await withTimeout(
        supabase
          .from("chat_messages")
          .select("message, created_at")
          .eq("room_id", String(myRoom.id))
          .order("created_at", { ascending: true })
      );

      if (myMsgError) throw myMsgError;

      const state = deriveHireStateFromMessages(myMessages || []);
      setIsHireRequested(state.requested);
      setIsHireAccepted(state.accepted);
    } catch (e) {
      console.error("Load hire data error", e);
    } finally {
      if (!silent) {
        setRequestLoading(false);
      }
    }
  }, [currentUserId, creatorId, id, isServiceOwner]);

  // Initial hire data handled by loader
  useEffect(() => {
    // Only fetch if data is missing or initial was empty and we have IDs now
    if (creatorId && currentUserId && !isHireRequested && pendingHireRequests.length === 0) {
      loadHireRequestData();
    }
  }, [loadHireRequestData, creatorId, currentUserId, isHireRequested, pendingHireRequests.length]);

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
      .channel(`service_detail_${id}`)
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
          if (nextServiceId === String(id) || prevServiceId === String(id)) {
            refreshSilently();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages"
        },
        (payload) => {
          const nextOrderId = String((payload.new as any)?.order_id || "");
          const prevOrderId = String((payload.old as any)?.order_id || "");
          if (nextOrderId === String(id) || prevOrderId === String(id)) {
            loadHireRequestData({ silent: true });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms"
        },
        (payload) => {
          const nextOrderId = String((payload.new as any)?.order_id || "");
          const prevOrderId = String((payload.old as any)?.order_id || "");
          if (nextOrderId === String(id) || prevOrderId === String(id)) {
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
  }, [id, loadHireRequestData, loadService]);

  const sendHireRequest = async () => {
    if (!currentUserId || !creatorId) return;

    try {
      setSendingHireRequest(true);
      setRequestError(null);

      const rId = await resolveChatRoom(true);
      if (!rId) throw new Error("Could not initialize chat room for request");

      const systemMsg = toSystemRequestMessage(
        hireRequestMessage || DEFAULT_HIRE_MESSAGE
      );

      await supabase.from("chat_messages").insert({
        room_id: rId,
        order_id: id,
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

      const systemMsg = toSystemAcceptMessage(
        "Freelancer accepted your hire request. You can now chat!"
      );

      await supabase.from("chat_messages").insert({
        room_id: request.room_id,
        order_id: id,
        sender_id: currentUserId,
        message: systemMsg
      });

      setPendingHireRequests((prev) =>
        prev.filter((r) => r.room_id !== request.room_id)
      );
      toast.success("Accepted hire request!");
    } catch (err: any) {
      toast.error(err.message || "Failed to accept");
    } finally {
      setAcceptingRequestRoomId(null);
    }
  };

  const declineHireRequest = async (request: PendingHireRoomView) => {
    try {
      setDecliningRequestRoomId(request.room_id);
      const systemMsg = toSystemDeclineMessage(
        "Freelancer declined your hire request."
      );

      const { error: declineErr } = await withTimeout(
        supabase.from("chat_messages").insert({
          room_id: request.room_id,
          order_id: id,
          sender_id: currentUserId,
          message: systemMsg
        })
      );

      if (declineErr) throw declineErr;

      setPendingHireRequests((prev) =>
        prev.filter((r) => r.room_id !== request.room_id)
      );
      toast.success("Declined hire request.");
    } catch (err: any) {
      toast.error(err.message || "Failed to decline");
    } finally {
      setDecliningRequestRoomId(null);
    }
  };

  const openChat = async () => {
    try {
      setStartingChat(true);
      setChatError(null);

      const rId = await resolveChatRoom(true);
      if (!rId) throw new Error("Failed to open chat room");

      setRoomId(rId);
      await loadRoomParticipants(rId);
      router.navigate({
        to: "/service/$id",
        params: { id },
        hash: `chat:${encodeURIComponent(rId)}`
      });
      setIsChatOpen(true);
    } catch (err: any) {
      setChatError(err.message || "Failed to open chat");
    } finally {
      setStartingChat(false);
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setRoomId(null);
    setHashRoomId(null);
    router.navigate({
      to: "/service/$id",
      params: { id },
      hash: ""
    });
  };

  const deleteChat = async () => {
    const targetRoomId = roomId || hashRoomId;
    if (!targetRoomId) return;

    const confirm = window.confirm(
      "Are you sure you want to delete this chat?"
    );
    if (!confirm) return;

    try {
      setDeletingChat(true);
      const { error: deleteErr } = await withTimeout(
        supabase.from("chat_rooms").delete().eq("id", targetRoomId)
      );

      if (deleteErr) throw deleteErr;

      toast.success("Chat deleted");
      closeChat();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete chat");
    } finally {
      setDeletingChat(false);
    }
  };

  useEffect(() => {
    if (!isChatOpen || !currentUserId) return;

    const fetchRooms = async () => {
      try {
        setLoadingChatRoomList(true);
        const { data, error: roomError } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select(`
              id,
              order_id,
              customer_id,
              freelancer_id
            `)
            .or(`customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`)
        );

        if (roomError) throw roomError;

        if (data) {
          const roomIds = data.map(r => r.id);
          const partnerIds = data
            .map((r) =>
              String(r.customer_id) === String(currentUserId)
                ? r.freelancer_id
                : r.customer_id
            )
            .filter(Boolean);

          const [{ data: profiles }, { data: latestMessages }] = await Promise.all([
            supabase.from("profiles").select("*").in("id", partnerIds),
            supabase.from("chat_messages")
              .select("room_id, message, created_at")
              .in("room_id", roomIds)
              .order("created_at", { ascending: false })
          ]);

          const pMap = new Map((profiles || []).map((p) => [String(p.id), p]));
          const msgMap = new Map();
          (latestMessages || []).forEach(m => {
            if (!msgMap.has(m.room_id)) msgMap.set(m.room_id, m);
          });

          const list: ChatRoomListItem[] = data.map((r) => {
            const isCustomer = String(r.customer_id) === String(currentUserId);
            const partnerId = isCustomer ? r.freelancer_id : r.customer_id;
            const p = pMap.get(String(partnerId));
            const last = msgMap.get(r.id);

            const lastTxt = isImageMessage(last?.message)
              ? "Image"
              : stripSystemPrefix(last?.message || "No messages yet");

            return {
              roomId: r.id,
              serviceId: r.order_id,
              partnerName: p?.full_name || "User",
              partnerAvatarUrl: p?.avatar_url || null,
              partnerRoleLabel: isCustomer ? "Freelancer" : "Customer",
              serviceName: "Order Chat",
              lastMessage: lastTxt,
              lastAt: last?.created_at || new Date().toISOString()
            };
          });

          setChatRoomList(list.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()));
        }
      } catch (e) {
        console.error("Load rooms list error", e);
      } finally {
        setLoadingChatRoomList(false);
      }
    };

    fetchRooms();
  }, [isChatOpen, currentUserId, roomId, hashRoomId]);

  useEffect(() => {
    const targetRoomId = roomId || hashRoomId;
    if (!isChatOpen || !targetRoomId || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        setChatLoading(true);
        const { data, error: msgError } = await withTimeout(
          supabase
            .from("chat_messages")
            .select("*")
            .eq("room_id", targetRoomId)
            .order("created_at", { ascending: true })
        );

        if (msgError) throw msgError;
        setMessages(data || []);
      } catch (e: any) {
        setChatError(e.message || "Failed to load messages");
      } finally {
        setChatLoading(false);
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel(`room_${targetRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${targetRoomId}`
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isChatOpen, currentUserId, roomId, hashRoomId]);

  const sendMessage = async (overrideMessage?: string) => {
    const targetRoomId = roomId || hashRoomId;
    const text = (overrideMessage || chatInput).trim();
    if (!targetRoomId || !currentUserId || !text) return;

    try {
      setSending(true);

      const { error: sendError } = await withTimeout(
        supabase.from("chat_messages").insert({
          room_id: targetRoomId,
          order_id: id,
          sender_id: currentUserId,
          message: text
        })
      );

      if (sendError) throw sendError;
      if (!overrideMessage) setChatInput("");
    } catch (e: any) {
      setChatError(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onPickImage = () => imageInputRef.current?.click();

  const onImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    const targetRoomId = roomId || hashRoomId;
    if (!file || !targetRoomId || !currentUserId) return;

    try {
      setSendingImage(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${targetRoomId}_${Date.now()}.${fileExt}`;
      const filePath = `chat_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("service-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      const imgMsg = toImageMessage(publicUrl);

      const { error: sendError } = await withTimeout(
        supabase.from("chat_messages").insert({
          room_id: targetRoomId,
          order_id: id,
          sender_id: currentUserId,
          message: imgMsg
        })
      );

      if (sendError) throw sendError;
    } catch (e: any) {
      setChatError(e.message || "Failed to upload image");
    } finally {
      setSendingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isChatOpen) return;
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isChatOpen, chatLoading]);

  const filteredChatRoomList = chatRoomList.filter((item) => {
    const s = chatRoomSearch.trim().toLowerCase();
    if (!s) return true;
    return (
      item.partnerName.toLowerCase().includes(s) ||
      item.serviceName.toLowerCase().includes(s)
    );
  });

  const isCurrentUserFreelancerInRoom = activeRoomParticipants
    ? String(currentUserId) === String(activeRoomParticipants.freelancer)
    : false;

  const activeChatRoomId = roomId || hashRoomId;
  const activeChatRoomItem = useMemo(
    () =>
      chatRoomList.find(
        (item) => String(item.roomId) === String(activeChatRoomId || "")
      ) || null,
    [chatRoomList, activeChatRoomId]
  );

  useEffect(() => {
    const loadCounterpartProfile = async () => {
      if (!currentUserId) {
        setChatCounterpartProfile(null);
        return;
      }

      const pair = getParticipantPair();
      const counterpartId = String(pair?.other || "");
      if (!counterpartId) {
        setChatCounterpartProfile(null);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", counterpartId)
        .maybeSingle();

      setChatCounterpartProfile(profileRow || null);
    };

    loadCounterpartProfile();
  }, [currentUserId, getParticipantPair]);

  const serviceWorkflow = useMemo(() => {
    const hasHireAccepted = messages.some((row: any) =>
      String(row?.message || "").startsWith(SYSTEM_ACCEPT_PREFIX)
    );

    const enabled =
      !isDeliverySessionService &&
      hasHireAccepted &&
      !!activeRoomParticipants?.customer &&
      !!activeRoomParticipants?.freelancer;

    if (!enabled) {
      return {
        enabled: false,
        agreedPrice: null as number | null,
        statusText: "",
        canPayAndStartWork: false,
        canSubmitWork: false,
        canApproveWork: false,
        canDeclineWork: false
      };
    }

    let agreedPrice = Number(service?.price || 0);
    let paymentHeldAt = 0;
    let latestSubmittedAt = 0;
    let latestRevisionAt = 0;
    let latestApprovedAt = 0;
    let latestReleasedAt = 0;

    (messages as any[]).forEach((row: any) => {
      const message = String(row?.message || "");
      const createdAt = Date.parse(String(row?.created_at || ""));
      const ts = Number.isFinite(createdAt) ? createdAt : 0;

      if (message.startsWith(SYSTEM_WORK_PRICE_PREFIX)) {
        const parsedPrice = getPriceFromMessage(message);
        if (parsedPrice > 0) {
          agreedPrice = parsedPrice;
        }
      }
      if (message.startsWith(SYSTEM_WORK_PAYMENT_HELD_PREFIX)) {
        paymentHeldAt = Math.max(paymentHeldAt, ts);
      }
      if (message.startsWith(SYSTEM_WORK_SUBMITTED_PREFIX)) {
        latestSubmittedAt = Math.max(latestSubmittedAt, ts);
      }
      if (message.startsWith(SYSTEM_WORK_REVISION_PREFIX)) {
        latestRevisionAt = Math.max(latestRevisionAt, ts);
      }
      if (message.startsWith(SYSTEM_WORK_APPROVED_PREFIX)) {
        latestApprovedAt = Math.max(latestApprovedAt, ts);
      }
      if (message.startsWith(SYSTEM_WORK_RELEASED_PREFIX)) {
        latestReleasedAt = Math.max(latestReleasedAt, ts);
      }
    });

    const paymentHeld = paymentHeldAt > 0;
    const isReleased = latestReleasedAt > 0;
    const latestReviewAt = Math.max(
      latestRevisionAt,
      latestApprovedAt,
      latestReleasedAt
    );
    const awaitingCustomerReview =
      latestSubmittedAt > 0 && latestSubmittedAt > latestReviewAt;

    let statusText = "Customer should pay and start this work.";
    if (paymentHeld && !awaitingCustomerReview && !isReleased) {
      statusText = "Payment is held. Freelancer can submit work for review.";
    }
    if (awaitingCustomerReview && !isReleased) {
      statusText =
        "Work submitted. Waiting for customer approval or revision request.";
    }
    if (latestRevisionAt > latestSubmittedAt && !isReleased) {
      statusText =
        "Customer requested revision. Freelancer should submit an updated result.";
    }
    if (isReleased) {
      statusText = "Work approved. Payment released to freelancer earning.";
    }

    return {
      enabled,
      agreedPrice,
      statusText,
      canPayAndStartWork:
        !isCurrentUserFreelancerInRoom && !paymentHeld && !isReleased,
      canSubmitWork:
        isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        !awaitingCustomerReview,
      canApproveWork:
        !isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        awaitingCustomerReview,
      canDeclineWork:
        !isCurrentUserFreelancerInRoom &&
        paymentHeld &&
        !isReleased &&
        awaitingCustomerReview
    };
  }, [
    messages,
    service,
    isDeliverySessionService,
    activeRoomParticipants,
    isCurrentUserFreelancerInRoom
  ]);

  const sendWorkflowMessage = useCallback(
    async (message: string) => {
      await sendMessage(message);
      window.dispatchEvent(new Event("service-chat-updated"));
    },
    [sendMessage]
  );

  const payAndStartWork = useCallback(async () => {
    if (!serviceWorkflow.enabled || !activeRoomParticipants) return;

    const agreedPrice = Number(serviceWorkflow.agreedPrice || 0);
    if (agreedPrice <= 0) {
      setChatError("Agreed price must be greater than 0.");
      return;
    }

    try {
      setWorkflowBusyAction("pay");
      const serviceId = String(id);
      const customerId = String(activeRoomParticipants.customer || "");
      const freelancerId = String(activeRoomParticipants.freelancer || "");
      const agreedText = agreedPrice.toFixed(2);

      await sendWorkflowMessage(
        `${SYSTEM_WORK_PRICE_PREFIX} SERVICE:${serviceId} PRICE:${agreedText}`
      );
      await sendWorkflowMessage(
        `${SYSTEM_WORK_PAYMENT_HELD_PREFIX} SERVICE:${serviceId} PRICE:${agreedText} CUSTOMER:${customerId} FREELANCER:${freelancerId} Payment held and work started.`
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, activeRoomParticipants, id, sendWorkflowMessage]);

  const submitWork = useCallback(async () => {
    if (!serviceWorkflow.enabled || !currentUserId) return;

    try {
      setWorkflowBusyAction("submit");
      await sendWorkflowMessage(
        `${SYSTEM_WORK_SUBMITTED_PREFIX} SERVICE:${id} FREELANCER:${currentUserId} Submitted work for customer review.`
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, currentUserId, id, sendWorkflowMessage]);

  const requestRevision = useCallback(async () => {
    if (!serviceWorkflow.enabled || !currentUserId) return;

    try {
      setWorkflowBusyAction("decline");
      await sendWorkflowMessage(
        `${SYSTEM_WORK_REVISION_PREFIX} SERVICE:${id} CUSTOMER:${currentUserId} Customer requested revision. Please continue and submit again.`
      );
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, currentUserId, id, sendWorkflowMessage]);

  const approveWork = useCallback(async () => {
    if (!serviceWorkflow.enabled || !currentUserId || !activeRoomParticipants)
      return;

    const agreedPrice = Number(serviceWorkflow.agreedPrice || 0);
    if (agreedPrice <= 0) {
      setChatError("Agreed price must be greater than 0.");
      return;
    }

    try {
      setWorkflowBusyAction("approve");
      const serviceId = String(id);
      const customerId = String(activeRoomParticipants.customer || "");
      const freelancerId = String(activeRoomParticipants.freelancer || "");
      const agreedText = agreedPrice.toFixed(2);

      await sendWorkflowMessage(
        `${SYSTEM_WORK_APPROVED_PREFIX} SERVICE:${serviceId} CUSTOMER:${currentUserId} Work approved by customer.`
      );
      await sendWorkflowMessage(
        `${SYSTEM_WORK_RELEASED_PREFIX} SERVICE:${serviceId} PRICE:${agreedText} CUSTOMER:${customerId} FREELANCER:${freelancerId} Payment released to freelancer earning.`
      );

      // Update freelancer's earning in Supabase
      const earningAmount = Number(agreedText);
      if (freelancerId && earningAmount > 0) {
        // Get current earning
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("earning")
          .eq("id", freelancerId)
          .maybeSingle();

        if (profileError) {
          toast.error("Failed to fetch freelancer earning: " + profileError.message);
        } else if (!profileData) {
          toast.error("Freelancer profile not found.");
        } else {
          const currentEarning = Number(profileData.earning || 0);
          const newEarning = currentEarning + earningAmount;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ earning: newEarning })
            .eq("id", freelancerId);
          if (updateError) {
            toast.error("Failed to update earning: " + updateError.message);
          } else {
            toast.success("Freelancer earning updated!");
            // Optionally, refresh profile in store if current user is freelancer
            if (String(currentUserId) === String(freelancerId)) {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("profile-updated"));
              }
            }
          }
        }
      }
    } finally {
      setWorkflowBusyAction(null);
    }
  }, [serviceWorkflow, currentUserId, activeRoomParticipants, id, sendWorkflowMessage]);

  const chatCounterpart = getParticipantPair();
  const chatCounterpartAvatar =
    chatCounterpartProfile?.avatar_url ||
    chatCounterpartProfile?.image_url ||
    chatCounterpartProfile?.photo_url ||
    activeChatRoomItem?.partnerAvatarUrl ||
    (chatCounterpart?.myRole === "customer"
      ? creator?.avatar_url || creator?.image_url || creator?.photo_url || null
      : null);

  const chatCounterpartName =
    chatCounterpartProfile?.full_name ||
    chatCounterpartProfile?.email ||
    activeChatRoomItem?.partnerName ||
    (chatCounterpart?.myRole === "customer"
      ? creator?.full_name || creator?.email || "Freelancer"
      : "Customer");

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

  if (isChatOpen) {
    return (
      <ServiceChat
        chatRoomSearch={chatRoomSearch}
        setChatRoomSearch={setChatRoomSearch}
        loadingChatRoomList={loadingChatRoomList}
        filteredChatRoomList={filteredChatRoomList}
        roomId={roomId}
        hashRoomId={hashRoomId}
        setRoomId={setRoomId}
        loadRoomParticipants={loadRoomParticipants}
        router={router}
        serviceId={id}
        serviceName={service.name}
        chatCounterpartAvatar={chatCounterpartAvatar}
        chatCounterpartName={chatCounterpartName}
        closeChat={closeChat}
        deleteChat={deleteChat}
        deletingChat={deletingChat}
        messagesContainerRef={messagesContainerRef}
        chatLoading={chatLoading}
        messages={messages}
        currentUserId={currentUserId}
        isCurrentUserFreelancerInRoom={isCurrentUserFreelancerInRoom}
        extractImageUrl={extractImageUrl}
        chatError={chatError}
        imageInputRef={imageInputRef}
        onImageSelected={onImageSelected}
        onPickImage={onPickImage}
        sending={sending}
        sendingImage={sendingImage}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendMessage={sendMessage}
        workflowEnabled={serviceWorkflow.enabled}
        workflowStatusText={serviceWorkflow.statusText}
        workflowAgreedPrice={serviceWorkflow.agreedPrice}
        canPayAndStartWork={serviceWorkflow.canPayAndStartWork}
        canSubmitWork={serviceWorkflow.canSubmitWork}
        canApproveWork={serviceWorkflow.canApproveWork}
        canDeclineWork={serviceWorkflow.canDeclineWork}
        onPayAndStartWork={payAndStartWork}
        onSubmitWork={submitWork}
        onApproveWork={approveWork}
        onDeclineWork={requestRevision}
        workflowBusyAction={workflowBusyAction}
      />
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
      chatError={chatError}
      requestError={requestError}
    />
  );
}
