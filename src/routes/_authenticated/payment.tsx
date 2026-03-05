/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef, type ChangeEvent } from "react";

import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import { useOrderStore } from "@/stores/useOrderStore";
import supabase from "@/utils/supabase";
import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";

import type { PaymentMethod, DeliveryTracking } from "@/types/payment";
import type { Product } from "@/types/product";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { CardDetailsForm } from "@/components/payment/CardDetailsForm";
import { QrPaymentForm } from "@/components/payment/QrPaymentForm";
import { CashPaymentForm } from "@/components/payment/CashPaymentForm";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { DeliveryTrackingView } from "@/components/payment/DeliveryTrackingView";
import {
  toNumber,
  isCompletedOrderStatus,
} from "@/utils/helpers";

export const Route = createFileRoute("/_authenticated/payment")({
  component: RouteComponent,
});

const DEFAULT_MAP_CENTER = { lat: 13.7563, lng: 100.5018 };

const getTrackingStorageKey = (userId: string) => `active_tracking_order_id:${userId}`;

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const { setSelectedPaymentMethod, activeOrderId, setActiveOrderId } = useOrderStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(null);
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
  const isCartReady = hasHydrated || cartHydrationTimedOut;

  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => setCartHydrationTimedOut(true), 1500);
    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!isCartReady) return;
      const selectedIds = Object.keys(cartItems);
      if (selectedIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;
        const selectedSet = new Set(selectedIds.map(String));
        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            price: Number(item.price ?? 0),
            pickup_address_id: item.pickup_address_id ? String(item.pickup_address_id) : null,
            image_url: item.image_url ? String(item.image_url) : null,
          }))
          .filter((item) => item.id && selectedSet.has(item.id));
        setProducts(normalized as Product[]);
      } catch (error) {
        console.error("Failed to load selected products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSelectedProducts();
  }, [cartItems, isCartReady]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const quantity = cartItems[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [products, cartItems]);

  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;

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
    reader.onload = () => { if (typeof reader.result === "string") setQrSlipPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const canProceedCard = /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardNumber) && cardholderName.trim().length >= 2 && /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry) && /^\d{3,4}$/.test(cardCvv);
  const canProceedQr = !!qrSlipName;
  const canProceedCash = cashSubmitted;
  const canProceedByMethod = paymentMethod === "card" ? canProceedCard : paymentMethod === "qr" ? canProceedQr : canProceedCash;

  const proceedDisabled = subtotal <= 0 || !canProceedByMethod;

  const proceedToCheckout = () => {
    if (!canProceedByMethod) {
      setSubmitError("Please complete the payment information.");
      return;
    }
    setSelectedPaymentMethod(paymentMethod);
    router.navigate({ to: "/checkout" });
  };

  const loadTracking = useCallback(async (orderId: string, options?: { background?: boolean }) => {
    const isBackground = options?.background ?? false;
    if (!isBackground && lastLoadedOrderIdRef.current === orderId && trackingData) return;
    try {
      if (!isBackground) {
        setTrackingLoading(true);
        setTrackingError(null);
      }
      const { data: orderRow, error: orderError } = await supabase.from("orders").select("*").eq("order_id", orderId).maybeSingle();
      if (orderError) throw orderError;
      if (!orderRow) throw new Error("Order not found");

      const pickupAddressId = orderRow.pickup_address_id ? String(orderRow.pickup_address_id) : null;
      const destinationAddressId = orderRow.destination_address_id ? String(orderRow.destination_address_id) : null;
      const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];
      const { data: addressRows } = addressIds.length > 0 ? await supabase.from("addresses").select("*").in("id", addressIds) : { data: [] as any[] };
      const addressMap = new Map((addressRows ?? []).map((item: any) => [String(item.id), item]));

      const { data: productRow } = orderRow.product_id ? await supabase.from("products").select("*").eq("product_id", orderRow.product_id).maybeSingle() : { data: null as any };
      const freelanceId = orderRow.freelance_id ? String(orderRow.freelance_id) : null;
      const { data: freelanceProfile } = freelanceId ? await supabase.from("profiles").select("*").eq("id", freelanceId).maybeSingle() : { data: null as any };
      
      const { data: chatRoomRow } = await supabase.from("chat_rooms").select("id").eq("order_id", orderId).maybeSingle();

      const tracking: DeliveryTracking = {
        orderId: String(orderRow.order_id),
        serviceId: orderRow.service_id,
        roomId: chatRoomRow?.id ? String(chatRoomRow.id) : null,
        status: String(orderRow.status || ""),
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
        price: Number(orderRow.price ?? 0),
        productName: productRow?.name || "Product",
        pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
        destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
        freelanceName: freelanceProfile?.full_name || freelanceProfile?.email || (freelanceId ? "Freelancer" : "Waiting..."),
        freelanceId,
        freelanceAvatarUrl: freelanceProfile?.avatar_url || null,
      };
      setTrackingData(tracking);
      lastLoadedOrderIdRef.current = orderId;
    } catch (err: any) {
      if (!isBackground) setTrackingError(err.message);
    } finally {
      if (!isBackground) setTrackingLoading(false);
    }
  }, [trackingData]);

  useEffect(() => {
    if (!activeOrderId) return;
    loadTracking(activeOrderId);
    const channel = supabase.channel(`tracking-${activeOrderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `order_id=eq.${activeOrderId}` }, () => loadTracking(activeOrderId, { background: true }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => loadTracking(activeOrderId, { background: true }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeOrderId, loadTracking]);

  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = getTrackingStorageKey(currentUserId);
    if (!activeOrderId) {
      if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
      return;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, activeOrderId);
  }, [currentUserId, activeOrderId]);

  if (!isCartReady || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading payment page...</p>
      </div>
    );
  }

  if (activeOrderId && trackingData) {
    const status = trackingData.status.toLowerCase();
    const isDelivered = isCompletedOrderStatus(status);
    const pickupLat = toNumber(trackingData.pickupAddress?.lat || "");
    const pickupLng = toNumber(trackingData.pickupAddress?.lng || "");
    const destinationLat = toNumber(trackingData.destinationAddress?.lat || "");
    const destinationLng = toNumber(trackingData.destinationAddress?.lng || "");
    const hasPickup = pickupLat != null && pickupLng != null;
    const hasDest = destinationLat != null && destinationLng != null;
    const markerLat = hasPickup ? pickupLat : (hasDest ? destinationLat : DEFAULT_MAP_CENTER.lat);
    const markerLng = hasPickup ? pickupLng : (hasDest ? destinationLng : DEFAULT_MAP_CENTER.lng);
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${markerLng!-0.02}%2C${markerLat!-0.02}%2C${markerLng!+0.02}%2C${markerLat!+0.02}&layer=mapnik&marker=${markerLat}%2C${markerLng}`;

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
        loadTracking={loadTracking}
        router={router}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">Choose your payment method</p>
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
                  cardNumber={cardNumber} setCardNumber={setCardNumber}
                  cardholderName={cardholderName} setCardholderName={setCardholderName}
                  cardExpiry={cardExpiry} setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv} setCardCvv={setCardCvv}
                  formatCardNumber={formatCardNumber} formatExpiry={formatExpiry}
                  canProceedCard={canProceedCard}
                />
              )}
              {paymentMethod === "qr" && (
                <QrPaymentForm
                  qrIcon={qrIcon} total={total}
                  qrSlipName={qrSlipName} qrSlipPreview={qrSlipPreview}
                  handleQrSlipUpload={handleQrSlipUpload}
                />
              )}
              {paymentMethod === "cash" && (
                <CashPaymentForm setCashSubmitted={setCashSubmitted} setSubmitError={setSubmitError} />
              )}
            </div>
            <PaymentSummary
              subtotal={subtotal} tax={tax} total={total}
              isSubmitting={false} proceedDisabled={proceedDisabled}
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
