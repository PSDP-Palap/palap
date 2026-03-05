import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Home, Receipt } from "lucide-react";
import { z } from "zod";

const orderCompleteSearchSchema = z.object({
  order_id: z.string().optional(),
  payment_id: z.string().optional()
});

export const Route = createFileRoute("/_authenticated/order-complete")({
  validateSearch: orderCompleteSearchSchema,
  component: OrderCompletePage
});

function OrderCompletePage() {
  const { order_id, payment_id } = Route.useSearch();

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden transform animate-in fade-in zoom-in duration-500">
        <div className="bg-linear-to-br from-green-500 to-emerald-600 p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Payment Successful
            </h1>
            <p className="mt-2 text-white/90 font-medium">
              Thank you for your business!
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Order ID</span>
              <span className="font-bold text-[#4A2600] text-sm">
                {order_id || "N/A"}
              </span>
            </div>
            {payment_id && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Transaction ID</span>
                <span className="font-bold text-[#4A2600] text-sm">
                  {payment_id}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Status</span>
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase">
                Paid & Completed
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/order-history"
              className="w-full py-3.5 rounded-xl bg-[#4A2600] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#361d00] transition-all transform active:scale-95"
            >
              <Receipt className="w-4 h-4" />
              View Order History
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all transform active:scale-95"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 font-medium pt-2">
            A confirmation email has been sent to your registered address.
          </p>
        </div>
      </div>
    </div>
  );
}
