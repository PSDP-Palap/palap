/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Banknote,
  ChevronLeft,
  CreditCard,
  Lock,
  QrCode,
  ShieldCheck
} from "lucide-react";
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
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

const paymentSearchSchema = z.object({
  subtotal: z.coerce.number().optional().default(0),
  tax: z.coerce.number().optional().default(0),
  total: z.coerce.number().optional().default(0),
  deliveryFee: z.coerce.number().optional().default(0),
  order_id: z.string().optional(),
  address_id: z.string().optional(),
  service_id: z.string().optional(),
  note: z.string().optional(),
  appointment_at: z.string().optional()
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
  const {
    subtotal,
    tax,
    total,
    deliveryFee,
    order_id,
    address_id,
    note,
    appointment_at
  } = Route.useSearch();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const hasHydrated = useCartStore((s) => s.hasHydrated);

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

  // Add real-time validation after first attempt or as they type
  useEffect(() => {
    if (cardNumber || cardholderName || cardExpiry || cardCvv) {
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
      } else {
        setCardErrors({});
      }
    }
  }, [cardNumber, cardholderName, cardExpiry, cardCvv]);

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

      if (!finalOrderId) {
        if (!currentUserId || !address_id) {
          throw new Error("Missing user or address information.");
        }

        // --- PRODUCT ORDER FLOW ONLY ---
        const productIds = Object.keys(cartItems).filter(
          (id) => cartItems[id] > 0
        );
        if (productIds.length === 0) {
          throw new Error("Cart is empty.");
        }

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("product_id, pickup_address_id, price")
          .in("product_id", productIds);

        if (productsError) throw productsError;

        const ordersToCreate = productsData.map((p) => {
          return {
            customer_id: currentUserId,
            product_id: p.product_id,
            pickup_address_id: p.pickup_address_id,
            destination_address_id: address_id,
            price: total,
            status: "WAITING",
            appointment_at: appointment_at
          };
        });

        const { data: createdOrders, error: createOrderError } = await supabase
          .from("orders")
          .insert(ordersToCreate)
          .select("order_id")
          .limit(1)
          .single();

        if (createOrderError) throw createOrderError;
        finalOrderId = createdOrders.order_id;
      }

      // 1. Call the Edge Function to handle the atomic payment transaction
      const { data: edgeResponse, error: edgeError } =
        await supabase.functions.invoke("payment", {
          body: {
            order_id: finalOrderId,
            payment_method: mappedMethod
          }
        });

      if (edgeError || (edgeResponse && edgeResponse.error)) {
        throw new Error(
          edgeError?.message || edgeResponse?.error || "Edge Function failed"
        );
      }

      // 2. Setup Chat Room (if it's a new order)
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", finalOrderId)
        .maybeSingle();

      if (!existingRoom) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("freelance_id")
          .eq("order_id", finalOrderId)
          .single();

        const { data: newRoom } = await supabase
          .from("chat_rooms")
          .insert({
            order_id: finalOrderId,
            customer_id: currentUserId,
            freelancer_id: orderData?.freelance_id || null,
            created_by: currentUserId,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (newRoom) {
          await supabase.from("chat_messages").insert({
            room_id: newRoom.id,
            order_id: finalOrderId,
            sender_id: currentUserId,
            content: `[SYSTEM_ORDER_PAID] Order placed successfully. Waiting for delivery.${note ? `\n\nNote: ${note}` : ""}`,
            message_type: "SYSTEM"
          });
        }
      }

      clearCart();
      toast.dismiss(toastId);
      toast.success("Order placed successfully!");

      router.navigate({
        to: "/order-complete" as any,
        search: {
          order_id: finalOrderId,
          payment_id: edgeResponse.payment_id || `TR-${Date.now()}`
        } as any
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Process failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (paymentMethod === "CARD" && !canProceedCard)
      return "Enter Card Details";
    if (paymentMethod === "QR" && !canProceedQr) return "Upload Receipt";
    if (paymentMethod === "CASH" && !canProceedCash)
      return "Confirm Cash Payment";
    return order_id ? "Complete Payment" : "Place Order & Pay";
  };

  if (!isCartReady) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Visual Stepper */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center w-full max-w-2xl">
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-black z-10 shadow-lg shadow-green-900/20">
                ✓
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-green-600">
                Summary
              </p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-green-500 -z-0" />
            </div>
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-[#A03F00] text-white flex items-center justify-center font-black z-10 shadow-lg shadow-orange-900/20">
                2
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-[#A03F00]">
                Payment
              </p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-gray-100 -z-0" />
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-300 flex items-center justify-center font-black z-10">
                3
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-300">
                Complete
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-[#4A2600]">Payment</h1>
                <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">
                  {order_id
                    ? `Finalizing order #${order_id.slice(0, 8)}`
                    : "Secure checkout process"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (order_id) {
                    router.navigate({
                      to: "/order/$order_id" as any,
                      params: { order_id } as any
                    });
                  } else {
                    router.navigate({ to: "/order-summary" });
                  }
                }}
                className="p-3 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Payment Method Selection */}
              <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 overflow-hidden">
                <div className="p-8 border-b border-orange-50 bg-orange-50/30">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#A03F00] text-white shadow-lg shadow-orange-900/20">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-[#4A2600]">
                      Choose Payment Method
                    </h2>
                  </div>
                </div>

                <div className="p-8">
                  <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    setSubmitError={setSubmitError}
                    cardIcon={cardIcon}
                    qrIcon={qrIcon}
                    cashIcon={cashIcon}
                  />
                </div>
              </section>

              {/* Payment Details Form */}
              <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 p-8 animate-in slide-in-from-bottom-4 duration-500">
                {paymentMethod === "CARD" && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <h3 className="font-black text-[#4A2600] uppercase tracking-widest text-sm">
                        Card Details
                      </h3>
                    </div>
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
                  </div>
                )}
                {paymentMethod === "QR" && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <QrCode className="w-5 h-5 text-orange-600" />
                      <h3 className="font-black text-[#4A2600] uppercase tracking-widest text-sm">
                        QR Payment
                      </h3>
                    </div>
                    <QrPaymentForm
                      qrIcon={qrIcon}
                      total={total}
                      qrSlipName={qrSlipName}
                      qrSlipPreview={qrSlipPreview}
                      handleQrSlipUpload={handleQrSlipUpload}
                    />
                  </div>
                )}
                {paymentMethod === "CASH" && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Banknote className="w-5 h-5 text-orange-600" />
                      <h3 className="font-black text-[#4A2600] uppercase tracking-widest text-sm">
                        Cash on Delivery
                      </h3>
                    </div>
                    <CashPaymentForm
                      setCashSubmitted={setCashSubmitted}
                      setSubmitError={setSubmitError}
                    />
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Right Summary Side */}
          <div className="lg:w-[400px]">
            <div className="sticky top-28 space-y-6">
              <PaymentSummary
                subtotal={subtotal}
                tax={tax}
                deliveryFee={deliveryFee}
                total={total}
                isSubmitting={isSubmitting}
                proceedDisabled={proceedDisabled}
                completePayment={completePayment}
                onBack={() => {}}
                submitError={submitError}
                buttonText={getButtonText()}
              />

              {/* Secure Trust Badge */}
              <div className="bg-white rounded-[2rem] border border-orange-50 shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#4A2600] uppercase tracking-widest mb-1">
                      Encrypted Payment
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                      We use industry-standard encryption to protect your
                      sensitive financial data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
