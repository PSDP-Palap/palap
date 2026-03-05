/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import { cleanPreviewMessage, isSystemMessage, withTimeout } from "@/utils/helpers";
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

const resolveCustomerId = (room: any) =>
  String(room?.customer_id ?? room?.user_id ?? "");

const resolveFreelancerId = (room: any) =>
  String(room?.freelancer_id ?? room?.freelance_id ?? "");

const resolveOrderCustomerId = (order: any) =>
  String(order?.customer_id ?? order?.user_id ?? "");

const resolveOrderFreelancerId = (order: any) =>
  String(order?.freelancer_id ?? order?.freelance_id ?? "");

const FloatingChatWidget = () => {
  const router = useRouter();
  const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) });
  const { profile, session, isInitialized } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [readByRoom, setReadByRoom] = useState<Record<string, string>>({});

  const isFetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const isCheckoutFooterPage = pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");
  const activeChatRoomId = useMemo(() => {
    if (!isActiveChatPage) return null;
    const raw = pathname.split("/chat/")[1] || "";
    const roomId = decodeURIComponent(raw.split("/")[0] || "").trim();
    return roomId || null;
  }, [pathname, isActiveChatPage]);

  const readStorageKey = useMemo(
    () => `floating_chat_read_at:${String(userId || "")}`,
    [userId]
  );

  const toTimestamp = (value: string | null | undefined) => {
    const ts = Date.parse(String(value || ""));
    return Number.isFinite(ts) ? ts : 0;
  };

  const persistReadMap = useCallback(
    (nextMap: Record<string, string>) => {
      if (typeof window === "undefined" || !userId) return;
      try {
        window.localStorage.setItem(readStorageKey, JSON.stringify(nextMap));
      } catch {
        // Ignore storage write failures.
      }
    },
    [readStorageKey, userId]
  );

  const markRoomAsRead = useCallback(
    (roomId: string, lastSeenAt?: string | null) => {
      const normalizedRoomId = String(roomId || "").trim();
      if (!normalizedRoomId) return;

      const seenAt = String(lastSeenAt || new Date().toISOString());
      setReadByRoom((prev) => {
        const prevTs = toTimestamp(prev[normalizedRoomId]);
        const seenTs = toTimestamp(seenAt);
        if (prevTs >= seenTs) {
          return prev;
        }

        const next = {
          ...prev,
          [normalizedRoomId]: seenAt,
        };
        persistReadMap(next);
        return next;
      });
    },
    [persistReadMap]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      setReadByRoom({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(readStorageKey);
      if (!raw) {
        setReadByRoom({});
        return;
      }
      const parsed = JSON.parse(raw);
      setReadByRoom(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setReadByRoom({});
    }
  }, [readStorageKey, userId]);

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

  useEffect(() => {
    if (!userId || !isInitialized) return;

    let active = true;
    let fetchUnlockTimer: number | null = null;

    const loadConversations = async () => {
      if (isFetchingRef.current) return;
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 1000) return;

      try {
        isFetchingRef.current = true;
        if (fetchUnlockTimer) {
          window.clearTimeout(fetchUnlockTimer);
        }
        // Safety unlock: if any async branch hangs, allow next poll to recover.
        fetchUnlockTimer = window.setTimeout(() => {
          isFetchingRef.current = false;
        }, 15000);

        if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }

        let rooms: any[] | null = null;
        let roomError: any = null;
        let resolvedProfileRows: any[] = [];

        const roomQueryVariants = [
          {
            select: "id, order_id, customer_id, freelancer_id, last_message_at",
            filter: `customer_id.eq.${userId},freelancer_id.eq.${userId}`
          },
          {
            select: "id, order_id, customer_id, freelance_id, last_message_at",
            filter: `customer_id.eq.${userId},freelance_id.eq.${userId}`
          },
          {
            select: "id, order_id, user_id, freelancer_id, last_message_at",
            filter: `user_id.eq.${userId},freelancer_id.eq.${userId}`
          },
          {
            select: "id, order_id, user_id, freelance_id, last_message_at",
            filter: `user_id.eq.${userId},freelance_id.eq.${userId}`
          }
        ];

        let bestScore = -1;

        for (const variant of roomQueryVariants) {
          const result = await withTimeout(
            supabase
              .from("chat_rooms")
              .select(variant.select)
              .or(variant.filter)
              .order("last_message_at", { ascending: false })
              .limit(100),
            12000
          );

          if (!result.error) {
            const candidateRooms = (result.data as any[]) ?? [];

            if (candidateRooms.length === 0) {
              if (bestScore < 0) {
                rooms = [];
                roomError = null;
                bestScore = 0;
              }
              continue;
            }

            const hasUsableParticipants = candidateRooms.some((room) => {
              const customerId = resolveCustomerId(room);
              const freelancerId = resolveFreelancerId(room);
              if (!customerId || !freelancerId) return false;
              return (
                String(customerId) === String(userId) ||
                String(freelancerId) === String(userId)
              );
            });

            if (!hasUsableParticipants) {
              continue;
            }

            const candidateOrderIds = Array.from(
              new Set(
                candidateRooms
                  .map((room) => String(room?.order_id || ""))
                  .filter(Boolean)
              )
            );

            const { data: candidateOrderRows } = candidateOrderIds.length
              ? await withTimeout(
                  supabase
                    .from("orders")
                    .select("order_id, customer_id, freelancer_id, freelance_id")
                    .in("order_id", candidateOrderIds),
                  12000
                )
              : { data: [] as any[] };

            const candidateOrderMap = new Map(
              ((candidateOrderRows as any[]) ?? []).map((row: any) => [
                String(row.order_id || ""),
                row,
              ])
            );

            const candidatePartnerIds = candidateRooms
              .map((room) => {
                const orderRow = candidateOrderMap.get(
                  String(room?.order_id || "")
                );
                const customerId =
                  resolveCustomerId(room) || resolveOrderCustomerId(orderRow);
                const freelancerId =
                  resolveFreelancerId(room) ||
                  resolveOrderFreelancerId(orderRow);
                return String(customerId) === String(userId)
                  ? freelancerId
                  : customerId;
              })
              .filter(Boolean);

            let candidateProfileRows: any[] = [];
            if (candidatePartnerIds.length > 0) {
              const profileResult = await withTimeout(
                supabase.from("profiles").select("*").in("id", candidatePartnerIds),
                12000
              );

              if (profileResult.error) {
                const fallbackPartnerIds = candidatePartnerIds.filter((id) =>
                  isUuidLike(String(id || ""))
                );

                if (fallbackPartnerIds.length > 0) {
                  const fallbackProfileResult = await withTimeout(
                    supabase
                      .from("profiles")
                      .select("*")
                      .in("id", fallbackPartnerIds),
                    12000
                  );

                  candidateProfileRows =
                    ((fallbackProfileResult.data as any[]) ?? []).filter(Boolean);
                }
              } else {
                candidateProfileRows =
                  ((profileResult.data as any[]) ?? []).filter(Boolean);
              }
            }

            const score = candidateProfileRows.length;
            if (score > bestScore) {
              bestScore = score;
              rooms = candidateRooms;
              resolvedProfileRows = candidateProfileRows;
              roomError = null;
            }

            const targetScore = new Set(
              candidatePartnerIds.map((id) => String(id))
            ).size;
            if (targetScore > 0 && score >= targetScore) {
              break;
            }

            continue;
          }

          roomError = result.error;
          if (!isColumnMissingError(result.error)) {
            break;
          }
        }

        if (!active || roomError || !rooms) {
          if (active) {
            setConversations([]);
            hasLoadedOnceRef.current = true;
            setHasLoadedOnce(true);
          }
          return;
        }

        // Keep rows even if room ids are non-UUID in some environments.
        const roomRows = (rooms as any[]).filter((r) => String(r.id || "").length > 0);
        const roomIds = roomRows.map((item) => String(item.id));
        const orderIds = Array.from(
          new Set(
            roomRows
              .map((row) => String(row?.order_id || ""))
              .filter(Boolean)
          )
        );

        const { data: orderRows } = orderIds.length
          ? await withTimeout(
              supabase
                .from("orders")
                .select("order_id, customer_id, freelancer_id, freelance_id")
                .in("order_id", orderIds),
              12000
            )
          : { data: [] as any[] };

        const orderMap = new Map(
          ((orderRows as any[]) ?? []).map((row: any) => [
            String(row.order_id || ""),
            row,
          ])
        );

        const { data: messageRows } = roomIds.length > 0
          ? await withTimeout(
              supabase
                .from("chat_messages")
                .select("room_id, message, created_at, sender_id")
                .in("room_id", roomIds)
                .order("created_at", { ascending: false }),
              12000
            )
          : { data: [] as any[] };

        const latestMessageByRoom = new Map<string, { message: string; created_at: string }>();
        const latestNonSelfSenderByRoom = new Map<string, string>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          if (latestMessageByRoom.has(key)) return;
          if (isSystemMessage(row.message)) return;

          latestMessageByRoom.set(key, {
            message: row.message ?? "",
            created_at: row.created_at,
          });

          const senderId = String(row.sender_id || "");
          if (
            senderId &&
            senderId !== String(userId) &&
            !latestNonSelfSenderByRoom.has(key)
          ) {
            latestNonSelfSenderByRoom.set(key, senderId);
          }
        });

        const profileRows = resolvedProfileRows;

        if (!active) return;

        const profileMap = new Map(
          (profileRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "User",
              avatarUrl: item.avatar_url || item.image_url || item.photo_url || null,
            },
          ])
        );

        const mapped: ConversationItem[] = roomRows.map((item: any) => {
          const roomId = String(item.id);
          const orderId = String(item.order_id);
          const orderRow = orderMap.get(orderId);
          const customerId =
            resolveCustomerId(item) || resolveOrderCustomerId(orderRow);
          const freelancerId =
            resolveFreelancerId(item) || resolveOrderFreelancerId(orderRow);
          const isCurrentUserCustomer = String(customerId) === String(userId);
          let partnerId = isCurrentUserCustomer ? freelancerId : customerId;
          if (!partnerId || String(partnerId) === String(userId)) {
            partnerId = latestNonSelfSenderByRoom.get(roomId) || partnerId;
          }
          const partner = profileMap.get(partnerId);
          const customer = profileMap.get(customerId);
          const freelancer = profileMap.get(freelancerId);
          const latest = latestMessageByRoom.get(roomId);

          return {
            key: roomId,
            roomId,
            orderId,
            partnerId,
            partnerName:
              partner?.name ||
              (isCurrentUserCustomer
                ? "Freelancer"
                : "Customer"),
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
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
        lastLoadTimeRef.current = Date.now();
      } catch (err) {
        console.error("Error loading chat conversations:", err);
        if (active) {
          setConversations([]);
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
        }
      } finally {
        if (fetchUnlockTimer) {
          window.clearTimeout(fetchUnlockTimer);
          fetchUnlockTimer = null;
        }
        isFetchingRef.current = false;
        if (active) {
          setLoading(false);
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
      isFetchingRef.current = false;
      if (fetchUnlockTimer) {
        window.clearTimeout(fetchUnlockTimer);
      }
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

  useEffect(() => {
    if (!activeChatRoomId) return;
    const currentConversation = conversations.find(
      (item) => String(item.roomId) === String(activeChatRoomId)
    );
    markRoomAsRead(activeChatRoomId, currentConversation?.lastAt || null);
  }, [activeChatRoomId, conversations, markRoomAsRead]);

  const hasUnreadConversations = useMemo(() => {
    return conversations.some((item) => {
      const lastTs = toTimestamp(item.lastAt);
      const readTs = toTimestamp(readByRoom[item.roomId]);
      if (!readByRoom[item.roomId]) return true;
      return lastTs > readTs;
    });
  }, [conversations, readByRoom]);

  const unreadCount = useMemo(() => {
    return conversations.reduce((count, item) => {
      const lastTs = toTimestamp(item.lastAt);
      const readTs = toTimestamp(readByRoom[item.roomId]);
      if (!readByRoom[item.roomId] || lastTs > readTs) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [conversations, readByRoom]);

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
            {loading && !hasLoadedOnce && conversations.length === 0 ? (
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
                      markRoomAsRead(item.roomId, item.lastAt);
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
            {hasUnreadConversations && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full border-2 border-[#FF914D] text-[10px] font-black leading-none flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default FloatingChatWidget;
