/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { ServiceChat } from "@/components/service/ServiceChat";
import { ServiceDetailView } from "@/components/service/ServiceDetailView";
import { useUserStore } from "@/stores/useUserStore";
import type { ChatRoomListItem, PendingHireRoomView } from "@/types/service";
import { withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/service/$id")({
  component: RouteComponent
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

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [service, setService] = useState<any | null>(null);
  const [creator, setCreator] = useState<{
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    user_role?: string | null;
    avatar_url?: string | null;
    image_url?: string | null;
    photo_url?: string | null;
  } | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hashRoomId, setHashRoomId] = useState<string | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<{
    customer?: string;
    freelancer?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
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

  const [isHireRequested, setIsHireRequested] = useState(false);
  const [isHireAccepted, setIsHireAccepted] = useState(false);
  const [hireRequestMessage, setHireRequestMessage] =
    useState(DEFAULT_HIRE_MESSAGE);
  const [sendingHireRequest, setSendingHireRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingHireRequests, setPendingHireRequests] = useState<
    PendingHireRoomView[]
  >([]);
  const [acceptingRequestRoomId, setAcceptingRequestRoomId] = useState<
    string | null
  >(null);
  const [decliningRequestRoomId, setDecliningRequestRoomId] = useState<
    string | null
  >(null);

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

        const { data: serviceData, error: serviceError } = await withTimeout(
          supabase
            .from("services")
            .select("*")
            .eq("service_id", id)
            .maybeSingle()
        );

        if (serviceError) throw serviceError;
        if (!serviceData) throw new Error("Service not found");

        setService(serviceData);
        const freelancerId =
          serviceData.freelancer_id ||
          serviceData.created_by ||
          serviceData.user_id ||
          serviceData.profile_id ||
          null;

        setCreatorId(freelancerId);

        if (freelancerId) {
          const { data: profileData, error: profileError } = await withTimeout(
            supabase
              .from("profiles")
              .select("*")
              .eq("id", freelancerId)
              .maybeSingle()
          );

          if (!profileError && profileData) {
            setCreator(profileData);
          }
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

  useEffect(() => {
    loadService();
  }, [loadService]);

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

  useEffect(() => {
    loadHireRequestData();
  }, [loadHireRequestData]);

  useEffect(() => {
    const refreshSilently = () => {
      loadService({ silent: true });
      loadHireRequestData({ silent: true });
    };

    const intervalId = window.setInterval(refreshSilently, 5000);
    const onFocusRefresh = () => refreshSilently();
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
      window.clearInterval(intervalId);
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

  const chatCounterpart = getParticipantPair();
  const chatCounterpartAvatar =
    chatCounterpart?.myRole === "customer"
      ? creator?.avatar_url || creator?.image_url || creator?.photo_url || null
      : null;

  const chatCounterpartName =
    chatCounterpart?.myRole === "customer"
      ? creator?.full_name || creator?.email || "Freelancer"
      : "Customer";

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
