/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Inbox, MessageCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";
import { cleanPreviewMessage, withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

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
  const { pathname } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname })
  });
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

  const activeChatPrefix = useMemo(() => {
    if (pathname.startsWith("/freelance/chat/")) return "/freelance/chat/";
    if (pathname.startsWith("/chat/")) return "/chat/";
    return null;
  }, [pathname]);
  const isActiveChatPage = Boolean(activeChatPrefix);

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
          [normalizedRoomId]: seenAt
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
            select: "id, order_id, user_id, freelancer_id, last_message_at",
            filter: `user_id.eq.${userId},freelancer_id.eq.${userId}`
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
                    .select("order_id, customer_id, freelance_id")
                    .in("order_id", candidateOrderIds),
                  12000
                )
              : { data: [] as any[] };

            const candidateOrderMap = new Map(
              ((candidateOrderRows as any[]) ?? []).map((row: any) => [
                String(row.order_id || ""),
                row
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
                supabase
                  .from("profiles")
                  .select("*")
                  .in("id", candidatePartnerIds),
                12000
              );

              if (!profileResult.error) {
                candidateProfileRows = (
                  (profileResult.data as any[]) ?? []
                ).filter(Boolean);
              }
            }

            const score = candidateProfileRows.length;
            if (score > bestScore) {
              bestScore = score;
              rooms = candidateRooms;
              resolvedProfileRows = candidateProfileRows;
              roomError = null;
            }
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

        const roomRows = (rooms as any[]).filter(
          (r) => String(r.id || "").length > 0
        );
        const roomIds = roomRows.map((item) => String(item.id));
        const orderIds = Array.from(
          new Set(
            roomRows.map((row) => String(row?.order_id || "")).filter(Boolean)
          )
        );

        const { data: orderRows } = orderIds.length
          ? await withTimeout(
              supabase
                .from("orders")
                .select("order_id, customer_id, freelance_id")
                .in("order_id", orderIds),
              12000
            )
          : { data: [] as any[] };

        const orderMap = new Map(
          ((orderRows as any[]) ?? []).map((row: any) => [
            String(row.order_id || ""),
            row
          ])
        );

        const { data: messageRows } =
          roomIds.length > 0
            ? await withTimeout(
                supabase
                  .from("chat_messages")
                  .select(
                    "room_id, content, created_at, sender_id, message_type"
                  )
                  .in("room_id", roomIds)
                  .order("created_at", { ascending: false }),
                12000
              )
            : { data: [] as any[] };

        const latestMessageByRoom = new Map<
          string,
          { content: string; created_at: string; message_type: string }
        >();
        const latestNonSelfSenderByRoom = new Map<string, string>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          if (latestMessageByRoom.has(key)) return;
          const upperType = String(row.message_type || "").toUpperCase();

          latestMessageByRoom.set(key, {
            content: row.content ?? "",
            created_at: row.created_at,
            message_type: upperType
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

        const profileMap = new Map(
          (resolvedProfileRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "User",
              avatarUrl:
                item.avatar_url || item.image_url || item.photo_url || null
            }
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
          const latest = latestMessageByRoom.get(roomId);

          return {
            key: roomId,
            roomId,
            orderId,
            partnerId,
            partnerName:
              partner?.name ||
              (isCurrentUserCustomer ? "Freelancer" : "Customer"),
            partnerAvatarUrl: partner?.avatarUrl || null,
            customerName: customer?.name || "Customer",
            customerAvatarUrl: null,
            freelancerName: "Freelancer",
            freelancerAvatarUrl: null,
            lastMessage:
              latest?.message_type === "IMAGE"
                ? "📷 Sent an image"
                : cleanPreviewMessage(latest?.content, latest?.message_type),
            lastAt:
              latest?.created_at ||
              item.last_message_at ||
              new Date().toISOString(),
            serviceName: "Order Chat"
          };
        });

        const sorted = mapped.sort(
          (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
        );

        setConversations(sorted);
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
        lastLoadTimeRef.current = Date.now();
      } catch (err) {
        console.error("Error loading chat conversations:", err);
      } finally {
        if (fetchUnlockTimer) {
          window.clearTimeout(fetchUnlockTimer);
        }
        isFetchingRef.current = false;
        if (active) {
          setLoading(false);
        }
      }
    };

    const loadConversationsThrottled = (() => {
      let timer: number | null = null;
      return () => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          loadConversations();
          timer = null;
        }, 500);
      };
    })();

    loadConversations();

    const channel = supabase
      .channel(`floating-chat-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          loadConversationsThrottled();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          loadConversationsThrottled();
        }
      )
      .subscribe();

    const handleExternalChatUpdate = () => {
      loadConversationsThrottled();
    };
    window.addEventListener("service-chat-updated", handleExternalChatUpdate);

    return () => {
      active = false;
      isFetchingRef.current = false;
      window.removeEventListener(
        "service-chat-updated",
        handleExternalChatUpdate
      );
      supabase.removeChannel(channel);
    };
  }, [userId, isInitialized]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (item) =>
        item.partnerName.toLowerCase().includes(query) ||
        item.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, search]);

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

  const hasUnread = unreadCount > 0;

  if (!isInitialized || !userId || isActiveChatPage) return null;

  function formatTime(isoString: string) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div
      ref={rootRef}
      className={
        "fixed right-4 mb-2 md:right-6 z-60 transition-all duration-300 bottom-0"
      }
    >
      {open && (
        <div className="mb-4 w-85 md:w-100 rounded-[2rem] border border-orange-100 bg-white shadow-[0_20px_50px_rgba(160,63,0,0.15)] overflow-hidden flex flex-col max-h-125 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
          <div className="bg-linear-to-r from-[#FF914D] to-[#FF7F32] p-5 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight">Messages</h3>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  {unreadCount > 0
                    ? `${unreadCount} new messages`
                    : "Active Chats"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-orange-50 bg-[#FDFCFB]">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-orange-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#FDFCFB]">
            {loading && !hasLoadedOnce && conversations.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loading fullScreen={false} size={50} />
                <p className="text-xs font-black text-orange-800/40 uppercase tracking-widest">
                  Syncing Inbox...
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-orange-200">
                  <Inbox className="w-10 h-10 text-orange-200" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#4A2600]">
                    No messages found
                  </p>
                  <p className="text-xs text-gray-400 px-10">
                    Start a conversation with a freelancer to see it here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((item) => {
                  const lastTs = toTimestamp(item.lastAt);
                  const readTs = toTimestamp(readByRoom[item.roomId]);
                  const isUnread = !readByRoom[item.roomId] || lastTs > readTs;

                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        markRoomAsRead(item.roomId, item.lastAt);
                        setOpen(false);
                        router.navigate({
                          to: "/chat/$id",
                          params: { id: item.roomId }
                        });
                      }}
                      className={`w-full p-4 flex items-start gap-4 rounded-2xl transition-all text-left group relative
                        ${isUnread ? "bg-orange-50/50" : "hover:bg-orange-50/30"}`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`w-14 h-14 rounded-full border-2 transition-transform group-hover:scale-105 duration-300 overflow-hidden bg-white shadow-sm
                          ${isUnread ? "border-orange-400" : "border-white"}`}
                        >
                          {item.partnerAvatarUrl ? (
                            <img
                              src={item.partnerAvatarUrl}
                              alt={item.partnerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-orange-600 font-black text-xl bg-orange-50">
                              {item.partnerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {isUnread && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-orange-600 border-2 border-white rounded-full shadow-sm animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`font-black truncate transition-colors text-sm
                            ${isUnread ? "text-orange-900" : "text-[#4A2600] group-hover:text-orange-600"}`}
                          >
                            {item.partnerName}
                          </h4>
                          <span
                            className={`text-[10px] font-bold shrink-0
                            ${isUnread ? "text-orange-600" : "text-gray-400"}`}
                          >
                            {formatTime(item.lastAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-orange-600/70 font-black uppercase tracking-wider mb-1 truncate leading-none">
                          {item.serviceName}
                        </p>
                        <p
                          className={`text-xs line-clamp-1 leading-snug
                          ${isUnread ? "text-[#4A2600] font-bold" : "text-gray-500 font-medium"}`}
                        >
                          {item.lastMessage}
                        </p>
                      </div>

                      <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-orange-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group relative
            ${hasUnread ? "bg-[#A03F00] animate-bounce" : "bg-[#FF914D]"}`}
        >
          <div className="relative">
            <MessageCircle
              className={`w-7 h-7 md:w-8 md:h-8 fill-current transition-transform duration-500 group-hover:rotate-12
              ${hasUnread ? "text-orange-100" : "text-white"}`}
            />
            {hasUnread && (
              <span className="absolute -top-3 -right-3 min-w-5.5 h-5.5 px-1.5 bg-red-600 text-white rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center shadow-lg">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          {/* New message tooltip-like badge */}
          {hasUnread && (
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#4A2600] text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {unreadCount} New Chats
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default FloatingChatWidget;
