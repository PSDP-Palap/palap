import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import MessagesTab from "@/components/freelance/MessagesTab";
import { useUserStore } from "@/stores/useUserStore";
import type { ConversationItem } from "@/types/chat";
import { cleanPreviewMessage, isSystemMessage } from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/messages")({
  component: MessagesRoute
});

function MessagesRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const [freelanceChats, setFreelanceChats] = useState<ConversationItem[]>([]);
  const [loadingFreelanceChats, setLoadingFreelanceChats] = useState(false);

  const loadFreelanceChats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoadingFreelanceChats(true);
      const { data: rooms, error: roomsError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("freelancer_id", currentUserId)
        .order("last_message_at", { ascending: false });

      if (roomsError || !rooms) {
        if (roomsError) console.error("Rooms fetch error:", roomsError);
        setFreelanceChats([]);
        return;
      }

      const roomIds = rooms.map((r) => r.id);
      const orderIds = Array.from(
        new Set(rooms.map((r) => String(r.order_id)).filter(Boolean))
      );

      const [{ data: orderRows }, { data: messageRows }] = await Promise.all([
        orderIds.length
          ? supabase
              .from("services")
              .select("service_id, name")
              .in("service_id", orderIds)
          : { data: [] },
        roomIds.length
          ? supabase
              .from("chat_messages")
              .select("room_id, content, created_at, sender_id")
              .in("room_id", roomIds)
              .order("created_at", { ascending: false })
          : { data: [] }
      ]);

      const serviceMap = new Map(
        (orderRows || []).map((s) => [String(s.service_id), s.name])
      );
      const latestMsgMap = new Map();
      (messageRows || []).forEach((m) => {
        if (!latestMsgMap.has(m.room_id) && !isSystemMessage(m.content)) {
          latestMsgMap.set(m.room_id, m);
        }
      });

      // Fetch partner profiles (customers)
      const partnerIds = Array.from(
        new Set(
          rooms
            .map((r) => r.customer_id)
            .filter((id) => id && isUuidLike(String(id)))
        )
      );
      const { data: partners } = partnerIds.length
        ? await supabase.from("profiles").select("*").in("id", partnerIds)
        : { data: [] };
      const pMap = new Map((partners || []).map((p) => [String(p.id), p]));

      const chats: ConversationItem[] = rooms.map((r) => {
        const partnerId = r.customer_id;
        const p = pMap.get(String(partnerId));
        const lastMsg = latestMsgMap.get(r.id);
        const svcName = serviceMap.get(String(r.order_id)) || "Service";

        return {
          key: r.id,
          roomId: r.id,
          serviceId: String(r.order_id),
          partnerId: String(partnerId),
          partnerName: p?.full_name || p?.email || "Customer",
          partnerAvatarUrl:
            p?.avatar_url || p?.image_url || p?.photo_url || null,
          customerName: p?.full_name || p?.email || "Customer",
          customerAvatarUrl:
            p?.avatar_url || p?.image_url || p?.photo_url || null,
          freelancerName: profile?.full_name || "Me",
          freelancerAvatarUrl: profile?.avatar_url || null,
          lastMessage: lastMsg
            ? cleanPreviewMessage(lastMsg.content)
            : "No messages yet",
          lastAt: lastMsg?.created_at || r.last_message_at || r.created_at,
          serviceName: svcName
        };
      });

      setFreelanceChats(chats);
    } catch (err) {
      console.error("Load freelance chats failed:", err);
    } finally {
      setLoadingFreelanceChats(false);
    }
  }, [currentUserId, profile]);

  useEffect(() => {
    loadFreelanceChats();
  }, [loadFreelanceChats]);

  return (
    <MessagesTab
      loadingFreelanceChats={loadingFreelanceChats}
      freelanceChats={freelanceChats}
    />
  );
}
