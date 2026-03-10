/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState, Link } from "@tanstack/react-router";
import { 
  Truck, 
  X, 
  History, 
  MapPin, 
  Package, 
  MessageCircle, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle2,
  Building,
  CreditCard
} from "lucide-react";
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
  { key: "WAITING", label: "Placed", icon: Package },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
  { key: "PICKING_UP", label: "Picking", icon: Building },
  { key: "DELIVERING", label: "On Way", icon: Truck },
  { key: "COMPLETE", label: "Delivered", icon: CheckCircle2 }
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
  const suppressAutoPickRef = useRef(false);

  const isPaymentConfirmPage = pathname === "/payment";
  const isCheckoutFooterPage = pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");
  const isOrderTrackingPage = pathname.startsWith("/order/");

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
      if (!force && excludedOrderIds.length === 0 && now - lastOngoingFetchTimeRef.current < 3000) {
        return null;
      }

      const currentUserId = useUserStore.getState().profile?.id || useUserStore.getState().session?.user?.id || null;
      if (!currentUserId) return null;

      try {
        isFetchingOngoingRef.current = true;

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select("order_id, status, product_id, service_id, payment_id")
          .eq("customer_id", currentUserId)
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

      const currentUserId = useUserStore.getState().profile?.id || useUserStore.getState().session?.user?.id || null;
      if (!currentUserId) return;

      try {
        if (!isBackground) {
          isFetchingTrackingRef.current = orderId;
          setLoading(true);
        }

        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderRow) throw new Error("Order not found");

        const pickupAddressId = orderRow.pickup_address_id ? String(orderRow.pickup_address_id) : null;
        const destinationAddressId = orderRow.destination_address_id ? String(orderRow.destination_address_id) : null;

        const [
          { data: addressRows },
          { data: productRow },
          { data: serviceRow }
        ] = await Promise.all([
          [pickupAddressId, destinationAddressId].filter(Boolean).length > 0
            ? supabase.from("addresses").select("id, name, address_detail").in("id", [pickupAddressId, destinationAddressId].filter(Boolean) as string[])
            : Promise.resolve({ data: [] as any[] }),
          orderRow.product_id
            ? supabase.from("products").select("product_id, name").eq("product_id", String(orderRow.product_id)).maybeSingle()
            : Promise.resolve({ data: null as any }),
          orderRow.service_id
            ? supabase.from("services").select("service_id, name").eq("service_id", String(orderRow.service_id)).maybeSingle()
            : Promise.resolve({ data: null as any })
        ]);

        const freelanceId = orderRow.freelance_id ? String(orderRow.freelance_id) : null;
        const { data: freelanceProfile } = freelanceId && isUuidLike(freelanceId)
            ? await supabase.from("profiles").select("*").eq("id", freelanceId).maybeSingle()
            : { data: null as any };

        const { data: roomRow } = orderId && currentUserId
            ? await supabase.from("chat_rooms").select("id").eq("order_id", orderId).maybeSingle()
            : { data: null as any };

        const addressMap = new Map((addressRows ?? []).map((row: any) => [String(row.id), row]));
        const rawStatus = String(orderRow.status || "").toUpperCase();
        const nextStatus = isCompletedOrderStatus(rawStatus, orderRow.payment_id) ? "COMPLETE" : rawStatus || "WAITING";

        if (isCompletedOrderStatus(nextStatus, orderRow.payment_id) && orderRow.payment_id) {
          suppressAutoPickRef.current = true;
          useOrderStore.getState().setActiveOrderId(null);
          setTracking(null);
          setOpen(false);
          return;
        }

        setTracking({
          orderId: String(orderRow.order_id),
          serviceId: orderRow.service_id,
          customerId: orderRow.customer_id ? String(orderRow.customer_id) : null,
          roomId: roomRow?.id ? String(roomRow.id) : null,
          status: nextStatus,
          createdAt: orderRow.created_at,
          updatedAt: String(orderRow.updated_at || orderRow.created_at || new Date().toISOString()),
          price: Number(orderRow.price ?? 0),
          freelanceName: freelanceProfile?.full_name || freelanceProfile?.email || (freelanceId ? "Freelancer" : "Waiting..."),
          freelanceId,
          freelanceAvatarUrl: freelanceProfile?.avatar_url || null,
          productName: productRow?.name || serviceRow?.name || "Order",
          pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
          destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
          paymentId: orderRow.payment_id
        });
      } catch (err) {
        console.error(err);
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
      if (activeOrderId) await loadTracking(activeOrderId);
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId || !isCustomer || !isInitialized) return;
    const channel = supabase.channel('ongoing-orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, () => {
          getOngoingOrdersData([], true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isCustomer, isInitialized, getOngoingOrdersData]);

  useEffect(() => {
    if (isPaymentConfirmPage || !isCustomer || !userId || !isInitialized || activeOrderId || suppressAutoPickRef.current) return;
    const boot = async () => {
      const orders = await getOngoingOrdersData();
      const orderId = orders?.[0]?.id || null;
      if (orderId) {
        setActiveOrderId(orderId);
        setOpen(true);
      }
    };
    boot();
  }, [isPaymentConfirmPage, isCustomer, userId, isInitialized, activeOrderId, getOngoingOrdersData, setActiveOrderId]);

  useEffect(() => {
    if (isPaymentConfirmPage || !isCustomer || !activeOrderId) {
      if (!activeOrderId) setTracking(null);
      return;
    }
    loadTracking(activeOrderId);
    const channel = supabase.channel(`global-tracking-${activeOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `order_id=eq.${activeOrderId}` }, () => {
          loadTracking(activeOrderId, { background: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isPaymentConfirmPage, isCustomer, activeOrderId, loadTracking]);

  const handlePay = async () => {
    if (!tracking || !userId) return;
    const price = tracking.price || 0;
    const subtotal = price / 1.0815;
    const deliveryFee = subtotal * 0.20; // Matches our 20% logic
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

  if (!isInitialized || !userId || !isCustomer || isActiveChatPage || isPaymentConfirmPage || isOrderTrackingPage) return null;

  const currentStatusKey = String(tracking?.status || "").toUpperCase();
  const getStepIndex = (status: string) => {
    if (status === "COMPLETE") return 4;
    if (status === "DELIVERING") return 3;
    if (status === "PICKING_UP") return 2;
    if (status === "ACCEPTED") return 1;
    return 0;
  };
  const activeStep = getStepIndex(currentStatusKey);
  const isCompletedUnpaid = tracking?.status === "COMPLETE" && !tracking.paymentId;

  return (
    <aside className={`fixed right-4 md:right-6 z-70 flex flex-col items-end pointer-events-none transition-all duration-300 ${isCheckoutFooterPage ? "bottom-25 md:bottom-6" : "bottom-4"}`}>
      {open && (
        <div className="mb-3 w-80 rounded-3xl border border-orange-100 bg-white/95 backdrop-blur-md text-[#4A2600] shadow-2xl overflow-hidden pointer-events-auto flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-5 py-4 bg-[#4A2600] flex items-center justify-between text-white">
            <div className="min-w-0 flex-1 cursor-pointer group" onClick={openOrderPage}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-200/60">Live Tracking</p>
              <p className="text-sm font-black truncate">{viewMode === "list" ? `${ongoingOrders.length} active jobs` : (tracking?.productName || "Order Detail")}</p>
            </div>
            <div className="flex items-center gap-2">
              {ongoingOrders.length > 1 && (
                <button onClick={() => setViewMode(viewMode === "detail" ? "list" : "detail")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  {viewMode === "detail" ? <History className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {viewMode === "list" ? (
              <div className="space-y-2">
                {ongoingOrders.map((o) => (
                  <button key={o.id} onClick={() => { setActiveOrderId(o.id); setViewMode("detail"); }} className={`w-full text-left p-3 rounded-2xl border transition-all ${o.id === activeOrderId ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                    <p className="text-[10px] font-black text-[#4A2600]">{o.name}</p>
                    <p className="text-[8px] font-bold text-orange-600 uppercase mt-0.5">{o.status.replace(/_/g, ' ')}</p>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {loading && !tracking ? <div className="py-10 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-orange-500" /></div> : (
                  <>
                    <div className="relative pt-2 pb-4">
                      <div className="flex justify-between relative z-10 px-1">
                        {STATUS_STEPS.map((step, idx) => {
                          const isActive = idx <= activeStep;
                          return (
                            <div key={step.key} className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? "bg-[#A03F00] border-[#A03F00] text-white" : "bg-white border-orange-50 text-gray-200"}`}>
                              <step.icon className="w-3.5 h-3.5" />
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute top-5.5 left-4 right-4 h-0.5 bg-orange-50 -z-0">
                        <div className="h-full bg-[#A03F00] transition-all duration-700" style={{ width: `${(activeStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
                      </div>
                    </div>

                    {isCompletedUnpaid && (
                      <button onClick={handlePay} className="w-full py-3 rounded-2xl bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg animate-pulse flex items-center justify-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" /> Release Payment
                      </button>
                    )}

                    <div className="space-y-3 bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                          <p className="text-[11px] font-black text-[#4A2600] truncate">{tracking?.destinationAddress?.address_detail || "My Home"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-black text-[#A03F00]">฿{tracking?.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/chat/${tracking?.roomId}` as any} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 text-[#A03F00] border border-orange-100 font-black text-[9px] uppercase tracking-widest hover:bg-orange-100 transition-all">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                      <button onClick={openOrderPage} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#A03F00] text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-orange-800 transition-all">
                        Track Map <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} className={`pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${open ? "bg-white text-[#4A2600] border-2 border-orange-100" : "bg-[#A03F00] text-white"}`}>
        {open ? <X className="w-6 h-6" /> : <Truck className="w-7 h-7" />}
        {!open && ongoingOrders.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">{ongoingOrders.length}</span>
        )}
      </button>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;
