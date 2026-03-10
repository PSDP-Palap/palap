/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Truck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import {
  getOrderIdFromSystemMessage,
  isCompletedOrderStatus
} from "@/utils/helpers";
import supabase, { isUuidLike } from "@/utils/supabase";

const WAITING_STATUS_SET = new Set([
  "",
  "WAITING",
  "PENDING",
  "NEW",
  "OPEN",
  "REQUESTED",
  "LOOKING_FREELANCER"
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
  const userRole = useUserStore((s) => s.profile?.role || null);
  const isInitialized = useUserStore((s) => s.isInitialized);
  const isCustomer = String(userRole || "").toLowerCase() === "customer";

  const {
    activeOrderId,
    setActiveOrderId,
    activeOrderTracking: tracking,
    setActiveOrderTracking: setTracking
  } = useOrderStore();

  const [ongoingOrderIds, setOngoingOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const isFetchingOngoingRef = useRef(false);
  const isFetchingTrackingRef = useRef<string | null>(null);
  const lastOngoingFetchTimeRef = useRef(0);
  const lastLoadedOrderIdRef = useRef<string | null>(null);
  const suppressAutoPickRef = useRef(false);

  const isPaymentConfirmPage = pathname === "/payment";
  const isCheckoutFooterPage =
    pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");

  const openOrderPage = () => {
    const targetOrderId = tracking?.orderId || activeOrderId;
    if (!targetOrderId || !userId) return;
    setActiveOrderId(targetOrderId);
    router.navigate({
      to: "/order/$order_id" as any,
      params: { order_id: targetOrderId } as any
    });
  };

  const getOngoingOrderIds = useCallback(
    async (excludedOrderIds: string[] = [], force = false) => {
      if (isFetchingOngoingRef.current) return null;
      const now = Date.now();
      if (
        !force &&
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
          .select(
            "order_id, status, created_at, customer_id, freelance_id, payment_id"
          )
          .or(
            `customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (orderError) {
          return null;
        }

        const { data: doneRows } = await supabase
          .from("chat_messages")
          .select("order_id, content, message_type")
          .eq("message_type", "SYSTEM_DELIVERY_DONE")
          .order("created_at", { ascending: false })
          .limit(500);

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? [])
            .map((row: any) => {
              const directId = String(row?.order_id || "").trim();
              if (directId) return directId;
              return getOrderIdFromSystemMessage(String(row?.content || ""));
            })
            .filter(Boolean)
        );

        const excludedSet = new Set(
          excludedOrderIds.map((value) => String(value))
        );
        const ongoing = (orderRows as any[]).filter((row) => {
          const rowOrderId = String(row?.order_id || "");
          if (!rowOrderId) return false;
          if (excludedSet.has(rowOrderId)) return false;
          if (doneOrderSet.has(rowOrderId)) return false;

          const rawStatus = String(row?.status || "").toUpperCase();
          const isFinished = isCompletedOrderStatus(rawStatus, row?.payment_id);

          // Allow complete status if payment is still pending
          if (rawStatus === "COMPLETE" && !row?.payment_id) {
            return true;
          }

          if (isFinished) {
            return false;
          }
          return true;
        });

        const result = ongoing.map((row: any) => String(row.order_id));

        lastOngoingFetchTimeRef.current = Date.now();
        setOngoingOrderIds(result);
        return result;
      } catch {
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

        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select(
            "order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id, payment_id"
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

        const [
          { data: addressRows },
          { data: productRow },
          { data: serviceRow }
        ] = await Promise.all([
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
            : Promise.resolve({ data: null as any }),
          orderRow.service_id
            ? supabase
                .from("services")
                .select("service_id, name")
                .eq("service_id", String(orderRow.service_id))
                .maybeSingle()
            : Promise.resolve({ data: null as any })
        ]);

        const normalizedFreelanceId =
          (orderRow as any)?.freelance_id ??
          (orderRow as any)?.freelancer_id ??
          null;
        const freelanceId = normalizedFreelanceId
          ? String(normalizedFreelanceId)
          : null;

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
        const rawStatus = String(orderRow.status || "").toUpperCase();
        const nextStatus = isCompletedOrderStatus(
          rawStatus,
          orderRow.payment_id
        )
          ? "COMPLETE"
          : rawStatus || "WAITING";

        // Only clear and close if it's REALLY finished (paid or marked as done)
        if (
          isCompletedOrderStatus(nextStatus, orderRow.payment_id) &&
          orderRow.payment_id
        ) {
          suppressAutoPickRef.current = true;
          useOrderStore.getState().setActiveOrderId(null);
          setTracking(null);
          setOpen(false);
          return;
        }

        setTracking({
          orderId: String(orderRow.order_id),
          serviceId,
          customerId: orderRow.customer_id
            ? String(orderRow.customer_id)
            : null,
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
          productName: productRow?.name || serviceRow?.name || "Service",
          pickupAddress: pickupAddressId
            ? (addressMap.get(pickupAddressId) ?? null)
            : null,
          destinationAddress: destinationAddressId
            ? (addressMap.get(destinationAddressId) ?? null)
            : null,
          paymentId: orderRow.payment_id
        });
        lastLoadedOrderIdRef.current = orderId;
      } catch (err) {
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
    [setTracking]
  );
  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      await getOngoingOrderIds([], true);

      if (activeOrderId) {
        await loadTracking(activeOrderId);
      }
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPaymentConfirmPage) return;
    if (!isCustomer) return;
    if (!userId || !isInitialized) return;
    if (activeOrderId) return;
    if (suppressAutoPickRef.current) return;

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
    isPaymentConfirmPage,
    isCustomer,
    userId,
    isInitialized,
    activeOrderId,
    getOngoingOrderIds,
    setActiveOrderId,
    setTracking
  ]);

  useEffect(() => {
    if (isPaymentConfirmPage) return;
    if (!isCustomer) return;
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
  }, [
    isPaymentConfirmPage,
    isCustomer,
    activeOrderId,
    loadTracking,
    setTracking
  ]);

  const handleOpenChat = async () => {
    const targetOrderId = tracking?.orderId || activeOrderId;
    if (!targetOrderId || !userId) return;

    try {
      setLoading(true);
      let { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", targetOrderId)
        .or(`customer_id.eq.${userId},freelancer_id.eq.${userId}`)
        .maybeSingle();

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
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!tracking || !userId) return;
    const price = tracking.price || 0;
    const subtotal = price / 1.07;
    const tax = price - subtotal;

    router.navigate({
      to: "/payment",
      search: {
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(price.toFixed(2)),
        order_id: tracking.orderId
      }
    });
  };

  const handleTrackNextOngoingOrder = async () => {
    try {
      setLoading(true);
      suppressAutoPickRef.current = false;

      const nextOrderIds = await getOngoingOrderIds();
      const nextOrderId = nextOrderIds?.[0] || ongoingOrderIds[0] || null;

      if (!nextOrderId) {
        toast("No ongoing orders to track right now.");
        return;
      }

      setActiveOrderId(nextOrderId);
      setOpen(true);
      await loadTracking(nextOrderId);
    } finally {
      setLoading(false);
    }
  };

  if (
    !isInitialized ||
    !userId ||
    !isCustomer ||
    isActiveChatPage ||
    isPaymentConfirmPage
  ) {
    return null;
  }

  const statusDisplay =
    String(tracking?.status || "").replaceAll("_", " ") || "WAITING";
  const isActuallyWaiting = tracking
    ? !tracking.freelanceId ||
      WAITING_STATUS_SET.has(String(tracking.status || "").toUpperCase())
    : true;
  const isCompletedUnpaid = tracking?.status === "COMPLETE";

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
                {isActuallyWaiting ? "WAITING" : "ON_MY_WAY"}
              </span>
              <span className="text-white group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto text-left">
            {!tracking && loading ? (
              <div className="p-4 text-center">
                <Loading fullScreen={false} size={60} />
                <p className="text-sm font-bold text-orange-700 mt-2">
                  Loading tracking...
                </p>
              </div>
            ) : !tracking ? (
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-orange-700">
                  Waiting for order information...
                </p>
                <button
                  type="button"
                  onClick={handleTrackNextOngoingOrder}
                  disabled={loading || ongoingOrderIds.length === 0}
                  className="mt-3 px-3 py-2 rounded-lg bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
                >
                  {loading ? "Checking..." : "Track next ongoing order"}
                </button>
              </div>
            ) : (
              <>
                {isCompletedUnpaid && (
                  <div className="rounded-xl bg-orange-100 border border-orange-200 p-3 mb-1">
                    <p className="text-xs font-black text-orange-800 uppercase tracking-tight mb-1">
                      Action Required
                    </p>
                    <p className="text-[11px] text-orange-700 font-bold leading-tight">
                      Freelancer has marked the work as complete. Please release
                      the payment.
                    </p>
                    <button
                      onClick={handlePay}
                      disabled={loading}
                      className="w-full mt-2 py-2 rounded-lg bg-[#FF914D] text-white text-xs font-black shadow-md hover:bg-[#e67e3d] transition-all disabled:bg-gray-300"
                    >
                      {loading
                        ? "Processing..."
                        : "Pay Now ฿ " + tracking.price.toFixed(2)}
                    </button>
                  </div>
                )}
                <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-1">
                  <p>
                    <span className="text-gray-500">Service:</span>{" "}
                    <span className="font-bold">{tracking.productName}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Freelancer:</span>{" "}
                    <span className="font-bold">{tracking.freelanceName}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Status:</span>{" "}
                    <span className="font-bold text-orange-700 uppercase">
                      {statusDisplay}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Price:</span>{" "}
                    <span className="font-bold">
                      ฿ {tracking.price.toFixed(2)}
                    </span>
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
                  Ongoing Orders
                </p>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[10px] font-black text-[#A03F00]">
                  {ongoingOrderIds.length}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {ongoingOrderIds.length === 0 ? (
                  <p className="text-gray-500 italic">
                    No ongoing orders right now.
                  </p>
                ) : (
                  ongoingOrderIds.map((id) => (
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
                onClick={handleManualRefresh}
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
          className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-2xl flex items-center justify-center transition-transform active:scale-95"
        >
          {open ? (
            <X className="w-7 h-7 md:w-8 md:h-8" />
          ) : (
            <Truck className="w-7 h-7 md:w-8 md:h-8" />
          )}
        </button>
      </div>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;
