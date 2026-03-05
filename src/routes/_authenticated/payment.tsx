/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createFileRoute,
  useRouter,
  useRouterState
} from "@tanstack/react-router";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import toast from "react-hot-toast";
import { z } from "zod";

import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";
import { CardDetailsForm } from "@/components/payment/CardDetailsForm";
import { CashPaymentForm } from "@/components/payment/CashPaymentForm";
import { DeliveryTrackingView } from "@/components/payment/DeliveryTrackingView";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { QrPaymentForm } from "@/components/payment/QrPaymentForm";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import type { DeliveryTracking, PaymentMethod } from "@/types/payment";
import {
  getOrderIdFromSystemMessage,
  isCompletedOrderStatus,
  toNumber
} from "@/utils/helpers";
import supabase from "@/utils/supabase";

const paymentSearchSchema = z.object({
  subtotal: z.coerce.number().optional().default(0),
  tax: z.coerce.number().optional().default(0),
  total: z.coerce.number().optional().default(0)
});

export const Route = createFileRoute("/_authenticated/payment")({
  validateSearch: paymentSearchSchema,
  component: RouteComponent
});

const DEFAULT_MAP_CENTER = { lat: 13.7563, lng: 100.5018 };
const WAITING_STATUS_SET = new Set([
  "",
  "waiting",
  "pending",
  "new",
  "open",
  "requested",
  "looking_freelancer"
]);
const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";

type OrderHistoryItem = {
  orderId: string;
  productName: string;
  status: string;
  price: number;
  createdAt: string;
  isCompleted: boolean;
};

const getTrackingStorageKey = (userId: string) =>
  `active_tracking_order_id:${userId}`;

