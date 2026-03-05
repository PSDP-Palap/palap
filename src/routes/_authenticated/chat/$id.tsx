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

const resolveCustomerId = (room: any) =>
  String(room?.customer_id ?? room?.user_id ?? "");

const resolveFreelancerId = (room: any) =>
  String(room?.freelancer_id ?? room?.freelance_id ?? "");

const resolveOrderCustomerId = (order: any) =>
  String(order?.customer_id ?? order?.user_id ?? "");

const resolveOrderFreelancerId = (order: any) =>
  String(order?.freelancer_id ?? order?.freelance_id ?? "");

const isColumnMissingError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    code === "pgrst204" ||
    code === "42703" ||
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
};

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

      setOrderId(room.order_id);
      let customerId = resolveCustomerId(room);
      let freelancerId = resolveFreelancerId(room);

      if (room.order_id && (!customerId || !freelancerId)) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("order_id, customer_id, freelancer_id, freelance_id")
          .eq("order_id", String(room.order_id))
          .maybeSingle();

        if (orderRow) {
          customerId = customerId || resolveOrderCustomerId(orderRow);
          freelancerId = freelancerId || resolveOrderFreelancerId(orderRow);
        }
      }

      setActiveRoomParticipants({
        customer: customerId,
        freelancer: freelancerId
      });

      const otherId =
        String(customerId) === String(currentUserId)
          ? freelancerId
          : customerId;

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

        let resolvedRooms: any[] | null = null;
        let resolvedRoomError: any = null;

        const roomQueryVariants = [
          {
            select: "id, order_id, customer_id, freelancer_id, last_message_at",
            filter: `customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, customer_id, freelance_id, last_message_at",
            filter: `customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, user_id, freelancer_id, last_message_at",
            filter: `user_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
          },
          {
            select: "id, order_id, user_id, freelance_id, last_message_at",
            filter: `user_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          }
        ];

        for (const variant of roomQueryVariants) {
          const result = await withTimeout(
            supabase
              .from("chat_rooms")
              .select(variant.select)
              .or(variant.filter)
              .order("last_message_at", { ascending: false })
              .limit(50),
            30000
          );

          if (result.error) {
            resolvedRoomError = result.error;
            if (!isColumnMissingError(result.error)) {
              break;
            }
            continue;
          }

          const candidateRows = (result.data as any[]) ?? [];
          if (candidateRows.length === 0) {
            resolvedRooms = [];
            resolvedRoomError = null;
            break;
          }

          const hasUsableParticipants = candidateRows.some((room) => {
            const customerId = resolveCustomerId(room);
            const freelancerId = resolveFreelancerId(room);
            if (!customerId || !freelancerId) return false;
            return (
              String(customerId) === String(currentUserId) ||
              String(freelancerId) === String(currentUserId)
            );
          });

          if (hasUsableParticipants) {
            resolvedRooms = candidateRows;
            resolvedRoomError = null;
            break;
          }
        }

        if (resolvedRoomError) throw resolvedRoomError;

        if (resolvedRooms && resolvedRooms.length > 0) {
          const roomIds = resolvedRooms.map((r) => r.id);
          const orderIds = Array.from(
            new Set(
              resolvedRooms
                .map((r) => String(r.order_id || ""))
                .filter(Boolean)
            )
          );

          const { data: orderRows } = orderIds.length
            ? await supabase
                .from("orders")
                .select("order_id, customer_id, freelancer_id, freelance_id")
                .in("order_id", orderIds)
            : { data: [] as any[] };

          const orderMap = new Map(
            ((orderRows as any[]) ?? []).map((row: any) => [
              String(row.order_id || ""),
              row
            ])
          );

          const partnerIds = resolvedRooms
            .map((r) => {
              const orderRow = orderMap.get(String(r.order_id || ""));
              const customerId =
                resolveCustomerId(r) || resolveOrderCustomerId(orderRow);
              const freelancerId =
                resolveFreelancerId(r) || resolveOrderFreelancerId(orderRow);

              return String(customerId) === String(currentUserId)
                ? freelancerId
                : customerId;
            })
            .filter(Boolean);

          const [{ data: profiles }, { data: latestMessages }] =
            await Promise.all([
              supabase.from("profiles").select("*").in("id", partnerIds),
              supabase
                .from("chat_messages")
                .select("room_id, message, created_at, sender_id")
                .in("room_id", roomIds)
                .order("created_at", { ascending: false })
            ]);

          const pMap = new Map((profiles || []).map((p) => [String(p.id), p]));
          const msgMap = new Map();
          const latestNonSelfSenderByRoom = new Map<string, string>();
          (latestMessages || []).forEach((m) => {
            if (!msgMap.has(m.room_id)) msgMap.set(m.room_id, m);
            const senderId = String((m as any).sender_id || "");
            if (
              senderId &&
              senderId !== String(currentUserId) &&
              !latestNonSelfSenderByRoom.has(String(m.room_id))
            ) {
              latestNonSelfSenderByRoom.set(String(m.room_id), senderId);
            }
          });

          const extraPartnerIds = Array.from(latestNonSelfSenderByRoom.values());
          if (extraPartnerIds.length > 0) {
            const missingPartnerIds = extraPartnerIds.filter(
              (id) => !pMap.has(String(id))
            );

            if (missingPartnerIds.length > 0) {
              const { data: extraProfiles } = await supabase
                .from("profiles")
                .select("*")
                .in("id", missingPartnerIds);

              (extraProfiles || []).forEach((profile: any) => {
                pMap.set(String(profile.id), profile);
              });
            }
          }

          const list: ChatRoomListItem[] = resolvedRooms.map((r: any) => {
            const orderRow = orderMap.get(String(r.order_id || ""));
            const customerId =
              resolveCustomerId(r) || resolveOrderCustomerId(orderRow);
            const freelancerId =
              resolveFreelancerId(r) || resolveOrderFreelancerId(orderRow);
            const isCustomer = customerId === String(currentUserId);
            let partnerId = isCustomer ? freelancerId : customerId;
            if (!partnerId || String(partnerId) === String(currentUserId)) {
              partnerId = latestNonSelfSenderByRoom.get(String(r.id)) || partnerId;
            }
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

  const syncedChatRoomList = filteredChatRoomList.map((item) => {
    const isActive = String(item.roomId) === String(roomId || "");
    if (!isActive || !otherParticipant) return item;

    return {
      ...item,
      partnerName: otherParticipant.full_name || otherParticipant.email || item.partnerName,
      partnerAvatarUrl:
        otherParticipant.avatar_url ||
        otherParticipant.image_url ||
        otherParticipant.photo_url ||
        item.partnerAvatarUrl ||
        null,
    };
  });

  const isCurrentUserFreelancerInRoom = activeRoomParticipants
    ? String(currentUserId) === String(activeRoomParticipants.freelancer)
    : false;

  return (
    <ServiceChat
      chatRoomSearch={chatRoomSearch}
      setChatRoomSearch={setChatRoomSearch}
      loadingChatRoomList={loadingChatRoomList}
      filteredChatRoomList={syncedChatRoomList}
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
