import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";

export const Route = createFileRoute("/_authenticated/payment/confirm")({
  component: RouteComponent,
});

type PaymentMethod = "card" | "qr" | "cash";

type Product = {
  id: string;
  name: string;
  price: number;
  pickup_address_id?: string | null;
};

type Address = {
  id: string;
  name?: string | null;
  address_detail?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type DeliveryTracking = {
  orderId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  productName: string;
  pickupAddress: Address | null;
  destinationAddress: Address | null;
  freelanceName: string;
  freelanceId: string | null;
  freelanceAvatarUrl: string | null;
};

type MockChatMessage = {
  id: string;
  sender: "me" | "freelance";
  text: string;
  createdAt: string;
};

const MOCK_DELIVERY_FLOW = true;
const DEFAULT_MAP_CENTER = { lat: 13.7563, lng: 100.5018 };

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const getMapBounds = (latA: number, lngA: number, latB: number, lngB: number) => {
  const minLat = Math.min(latA, latB);
  const maxLat = Math.max(latA, latB);
  const minLng = Math.min(lngA, lngB);
  const maxLng = Math.max(lngA, lngB);
  const latPadding = Math.max(0.02, (maxLat - minLat) * 0.6);
  const lngPadding = Math.max(0.02, (maxLng - minLng) * 0.6);

  return {
    left: minLng - lngPadding,
    right: maxLng + lngPadding,
    top: maxLat + latPadding,
    bottom: minLat - latPadding,
  };
};

const getSinglePointBounds = (lat: number, lng: number) => ({
  left: lng - 0.02,
  right: lng + 0.02,
  top: lat + 0.02,
  bottom: lat - 0.02,
});

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const clearCart = useCartStore((s) => s.clear);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(null);
  const [isWaitingFreelance, setIsWaitingFreelance] = useState(false);
  const [isMockChatOpen, setIsMockChatOpen] = useState(false);
  const [mockChatInput, setMockChatInput] = useState("");
  const [mockChatMessages, setMockChatMessages] = useState<MockChatMessage[]>([]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!hasHydrated) return;

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

        const selectedSet = new Set(selectedIds.map((value) => String(value)));
        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            price: Number(item.price ?? 0),
            pickup_address_id: item.pickup_address_id ? String(item.pickup_address_id) : null,
          }))
          .filter((item) => item.id && selectedSet.has(item.id));

        setProducts(normalized as Product[]);
      } catch (error) {
        console.error("Failed to load selected products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedProducts();
  }, [cartItems, hasHydrated]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const quantity = cartItems[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [products, cartItems]);

  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;

  const loadTracking = async (orderId: string) => {
    try {
      setTrackingLoading(true);
      setTrackingError(null);

      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .select("order_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderRow) throw new Error("Order not found");

      const pickupAddressId = orderRow.pickup_address_id ? String(orderRow.pickup_address_id) : null;
      const destinationAddressId = orderRow.destination_address_id ? String(orderRow.destination_address_id) : null;
      const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];

      const { data: addressRows, error: addressError } = addressIds.length > 0
        ? await supabase
            .from("addresses")
            .select("id, name, address_detail, lat, lng")
            .in("id", addressIds)
        : { data: [] as any[], error: null };

      if (addressError) throw addressError;

      const addressMap = new Map((addressRows ?? []).map((item: any) => [String(item.id), item]));

      const productId = orderRow.product_id ? String(orderRow.product_id) : null;
      const { data: productRow } = productId
        ? await supabase
            .from("products")
            .select("product_id, name")
            .eq("product_id", productId)
            .maybeSingle()
        : { data: null as any };

      const freelanceId = orderRow.freelance_id ? String(orderRow.freelance_id) : null;
      const { data: freelanceProfile } = freelanceId
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, image_url, photo_url")
            .eq("id", freelanceId)
            .maybeSingle()
        : { data: null as any };

      const tracking: DeliveryTracking = {
        orderId: String(orderRow.order_id),
        status: String(orderRow.status || "looking_freelancer"),
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
        price: Number(orderRow.price ?? 0),
        productName: productRow?.name || "Product",
        pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
        destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
        freelanceName: freelanceProfile?.full_name || freelanceProfile?.email || "Waiting for freelance",
        freelanceId,
        freelanceAvatarUrl: freelanceProfile?.avatar_url || freelanceProfile?.image_url || freelanceProfile?.photo_url || null,
      };

      setTrackingData(tracking);

      const status = tracking.status.toLowerCase();
      const waiting = !tracking.freelanceId || status === "looking_freelancer" || status === "pending";
      setIsWaitingFreelance(waiting);
    } catch (err: any) {
      setTrackingError(err?.message || "Unable to load tracking info.");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (!activeOrderId) return;
    if (MOCK_DELIVERY_FLOW) return;

    loadTracking(activeOrderId);

    const interval = window.setInterval(() => {
      loadTracking(activeOrderId);
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeOrderId]);

  const completePayment = async () => {
    if (subtotal <= 0 || !currentUserId || products.length === 0) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setTrackingError(null);

      const selectedProduct = products.find((item) => (cartItems[item.id] || 0) > 0) || products[0];
      const pickupAddressId = selectedProduct?.pickup_address_id || null;

      const { data: customerRow } = await supabase
        .from("customers")
        .select("address_id")
        .eq("id", currentUserId)
        .maybeSingle();

      const destinationAddressId = customerRow?.address_id ? String(customerRow.address_id) : null;

      if (MOCK_DELIVERY_FLOW) {
        const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];
        const { data: addressRows, error: addressError } = addressIds.length > 0
          ? await supabase
              .from("addresses")
              .select("id, name, address_detail, lat, lng")
              .in("id", addressIds)
          : { data: [] as any[], error: null };

        if (addressError) throw addressError;

        const addressMap = new Map((addressRows ?? []).map((item: any) => [String(item.id), item]));

        const mockOrderId = `mock-${Date.now()}`;
        const nowIso = new Date().toISOString();

        setTrackingData({
          orderId: mockOrderId,
          status: "pending",
          createdAt: nowIso,
          updatedAt: nowIso,
          price: total,
          productName: selectedProduct?.name || "Product",
          pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
          destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
          freelanceName: "Waiting for freelance",
          freelanceId: null,
          freelanceAvatarUrl: null,
        });

        clearCart();
        setActiveOrderId(mockOrderId);
        setIsWaitingFreelance(true);

        window.setTimeout(() => {
          setTrackingData((prev) => {
            if (!prev || prev.orderId !== mockOrderId) return prev;
            return {
              ...prev,
              status: "serving",
              updatedAt: new Date().toISOString(),
              freelanceName: "Freelance Demo",
              freelanceId: "mock-freelance-1",
              freelanceAvatarUrl: null,
            };
          });
          setIsWaitingFreelance(false);
        }, 7000);

        return;
      }

      const { data: createdOrder, error: createOrderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: currentUserId,
            product_id: selectedProduct?.id || null,
            pickup_address_id: pickupAddressId,
            destination_address_id: destinationAddressId,
            price: total,
            status: "looking_freelancer",
          },
        ])
        .select("order_id")
        .single();

      if (createOrderError) throw createOrderError;

      const orderId = createdOrder?.order_id ? String(createdOrder.order_id) : null;
      if (!orderId) throw new Error("Failed to create order id.");

      await supabase.from("transactions").insert([
        {
          order_id: orderId,
          customer_id: currentUserId,
          amount: total,
          payment_method: paymentMethod,
          status: "paid",
        },
      ]);

      clearCart();
      setActiveOrderId(orderId);
      setIsWaitingFreelance(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Unable to complete payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeOrderId || !trackingData) return;

    const currentStatus = String(trackingData.status || "").toLowerCase();
    const alreadyEnded = currentStatus === "completed" || currentStatus === "done";
    const hasAcceptedFreelancer = !!trackingData.freelanceId && !isWaitingFreelance;

    if (!hasAcceptedFreelancer || alreadyEnded) return;

    const timer = window.setTimeout(async () => {
      if (MOCK_DELIVERY_FLOW) {
        setTrackingData((prev) => {
          if (!prev || prev.orderId !== activeOrderId) return prev;
          return {
            ...prev,
            status: "completed",
            updatedAt: new Date().toISOString(),
          };
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", activeOrderId);

      if (updateError) {
        setTrackingError(updateError.message || "Unable to update service status.");
        return;
      }

      setTrackingData((prev) => {
        if (!prev || prev.orderId !== activeOrderId) return prev;
        return {
          ...prev,
          status: "completed",
          updatedAt: new Date().toISOString(),
        };
      });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeOrderId, trackingData, isWaitingFreelance]);

  useEffect(() => {
    if (!activeOrderId) {
      setMockChatMessages([]);
      setIsMockChatOpen(false);
      return;
    }

    setMockChatMessages((prev) => {
      if (prev.length > 0) return prev;

      return [
        {
          id: `mock-chat-${Date.now()}`,
          sender: "freelance",
          text: "Hello! This is mock chat. I will update you about your delivery here.",
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, [activeOrderId]);

  const sendMockChatMessage = () => {
    const text = mockChatInput.trim();
    if (!text) return;

    const mine: MockChatMessage = {
      id: `me-${Date.now()}`,
      sender: "me",
      text,
      createdAt: new Date().toISOString(),
    };

    setMockChatMessages((prev) => [...prev, mine]);
    setMockChatInput("");

    const freelanceName = trackingData?.freelanceName || "Freelance";
    window.setTimeout(() => {
      const reply: MockChatMessage = {
        id: `freelance-${Date.now()}`,
        sender: "freelance",
        text: `Mock reply from ${freelanceName}: I got your message, delivery is on the way.`,
        createdAt: new Date().toISOString(),
      };
      setMockChatMessages((prev) => [...prev, reply]);
    }, 900);
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading payment page...</p>
      </div>
    );
  }

  if (activeOrderId) {
    const status = trackingData?.status?.toLowerCase() || "looking_freelancer";
    const accepted = !isWaitingFreelance;
    const isDelivered = status === "completed" || status === "done";
    const pickupLat = toNumber(trackingData?.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData?.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData?.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData?.destinationAddress?.lng);

    const hasPickupCoordinates = pickupLat != null && pickupLng != null;
    const hasDestinationCoordinates = destinationLat != null && destinationLng != null;

    const mapBounds = hasPickupCoordinates && hasDestinationCoordinates
      ? getMapBounds(pickupLat, pickupLng, destinationLat, destinationLng)
      : hasPickupCoordinates
        ? getSinglePointBounds(pickupLat, pickupLng)
        : hasDestinationCoordinates
          ? getSinglePointBounds(destinationLat, destinationLng)
          : getSinglePointBounds(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);

    const markerLat = hasPickupCoordinates
      ? pickupLat
      : hasDestinationCoordinates
        ? destinationLat
        : DEFAULT_MAP_CENTER.lat;
    const markerLng = hasPickupCoordinates
      ? pickupLng
      : hasDestinationCoordinates
        ? destinationLng
        : DEFAULT_MAP_CENTER.lng;

    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds.left}%2C${mapBounds.bottom}%2C${mapBounds.right}%2C${mapBounds.top}&layer=mapnik&marker=${markerLat}%2C${markerLng}`;

    const routeUrl = hasPickupCoordinates && hasDestinationCoordinates
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pickupLat}%2C${pickupLng}%3B${destinationLat}%2C${destinationLng}`
      : `https://www.openstreetmap.org/?mlat=${markerLat}&mlon=${markerLng}#map=14/${markerLat}/${markerLng}`;

    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
        <main className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[#4A2600]">Your Delivery Order</h1>
                <p className="text-sm text-orange-700/80 font-semibold">Order ID: {activeOrderId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMockChatOpen((prev) => !prev)}
                  className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#A03F00] text-white hover:bg-[#8a3600]"
                >
                  {isMockChatOpen ? "Close Chat" : "Mock Chat"}
                </button>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${accepted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {accepted ? "Freelancer Accepted" : "Waiting for Freelance"}
                </span>
              </div>
            </div>

            {isMockChatOpen && (
              <section className="rounded-xl border border-orange-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Mock Chat</p>

                <div className="rounded-lg border border-orange-100 bg-[#fff8f2] p-3 h-[220px] overflow-y-auto space-y-2">
                  {mockChatMessages.map((message) => {
                    const isMine = message.sender === "me";
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${isMine ? "bg-[#F2A779] text-[#4A2600]" : "bg-white border border-orange-200 text-[#4A2600]"}`}>
                          <p>{message.text}</p>
                          <p className="text-[10px] opacity-60 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={mockChatInput}
                    onChange={(e) => setMockChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMockChatMessage();
                      }
                    }}
                    placeholder="Type message..."
                    className="flex-1 border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendMockChatMessage}
                    className="px-4 py-2 rounded-lg bg-[#D35400] text-white font-black text-sm hover:bg-[#b34700]"
                  >
                    Send
                  </button>
                </div>
              </section>
            )}

            {(trackingLoading || !trackingData) && !trackingError && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-sm font-semibold text-[#4A2600]">Loading delivery details...</p>
              </div>
            )}

            {trackingError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">{trackingError}</p>
              </div>
            )}

            {trackingData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Pickup Address (Product)</p>
                    <p className="font-bold text-[#4A2600]">{trackingData.pickupAddress?.name || "Pickup point"}</p>
                    <p className="text-sm text-[#4A2600]/80 mt-1">{trackingData.pickupAddress?.address_detail || "No pickup address"}</p>
                  </section>

                  <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Destination Address (Customer)</p>
                    <p className="font-bold text-[#4A2600]">{trackingData.destinationAddress?.name || "Destination"}</p>
                    <p className="text-sm text-[#4A2600]/80 mt-1">{trackingData.destinationAddress?.address_detail || "No destination address"}</p>
                  </section>
                </div>

                <section className="rounded-xl border border-orange-100 bg-white p-4">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">OpenStreetMap (Mock Route)</p>
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-black text-orange-700 hover:text-orange-800"
                    >
                      Open full map
                    </a>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-orange-100">
                    <iframe
                      title="Delivery map"
                      src={mapSrc}
                      className="w-full h-[260px]"
                      loading="lazy"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {hasPickupCoordinates && hasDestinationCoordinates
                      ? "Mock route preview from pickup to destination."
                      : "Showing current area preview. Add lat/lng to addresses for full route line in external map."}
                  </p>
                </section>

                <div className="rounded-xl border border-orange-100 p-4 bg-white">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Delivery Detail</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Product</p>
                      <p className="font-bold text-[#4A2600]">{trackingData.productName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Freelancer</p>
                      <p className="font-bold text-[#4A2600]">{trackingData.freelanceName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-bold text-[#4A2600]">{status.replaceAll("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-bold text-[#4A2600]">฿ {trackingData.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {isDelivered ? (
                  <section className="rounded-xl border border-orange-200 p-6 md:p-8 bg-gradient-to-r from-[#FFE2CF] via-[#FFD5B8] to-[#FFC79E] flex justify-center items-center min-h-[220px]">
                    <div className="w-full max-w-[280px] rounded-xl border-2 border-orange-300 bg-[#fff7f0] px-4 py-5 text-center shadow-sm">
                      <div className="mx-auto w-16 h-16 rounded-full border-[3px] border-orange-500 overflow-hidden bg-orange-50 flex items-center justify-center text-xl font-black text-[#4A2600]">
                        {trackingData.freelanceAvatarUrl ? (
                          <img src={trackingData.freelanceAvatarUrl} alt={trackingData.freelanceName} className="w-full h-full object-cover" />
                        ) : (
                          (trackingData.freelanceName || "F").charAt(0).toUpperCase()
                        )}
                      </div>
                      <p className="mt-3 text-2xl font-black text-[#4A2600]">{trackingData.freelanceName}</p>
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="mt-3 text-base font-black text-orange-600 uppercase">Thank You</p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="rounded-xl border border-orange-100 p-4 bg-white">
                      <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Delivery Guy</p>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full border-2 border-orange-300 overflow-hidden bg-orange-50 flex items-center justify-center font-black text-[#4A2600]">
                          {trackingData.freelanceAvatarUrl ? (
                            <img src={trackingData.freelanceAvatarUrl} alt={trackingData.freelanceName} className="w-full h-full object-cover" />
                          ) : (
                            (trackingData.freelanceName || "F").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[#4A2600]">{trackingData.freelanceName}</p>
                          <p className="text-xs text-gray-500">{trackingData.freelanceId ? "Accepted this order" : "Waiting for acceptance"}</p>
                        </div>
                      </div>
                    </section>

                    <div className="rounded-xl border border-orange-100 p-4 bg-[#fff7f0]">
                      <p className="text-sm font-black text-[#4A2600] mb-2">Order Status</p>
                      <div className="space-y-2 text-sm text-[#4A2600]">
                        <p className={status === "looking_freelancer" || status === "pending" ? "font-black text-orange-600" : ""}>Looking for a freelancer</p>
                        <p className={accepted ? "font-black text-orange-600" : ""}>Freelancer has accepted</p>
                        <p className={status === "serving" || status === "in_progress" ? "font-black text-orange-600" : ""}>Currently serving</p>
                        <p className={isDelivered ? "font-black text-orange-600" : ""}>Service has ended</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.navigate({ to: "/product" })}
                className="px-5 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
              >
                Back to Products
              </button>
              <button
                type="button"
                onClick={() => router.navigate({ to: "/" })}
                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">Complete your Booking</p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-2xl font-black text-[#4A2600] mb-3">Payment Method</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "card"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cardIcon} alt="Card" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qr")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "qr"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={qrIcon} alt="Qr code" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Qr code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "cash"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cashIcon} alt="Cash" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Cash</span>
                  </button>
                </div>
              </section>

              {paymentMethod === "card" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Card Details</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Card Number</p>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="123-132-456-789"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Cardholder Name</p>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Somsuk Kumkeaw"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">Expiry Date</p>
                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="MM/YY" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">CVV</p>
                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="123" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {paymentMethod === "qr" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-2 text-left">Qr code</h2>
                  <p className="text-sm text-gray-500 mb-2">Scan only one time</p>
                  <div className="inline-flex flex-col items-center bg-[#FCE7D8] border border-[#E7C7B1] rounded-lg p-4">
                    <img src={qrIcon} alt="Payment QR" className="w-32 h-32 object-contain bg-white rounded-md border border-[#E7C7B1]" />
                    <p className="text-xs mt-2 text-gray-500">Price</p>
                    <p className="text-lg font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={completePayment}
                      className="px-5 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
                    >
                      Scan complete
                    </button>
                  </div>
                </section>
              )}

              {paymentMethod === "cash" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Cash</h2>
                  <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-gray-700">
                    <p className="mb-2">Please read the message.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Please have the money ready.</li>
                      <li>Pay the freelancer.</li>
                      <li>Please wait for a call from the freelancer.</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={completePayment}
                      className="px-6 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
                    >
                      Submit
                    </button>
                  </div>
                </section>
              )}
            </div>

            <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
              <h2 className="text-2xl font-black text-[#4A2600] mb-3">Order Summary</h2>
              <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Service</p>
                  <p className="font-semibold text-[#4A2600]">฿ {subtotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Tax</p>
                  <p className="font-semibold text-[#4A2600]">฿ {tax.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mb-5">
                <p className="font-black text-[#4A2600]">Total</p>
                <p className="text-2xl font-black text-[#4A2600]">฿ {total.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={completePayment}
                  disabled={subtotal <= 0 || isSubmitting}
                  className={`w-full py-2 rounded-md text-sm font-black ${
                    subtotal <= 0 || isSubmitting
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Complete Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => router.navigate({ to: "/payment" })}
                  className="w-full py-2 rounded-md text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
                {submitError && (
                  <p className="text-xs font-semibold text-red-600">{submitError}</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
