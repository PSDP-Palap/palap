/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PaymentSummary } from "@/components/payment/PaymentSummary";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutComponent
});

const ORDER_CREATE_STATUS_CANDIDATES = [
  "WAITING",
  "PENDING",
  "LOOKING_FREELANCER",
  "CREATED",
  "NEW",
  "OPEN",
  "REQUESTED"
];

function CheckoutComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const clearCart = useCartStore((s) => s.clear);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const { selectedPaymentMethod, setActiveOrderId } = useOrderStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState<any | null>(null);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);

  const isCartReady = hasHydrated || cartHydrationTimedOut;

  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => setCartHydrationTimedOut(true), 1500);
    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  useEffect(() => {
    const loadData = async () => {
      if (!isCartReady || !currentUserId) return;

      try {
        setLoading(true);
        // 1. Load Products
        const selectedIds = Object.keys(cartItems);
        const { data: productsData } = await supabase
          .from("products")
          .select("*");
        const selectedSet = new Set(selectedIds.map(String));
        const normalized = ((productsData as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            price: Number(item.price ?? 0),
            pickup_address_id: item.pickup_address_id
              ? String(item.pickup_address_id)
              : null,
            image_url: item.image_url ? String(item.image_url) : null
          }))
          .filter((item) => item.id && selectedSet.has(item.id));
        setProducts(normalized as Product[]);

        // 2. Load Address
        const { data: customerRow } = await supabase
          .from("customers")
          .select("address_id")
          .eq("id", currentUserId)
          .maybeSingle();

        if (customerRow?.address_id) {
          const { data: addressRow } = await supabase
            .from("addresses")
            .select("*")
            .eq("id", customerRow.address_id)
            .maybeSingle();
          setSavedAddress(addressRow);
        }
      } catch (error) {
        console.error("Failed to load checkout data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cartItems, isCartReady, currentUserId]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const quantity = cartItems[product.id || ""] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [products, cartItems]);

  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;

  const orderRows = useMemo(() => {
    return products
      .map((product) => {
        const quantity = cartItems[product.id || ""] || 0;
        return {
          id: product.id,
          name: product.name,
          imageUrl: product.image_url || null,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity
        };
      })
      .filter((row) => row.quantity > 0);
  }, [products, cartItems]);

  const completeOrder = async () => {
    if (
      subtotal <= 0 ||
      !currentUserId ||
      products.length === 0 ||
      !selectedPaymentMethod
    ) {
      toast.error("Please ensure all order details are complete.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const selectedProduct = products[0];
      const pickupAddressId = selectedProduct?.pickup_address_id || null;
      const destinationAddressId = savedAddress?.id || null;

      if (!pickupAddressId || !destinationAddressId) {
        throw new Error("Missing pickup or destination address.");
      }

      // Create Service Session (supports multiple owner column variants)
      const serviceBasePayload = {
        name: selectedProduct.name,
        price: total,
        category: "DELIVERY",
        pickup_address_id: pickupAddressId,
        destination_address_id: destinationAddressId,
        image_url: selectedProduct.image_url
      };

      const serviceOwnerColumns = [
        "created_by",
        "freelancer_id",
        "freelance_id",
        "user_id",
        "profile_id"
      ];

      let createdService: any = null;
      let serviceInsertError: any = null;

      for (const ownerColumn of serviceOwnerColumns) {
        const payload = {
          ...serviceBasePayload,
          [ownerColumn]: currentUserId
        } as any;

        const { data, error } = await supabase
          .from("services")
          .insert([payload])
          .select("service_id")
          .single();

        if (!error && data) {
          createdService = data;
          serviceInsertError = null;
          break;
        }

        serviceInsertError = error;
      }

      if (!createdService) {
        const { data, error } = await supabase
          .from("services")
          .insert([serviceBasePayload])
          .select("service_id")
          .single();

        if (error) throw error;
        createdService = data;
      }

      if (!createdService?.service_id) {
        throw new Error(
          serviceInsertError?.message || "Failed to create service session."
        );
      }

      const serviceId = String(createdService.service_id);

      // Create Order
      let orderId: string | null = null;
      let lastOrderError: any = null;

      const baseOrderPayload = {
        customer_id: currentUserId,
        service_id: serviceId,
        product_id: selectedProduct.id,
        pickup_address_id: pickupAddressId,
        destination_address_id: destinationAddressId,
        price: total,
        freelance_id: null
      };

      const orderPayloadCandidates = [
        baseOrderPayload,
        {
          ...baseOrderPayload,
          destination_address_id: undefined,
          dest_address_id: destinationAddressId
        }
      ];

      for (const payloadCandidate of orderPayloadCandidates) {
        for (const status of ORDER_CREATE_STATUS_CANDIDATES) {
          const payload = {
            ...payloadCandidate,
            status
          };

          const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert([payload])
            .select("order_id")
            .single();

          if (!orderError && newOrder?.order_id) {
            orderId = String(newOrder.order_id);
            break;
          }

          lastOrderError = orderError;
        }

        if (orderId) break;

        const { data: fallbackOrder, error: fallbackOrderError } =
          await supabase
            .from("orders")
            .insert([payloadCandidate])
            .select("order_id")
            .single();

        if (!fallbackOrderError && fallbackOrder?.order_id) {
          orderId = String(fallbackOrder.order_id);
          break;
        }

        lastOrderError = fallbackOrderError;
      }

      if (!orderId) {
        throw new Error(lastOrderError?.message || "Failed to create order.");
      }

      // Create Transaction
      await supabase.from("transactions").insert([
        {
          order_id: orderId,
          customer_id: currentUserId,
          amount: total,
          payment_method: selectedPaymentMethod,
          status: "paid"
        }
      ]);

      clearCart();
      setActiveOrderId(orderId);
      toast.success("Order confirmed successfully!");
      router.navigate({ to: "/payment" });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to confirm order.");
      toast.error("Confirmation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-5xl mx-auto px-4">
        <div className="bg-[#FF914D] rounded-xl px-6 py-5 mb-4 text-white">
          <h1 className="text-3xl font-black uppercase">Final Review</h1>
          <p className="text-sm text-orange-100 font-semibold">
            Please check your details before confirming
          </p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              {/* Items Summary */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-black text-[#4A2600] mb-3 uppercase text-sm tracking-wider">
                  Items
                </h3>
                <div className="space-y-3">
                  {orderRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-orange-50 overflow-hidden shrink-0 border border-orange-100">
                        {row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#4A2600] truncate text-sm">
                          {row.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {row.quantity} × ฿{row.unitPrice}
                        </p>
                      </div>
                      <p className="font-bold text-[#4A2600] text-sm">
                        ฿{row.subtotal}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Summary */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-black text-[#4A2600] mb-3 uppercase text-sm tracking-wider">
                  Delivery to
                </h3>
                <p className="font-bold text-[#4A2600] text-sm">
                  {savedAddress?.name || "Main Location"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {savedAddress?.address_detail || "No detail provided"}
                </p>
              </div>

              {/* Payment Summary */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-black text-[#4A2600] mb-3 uppercase text-sm tracking-wider">
                  Payment Method
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-black text-[10px] uppercase">
                    {selectedPaymentMethod || "Not Selected"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <PaymentSummary
                subtotal={subtotal}
                tax={tax}
                total={total}
                isSubmitting={isSubmitting}
                proceedDisabled={isSubmitting}
                completePayment={completeOrder}
                onBack={() => router.navigate({ to: "/payment" })}
                submitError={submitError}
                buttonText="Confirm Order"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
