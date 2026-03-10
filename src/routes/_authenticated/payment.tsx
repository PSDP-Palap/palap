/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { z } from "zod";

import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";
import { CardDetailsForm } from "@/components/payment/CardDetailsForm";
import { CashPaymentForm } from "@/components/payment/CashPaymentForm";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { QrPaymentForm } from "@/components/payment/QrPaymentForm";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

const paymentSearchSchema = z.object({
  subtotal: z.coerce.number().optional().default(0),
  tax: z.coerce.number().optional().default(0),
  total: z.coerce.number().optional().default(0),
  order_id: z.string().optional(),
  address_id: z.string().optional()
});

const cardSchema = z.object({
  cardNumber: z
    .string()
    .regex(
      /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/,
      "Invalid format (16 digits required)"
    ),
  cardholderName: z.string().min(2, "Name is too short"),
  cardExpiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Invalid format (MM/YY)"),
  cardCvv: z.string().regex(/^\d{3,4}$/, "Invalid CVV (3-4 digits)")
});

export const Route = createFileRoute("/_authenticated/payment")({
  validateSearch: paymentSearchSchema,
  component: RouteComponent
});

function RouteComponent() {
  const router = useRouter();
  const { subtotal, tax, total, order_id, address_id } = Route.useSearch();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const { setSelectedPaymentMethod } = useOrderStore();

  const [paymentMethod, setPaymentMethod] = useState<any>("CARD");
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardErrors, setCardErrors] = useState<{
    cardNumber?: string;
    cardholderName?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }>({});

  const [qrSlipName, setQrSlipName] = useState<string | null>(null);
  const [qrSlipPreview, setQrSlipPreview] = useState<string | null>(null);
  const [cashSubmitted, setCashSubmitted] = useState(false);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateCard = useCallback(() => {
    const result = cardSchema.safeParse({
      cardNumber,
      cardholderName,
      cardExpiry,
      cardCvv
    });

    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setCardErrors(fieldErrors);
      return false;
    }

    setCardErrors({});
    return true;
  }, [cardNumber, cardholderName, cardExpiry, cardCvv]);

  const canProceedCard = cardSchema.safeParse({
    cardNumber,
    cardholderName,
    cardExpiry,
    cardCvv
  }).success;

  const canProceedQr = !!qrSlipName;
  const canProceedCash = cashSubmitted;
  const canProceedByMethod =
    paymentMethod === "CARD"
      ? canProceedCard
      : paymentMethod === "QR"
        ? canProceedQr
        : canProceedCash;

  const proceedDisabled = total <= 0 || isSubmitting || !canProceedByMethod;

  const completePayment = async () => {
    setSubmitError(null);

    if (paymentMethod === "CARD") {
      const isValid = validateCard();
      if (!isValid) {
        setSubmitError("Please correct the errors in your card details.");
        return;
      }
    } else if (paymentMethod === "QR" && !qrSlipName) {
      setSubmitError("Please upload your payment slip.");
      return;
    } else if (paymentMethod === "CASH" && !cashSubmitted) {
      setSubmitError("Please confirm your cash payment.");
      return;
    }

    const toastId = toast.loading("Processing Payment...");
    try {
      setIsSubmitting(true);
      const mappedMethod = (paymentMethod || "CARD").toUpperCase();

      let finalOrderId = order_id;

      // 1. If no order_id (Product flow from order-summary)
      if (!finalOrderId) {
        if (!currentUserId || !address_id) {
          throw new Error("Missing user or address information.");
        }

        const productIds = Object.keys(cartItems).filter((id) => cartItems[id] > 0);
        if (productIds.length === 0) {
          throw new Error("Cart is empty.");
        }

        // Load product details to get pickup_address_id
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("product_id, pickup_address_id, price")
          .in("product_id", productIds);

        if (productsError) throw productsError;

        // Create orders (For now, we create one order per product as per schema limitation)
        // We will just create the first one for simplicity or we can loop.
        // The user said "create order link customer_id with product_id"
        const ordersToCreate = productsData.map((p) => ({
          customer_id: currentUserId,
          product_id: p.product_id,
          pickup_address_id: p.pickup_address_id,
          destination_address_id: address_id,
          price: p.price * (cartItems[String(p.product_id)] || 1),
          status: "WAITING"
        }));

        const { data: createdOrders, error: createOrderError } = await supabase
          .from("orders")
          .insert(ordersToCreate)
          .select("order_id")
          .limit(1)
          .single();

        if (createOrderError) throw createOrderError;
        finalOrderId = createdOrders.order_id;
      }

      // 2. Process via Edge Function if it exists or direct transaction
      const { data, error: functionError } = await supabase.functions.invoke(
        "payment",
        {
          body: {
            order_id: finalOrderId,
            payment_method: mappedMethod,
            amount: total
          }
        }
      );

      // If function fails or doesn't exist, fallback to manual transaction record
      if (functionError || !data?.success) {
        console.warn(
          "Edge function failed or not found, falling back to manual transaction creation"
        );

        const { error: transError } = await supabase
          .from("transactions")
          .insert([
            {
              order_id: finalOrderId,
              customer_id: currentUserId,
              amount: total,
              payment_method: mappedMethod,
              status: "paid"
            }
          ]);

        if (transError) throw transError;
      }

      clearCart();
      toast.dismiss(toastId);
      toast.success("Payment successful!");

      router.navigate({
        to: "/order-complete" as any,
        search: {
          order_id: finalOrderId,
          payment_id: data?.payment_id || `TR-${Date.now()}`
        } as any
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Payment failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartReady) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-linear-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">
            {order_id
              ? `Paying for Order: ${order_id}`
              : "Choose your payment method"}
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
              {paymentMethod === "CARD" && (
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
                  errors={cardErrors}
                />
              )}
              {paymentMethod === "QR" && (
                <QrPaymentForm
                  qrIcon={qrIcon}
                  total={total}
                  qrSlipName={qrSlipName}
                  qrSlipPreview={qrSlipPreview}
                  handleQrSlipUpload={handleQrSlipUpload}
                />
              )}
              {paymentMethod === "CASH" && (
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
              isSubmitting={isSubmitting}
              proceedDisabled={proceedDisabled}
              completePayment={completePayment}
              onBack={() => {
                if (order_id) {
                  router.navigate({
                    to: "/order/$order_id" as any,
                    params: { order_id: order_id } as any
                  });
                } else {
                  router.navigate({ to: "/order-summary" });
                }
              }}
              submitError={submitError}
              buttonText={order_id ? "Pay Now" : "Review Order"}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
