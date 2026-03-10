import { useRouter } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import type { CartRow } from "@/types/product";

interface CartFooterProps {
  isFooterCartExpanded: boolean;
  setIsFooterCartExpanded: (
    val: boolean | ((prev: boolean) => boolean)
  ) => void;
  selectedCartRows: CartRow[];
  setCartQuantity: (id: string, qty: number) => void;
  removeCartItem: (id: string) => void;
  selectedItemCount: number;
  totalPrice: number;
  cartItems: Record<string, number>;
}

export function CartFooter({
  isFooterCartExpanded,
  setIsFooterCartExpanded,
  selectedCartRows,
  setCartQuantity,
  removeCartItem,
  selectedItemCount,
  totalPrice,
  cartItems
}: CartFooterProps) {
  const router = useRouter();

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-orange-100 px-6 py-4 shadow-2xl z-50">
      {isFooterCartExpanded && selectedCartRows.length > 0 && (
        <div className="max-w-6xl mx-auto mb-4 max-h-52 overflow-y-auto pr-1 space-y-2">
          {selectedCartRows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between text-sm border border-orange-100 rounded-lg px-3 py-2 bg-orange-50/60 gap-3"
            >
              <div className="min-w-0 flex items-center gap-2">
                <img
                  src={row.imageUrl || "/shiba.png"}
                  alt={row.name}
                  className="w-12 h-12 rounded-lg object-cover border border-orange-100 flex-none"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#4A2600] truncate">
                    {row.name}
                  </p>
                  <p className="text-xs text-gray-500">฿{row.unitPrice} each</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCartQuantity(row.id, row.qty - 1)}
                  className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                >
                  -
                </button>
                <span className="min-w-6 text-center font-bold text-[#4A2600]">
                  {row.qty}
                </span>
                <button
                  type="button"
                  onClick={() => setCartQuantity(row.id, row.qty + 1)}
                  className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => removeCartItem(row.id)}
                  className="px-2 py-1 rounded-md bg-red-50 text-red-600 font-black text-[10px] uppercase hover:bg-red-100"
                >
                  Remove
                </button>

                <p className="font-black text-[#4A2600] min-w-19.5 text-right">
                  ฿{row.subtotal}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
        <button
          type="button"
          onClick={() => setIsFooterCartExpanded((prev: boolean) => !prev)}
          className="relative w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center disabled:bg-gray-100 disabled:text-gray-300"
          aria-label="Toggle cart"
          disabled={selectedCartRows.length === 0}
        >
          <ShoppingCart className="w-6 h-6" />
          {selectedItemCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-4.5 text-center">
              {selectedItemCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase font-black text-orange-800/40">
              Total Amount
            </p>
            <p className="text-2xl font-black text-orange-600">฿{totalPrice}</p>
          </div>
          <button
            disabled={Object.keys(cartItems).length === 0}
            onClick={() => router.navigate({ to: "/order-summary" })}
            className={`px-8 py-3 rounded-2xl font-black uppercase text-sm tracking-widest transition-all transform active:scale-95 ${
              Object.keys(cartItems).length > 0
                ? "bg-[#D35400] text-white hover:bg-[#b34700] shadow-lg shadow-orange-700/20"
                : "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200"
            }`}
          >
            Check Out
          </button>
        </div>
      </div>
    </footer>
  );
}
