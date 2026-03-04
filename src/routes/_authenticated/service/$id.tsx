import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/service/$id")({
  component: RouteComponent,
});

const DEFAULT_DESCRIPTION = "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_HIRE_MESSAGE = "Hi, I want to hire this service. Could you share more details before we proceed?";
const MOCK_SERVICE_CHAT = true;
const SYSTEM_REQUEST_PREFIX = "[SYSTEM_HIRE_REQUEST]";
const SYSTEM_ACCEPT_PREFIX = "[SYSTEM_HIRE_ACCEPTED]";

const toSystemRequestMessage = (text: string) => `${SYSTEM_REQUEST_PREFIX} ${text}`;
const toSystemAcceptMessage = (text: string) => `${SYSTEM_ACCEPT_PREFIX} ${text}`;
const isSystemRequestMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(SYSTEM_REQUEST_PREFIX);
const isSystemAcceptMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(SYSTEM_ACCEPT_PREFIX);
const stripSystemPrefix = (message: string | null | undefined) =>
  (message || "")
    .replace(SYSTEM_REQUEST_PREFIX, "")
    .replace(SYSTEM_ACCEPT_PREFIX, "")
    .trim();

type PendingHireRoomView = {
  room_id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  request_message: string;
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
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash === "#chat";
  });
  const [messages, setMessages] = useState<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [, setHireRoomId] = useState<string | null>(null);
  const [isHireRequested, setIsHireRequested] = useState(false);
  const [isHireAccepted, setIsHireAccepted] = useState(false);
  const [pendingHireRequests, setPendingHireRequests] = useState<PendingHireRoomView[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sendingHireRequest, setSendingHireRequest] = useState(false);
  const [acceptingRequestRoomId, setAcceptingRequestRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const isServiceOwner = !!currentUserId && !!creatorId && String(currentUserId) === String(creatorId);
  const canTryHire = !!currentUserId && !isServiceOwner;
  const canRequestHire = canTryHire && !!creatorId;
  const hasAcceptedHire = isHireAccepted;
  const hasPendingHire = isHireRequested && !isHireAccepted;

  const syncMockRoomToWidget = (roomKey: string, lastMessage?: string) => {
    if (typeof window === "undefined") return;

    const pair = getParticipantPair();
    const storageKey = "mock_service_chat_rooms";

    type StoredMockRoom = {
      roomId: string;
      serviceId: string;
      customerId: string;
      freelancerId: string;
      customerName: string;
      customerAvatarUrl: string | null;
      freelancerName: string;
      freelancerAvatarUrl: string | null;
      serviceName: string;
      lastMessage: string;
      lastAt: string;
    };

    const customerId = pair?.customerId || String(currentUserId || "customer");
    const freelancerId = pair?.freelancerId || String(creatorId || "freelance");
    const customerName = String(currentUserId) === customerId
      ? (profile?.full_name || profile?.email || "Customer")
      : (creator?.full_name || creator?.email || "Customer");
    const freelancerName = String(currentUserId) === freelancerId
      ? (profile?.full_name || profile?.email || "Freelance")
      : (creator?.full_name || creator?.email || "Freelance");
    const profileAvatar = (profile as any)?.avatar_url || (profile as any)?.image_url || (profile as any)?.photo_url || null;
    const customerAvatarUrl = String(currentUserId) === customerId
      ? profileAvatar
      : (creator?.avatar_url || creator?.image_url || creator?.photo_url || null);
    const freelancerAvatarUrl = String(currentUserId) === freelancerId
      ? profileAvatar
      : (creator?.avatar_url || creator?.image_url || creator?.photo_url || null);

    let existing: StoredMockRoom[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      existing = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const now = new Date().toISOString();
    const nextRoom: StoredMockRoom = {
      roomId: roomKey,
      serviceId: String(id),
      customerId,
      freelancerId,
      customerName,
      customerAvatarUrl,
      freelancerName,
      freelancerAvatarUrl,
      serviceName: service?.name || "Service",
      lastMessage: lastMessage || "Mock chat started",
      lastAt: now,
    };

    const filtered = existing.filter((item) => String(item.roomId) !== String(roomKey));
    filtered.unshift(nextRoom);
    window.localStorage.setItem(storageKey, JSON.stringify(filtered.slice(0, 100)));
    window.dispatchEvent(new Event("service-chat-updated"));
  };

  const getRoleValue = (value: any) => {
    const roleValue = value?.user_role ?? value?.role ?? null;
    return typeof roleValue === "string" ? roleValue.toLowerCase() : null;
  };

  const getParticipantPair = () => {
    if (!currentUserId || !creatorId) return null;
    if (String(currentUserId) === String(creatorId)) return null;

    const currentRole = getRoleValue(profile);
    const creatorRole = getRoleValue(creator);

    if (currentRole === "freelance") {
      return {
        customerId: String(creatorId),
        freelancerId: String(currentUserId),
      };
    }

    if (creatorRole === "freelance") {
      return {
        customerId: String(currentUserId),
        freelancerId: String(creatorId),
      };
    }

    return {
      customerId: String(currentUserId),
      freelancerId: String(creatorId),
    };
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === "undefined") return;
      setIsChatOpen(window.location.hash === "#chat");
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const resolveChatRoom = async (createIfMissing: boolean) => {
    const pair = getParticipantPair();
    if (!pair) return null;

    const { customerId, freelancerId } = pair;

    const { data: existingRoom, error: existingRoomError } = await supabase
      .from("service_chat_rooms")
      .select("id")
      .eq("service_id", id)
      .eq("customer_id", customerId)
      .eq("freelancer_id", freelancerId)
      .maybeSingle();

    if (existingRoomError) {
      setChatError(existingRoomError.message || "Unable to check existing chat room.");
      return null;
    }
    if (existingRoom?.id) return String(existingRoom.id);
    if (!createIfMissing) return null;

    const { data: createdRoom, error: createdRoomError } = await supabase
      .from("service_chat_rooms")
      .upsert(
        [
          {
            service_id: id,
            customer_id: customerId,
            freelancer_id: freelancerId,
            created_by: currentUserId,
            last_message_at: new Date().toISOString(),
          },
        ],
        { onConflict: "service_id,customer_id,freelancer_id" }
      )
      .select("id")
      .single();

    if (createdRoomError) {
      setChatError(createdRoomError.message || "Unable to create chat room.");
      return null;
    }
    return createdRoom?.id ? String(createdRoom.id) : null;
  };

  const loadHireRequestData = async () => {
    if (!currentUserId || !creatorId) {
      setHireRoomId(null);
      setIsHireRequested(false);
      setIsHireAccepted(false);
      setPendingHireRequests([]);
      setRequestError(null);
      return;
    }

    try {
      setRequestLoading(true);
      setRequestError(null);

      if (isServiceOwner) {
        const { data: rooms, error: roomsError } = await supabase
          .from("service_chat_rooms")
          .select("id, service_id, customer_id, freelancer_id")
          .eq("service_id", id)
          .eq("freelancer_id", currentUserId)
          .limit(50);

        if (roomsError) throw roomsError;

        const roomRows = rooms ?? [];
        const roomIds = roomRows.map((item: any) => String(item.id));
        const customerIds = Array.from(new Set(roomRows.map((item: any) => String(item.customer_id))));

        const { data: messageRows, error: messageError } = roomIds.length > 0
          ? await supabase
              .from("service_messages")
              .select("room_id, sender_id, message, created_at")
              .in("room_id", roomIds)
              .order("created_at", { ascending: true })
          : { data: [] as any[], error: null };

        if (messageError) throw messageError;

        const roomMessageMap = new Map<string, any[]>();
        (messageRows ?? []).forEach((item: any) => {
          const key = String(item.room_id);
          const current = roomMessageMap.get(key) || [];
          current.push(item);
          roomMessageMap.set(key, current);
        });

        const { data: customerRows, error: customerError } = customerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, email, avatar_url, image_url, photo_url")
              .in("id", customerIds)
          : { data: [] as any[], error: null };

        if (customerError) throw customerError;

        const customerMap = new Map(
          (customerRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "User",
              avatar: item.avatar_url || item.image_url || item.photo_url || null,
            },
          ])
        );

        const mappedRequests: PendingHireRoomView[] = roomRows
          .map((room: any) => {
            const roomId = String(room.id);
            const messages = roomMessageMap.get(roomId) || [];
            const hasRequest = messages.some((message) => isSystemRequestMessage(message.message));
            const hasAccepted = messages.some((message) => isSystemAcceptMessage(message.message));
            if (!hasRequest || hasAccepted) return null;

            const firstRequestMessage = messages.find((message) => isSystemRequestMessage(message.message));
            const customer = customerMap.get(String(room.customer_id));

            return {
              room_id: roomId,
              customer_id: String(room.customer_id),
              customer_name: customer?.name || "User",
              customer_avatar_url: customer?.avatar || null,
              request_message: stripSystemPrefix(firstRequestMessage?.message) || DEFAULT_HIRE_MESSAGE,
            };
          })
          .filter(Boolean) as PendingHireRoomView[];

        setPendingHireRequests(mappedRequests);
        return;
      }

      const { data: existingRoom, error: existingRoomError } = await supabase
        .from("service_chat_rooms")
        .select("id")
        .eq("service_id", id)
        .eq("customer_id", currentUserId)
        .eq("freelancer_id", creatorId)
        .maybeSingle();

      if (existingRoomError) throw existingRoomError;

      if (!existingRoom?.id) {
        setHireRoomId(null);
        setIsHireRequested(false);
        setIsHireAccepted(false);
        return;
      }

      const nextRoomId = String(existingRoom.id);
      setHireRoomId(nextRoomId);

      const { data: messageRows, error: messageError } = await supabase
        .from("service_messages")
        .select("message")
        .eq("room_id", nextRoomId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      const hasRequest = (messageRows ?? []).some((message: any) => isSystemRequestMessage(message.message));
      const hasAccepted = (messageRows ?? []).some((message: any) => isSystemAcceptMessage(message.message));

      setIsHireRequested(hasRequest);
      setIsHireAccepted(hasAccepted);
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to load hire request status.";
      setRequestError(nextMessage);
    } finally {
      setRequestLoading(false);
    }
  };

  const sendHireRequest = async () => {
    if (!currentUserId) return;
    if (!creatorId) {
      const nextMessage = "This service is missing freelancer owner info. Please update freelancer_id on this service first.";
      setRequestError(nextMessage);
      toast.error("Service owner not linked yet.");
      return;
    }
    if (!canRequestHire) return;

    try {
      setSendingHireRequest(true);
      setRequestError(null);
      setChatError(null);

      const nextRoomId = await resolveChatRoom(true);
      if (!nextRoomId) throw new Error("Unable to create request room.");

      const { error } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: nextRoomId,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: creatorId,
            message: toSystemRequestMessage(DEFAULT_HIRE_MESSAGE),
          },
        ]);

      if (error) throw error;

      setHireRoomId(nextRoomId);
      setIsHireRequested(true);
      setIsHireAccepted(false);
      toast.success("Hire request sent. Waiting for freelance approval.");
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to send hire request.";
      setRequestError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setSendingHireRequest(false);
    }
  };

  const acceptHireRequest = async (request: PendingHireRoomView) => {
    if (!currentUserId || !isServiceOwner) return;

    try {
      setAcceptingRequestRoomId(request.room_id);
      setRequestError(null);

      const { error: acceptError } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: request.room_id,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: request.customer_id,
            message: toSystemAcceptMessage("Hire request accepted. You can now start chat."),
          },
        ]);

      if (acceptError) throw acceptError;

      toast.success("Request accepted. Chat room is ready.");
      await loadHireRequestData();
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to accept hire request.";
      setRequestError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setAcceptingRequestRoomId(null);
    }
  };

  const openChat = async () => {
    if (MOCK_SERVICE_CHAT) {
      try {
        setStartingChat(true);
        setChatError(null);

        const pair = getParticipantPair();
        let nextRoomId: string | null = null;

        if (pair && currentUserId && creatorId) {
          const resolvedRoomId = await resolveChatRoom(true);
          nextRoomId = resolvedRoomId;

          if (resolvedRoomId) {
            const { data: existingMessages } = await supabase
              .from("service_messages")
              .select("id")
              .eq("room_id", resolvedRoomId)
              .limit(1);

            if (!existingMessages || existingMessages.length === 0) {
              await supabase
                .from("service_messages")
                .insert([
                  {
                    room_id: resolvedRoomId,
                    service_id: id,
                    sender_id: creatorId,
                    receiver_id: currentUserId,
                    message: "Hi! This is mock chat for testing. You can send messages now.",
                  },
                ]);
            }
          }
        }

        const fallbackRoomKey = `mock-room-${id}-${currentUserId || "guest"}`;
        const effectiveRoomId = nextRoomId || fallbackRoomKey;
        setRoomId(effectiveRoomId);
        if (!nextRoomId) {
          syncMockRoomToWidget(effectiveRoomId, "Mock chat started");
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("service-chat-updated"));
        }

        router.navigate({
          to: "/service/$id",
          params: { id },
          hash: "chat",
        });
        setIsChatOpen(true);
      } finally {
        setStartingChat(false);
      }
      return;
    }

    const pair = getParticipantPair();
    if (!pair) {
      setChatError("Chat is unavailable for this service.");
      toast.error("This service has no freelancer linked yet.");
      return;
    }

    if (!hasAcceptedHire && !isServiceOwner) {
      const message = hasPendingHire
        ? "Waiting for freelancer approval before chat can start."
        : "Send a hire request first to start chat.";
      setChatError(message);
      toast.error(message);
      return;
    }

    try {
      setStartingChat(true);
      setChatError(null);

      const resolvedRoomId = await resolveChatRoom(false);
      if (!resolvedRoomId) {
        setChatError((prev) => prev || "Chat room is not ready yet.");
        toast.error("Chat room is not ready yet.");
        return;
      }

      setRoomId(resolvedRoomId);
      router.navigate({
        to: "/service/$id",
        params: { id },
        hash: "chat",
      });
      setIsChatOpen(true);
    } finally {
      setStartingChat(false);
    }
  };

  const closeChat = () => {
    router.navigate({
      to: "/service/$id",
      params: { id },
      hash: "",
      replace: true,
    });
    setIsChatOpen(false);
    setRoomId(null);
  };

  useEffect(() => {
    let isActive = true;

    const withTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs = 12000): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out. Please try again."));
        }, timeoutMs);

        Promise.resolve(promiseLike)
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };

    const loadService = async () => {
      try {
        if (!isActive) return;
        setLoading(true);
        setError(null);

        const byServiceId = await withTimeout(
          supabase
            .from("services")
            .select("*")
            .eq("service_id", id)
            .maybeSingle()
        );

        if (!isActive) return;
        if (byServiceId.error) throw byServiceId.error;

        let foundService = byServiceId.data;

        if (!foundService) {
          const byId = await withTimeout(
            supabase
              .from("services")
              .select("*")
              .eq("id", id)
              .maybeSingle()
          );

          if (!isActive) return;
          if (byId.error) throw byId.error;
          foundService = byId.data;
        }

        if (!foundService) {
          throw new Error("Service not found");
        }

        setService(foundService);

        const creatorId =
          foundService.freelancer_id ??
          foundService.freelance_id ??
          foundService.created_by ??
          foundService.created_by_id ??
          foundService.user_id ??
          foundService.userId ??
          foundService.owner_id ??
          foundService.ownerId ??
          foundService.freelancer_user_id ??
          foundService.profile_id ??
          null;

        if (!creatorId) {
          setCreatorId(null);
          setCreator(null);
          return;
        }

        setCreatorId(String(creatorId));

        const { data: creatorProfile, error: creatorError } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", creatorId)
            .maybeSingle()
        );

        if (!isActive) return;
        if (creatorError) {
          setCreator(null);
          return;
        }

        setCreator(creatorProfile ?? null);
      } catch (err: any) {
        if (!isActive) return;
        setService(null);
        setCreatorId(null);
        setCreator(null);
        setError(err.message || "Failed to load service");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    loadService();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    loadHireRequestData();
  }, [id, currentUserId, creatorId, isServiceOwner]);

  useEffect(() => {
    if (!id || !currentUserId || !creatorId) return;

    const channel = supabase
      .channel(`service-hire-request-${id}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_chat_rooms",
          filter: `service_id=eq.${id}`,
        },
        () => {
          loadHireRequestData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_messages",
          filter: `service_id=eq.${id}`,
        },
        () => {
          loadHireRequestData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId, creatorId, isServiceOwner]);

  useEffect(() => {
    if (!isChatOpen) return;
    if (!currentUserId) {
      setChatError("Please sign in again to use chat.");
      return;
    }

    if (!MOCK_SERVICE_CHAT && !hasAcceptedHire && !isServiceOwner) {
      setChatError("Chat opens after your hire request is accepted.");
      setMessages([]);
      return;
    }

    const loadRoomMessages = async (targetRoomId: string) => {
      const { data, error } = await supabase
        .from("service_messages")
        .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
        .eq("room_id", targetRoomId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(
        (data ?? []).filter(
          (message: any) =>
            !isSystemRequestMessage(message.message) && !isSystemAcceptMessage(message.message)
        )
      );
    };

    if (MOCK_SERVICE_CHAT) {
      const loadMockChat = async () => {
        try {
          setChatLoading(true);
          setChatError(null);

          let activeRoomId = roomId;

          if (!activeRoomId || activeRoomId.startsWith("mock-room-")) {
            const resolvedRoomId = await resolveChatRoom(false);
            if (resolvedRoomId) {
              activeRoomId = resolvedRoomId;
              setRoomId(resolvedRoomId);
            }
          }

          if (activeRoomId && !activeRoomId.startsWith("mock-room-")) {
            await loadRoomMessages(activeRoomId);
            return;
          }

          setMessages([
            {
              id: `mock-1-${id}`,
              service_id: id,
              sender_id: creatorId || "mock-freelance",
              receiver_id: currentUserId,
              message: "Hi! Thanks for your interest. This is a mock chat for testing.",
              created_at: new Date(Date.now() - 60_000).toISOString(),
            },
          ]);
          if (!roomId) setRoomId(`mock-room-${id}`);
        } catch (err: any) {
          setChatError(err?.message || "Failed to load chat messages.");
        } finally {
          setChatLoading(false);
        }
      };

      loadMockChat();
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        setChatLoading(true);
        setChatError(null);

        const resolvedRoomId = roomId || (await resolveChatRoom(false));
        if (!active) return;

        if (!resolvedRoomId) {
          setMessages([]);
          setChatError("Chat room will appear once request is accepted.");
          return;
        }

        setRoomId(resolvedRoomId);

        const { data, error } = await supabase
          .from("service_messages")
          .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
          .eq("room_id", resolvedRoomId)
          .order("created_at", { ascending: true });

        if (!active) return;
        if (error) throw error;
        setMessages(
          (data ?? []).filter(
            (message: any) =>
              !isSystemRequestMessage(message.message) && !isSystemAcceptMessage(message.message)
          )
        );
      } catch (err: any) {
        if (!active) return;
        setChatError(err.message || "Failed to load chat messages.");
      } finally {
        if (!active) return;
        setChatLoading(false);
      }
    };

    loadMessages();

    if (!roomId) return;

    const channel = supabase
      .channel(`service-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!active) return;

          setMessages((prev) => {
            const exists = prev.some((item) => String(item.id) === String(payload.new.id));
            if (exists) return prev;
            if (isSystemRequestMessage(payload.new.message) || isSystemAcceptMessage(payload.new.message)) {
              return prev;
            }
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, isChatOpen, currentUserId, roomId, creatorId, hasAcceptedHire, isServiceOwner]);

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !currentUserId) return;

    if (MOCK_SERVICE_CHAT) {
      const tempId = `mock-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          service_id: id,
          sender_id: currentUserId,
          receiver_id: creatorId || "mock-freelance",
          message: text,
          created_at: new Date().toISOString(),
        },
      ]);
      setChatInput("");

      if (roomId && !roomId.startsWith("mock-room-")) {
        try {
          await supabase.from("service_messages").insert([
            {
              room_id: roomId,
              service_id: id,
              sender_id: currentUserId,
              receiver_id: creatorId || "mock-freelance",
              message: text,
            },
          ]);

          await supabase
            .from("service_chat_rooms")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", roomId);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("service-chat-updated"));
          }
        } catch {
        }
      } else {
        const localRoomId = roomId || `mock-room-${id}-${currentUserId || "guest"}`;
        syncMockRoomToWidget(localRoomId, text);
      }

      window.setTimeout(() => {
        const replyText = "Mock reply: I received your message and will respond soon.";
        setMessages((prev) => [
          ...prev,
          {
            id: `mock-reply-${Date.now()}`,
            service_id: id,
            sender_id: creatorId || "mock-freelance",
            receiver_id: currentUserId,
            message: replyText,
            created_at: new Date().toISOString(),
          },
        ]);

        if (roomId && !roomId.startsWith("mock-room-")) {
          supabase.from("service_messages").insert([
            {
              room_id: roomId,
              service_id: id,
              sender_id: creatorId || "mock-freelance",
              receiver_id: currentUserId,
              message: replyText,
            },
          ]).then(() => {
            supabase
              .from("service_chat_rooms")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", roomId)
              .then(() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("service-chat-updated"));
                }
              });
          });
        }

        const localRoomId = roomId || `mock-room-${id}-${currentUserId || "guest"}`;
        syncMockRoomToWidget(localRoomId, replyText);
      }, 900);
      return;
    }

    if (!roomId) return;

    const participantPair = getParticipantPair();
    if (!participantPair) return;

    try {
      setSending(true);
      setChatError(null);

      const receiverId = String(currentUserId) === participantPair.customerId
        ? participantPair.freelancerId
        : participantPair.customerId;
      const tempId = `temp-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          service_id: id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          message: text,
          created_at: new Date().toISOString(),
        },
      ]);
      setChatInput("");

      const { data, error } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: roomId,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: text,
          },
        ])
        .select("id, service_id, sender_id, receiver_id, message, created_at")
        .single();

      if (error) throw error;

      await supabase
        .from("service_chat_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", roomId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("service-chat-updated"));
      }

      setMessages((prev) =>
        prev.map((item) => (String(item.id) === tempId ? data : item))
      );
    } catch (err: any) {
      setChatError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!isChatOpen) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, isChatOpen, chatLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Service...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-red-600 font-bold">{error || "Service not found"}</p>
        <Link to="/service" className="px-4 py-2 bg-[#D35400] text-white rounded-lg font-bold">
          Back to Services
        </Link>
      </div>
    );
  }

  if (isChatOpen) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
        <main className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 h-[72vh] max-h-[72vh]">
              <aside className="bg-[#F7D9C4] rounded-xl p-3 border border-orange-100">
                <div className="bg-white rounded-lg px-3 py-2 border border-orange-100 mb-3">
                  <input
                    type="text"
                    placeholder="Search Name"
                    className="w-full text-sm outline-none bg-transparent"
                    readOnly
                  />
                </div>

                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                      {(creator?.avatar_url || creator?.image_url || creator?.photo_url) ? (
                        <img
                          src={creator?.avatar_url || creator?.image_url || creator?.photo_url || ""}
                          alt={creator?.full_name || creator?.email || "Freelance user"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (creator?.full_name || creator?.email || "F").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#4A2600] truncate">{creator?.full_name || creator?.email || "Freelance user"}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">Service: {service.name}</p>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="bg-[#F7D9C4] rounded-xl p-3 border border-orange-100 flex flex-col min-h-0">
                <header className="bg-[#F2A779] rounded-xl p-4 border border-orange-200 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                      {(creator?.avatar_url || creator?.image_url || creator?.photo_url) ? (
                        <img
                          src={creator?.avatar_url || creator?.image_url || creator?.photo_url || ""}
                          alt={creator?.full_name || creator?.email || "Freelance user"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (creator?.full_name || creator?.email || "F").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#4A2600] truncate">{creator?.full_name || creator?.email || "Freelance user"}</p>
                      <p className="text-sm text-[#4A2600]/80 mt-1 truncate">Service: {service.name}</p>
                    </div>
                  </div>
                </header>

                <div ref={messagesContainerRef} className="bg-white rounded-xl border border-orange-100 flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
                  {chatLoading && <p className="text-sm text-gray-500">Loading chat...</p>}
                  {!chatLoading && messages.length === 0 && (
                    <p className="text-sm text-gray-500">No message yet. Start chatting with the freelancer.</p>
                  )}

                  {messages.map((message) => {
                    const isMine = String(message.sender_id) === String(currentUserId);
                    return (
                      <div key={String(message.id)} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm border ${isMine ? "bg-[#F2A779] border-orange-300 text-[#4A2600]" : "bg-white border-orange-300 text-[#4A2600]"}`}>
                          <p>{message.message}</p>
                          <p className="text-[10px] mt-1 opacity-70">{new Date(message.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {chatError && (
                  <p className="text-red-600 text-sm font-semibold mt-3">{chatError}</p>
                )}

                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg border border-orange-100 px-3 py-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !chatInput.trim()}
                    className={`px-4 py-1.5 rounded-lg text-sm font-black ${sending || !chatInput.trim() ? "bg-gray-100 text-gray-400" : "bg-[#D35400] text-white hover:bg-[#b34700]"}`}
                  >
                    Send
                  </button>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={closeChat}
                    className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                  >
                    Back to Detail
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <img
                src={service.image_url || DEFAULT_IMAGE}
                alt={service.name}
                className="w-full aspect-[4/3] object-cover rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700/70">Service Detail</p>
              <h1 className="text-4xl font-black text-[#4A2600] leading-tight">{service.name}</h1>

              <p className="text-lg text-gray-700 leading-relaxed">
                {service.description || DEFAULT_DESCRIPTION}
              </p>

              <div className="space-y-2 text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">
                {service.pickup_address && <p>• Pickup: {service.pickup_address}</p>}
                {service.dest_address && <p>• Destination: {service.dest_address}</p>}
                {service.category && <p>• Category: {service.category}</p>}
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70 mb-2">Created By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                    {(creator?.avatar_url || creator?.image_url || creator?.photo_url) ? (
                      <img
                        src={creator?.avatar_url || creator?.image_url || creator?.photo_url || ""}
                        alt={creator?.full_name || creator?.email || "Freelance user"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (creator?.full_name || creator?.email || "F").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-base font-black text-[#4A2600]">
                      {creator?.full_name || creator?.email || "Freelance user"}
                    </p>
                    <p className="text-xs text-orange-900/60 mt-1">
                      {(creator?.user_role || creator?.role) ? `Role: ${creator?.user_role || creator?.role}` : "Role: freelance"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-5xl font-black text-[#111111]">$ {service.price}</p>

              <div className="pt-2 flex flex-wrap gap-2 items-center">
                {canTryHire && MOCK_SERVICE_CHAT && (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={startingChat}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {startingChat ? "Opening Chat..." : "Open Mock Chat"}
                  </button>
                )}

                {canTryHire && !isHireRequested && (
                  <button
                    type="button"
                    onClick={sendHireRequest}
                    disabled={sendingHireRequest || requestLoading || !canRequestHire}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${(sendingHireRequest || requestLoading || !canRequestHire) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {sendingHireRequest ? "Sending Request..." : "I Want to Hire This"}
                  </button>
                )}

                {canTryHire && hasPendingHire && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex px-5 py-2 rounded-xl text-white font-bold bg-gray-300 cursor-not-allowed"
                  >
                    Waiting for Freelance Approval
                  </button>
                )}

                {canTryHire && hasAcceptedHire && (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={startingChat}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {startingChat ? "Opening Chat..." : "Open Chat"}
                  </button>
                )}

                {canTryHire && isHireRequested && !hasPendingHire && !hasAcceptedHire && (
                  <button
                    type="button"
                    onClick={sendHireRequest}
                    disabled={sendingHireRequest || requestLoading || !canRequestHire}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${(sendingHireRequest || requestLoading || !canRequestHire) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {sendingHireRequest ? "Sending Request..." : "Request Again"}
                  </button>
                )}

                <Link
                  to="/service"
                  className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                >
                  Close
                </Link>
              </div>

              {canTryHire && hasPendingHire && (
                <p className="text-sm text-orange-700 font-semibold">Your request has been sent. The freelancer must accept before chat starts.</p>
              )}

              {canTryHire && hasAcceptedHire && (
                <p className="text-sm text-green-700 font-semibold">Request accepted. You can now open chat.</p>
              )}

              {canTryHire && MOCK_SERVICE_CHAT && (
                <p className="text-sm text-orange-700 font-semibold">Mock chat mode enabled for testing. It will try creating a room for widget sync, then fallback to local mock if needed.</p>
              )}

              {canTryHire && !canRequestHire && (
                <p className="text-sm text-red-600 font-semibold">This service has no linked freelancer owner yet, so request cannot be sent.</p>
              )}

              {isServiceOwner && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">Hire Requests</p>

                  {requestLoading && <p className="text-sm text-gray-600">Loading requests...</p>}

                  {!requestLoading && pendingHireRequests.length === 0 && (
                    <p className="text-sm text-gray-600">No pending requests right now.</p>
                  )}

                  {!requestLoading && pendingHireRequests.map((request) => (
                    <div key={request.room_id} className="bg-white border border-orange-100 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                          {request.customer_avatar_url ? (
                            <img src={request.customer_avatar_url} alt={request.customer_name} className="w-full h-full object-cover" />
                          ) : (
                            request.customer_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[#4A2600] truncate">{request.customer_name}</p>
                          <p className="text-xs text-gray-500 truncate">{request.request_message || DEFAULT_HIRE_MESSAGE}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => acceptHireRequest(request)}
                        disabled={acceptingRequestRoomId === request.room_id}
                        className={`inline-flex px-4 py-1.5 rounded-lg text-white font-bold text-sm ${(acceptingRequestRoomId === request.room_id) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                      >
                        {acceptingRequestRoomId === request.room_id ? "Accepting..." : "Accept"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {chatError && (
                <p className="text-sm text-red-600 font-semibold">{chatError}</p>
              )}

              {requestError && (
                <p className="text-sm text-red-600 font-semibold">{requestError}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
