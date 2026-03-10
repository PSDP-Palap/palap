interface OrderItem {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderItemsListProps {
  orderRows: OrderItem[];
  setCartQuantity: (id: string, qty: number) => void;
  removeCartItem: (id: string) => void;
}

export function OrderItemsList({
  orderRows,
  setCartQuantity,
  removeCartItem,
}: OrderItemsListProps) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-black text-[#4A2600] mb-3">Service Details</h2>

      {orderRows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No selected product. Please select an item first.
        </p>
      ) : (
        <div className="space-y-2 max-h-[255px] overflow-y-auto pr-1">
          {orderRows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={row.imageUrl || "/shiba.png"}
                  alt={row.name}
                  className="w-12 h-12 rounded-lg object-cover border border-orange-100 flex-none"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#4A2600] truncate">{row.name}</p>
                  <p className="text-gray-500">
                    {row.quantity} x ฿{row.unitPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCartQuantity(row.id, row.quantity - 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="min-w-6 text-center font-bold text-[#4A2600]">
                    {row.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCartQuantity(row.id, row.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeCartItem(row.id)}
                  className="px-2 py-1 rounded-md bg-red-50 text-red-600 font-black text-[10px] uppercase hover:bg-red-100"
                >
                  Remove
                </button>

                <p className="font-black text-[#4A2600] min-w-[78px] text-right">
                  ฿{row.subtotal.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
