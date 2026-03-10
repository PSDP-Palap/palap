interface PaymentSummaryProps {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  isSubmitting: boolean;
  proceedDisabled: boolean;
  completePayment: () => void;
  onBack: () => void;
  submitError: string | null;
  buttonText?: string;
}

export function PaymentSummary({
  subtotal,
  tax,
  deliveryFee,
  total,
  isSubmitting,
  proceedDisabled,
  completePayment,
  onBack,
  submitError,
  buttonText,
}: PaymentSummaryProps) {
  return (
    <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
      <h2 className="text-2xl font-black text-[#4A2600] mb-3">
        Order Summary
      </h2>
      <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Items Subtotal</p>
          <p className="font-semibold text-[#4A2600]">
            ฿ {subtotal.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Delivery Fee</p>
          <p className="font-semibold text-[#4A2600]">
            ฿ {deliveryFee.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Web Service Fee (3%)</p>
          <p className="font-semibold text-[#4A2600]">
            ฿ {tax.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 mb-5">
        <p className="font-black text-[#4A2600]">Total</p>
        <p className="text-2xl font-black text-[#4A2600]">
          ฿ {total.toFixed(2)}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={completePayment}
          disabled={proceedDisabled}
          className={`w-full py-2 rounded-md text-sm font-black ${
            proceedDisabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
          }`}
        >
          {isSubmitting ? "Processing..." : (buttonText || "Proceed to Payment")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 rounded-md text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Back
        </button>
        {submitError && (
          <p className="text-xs font-semibold text-red-600">
            {submitError}
          </p>
        )}
      </div>
    </aside>
  );
}
