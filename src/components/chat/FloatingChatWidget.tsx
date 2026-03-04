import { useRouter, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

type ConversationItem = {
  key: string;
  roomId: string;
  serviceId: string;
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
};

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

const formatTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isSystemMessage = (message: string | null | undefined) => {
  if (!message) return false;
  return message.startsWith("[SYSTEM_HIRE_REQUEST]") || message.startsWith("[SYSTEM_HIRE_ACCEPTED]");
};

const cleanPreviewMessage = (message: string | null | undefined) => {
  if (!message) return "No message yet";
  return message
    .replace("[SYSTEM_HIRE_REQUEST]", "")
    .replace("[SYSTEM_HIRE_ACCEPTED]", "")
    .trim() || "No message yet";
};

function FloatingChatWidget() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { profile, session, isInitialized } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;
  const isCheckoutFooterPage = pathname === "/product";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !isInitialized) return;

    let active = true;

    const loadConversations = async () => {
      try {
        setLoading(true);

        const { data: rooms, error: roomError } = await supabase
          .from("service_chat_rooms")
          .select("id, service_id, customer_id, freelancer_id, last_message_at")
          .or(`customer_id.eq.${userId},freelancer_id.eq.${userId}`)
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (!active || roomError || !rooms) {
          if (active) setConversations([]);
          return;
        }

        const roomRows = rooms as any[];
        const roomIds = roomRows.map((item) => String(item.id));
        const partnerIds = Array.from(
          new Set(
            roomRows.flatMap((item) => [String(item.customer_id), String(item.freelancer_id)])
          )
        );
        const serviceIds = Array.from(new Set(roomRows.map((item) => String(item.service_id))));

        const { data: messageRows } = roomIds.length > 0
          ? await supabase
              .from("service_messages")
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

        const [{ data: profileRows }, { data: serviceRows }] = await Promise.all([
          partnerIds.length > 0
            ? supabase.from("profiles").select("id, full_name, email, avatar_url, image_url, photo_url").in("id", partnerIds)
            : Promise.resolve({ data: [] as any[] }),
          serviceIds.length > 0
            ? supabase.from("services").select("service_id, id, name").in("service_id", serviceIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        if (!active) return;

        const profileMap = new Map(
          (profileRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "Freelance user",
              avatarUrl: item.avatar_url || item.image_url || item.photo_url || null,
            },
          ])
        );

        const serviceMap = new Map(
          (serviceRows ?? []).map((item: any) => [String(item.service_id ?? item.id), item.name || "Service"])
        );

        const mapped: ConversationItem[] = roomRows.map((item: any) => {
          const roomId = String(item.id);
          const serviceId = String(item.service_id);
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
            serviceId,
            partnerId,
            partnerName: partner?.name || "Freelance user",
            partnerAvatarUrl: partner?.avatarUrl || null,
            customerName: customer?.name || "Customer",
            customerAvatarUrl: customer?.avatarUrl || null,
            freelancerName: freelancer?.name || "Freelance",
            freelancerAvatarUrl: freelancer?.avatarUrl || null,
            lastMessage: cleanPreviewMessage(latest?.message),
            lastAt: latest?.created_at || item.last_message_at || new Date().toISOString(),
            serviceName: serviceMap.get(serviceId) || "Service",
          };
        });

        let mockConversations: ConversationItem[] = [];
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem("mock_service_chat_rooms");
            const parsed = raw ? JSON.parse(raw) : [];
            const rows: StoredMockRoom[] = Array.isArray(parsed) ? parsed : [];

            mockConversations = rows
              .filter((item) =>
                String(item.customerId) === String(userId) ||
                String(item.freelancerId) === String(userId)
              )
              .map((item) => {
                const partnerId = String(item.customerId) === String(userId)
                  ? String(item.freelancerId)
                  : String(item.customerId);
                const isUserCustomer = String(item.customerId) === String(userId);

                return {
                  key: String(item.roomId),
                  roomId: String(item.roomId),
                  serviceId: String(item.serviceId),
                  partnerId,
                  partnerName: isUserCustomer ? item.freelancerName : item.customerName,
                  partnerAvatarUrl: isUserCustomer ? item.freelancerAvatarUrl : item.customerAvatarUrl,
                  customerName: item.customerName,
                  customerAvatarUrl: item.customerAvatarUrl,
                  freelancerName: item.freelancerName,
                  freelancerAvatarUrl: item.freelancerAvatarUrl,
                  lastMessage: cleanPreviewMessage(item.lastMessage),
                  lastAt: item.lastAt || new Date().toISOString(),
                  serviceName: item.serviceName || "Service",
                };
              });
          } catch {
            mockConversations = [];
          }
        }

        const mergedMap = new Map<string, ConversationItem>();
        [...mapped, ...mockConversations]
          .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
          .forEach((item) => {
            if (!mergedMap.has(item.roomId)) {
              mergedMap.set(item.roomId, item);
            }
          });

        setConversations(Array.from(mergedMap.values()));
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadConversations();

    const channel = supabase
      .channel(`floating-chat-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_chat_rooms" },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_messages" },
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

  if (!userId || !isInitialized) return null;

  return (
    <div className={isCheckoutFooterPage
      ? "fixed bottom-[112px] right-6 md:right-8 z-[80]"
      : "fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[80]"}>
      {open && (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-[#F9E6D8] text-[#4A2600] rounded-2xl border border-orange-200 shadow-2xl mb-3 overflow-hidden">
          <div className="px-4 py-4 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">Chats</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-orange-200">
            <div className="rounded-full bg-white border border-orange-200 px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-700/70" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Messenger"
                className="w-full bg-transparent outline-none text-sm text-[#4A2600] placeholder:text-[#4A2600]/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[52vh]">
            {!loading && filteredConversations.length === 0 && (
              <p className="px-4 py-5 text-sm text-[#4A2600]/70">No chat found.</p>
            )}

            {filteredConversations.map((chat) => (
              <button
                key={chat.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.navigate({
                    to: "/service/$id",
                    params: { id: chat.serviceId },
                    hash: "chat",
                  });
                }}
                className="w-full text-left px-4 py-3 hover:bg-orange-100/60 transition-colors flex items-center gap-3 border-b border-orange-100"
              >
                <div className="relative w-14 h-12 shrink-0">
                  <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                    {chat.customerAvatarUrl ? (
                      <img src={chat.customerAvatarUrl} alt={chat.customerName} className="w-full h-full object-cover" />
                    ) : (
                      chat.customerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute right-0 top-1 w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                    {chat.freelancerAvatarUrl ? (
                      <img src={chat.freelancerAvatarUrl} alt={chat.freelancerName} className="w-full h-full object-cover" />
                    ) : (
                      chat.freelancerName.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold truncate">{chat.partnerName}</p>
                    <p className="text-xs text-[#4A2600]/60 shrink-0">{formatTime(chat.lastAt)}</p>
                  </div>
                  <p className="text-xs text-orange-700 truncate">{chat.serviceName}</p>
                  <p className="text-sm text-[#4A2600]/75 truncate">{chat.lastMessage || "No message"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative ml-auto w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {conversations.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-[10px] font-black text-white flex items-center justify-center border border-white/40">
            {conversations.length > 9 ? "9+" : conversations.length}
          </span>
        )}
      </button>
    </div>
  );
}

export default FloatingChatWidget;
