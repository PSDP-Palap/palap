/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import type { DeliveryTracking } from "@/types/payment";
import { isCompletedOrderStatus } from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

const WAITING_STATUS_SET = new Set([
  "",
  "waiting",
  "pending",
  "new",
  "open",
  "requested",
  "looking_freelancer"
]);

function GlobalOrderTrackingWidget() {
  const router = useRouter();
  const { pathname } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      hash: state.location.hash || ""
    })
  });

  const userId = useUserStore(
    (s) => s.profile?.id || s.session?.user?.id || null
  );
  const isInitialized = useUserStore((s) => s.isInitialized);

  const { activeOrderId, setActiveOrderId } = useOrderStore();

  const [ongoingOrderIds, setOngoingOrderIds] = useState<string[]>([]);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");

  const isFetchingOngoingRef = useRef(false);
  const isFetchingTrackingRef = useRef<string | null>(null);
  const lastOngoingFetchTimeRef = useRef(0);
  const lastLoadedOrderIdRef = useRef<string | null>(null);

  const isPaymentConfirmPage = pathname === "/payment";
  const isCheckoutFooterPage =
    pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");

  const openOrderPage = () => {
    const targetOrderId = tracking?.orderId || activeOrderId;
    if (!targetOrderId || !userId) return;
    setActiveOrderId(targetOrderId);
    router.navigate({ to: "/payment" });
  };

  const getOngoingOrderIds = useCallback(
    async (excludedOrderIds: string[] = []) => {
      if (isFetchingOngoingRef.current) return null;
      const now = Date.now();
      if (
        excludedOrderIds.length === 0 &&
        now - lastOngoingFetchTimeRef.current < 3000
      ) {
        return null;
      }

      const currentUserId =
        useUserStore.getState().profile?.id ||
        useUserStore.getState().session?.user?.id ||
        null;
      if (!currentUserId) return null;

      try {
        isFetchingOngoingRef.current = true;

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select("order_id, status, created_at, customer_id, freelance_id")
          .or(
            `customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (orderError) {
          return null;
        }

        const excludedSet = new Set(
          excludedOrderIds.map((value) => String(value))
        );
        const ongoing = (orderRows as any[]).filter((row) => {
          const rowOrderId = String(row?.order_id || "");
          if (!rowOrderId) return false;
          if (excludedSet.has(rowOrderId)) return false;

          const isFinished = isCompletedOrderStatus(String(row?.status || ""));
          if (isFinished) {
            return false;
          }
          return true;
        });

        const result = ongoing.map((row: any) => String(row.order_id));

        lastOngoingFetchTimeRef.current = Date.now();
        setOngoingOrderIds(result);
        return result;
      } catch (err) {
        return null;
      } finally {
        isFetchingOngoingRef.current = false;
      }
    },
    []
  );

  const loadTracking = useCallback(
    async (orderId: string, options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (!isBackground && isFetchingTrackingRef.current === orderId) return;

      const currentUserId =
        useUserStore.getState().profile?.id ||
        useUserStore.getState().session?.user?.id ||
        null;
      if (!currentUserId) return;

      try {
        if (!isBackground) {
          isFetchingTrackingRef.current = orderId;
          setLoading(true);
        }

        // FIXED: Query by order_id only. Do NOT query 'id' column as it doesn't exist in orders table.
        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select(
            "order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id"
          )
          .eq("order_id", orderId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderRow) throw new Error("Order not found");

        const pickupAddressId = orderRow.pickup_address_id
          ? String(orderRow.pickup_address_id)
          : null;
        const destinationAddressId = orderRow.destination_address_id
          ? String(orderRow.destination_address_id)
          : null;
        const serviceId = orderRow.service_id
          ? String(orderRow.service_id)
          : null;

        const [{ data: addressRows }, { data: productRow }] = await Promise.all(
          [
            [pickupAddressId, destinationAddressId].filter(Boolean).length > 0
              ? supabase
                  .from("addresses")
                  .select("id, name, address_detail")
                  .in(
                    "id",
                    [pickupAddressId, destinationAddressId].filter(
                      Boolean
                    ) as string[]
                  )
              : Promise.resolve({ data: [] as any[] }),
            orderRow.product_id
              ? supabase
                  .from("products")
                  .select("product_id, name")
                  .eq("product_id", String(orderRow.product_id))
                  .maybeSingle()
              : Promise.resolve({ data: null as any })
          ]
        );

        const normalizedFreelanceId =
          (orderRow as any)?.freelance_id ??
          (orderRow as any)?.freelancer_id ??
          null;
        const freelanceId = normalizedFreelanceId
          ? String(normalizedFreelanceId)
          : null;

        // Use select("*") to avoid 400 errors from missing columns like avatar_url
        const { data: freelanceProfile } =
          freelanceId && isUuidLike(freelanceId)
            ? await supabase
                .from("profiles")
                .select("*")
                .eq("id", freelanceId)
                .maybeSingle()
            : { data: null as any };

        const freelanceName =
          freelanceProfile?.full_name ||
          freelanceProfile?.email ||
          (freelanceId
            ? `Freelancer (${freelanceId.slice(0, 8)})`
            : "Waiting for freelance");

        const { data: roomRow } =
          orderId && currentUserId
            ? await supabase
                .from("chat_rooms")
                .select("id")
                .eq("order_id", orderId)
                .or(
                  `customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`
                )
                .order("last_message_at", { ascending: false })
                .limit(1)
                .maybeSingle()
            : { data: null as any };

        const addressMap = new Map(
          (addressRows ?? []).map((row: any) => [String(row.id), row])
        );
        const rawStatus = String(orderRow.status || "").toLowerCase();
        const isAssigned = !!freelanceId;

        // Use ONLY database status to determine if the order is completed
        const nextStatus =
          isAssigned && WAITING_STATUS_SET.has(rawStatus)
            ? "serving"
            : rawStatus || (isAssigned ? "serving" : "waiting");

        if (isCompletedOrderStatus(nextStatus)) {
          const nextOngoingList = await getOngoingOrderIds([orderId]);
          if (nextOngoingList && nextOngoingList.length > 0) {
            useOrderStore.getState().setActiveOrderId(nextOngoingList[0]);
          } else {
            useOrderStore.getState().setActiveOrderId(null);
            setTracking(null);
            setOpen(false);
          }
          return;
        }

        setTracking({
          orderId: String(orderRow.order_id),
          serviceId,
          roomId: roomRow?.id ? String(roomRow.id) : null,
          status: nextStatus,
          createdAt: orderRow.created_at,
          updatedAt: String(
            orderRow.updated_at ||
              orderRow.created_at ||
              new Date().toISOString()
          ),
          price: Number(orderRow.price ?? 0),
          freelanceName,
          freelanceId,
          freelanceAvatarUrl:
            freelanceProfile?.avatar_url ||
            freelanceProfile?.image_url ||
            freelanceProfile?.photo_url ||
            null,
          productName: productRow?.name || "Product",
          pickupAddress: pickupAddressId
            ? (addressMap.get(pickupAddressId) ?? null)
            : null,
          destinationAddress: destinationAddressId
            ? (addressMap.get(destinationAddressId) ?? null)
            : null
        });
        lastLoadedOrderIdRef.current = orderId;
      } catch (err) {
        // Only clear if it's a "Not found" error and NOT a background refresh
        if (String(err).includes("Order not found")) {
          if (!isBackground) {
            setTracking(null);
            useOrderStore.getState().setActiveOrderId(null);
            setOpen(false);
          }
        }
      } finally {
        if (!isBackground) {
          setLoading(false);
          isFetchingTrackingRef.current = null;
        }
      }
    },
    [getOngoingOrderIds]
  );

  useEffect(() => {
    if (!userId || !isInitialized) return;
    if (activeOrderId) return;

    let active = true;
    const boot = async () => {
      const orderIds = await getOngoingOrderIds();
      if (!active) return;
      const orderId = orderIds?.[0] || null;
      if (orderId) {
        setActiveOrderId(orderId);
        setOpen(true);
      }
    };
    boot();
    return () => {
      active = false;
    };
  }, [
    userId,
    isInitialized,
    activeOrderId,
    getOngoingOrderIds,
    setActiveOrderId
  ]);

  useEffect(() => {
    if (!activeOrderId) {
      setTracking(null);
      lastLoadedOrderIdRef.current = null;
      return;
    }

    loadTracking(activeOrderId);

    const channel = supabase
      .channel(`global-order-tracking-${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${activeOrderId}`
        },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId, loadTracking]);

  const handleOpenChat = async () => {
    const targetOrderId = tracking?.orderId || activeOrderId;
    if (!targetOrderId || !userId) return;

    try {
      setLoading(true);
      // 1. Try to find existing room first
      let { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", targetOrderId)
        .or(`customer_id.eq.${userId},freelancer_id.eq.${userId}`)
        .maybeSingle();

      // 2. If no room, we need order info to create one
      if (!room) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("customer_id, freelance_id")
          .eq("order_id", targetOrderId)
          .maybeSingle();

        if (orderRow && orderRow.customer_id && orderRow.freelance_id) {
          const { data: newRoom, error: createError } = await supabase
            .from("chat_rooms")
            .insert({
              order_id: targetOrderId,
              customer_id: orderRow.customer_id,
              freelancer_id: orderRow.freelance_id,
              created_by: userId
            })
            .select("id")
            .single();

          if (createError) throw createError;
          room = newRoom;
        }
      }
      if (room?.id) {
        router.navigate({
          to: "/chat/$id",
          params: { id: room.id }
        });
      } else {
        toast.error(
          "Could not start chat. Freelancer might not be assigned yet."
        );
      }
    } catch (err: any) {
      toast.error("Failed to open chat");
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized || !userId || isActiveChatPage || isPaymentConfirmPage) {
    return null;
  }

  const statusDisplay =
    String(tracking?.status || "").replaceAll("_", " ") || "waiting";
  const isActuallyWaiting = tracking
    ? !tracking.freelanceId ||
      WAITING_STATUS_SET.has(String(tracking.status || "").toLowerCase())
    : true;
  const filteredOrderIds = ongoingOrderIds.filter((id) =>
    id.toLowerCase().includes(searchOrderId.trim().toLowerCase())
  );

  return (
    <aside
      data-floating-widget
      data-floating-corner="bottom-right"
      className={`fixed right-4 md:right-6 z-70 flex flex-col items-end pointer-events-none transition-all duration-300 ${
        isCheckoutFooterPage ? "bottom-25 md:bottom-6" : "bottom-4"
      }`}
    >
      {open && (
        <div className="mb-3 w-90 max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-2xl border border-orange-200 bg-[#F9E6D8] text-[#4A2600] shadow-2xl overflow-hidden pointer-events-auto flex flex-col">
          <div
            onClick={openOrderPage}
            className="px-4 py-3 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between gap-2 cursor-pointer hover:bg-[#ff8533] transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/85">
                Track Order
              </p>
              <p className="text-sm font-black text-white truncate">
                {activeOrderId || "..."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase ${isActuallyWaiting ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}
              >
                {isActuallyWaiting ? "Waiting" : "Serving"}
              </span>
              <span className="text-white group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto text-left">
            {!tracking && loading ? (
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-orange-700 animate-pulse">
                  Loading tracking...
                </p>
              </div>
            ) : !tracking ? (
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-orange-700">
                  Waiting for order information...
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-1">
                  <p>
                    <span className="text-gray-500">Product:</span>{" "}
                    <span className="font-bold">{tracking.productName}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Freelancer:</span>{" "}
                    <span className="font-bold">{tracking.freelanceName}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Status:</span>{" "}
                    <span className="font-bold">{statusDisplay}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Updated:</span>{" "}
                    {new Date(tracking.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
                      Pickup
                    </p>
                    <p className="font-semibold text-[#4A2600]">
                      {tracking.pickupAddress?.name || "Pickup point"}
                    </p>
                    <p className="text-[#4A2600]/75 line-clamp-1">
                      {tracking.pickupAddress?.address_detail ||
                        "No pickup address"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
                      Destination
                    </p>
                    <p className="font-semibold text-[#4A2600]">
                      {tracking.destinationAddress?.name || "Destination"}
                    </p>
                    <p className="text-[#4A2600]/75 line-clamp-1">
                      {tracking.destinationAddress?.address_detail ||
                        "No destination address"}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
                Ongoing Orders
              </p>
              <input
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Search order id"
                className="w-full border border-orange-200 rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-orange-300"
              />
              <div className="max-h-28 overflow-y-auto space-y-1">
                {filteredOrderIds.length === 0 ? (
                  <p className="text-gray-500 italic">
                    No matching ongoing order.
                  </p>
                ) : (
                  filteredOrderIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveOrderId(id);
                        loadTracking(id);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${id === activeOrderId ? "bg-orange-100 border-orange-300 text-[#4A2600]" : "bg-white border-orange-100 text-gray-700 hover:bg-orange-50"}`}
                    >
                      {id}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (activeOrderId) loadTracking(activeOrderId);
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300 hover:bg-[#8a3600] transition-colors"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={handleOpenChat}
                disabled={loading || !activeOrderId}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-black disabled:bg-gray-100 disabled:text-gray-400 hover:bg-blue-200 transition-colors"
              >
                {loading ? "Opening..." : "Open Chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end w-full pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 font-black text-lg flex items-center justify-center transition-transform active:scale-95"
        >
          {open ? "×" : "🚚"}
        </button>
      </div>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;
