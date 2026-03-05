/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ServiceChat } from "@/components/service/ServiceChat";
import { useUserStore } from "@/stores/useUserStore";
import type { ChatRoomListItem } from "@/types/service";
import { cleanPreviewMessage, withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatRouteComponent
});

const CHAT_IMAGE_PREFIX = "[CHAT_IMAGE]";

function ChatRouteComponent() {
  const { id: roomId } = Route.useParams();
  const router = useRouter();
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [orderId, setOrderId] = useState<string | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<{
    customer?: string;
    freelancer?: string;
  } | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [chatRoomList, setChatRoomList] = useState<ChatRoomListItem[]>([]);
  const [loadingChatRoomList, setLoadingChatRoomList] = useState(false);
  const [chatRoomSearch, setChatRoomSearch] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [roomData, setRoomData] = useState<any>(null);
  const [otherParticipant, setOtherParticipant] = useState<any>(null);

  const extractImageUrl = (message: string | null | undefined) =>
    typeof message === "string" && message.startsWith(CHAT_IMAGE_PREFIX)
      ? (message || "").replace(CHAT_IMAGE_PREFIX, "").trim()
      : null;

  const isImageMessage = (message: string | null | undefined) =>
    typeof message === "string" && message.startsWith(CHAT_IMAGE_PREFIX);

  const toImageMessage = (url: string) => `${CHAT_IMAGE_PREFIX} ${url}`;

  const loadRoomInfo = useCallback(async () => {
    if (!roomId || !currentUserId) return;

    try {
      setChatLoading(true);
      // Increase timeout to 30s
      const { data: room, error: roomErr } = await withTimeout(
        supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle(),
        30000
      );

      if (roomErr) throw roomErr;
      if (!room) throw new Error("Chat room not found");

      setRoomData(room);
      setOrderId(room.order_id);
      setActiveRoomParticipants({
        customer: room.customer_id,
        freelancer: room.freelancer_id
      });

      const otherId =
        String(room.customer_id) === String(currentUserId)
          ? room.freelancer_id
          : room.customer_id;

      if (otherId) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherId)
          .maybeSingle();
        setOtherParticipant(p);
      }
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setChatLoading(false);
    }
  }, [roomId, currentUserId]);

  useEffect(() => {
    loadRoomInfo();
  }, [loadRoomInfo]);

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        const { data, error: msgError } = await withTimeout(
          supabase
            .from("chat_messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true }),
          30000
        );

        if (msgError) throw msgError;
        setMessages(data || []);
      } catch (e: any) {
        setChatError(e.message);
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId, currentUserId]);

  const lastFetchRoomsTimeRef = useRef(0);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchRooms = async () => {
      const now = Date.now();
      if (now - lastFetchRoomsTimeRef.current < 2000) return; // Throttle to every 2s
      
      try {
        setLoadingChatRoomList(true);
        lastFetchRoomsTimeRef.current = now;

        const { data: rooms, error: roomError } = await withTimeout(
          supabase
            .from("chat_rooms")
            .select(
              `
              id,
              order_id,
              customer_id,
              freelancer_id,
              last_message_at
            `
            )
            .or(
              `customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
            )
            .order("last_message_at", { ascending: false })
            .limit(50),
          30000
        );

        if (roomError) throw roomError;

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map((r) => r.id);
          const partnerIds = rooms
            .map((r) =>
              String(r.customer_id) === String(currentUserId)
                ? r.freelancer_id
                : r.customer_id
            )
            .filter(Boolean);

          const [{ data: profiles }, { data: latestMessages }] =
            await Promise.all([
              supabase.from("profiles").select("*").in("id", partnerIds),
              supabase
                .from("chat_messages")
                .select("room_id, message, created_at")
                .in("room_id", roomIds)
                .order("created_at", { ascending: false })
            ]);

          const pMap = new Map((profiles || []).map((p) => [String(p.id), p]));
          const msgMap = new Map();
          (latestMessages || []).forEach((m) => {
            if (!msgMap.has(m.room_id)) msgMap.set(m.room_id, m);
          });

          const list: ChatRoomListItem[] = rooms.map((r: any) => {
            const isCustomer = String(r.customer_id) === String(currentUserId);
            const partnerId = isCustomer ? r.freelancer_id : r.customer_id;
            const p = pMap.get(String(partnerId));
            const last = msgMap.get(r.id);

            const lastTxt = isImageMessage(last?.message)
              ? "Image"
              : cleanPreviewMessage(last?.message);

            return {
              roomId: r.id,
              serviceId: r.order_id, // Map order_id to serviceId for component compatibility
              partnerName: p?.full_name || p?.email || "User",
              partnerAvatarUrl:
                p?.avatar_url || p?.image_url || p?.photo_url || null,
              partnerRoleLabel: isCustomer ? "Freelancer" : "Customer",
              serviceName: "Order Chat",
              lastMessage: lastTxt,
              lastAt:
                last?.created_at ||
                r.last_message_at ||
                new Date().toISOString()
            };
          });

          setChatRoomList(list);
        } else {
          setChatRoomList([]);
        }
      } catch (e) {
        console.error("[Chat] Load rooms list error", e);
      } finally {
        setLoadingChatRoomList(false);
      }
    };

    fetchRooms();
  }, [currentUserId]);

  const sendMessage = async (overrideMessage?: string) => {
    const text = (overrideMessage || chatInput).trim();
    if (!roomId || !currentUserId || !text || !orderId) return;

    try {
      setSending(true);

      const { error: sendError } = await withTimeout(
        supabase.from("chat_messages").insert({
          room_id: roomId,
          order_id: orderId,
          sender_id: currentUserId,
          message: text
        }),
        30000
      );

      if (sendError) throw sendError;
      if (!overrideMessage) setChatInput("");
    } catch (e: any) {
      setChatError(e.message);
    } finally {
      setSending(false);
    }
  };

  const onImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !roomId || !currentUserId || !orderId) return;

    try {
      setSendingImage(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${roomId}_${Date.now()}.${fileExt}`;
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

      await supabase.from("chat_messages").insert({
        room_id: roomId,
        order_id: orderId,
        sender_id: currentUserId,
        message: imgMsg
      });
    } catch (e: any) {
      setChatError(e.message);
    } finally {
      setSendingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredChatRoomList = chatRoomList.filter((item) => {
    const s = chatRoomSearch.trim().toLowerCase();
    return (
      !s ||
      item.partnerName.toLowerCase().includes(s) ||
      item.serviceName.toLowerCase().includes(s)
    );
  });

  const isCurrentUserFreelancerInRoom = activeRoomParticipants
    ? String(currentUserId) === String(activeRoomParticipants.freelancer)
    : false;

  return (
    <ServiceChat
      chatRoomSearch={chatRoomSearch}
      setChatRoomSearch={setChatRoomSearch}
      loadingChatRoomList={loadingChatRoomList}
      filteredChatRoomList={filteredChatRoomList}
      roomId={roomId}
      hashRoomId={null}
      setRoomId={(rid) =>
        router.navigate({ to: "/chat/$id", params: { id: rid } })
      }
      loadRoomParticipants={async () => {}}
      router={router}
      serviceId={orderId || ""}
      serviceName={orderId || "Order"}
      chatCounterpartAvatar={
        otherParticipant?.avatar_url ||
        otherParticipant?.image_url ||
        otherParticipant?.photo_url ||
        null
      }
      chatCounterpartName={
        otherParticipant?.full_name || otherParticipant?.email || "User"
      }
      closeChat={() => router.navigate({ to: "/" })}
      messagesContainerRef={messagesContainerRef}
      chatLoading={chatLoading}
      messages={messages}
      currentUserId={currentUserId}
      isCurrentUserFreelancerInRoom={isCurrentUserFreelancerInRoom}
      extractImageUrl={extractImageUrl}
      chatError={chatError}
      imageInputRef={imageInputRef}
      onImageSelected={onImageSelected}
      onPickImage={() => imageInputRef.current?.click()}
      sending={sending}
      sendingImage={sendingImage}
      chatInput={chatInput}
      setChatInput={setChatInput}
      sendMessage={sendMessage}
      deleteChat={function (): Promise<void> {
        throw new Error("Function not implemented.");
      }}
      deletingChat={false}
    />
  );
}
