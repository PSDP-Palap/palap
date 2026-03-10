import { Link } from "@tanstack/react-router";

interface PriceSummarySideProps {
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee: number;
  proceedingToPayment: boolean;
  proceedToPayment: () => void;
  orderRowsCount: number;
}

export function PriceSummarySide({
  totalItems,
  subtotal,
  tax,
  total,
  deliveryFee,
  proceedingToPayment,
  proceedToPayment,
  orderRowsCount,
}: PriceSummarySideProps) {
  return (
    <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
      <h2 className="text-lg font-black text-[#4A2600] mb-3">Price Summary</h2>
      <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Items</p>
          <p className="font-semibold text-[#4A2600]">{totalItems}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Service subtotal</p>
          <p className="font-semibold text-[#4A2600]">฿{subtotal.toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Delivery Fee</p>
          <p className="font-semibold text-[#4A2600]">฿{deliveryFee.toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Tax (3%)</p>
          <p className="font-semibold text-[#4A2600]">฿{tax.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mb-4">
        <p className="font-black text-[#4A2600]">Total</p>
        <p className="text-xl font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={orderRowsCount === 0 || proceedingToPayment}
          onClick={proceedToPayment}
          className={`w-full py-2 rounded-md text-sm font-black ${
            orderRowsCount === 0 || proceedingToPayment
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
          }`}
        >
          {proceedingToPayment ? "Preparing Payment..." : "Proceed to Payment"}
        </button>

        <Link
          to="/product"
          className="block w-full py-2 rounded-md text-sm font-bold text-center bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Back to Products
        </Link>
      </div>
    </aside>
  );
}
