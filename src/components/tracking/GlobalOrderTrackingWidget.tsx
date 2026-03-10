/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState, Link } from "@tanstack/react-router";
import { Truck, X, History, MapPin, Package, MessageCircle, RefreshCw, ChevronRight, CheckCircle2 } from "lucide-react";
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

const STATUS_STEPS = [
  { key: "WAITING", label: "Waiting", icon: Package },
  { key: "ON_MY_WAY", label: "On Way", icon: Truck },
  { key: "IN_SERVICE", label: "Serving", icon: Package },
  { key: "COMPLETE", label: "Complete", icon: CheckCircle2 }
];

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

  const [ongoingOrders, setOngoingOrders] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "list">("detail");

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

  const getOngoingOrdersData = useCallback(
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
            "order_id, status, product_id, service_id, payment_id"
          )
          .or(
            `customer_id.eq.${currentUserId},freelance_id.eq.${currentUserId}`
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (orderError) return null;

        const { data: doneRows } = await supabase
          .from("chat_messages")
          .select("order_id")
          .eq("message_type", "SYSTEM_DELIVERY_DONE")
          .order("created_at", { ascending: false });

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? []).map((row: any) => String(row?.order_id || "").trim()).filter(Boolean)
        );

        const excludedSet = new Set(excludedOrderIds.map(String));
        const ongoingRows = (orderRows as any[]).filter((row) => {
          const rowOrderId = String(row?.order_id || "");
          if (!rowOrderId || excludedSet.has(rowOrderId) || doneOrderSet.has(rowOrderId)) return false;
          const rawStatus = String(row?.status || "").toUpperCase();
          if (isCompletedOrderStatus(rawStatus, row?.payment_id) && row?.payment_id) return false;
          return true;
        });

        // Fetch names for these orders
        const productIds = Array.from(new Set(ongoingRows.map(r => r.product_id).filter(Boolean)));
        const serviceIds = Array.from(new Set(ongoingRows.map(r => r.service_id).filter(Boolean)));

        const [productsRes, servicesRes] = await Promise.all([
          productIds.length > 0 ? supabase.from("products").select("product_id, name").in("product_id", productIds) : { data: [] },
          serviceIds.length > 0 ? supabase.from("services").select("service_id, name").in("service_id", serviceIds) : { data: [] }
        ]);

        const nameMap = new Map();
        (productsRes.data || []).forEach((p: any) => nameMap.set(String(p.product_id), p.name));
        (servicesRes.data || []).forEach((s: any) => nameMap.set(String(s.service_id), s.name));

        const result = ongoingRows.map((row: any) => ({
          id: String(row.order_id),
          name: nameMap.get(String(row.product_id || row.service_id)) || "Order " + String(row.order_id).slice(0, 4),
          status: String(row.status || "WAITING").toUpperCase()
        }));

        lastOngoingFetchTimeRef.current = Date.now();
        setOngoingOrders(result);
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
      await getOngoingOrdersData([], true);

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
      const orders = await getOngoingOrdersData();
      if (!active) return;
      const orderId = orders?.[0]?.id || null;
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
    getOngoingOrdersData,
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
    
    // Reverse calculation matching our 5% delivery fee + 3% tax logic:
    const subtotal = price / 1.0815;
    const deliveryFee = subtotal * 0.05;
    const tax = (subtotal + deliveryFee) * 0.03;

    router.navigate({
      to: "/payment",
      search: {
        subtotal: Number(subtotal.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
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

      const nextOrders = await getOngoingOrdersData();
      const nextOrderId = nextOrders?.[0]?.id || ongoingOrders[0]?.id || null;

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

  // Stepper logic
  const currentStatusKey = String(tracking?.status || "").toUpperCase();
  const getStepIndex = (status: string) => {
    if (WAITING_STATUS_SET.has(status) || !status) return 0;
    if (status === "ON_MY_WAY") return 1;
    if (status === "IN_SERVICE") return 2;
    if (status === "COMPLETE" || status === "DONE" || status === "DELIVERED") return 3;
    return 0;
  };
  const activeStep = getStepIndex(currentStatusKey);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (WAITING_STATUS_SET.has(s)) return "text-orange-500 bg-orange-50";
    if (s === "ON_MY_WAY") return "text-blue-500 bg-blue-50";
    if (s === "IN_SERVICE") return "text-purple-500 bg-purple-50";
    if (s === "COMPLETE" || s === "DONE" || s === "DELIVERED") return "text-green-500 bg-green-50";
    return "text-gray-500 bg-gray-50";
  };

  const isCompletedUnpaid = tracking?.status === "COMPLETE" && !tracking.paymentId;

  return (
    <aside
      data-floating-widget
      data-floating-corner="bottom-right"
      className={`fixed right-4 md:right-6 z-70 flex flex-col items-end pointer-events-none transition-all duration-300 ${
        isCheckoutFooterPage ? "bottom-25 md:bottom-6" : "bottom-4"
      }`}
    >
      {open && (
        <div className="mb-3 w-90 max-w-[calc(100vw-2rem)] max-h-[80vh] rounded-3xl border border-orange-200 bg-white text-[#4A2600] shadow-2xl overflow-hidden pointer-events-auto flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-5 py-4 bg-linear-to-r from-[#FF914D] to-[#FF7F32] flex items-center justify-between text-white shadow-md">
            <div className="min-w-0 flex-1 cursor-pointer group" onClick={openOrderPage}>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  {viewMode === "list" ? "All Ongoing Jobs" : "Tracking Job"}
                </p>
                {viewMode === "detail" && <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
              </div>
              <p className="text-sm font-black truncate drop-shadow-sm">
                {viewMode === "list" ? `${ongoingOrders.length} orders active` : (activeOrderId ? `#${activeOrderId.slice(0, 8)}...` : "Selecting...")}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {ongoingOrders.length > 1 && (
                <button
                  onClick={() => setViewMode(viewMode === "detail" ? "list" : "detail")}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors bg-white/10"
                >
                  {viewMode === "detail" ? <Package className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                </button>
              )}
              <button 
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FFF9F5]">
            {viewMode === "list" ? (
              <div className="space-y-3">
                {ongoingOrders.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 italic text-sm">No ongoing orders</div>
                ) : (
                  ongoingOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setActiveOrderId(order.id);
                        loadTracking(order.id);
                        setViewMode("detail");
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                        order.id === activeOrderId 
                          ? "bg-orange-50 border-orange-200 shadow-sm" 
                          : "bg-white border-orange-100 hover:border-orange-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm font-black text-[#4A2600] truncate">{order.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${getStatusColor(order.status)}`}>
                            {order.status.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-orange-300 group-hover:translate-x-1 transition-transform ${order.id === activeOrderId ? "text-orange-500" : ""}`} />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                {!tracking && loading ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <Loading fullScreen={false} size={50} />
                    <p className="text-sm font-bold text-orange-700 mt-4 animate-pulse">Fetching details...</p>
                  </div>
                ) : !tracking ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8 text-orange-400" />
                    </div>
                    <p className="text-sm font-bold text-[#4A2600]">No active order selected</p>
                    <button
                      type="button"
                      onClick={handleTrackNextOngoingOrder}
                      className="px-4 py-2 rounded-xl bg-[#A03F00] text-white text-xs font-black"
                    >
                      Auto-Track Ongoing
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative pt-2 pb-1">
                      <div className="flex justify-between relative z-10">
                        {STATUS_STEPS.map((step, idx) => {
                          const Icon = step.icon;
                          const isActive = idx <= activeStep;
                          const isCurrent = idx === activeStep;
                          return (
                            <div key={step.key} className="flex flex-col items-center gap-1.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                isActive 
                                  ? "bg-[#A03F00] border-[#A03F00] text-white scale-110 shadow-md" 
                                  : "bg-white border-orange-100 text-orange-200"
                              } ${isCurrent ? "ring-4 ring-orange-100" : ""}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <p className={`text-[9px] font-black uppercase tracking-tight ${isActive ? "text-[#A03F00]" : "text-gray-400"}`}>
                                {step.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-orange-50 -z-0">
                        <div 
                          className="h-full bg-[#A03F00] transition-all duration-700 ease-out shadow-sm"
                          style={{ width: `${(activeStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {isCompletedUnpaid && (
                      <div className="rounded-2xl bg-[#FFE2CF] border border-orange-200 p-4 shadow-sm animate-in zoom-in-95 duration-300">
                        <p className="text-[11px] font-black text-orange-900 uppercase tracking-tight">Payment Released Needed</p>
                        <p className="text-[10px] text-orange-800 font-bold mt-0.5">Freelancer finished the job. Please pay to finalize.</p>
                        <button
                          onClick={handlePay}
                          className="w-full mt-3 py-2.5 rounded-xl bg-[#A03F00] text-white text-xs font-black flex items-center justify-center gap-2"
                        >
                          Pay Now ฿ {tracking.price.toFixed(2)}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Service</p>
                          <p className="text-xs font-black text-[#4A2600] truncate">{tracking.productName}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Freelancer</p>
                          <p className="text-xs font-black text-[#4A2600] truncate">{tracking.freelanceName}</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-orange-50">
                        <div className="flex gap-3">
                          <div className="mt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="w-0.5 h-6 bg-orange-50 mx-auto my-1" />
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black text-orange-700/60 uppercase">Pickup</p>
                              <p className="text-[11px] font-bold text-[#4A2600] truncate">{tracking.pickupAddress?.name || "Market/Shop"}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black text-orange-700/60 uppercase">Delivery</p>
                              <p className="text-[11px] font-bold text-[#4A2600] truncate">{tracking.destinationAddress?.name || "My Location"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-orange-100 hover:bg-orange-50 transition-colors group"
              >
                <RefreshCw className={`w-5 h-5 text-orange-600 ${loading ? 'animate-spin' : 'group-hover:rotate-45'} transition-all`} />
                <span className="text-[9px] font-black text-[#4A2600] uppercase">Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleOpenChat}
                disabled={loading || !activeOrderId}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-orange-100 hover:bg-orange-50 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black text-[#4A2600] uppercase">Chat</span>
              </button>
              <Link
                to="/order-history"
                className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-orange-100 hover:bg-orange-50 transition-colors group"
              >
                <History className="w-5 h-5 text-[#A03F00] group-hover:-rotate-12 transition-transform" />
                <span className="text-[9px] font-black text-[#4A2600] uppercase">History</span>
              </Link>
            </div>

            {/* Bottom mini-selector footer (only in detail view) */}
            {viewMode === "detail" && ongoingOrders.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-orange-50/50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Other ongoing jobs ({ongoingOrders.length - 1})</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {ongoingOrders.filter(o => o.id !== activeOrderId).map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setActiveOrderId(order.id);
                        loadTracking(order.id);
                      }}
                      className="shrink-0 px-4 py-2.5 rounded-xl border border-orange-100 bg-white text-[10px] font-black text-[#4A2600] hover:border-orange-200 transition-all max-w-[140px] truncate"
                    >
                      {order.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div className="flex justify-end w-full pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${
            open ? "bg-white text-orange-600 border-2 border-orange-200" : "bg-[#D35400] text-white hover:bg-[#b34700]"
          }`}
        >
          {open ? <X className="w-7 h-7" /> : <Truck className="w-8 h-8" />}
          {!open && ongoingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
              {ongoingOrders.length}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;
