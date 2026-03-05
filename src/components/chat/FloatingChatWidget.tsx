/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import { cleanPreviewMessage, isSystemMessage } from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

interface ConversationItem {
  key: string;
  roomId: string;
  orderId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  customerName: string;
  customerAvatarUrl: string | null;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  serviceName: string;
}

const FloatingChatWidget = () => {
  const router = useRouter();
  const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) });
  const { profile, session, isInitialized } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const isFetchingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const isPaymentConfirmPage = pathname === "/payment";
  const isCheckoutFooterPage = pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");

  useEffect(() => {
    if (!userId || !isInitialized) return;

    let active = true;

    const loadConversations = async () => {
      if (isFetchingRef.current) return;
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 1000) return;

      try {
        isFetchingRef.current = true;
        setLoading(true);

        const { data: rooms, error: roomError } = await supabase
          .from("chat_rooms")
          .select("id, order_id, customer_id, freelancer_id, last_message_at")
          .or(`customer_id.eq.${userId},freelancer_id.eq.${userId}`)
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (!active || roomError || !rooms) {
          if (active) setConversations([]);
          return;
        }

        const roomRows = (rooms as any[]).filter((r) => isUuidLike(r.id));
        const roomIds = roomRows.map((item) => String(item.id));
        const partnerIds = Array.from(
          new Set(
            roomRows.flatMap((item) => [String(item.customer_id), String(item.freelancer_id)])
          )
        ).filter(isUuidLike);

        const { data: messageRows } = roomIds.length > 0
          ? await supabase
              .from("chat_messages")
              .select("room_id, message, created_at")
              .in("room_id", roomIds)
              .order("created_at", { ascending: false })
          : { data: [] as any[] };

        const latestMessageByRoom = new Map<string, { message: string; created_at: string }>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          if (latestMessageByRoom.has(key)) return;
          if (isSystemMessage(row.message)) return;

          latestMessageByRoom.set(key, {
            message: row.message ?? "",
            created_at: row.created_at,
          });
        });

        const { data: profileRows } = partnerIds.length > 0
          ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", partnerIds)
          : { data: [] as any[] };

        if (!active) return;

        const profileMap = new Map(
          (profileRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "User",
              avatarUrl: item.avatar_url || null,
            },
          ])
        );

        const mapped: ConversationItem[] = roomRows.map((item: any) => {
          const roomId = String(item.id);
          const orderId = String(item.order_id);
          const partnerId = String(item.customer_id) === String(userId)
            ? String(item.freelancer_id)
            : String(item.customer_id);
          const partner = profileMap.get(partnerId);
          const customer = profileMap.get(String(item.customer_id));
          const freelancer = profileMap.get(String(item.freelancer_id));
          const latest = latestMessageByRoom.get(roomId);

          return {
            key: roomId,
            roomId,
            orderId,
            partnerId,
            partnerName: partner?.name || "User",
            partnerAvatarUrl: partner?.avatarUrl || null,
            customerName: customer?.name || "Customer",
            customerAvatarUrl: customer?.avatarUrl || null,
            freelancerName: freelancer?.name || "Freelancer",
            freelancerAvatarUrl: freelancer?.avatarUrl || null,
            lastMessage: cleanPreviewMessage(latest?.message),
            lastAt: latest?.created_at || item.last_message_at || new Date().toISOString(),
            serviceName: "Order Chat",
          };
        });

        const mergedMap = new Map<string, ConversationItem>();
        mapped
          .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
          .forEach((item) => {
            if (!mergedMap.has(item.roomId)) {
              mergedMap.set(item.roomId, item);
            }
          });

        setConversations(Array.from(mergedMap.values()));
        lastLoadTimeRef.current = Date.now();
      } catch (err) {
        console.error("Error loading chat conversations:", err);
        if (active) setConversations([]);
      } finally {
        if (active) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    };

    loadConversations();

    const pollingTimer = window.setInterval(() => {
      loadConversations();
    }, 4000);

    const channel = supabase
      .channel(`floating-chat-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const handleExternalChatUpdate = () => {
      loadConversations();
    };
    window.addEventListener("service-chat-updated", handleExternalChatUpdate);

    return () => {
      active = false;
      window.clearInterval(pollingTimer);
      window.removeEventListener("service-chat-updated", handleExternalChatUpdate);
      supabase.removeChannel(channel);
    };
  }, [userId, isInitialized]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      item.customerName.toLowerCase().includes(query) ||
      item.freelancerName.toLowerCase().includes(query) ||
      item.partnerName.toLowerCase().includes(query) ||
      item.serviceName.toLowerCase().includes(query) ||
      item.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, search]);

  if (!isInitialized || !userId) return null;
  if (isActiveChatPage) return null;

  function formatTime(isoString: string) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  return (
    <div
      ref={rootRef}
      className={`fixed right-4 md:right-6 z-[60] transition-all duration-300 ${
        isCheckoutFooterPage ? "bottom-[164px] md:bottom-[88px]" : "bottom-20"
      }`}
    >
      {open && (
        <div className="mb-4 w-80 md:w-96 rounded-2xl border border-orange-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
          <div className="bg-[#FF914D] p-4 flex items-center justify-between text-white">
            <h3 className="font-black text-lg">Messages</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 border-b border-orange-50 bg-orange-50/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-500 font-medium">Loading messages...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredConversations.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setOpen(false);
                      router.navigate({
                        to: "/chat/$id",
                        params: { id: item.roomId },
                      });
                    }}
                    className="w-full p-4 flex items-start gap-3 hover:bg-orange-50/50 transition-colors text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                      {item.partnerAvatarUrl ? (
                        <img
                          src={item.partnerAvatarUrl}
                          alt={item.partnerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-orange-600 font-black text-lg">
                          {item.partnerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-[#4A2600] truncate group-hover:text-orange-600 transition-colors">
                          {item.partnerName}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatTime(item.lastAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-orange-600/70 font-bold uppercase tracking-wider mb-1 truncate">
                        {item.serviceName}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1 leading-snug">
                        {item.lastMessage}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          open ? "bg-white text-orange-500 rotate-90" : "bg-[#FF914D] text-white"
        }`}
      >
        {open ? (
          <X className="w-7 h-7 md:w-8 md:h-8" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-7 h-7 md:w-8 md:h-8 fill-current" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#FF914D]"></span>
          </div>
        )}
      </button>
    </div>
  );
};

export default FloatingChatWidget;