function RouteComponent() {
  const router = useRouter();
  const { hash } = useRouterState({
    select: (state) => ({
      hash: state.location.hash || ""
    })
  });
  const { subtotal, tax, total } = Route.useSearch();

  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const { setSelectedPaymentMethod, activeOrderId, setActiveOrderId } =
    useOrderStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(
    null
  );
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDeliveredNotice, setShowDeliveredNotice] = useState(false);
  const [isTrackingWidgetOpen, setIsTrackingWidgetOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [qrSlipName, setQrSlipName] = useState<string | null>(null);
  const [qrSlipPreview, setQrSlipPreview] = useState<string | null>(null);
  const [cashSubmitted, setCashSubmitted] = useState(false);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lastLoadedOrderIdRef = useRef<string | null>(null);
  const previousTrackingStatusRef = useRef<string | null>(null);
  const completedRedirectScheduledRef = useRef(false);
  const normalizedHash = String(hash || "")
    .replace(/^#/, "")
    .toLowerCase();
  const forceHistoryView = normalizedHash === "order-history";
  const isCartReady = hasHydrated || cartHydrationTimedOut;

  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => setCartHydrationTimedOut(true), 1500);
    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handleQrSlipUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setQrSlipName(file.name);
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setQrSlipPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const canProceedCard =
    /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardNumber) &&
    cardholderName.trim().length >= 2 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry) &&
    /^\d{3,4}$/.test(cardCvv);
  const canProceedQr = !!qrSlipName;
  const canProceedCash = cashSubmitted;
  const canProceedByMethod =
    paymentMethod === "card"
      ? canProceedCard
      : paymentMethod === "qr"
        ? canProceedQr
        : canProceedCash;

  const proceedDisabled = subtotal <= 0 || !canProceedByMethod;
  const hasCheckoutItems = useMemo(
    () =>
      Object.values(cartItems).some((quantity) => Number(quantity || 0) > 0),
    [cartItems]
  );

  const proceedToCheckout = () => {
    if (!canProceedByMethod) {
      setSubmitError("Please complete the payment information.");
      return;
    }
    setSelectedPaymentMethod(paymentMethod);
    router.navigate({ to: "/checkout" });
  };

  const loadOrderHistory = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (!currentUserId) {
        setOrderHistory([]);
        return;
      }

      try {
        if (!isBackground) {
          setHistoryLoading(true);
        }

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select("order_id, product_id, price, status, created_at")
          .eq("customer_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (orderError) throw orderError;

        const rows = (orderRows as any[]) ?? [];
        if (rows.length === 0) {
          setOrderHistory([]);
          return;
        }

        const orderIds = rows
          .map((row) => String(row?.order_id || ""))
          .filter(Boolean);
        const productIds = Array.from(
          new Set(
            rows.map((row) => String(row?.product_id || "")).filter(Boolean)
          )
        );

        const [{ data: productRows }, { data: doneRows }] = await Promise.all([
          productIds.length > 0
            ? supabase
                .from("products")
                .select("product_id, id, name")
                .in("product_id", productIds)
            : Promise.resolve({ data: [] as any[] }),
          orderIds.length > 0
            ? supabase
                .from("chat_messages")
                .select("order_id, message")
                .in("order_id", orderIds)
                .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
                .order("created_at", { ascending: false })
                .limit(500)
            : Promise.resolve({ data: [] as any[] })
        ]);

        const productMap = new Map(
          ((productRows as any[]) ?? []).map((row: any) => [
            String(row.product_id ?? row.id),
            String(row.name || "Product")
          ])
        );

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? [])
            .map((row: any) => {
              const directId = String(row?.order_id || "").trim();
              if (directId) return directId;
              return getOrderIdFromSystemMessage(String(row?.message || ""));
            })
            .filter(Boolean)
        );

        const mapped: OrderHistoryItem[] = rows.map((row: any) => {
          const rowOrderId = String(row?.order_id || "");
          const rawStatus = String(row?.status || "").toLowerCase();
          const completed =
            doneOrderSet.has(rowOrderId) || isCompletedOrderStatus(rawStatus);
          const normalizedStatus = completed
            ? "delivered"
            : rawStatus || "waiting";

          return {
            orderId: rowOrderId,
            productName:
              productMap.get(String(row?.product_id || "")) || "Product",
            status: normalizedStatus,
            price: Number(row?.price || 0),
            createdAt: String(row?.created_at || ""),
            isCompleted: completed
          };
        });

        setOrderHistory(mapped);
      } catch {
        if (!isBackground) {
          setOrderHistory([]);
        }
      } finally {
        if (!isBackground) {
          setHistoryLoading(false);
        }
      }
    },
    [currentUserId]
  );

  const findNextOngoingOrderId = useCallback(
    async (excludeOrderId?: string | null) => {
      if (!currentUserId) return null;

      try {
        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select("order_id, status, created_at")
          .eq("customer_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (orderError) return null;

        const rows = (orderRows as any[]) ?? [];
        const orderIds = rows
          .map((row) => String(row?.order_id || ""))
          .filter(Boolean);

        if (orderIds.length === 0) return null;

        const { data: doneRows } = await supabase
          .from("chat_messages")
          .select("order_id, message")
          .in("order_id", orderIds)
          .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
          .order("created_at", { ascending: false })
          .limit(500);

        const doneOrderSet = new Set(
          ((doneRows as any[]) ?? [])
            .map((row: any) => {
              const directId = String(row?.order_id || "").trim();
              if (directId) return directId;
              return getOrderIdFromSystemMessage(String(row?.message || ""));
            })
            .filter(Boolean)
        );

        const excluded = String(excludeOrderId || "");
        const next = rows.find((row: any) => {
          const rowOrderId = String(row?.order_id || "");
          if (!rowOrderId) return false;
          if (excluded && rowOrderId === excluded) return false;

          const rawStatus = String(row?.status || "").toLowerCase();
          const isDone =
            doneOrderSet.has(rowOrderId) || isCompletedOrderStatus(rawStatus);
          return !isDone;
        });

        return next?.order_id ? String(next.order_id) : null;
      } catch {
        return null;
      }
    },
    [currentUserId]
  );

  const loadTracking = useCallback(
    async (orderId: string, options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      if (
        !isBackground &&
        lastLoadedOrderIdRef.current === orderId &&
        trackingData
      )
        return;
      try {
        if (!isBackground) {
          setTrackingLoading(true);
          setTrackingError(null);
        }
        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select("*")
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
        const addressIds = [pickupAddressId, destinationAddressId].filter(
          Boolean
        ) as string[];
        const { data: addressRows } =
          addressIds.length > 0
            ? await supabase.from("addresses").select("*").in("id", addressIds)
            : { data: [] as any[] };
        const addressMap = new Map(
          (addressRows ?? []).map((item: any) => [String(item.id), item])
        );

        const { data: productRow } = orderRow.product_id
          ? await supabase
              .from("products")
              .select("*")
              .eq("product_id", orderRow.product_id)
              .maybeSingle()
          : { data: null as any };
        const freelanceId = orderRow.freelance_id
          ? String(orderRow.freelance_id)
          : null;
        const { data: freelanceProfile } = freelanceId
          ? await supabase
              .from("profiles")
              .select("*")
              .eq("id", freelanceId)
              .maybeSingle()
          : { data: null as any };

        const { data: chatRoomRow } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("order_id", orderId)
          .maybeSingle();
        const { data: doneMarkerRow } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("order_id", orderId)
          .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const rawStatus = String(orderRow.status || "").toLowerCase();
        const hasAssignedFreelancer = !!freelanceId;
        const normalizedStatus =
          isCompletedOrderStatus(rawStatus) || !!doneMarkerRow
            ? "delivered"
            : hasAssignedFreelancer && WAITING_STATUS_SET.has(rawStatus)
              ? "serving"
              : rawStatus || (hasAssignedFreelancer ? "serving" : "waiting");

        const tracking: DeliveryTracking = {
          orderId: String(orderRow.order_id),
          serviceId: orderRow.service_id,
          roomId: chatRoomRow?.id ? String(chatRoomRow.id) : null,
          status: normalizedStatus,
          createdAt: orderRow.created_at,
          updatedAt: orderRow.updated_at,
          price: Number(orderRow.price ?? 0),
          productName: productRow?.name || "Product",
          pickupAddress: pickupAddressId
            ? (addressMap.get(pickupAddressId) ?? null)
            : null,
          destinationAddress: destinationAddressId
            ? (addressMap.get(destinationAddressId) ?? null)
            : null,
          freelanceName:
            freelanceProfile?.full_name ||
            freelanceProfile?.email ||
            (freelanceId ? "Freelancer" : "Waiting..."),
          freelanceId,
          freelanceAvatarUrl: freelanceProfile?.avatar_url || null
        };
        setTrackingData(tracking);
        lastLoadedOrderIdRef.current = orderId;
      } catch (err: any) {
        if (!isBackground) setTrackingError(err.message);
      } finally {
        if (!isBackground) setTrackingLoading(false);
      }
    },
    [trackingData]
  );

  useEffect(() => {
    if (hasCheckoutItems) return;
    if (!activeOrderId) return;
    loadTracking(activeOrderId);
    const channel = supabase
      .channel(`tracking-${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${activeOrderId}`
        },
        () => loadTracking(activeOrderId, { background: true })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => loadTracking(activeOrderId, { background: true })
      )
      .subscribe();

    const pollingTimer = window.setInterval(() => {
      loadTracking(activeOrderId, { background: true });
      loadOrderHistory({ background: true });
    }, 8000);

    return () => {
      window.clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  }, [activeOrderId, loadTracking, hasCheckoutItems]);

  useEffect(() => {
    if (hasCheckoutItems) return;
    if (!currentUserId || activeOrderId) return;

    let cancelled = false;

    const bootstrapTrackingOrder = async () => {
      const nextOrderId = await findNextOngoingOrderId();
      if (cancelled || !nextOrderId) return;
      setActiveOrderId(nextOrderId);
    };

    bootstrapTrackingOrder();

    return () => {
      cancelled = true;
    };
  }, [
    currentUserId,
    activeOrderId,
    findNextOngoingOrderId,
    setActiveOrderId,
    hasCheckoutItems
  ]);

  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory]);

  useEffect(() => {
    if (!currentUserId) return;

    const timer = window.setInterval(() => {
      loadOrderHistory({ background: true });
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentUserId, loadOrderHistory]);

  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = getTrackingStorageKey(currentUserId);
    if (!activeOrderId) {
      if (typeof window !== "undefined")
        window.localStorage.removeItem(storageKey);
      return;
    }
    if (typeof window !== "undefined")
      window.localStorage.setItem(storageKey, activeOrderId);
  }, [currentUserId, activeOrderId]);

  useEffect(() => {
    previousTrackingStatusRef.current = null;
    setShowDeliveredNotice(false);
    completedRedirectScheduledRef.current = false;
  }, [activeOrderId]);

  useEffect(() => {
    if (!trackingData || !activeOrderId || !currentUserId) return;

    const status = String(trackingData.status || "").toLowerCase();
    const previousStatus = previousTrackingStatusRef.current;
    previousTrackingStatusRef.current = status;

    if (typeof window === "undefined") return;

    const servingNoticeKey = `delivery_notice_serving:${currentUserId}:${activeOrderId}`;
    const deliveredNoticeKey = `delivery_notice_delivered:${currentUserId}:${activeOrderId}`;

    if (
      status === "serving" &&
      previousStatus !== "serving" &&
      !window.sessionStorage.getItem(servingNoticeKey)
    ) {
      toast.success("Your order is now being delivered.");
      window.sessionStorage.setItem(servingNoticeKey, "1");
    }

    if (isCompletedOrderStatus(status)) {
      if (!window.sessionStorage.getItem(deliveredNoticeKey)) {
        setShowDeliveredNotice(true);
        toast.success("Your delivery is complete.");
        window.sessionStorage.setItem(deliveredNoticeKey, "1");
      }

      if (!completedRedirectScheduledRef.current) {
        completedRedirectScheduledRef.current = true;
        const moveToNextOrHome = async () => {
          const nextOrderId = await findNextOngoingOrderId(activeOrderId);

          if (nextOrderId) {
            setActiveOrderId(nextOrderId);
            setShowDeliveredNotice(false);
            completedRedirectScheduledRef.current = false;
            return;
          }

          window.setTimeout(() => {
            router.navigate({ to: "/" });
          }, 900);
        };

        moveToNextOrHome();
      }
    }
  }, [
    trackingData,
    activeOrderId,
    currentUserId,
    router,
    findNextOngoingOrderId,
    setActiveOrderId
  ]);

  if (!isCartReady) {
    return <Loading />;
  }

  if (forceHistoryView) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
        <main className="max-w-6xl mx-auto px-4">
          <div className="bg-linear-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
            <h1 className="text-4xl font-black">Order History</h1>
            <p className="text-sm font-medium mt-2 text-[#4A2600]/80">
              Review and track your previous delivery orders
            </p>
          </div>

          <section
            id="order-history"
            className="rounded-xl border border-orange-100 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-black text-[#4A2600]">
                Track Order History
              </h2>
              <div className="flex items-center gap-2">
                {activeOrderId && trackingData && (
                  <button
                    type="button"
                    onClick={() => {
                      router.navigate({ to: "/payment" });
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-black bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    Back to Live Tracking
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadOrderHistory()}
                  disabled={historyLoading}
                  className="px-3 py-1.5 rounded-md text-xs font-black bg-orange-100 text-[#A03F00] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {historyLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {historyLoading && orderHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Loading order history...</p>
            ) : orderHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No orders found yet.</p>
            ) : (
              <div className="space-y-2">
                {orderHistory.map((item) => (
                  <div
                    key={item.orderId}
                    className="rounded-lg border border-orange-100 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-[#4A2600] truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Order: {item.orderId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-[#5D2611]">
                        ฿ {item.price.toFixed(2)}
                      </p>
                      <p
                        className={`text-xs font-bold uppercase ${item.isCompleted ? "text-green-700" : "text-orange-700"}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.orderId) return;
                          router.navigate({
                            to: "/order-history/$orderId" as any,
                            params: { orderId: item.orderId } as any
                          });
                        }}
                        className="mt-1 px-3 py-1.5 rounded-md bg-[#A03F00] text-white text-xs font-black"
                      >
                        View Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  if (!hasCheckoutItems && activeOrderId && trackingData && !forceHistoryView) {
    const status = trackingData.status.toLowerCase();
    const isDelivered = isCompletedOrderStatus(status);
    const pickupLat = toNumber(trackingData.pickupAddress?.lat || "");
    const pickupLng = toNumber(trackingData.pickupAddress?.lng || "");
    const destinationLat = toNumber(trackingData.destinationAddress?.lat || "");
    const destinationLng = toNumber(trackingData.destinationAddress?.lng || "");
    const hasPickup = pickupLat != null && pickupLng != null;
    const hasDest = destinationLat != null && destinationLng != null;
    const markerLat = hasPickup
      ? pickupLat
      : hasDest
        ? destinationLat
        : DEFAULT_MAP_CENTER.lat;
    const markerLng = hasPickup
      ? pickupLng
      : hasDest
        ? destinationLng
        : DEFAULT_MAP_CENTER.lng;
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${markerLng! - 0.02}%2C${markerLat! - 0.02}%2C${markerLng! + 0.02}%2C${markerLat! + 0.02}&layer=mapnik&marker=${markerLat}%2C${markerLng}`;

    return (
      <DeliveryTrackingView
        activeOrderId={activeOrderId}
        status={status}
        accepted={!!trackingData.freelanceId}
        isDelivered={isDelivered}
        trackingData={trackingData}
        trackingLoading={trackingLoading}
        trackingError={trackingError}
        mapSrc={mapSrc}
        routeUrl={`https://www.google.com/maps/search/?api=1&query=${markerLat},${markerLng}`}
        pickupPoint={null}
        destinationPoint={null}
        currentPoint={null}
        hasPickupCoordinates={hasPickup}
        hasDestinationCoordinates={hasDest}
        hasCurrentProductCoordinates={false}
        currentProductLat={null}
        currentProductLng={null}
        isTrackingWidgetOpen={isTrackingWidgetOpen}
        setIsTrackingWidgetOpen={setIsTrackingWidgetOpen}
        showDeliveredNotice={showDeliveredNotice}
        acknowledgeDeliveredNotice={() => setShowDeliveredNotice(false)}
        loadTracking={loadTracking}
        router={router}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-linear-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">
            Choose your payment method
          </p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                setSubmitError={setSubmitError}
                cardIcon={cardIcon}
                qrIcon={qrIcon}
                cashIcon={cashIcon}
              />
              {paymentMethod === "card" && (
                <CardDetailsForm
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardholderName={cardholderName}
                  setCardholderName={setCardholderName}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv}
                  setCardCvv={setCardCvv}
                  formatCardNumber={formatCardNumber}
                  formatExpiry={formatExpiry}
                  canProceedCard={canProceedCard}
                />
              )}
              {paymentMethod === "qr" && (
                <QrPaymentForm
                  qrIcon={qrIcon}
                  total={total}
                  qrSlipName={qrSlipName}
                  qrSlipPreview={qrSlipPreview}
                  handleQrSlipUpload={handleQrSlipUpload}
                />
              )}
              {paymentMethod === "cash" && (
                <CashPaymentForm
                  setCashSubmitted={setCashSubmitted}
                  setSubmitError={setSubmitError}
                />
              )}
            </div>
            <PaymentSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              isSubmitting={false}
              proceedDisabled={proceedDisabled}
              completePayment={proceedToCheckout}
              onBack={() => router.navigate({ to: "/order-summary" })}
              submitError={submitError}
              buttonText="Review Order"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
