import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useEffect } from "react";

import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useProductStore } from "@/stores/useProductStore";
import { useServiceStore } from "@/stores/useServiceStore";

export const Route = createFileRoute("/_authenticated/cart")({
  component: CartPage
});

function CartPage() {
  const router = useRouter();
  const { items, setQuantity, remove, clear } = useCartStore();
  const { products, loadProducts, isLoading } = useProductStore();

  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [products.length, loadProducts]);

  const cartRows = Object.entries(items)
    .map(([id, qty]) => {
      const product = products.find((p) => String(p.product_id) === id);
      if (!product) return null;
      return {
        id,
        name: product.name,
        price: product.price,
        imageUrl: product.image_url,
        qty,
        subtotal: product.price * qty
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  const totalPrice = cartRows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalItems = cartRows.reduce((sum, row) => sum + row.qty, 0);

  if (isLoading && products.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-6 md:pt-24 flex items-center justify-center">
        <Loading fullScreen={false} size={80} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-6 md:pt-28 pb-24 md:pb-10 font-sans">
      <main className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-black text-[#4A2600] uppercase flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-[#FF914D]" />
            Your Cart
          </h1>
        </div>

        {cartRows.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-orange-100">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-orange-200" />
            </div>
            <h2 className="text-xl font-bold text-[#4A2600] mb-2">
              ตะกร้าของคุณยังว่างอยู่
            </h2>
            <p className="text-gray-500 mb-8">
              ออกไปเลือกซื้อสินค้าดีๆ ให้สัตว์เลี้ยงของคุณกันเถอะ!
            </p>
            <button
              onClick={() => router.navigate({ to: "/product" })}
              className="bg-[#D35400] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-[#b34700] transition-all shadow-lg shadow-orange-700/20 active:scale-95"
            >
              ไปที่หน้าสินค้า
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="p-6 divide-y divide-gray-100">
                {cartRows.map((row) => (
                  <div
                    key={row.id}
                    className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4"
                  >
                    <div className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden border border-orange-50 shrink-0 mx-auto sm:mx-0">
                      <img
                        src={row.imageUrl || "/shiba.png"}
                        alt={row.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between text-center sm:text-left">
                      <div>
                        <h3 className="font-bold text-lg text-[#4A2600] truncate">
                          {row.name}
                        </h3>
                        <p className="text-orange-600 font-black">
                          ฿ {row.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-4 mt-4 sm:mt-0">
                        <div className="flex items-center bg-gray-100 rounded-xl p-1">
                          <button
                            onClick={() => setQuantity(row.id, row.qty - 1)}
                            className="w-8 h-8 flex items-center justify-center font-black text-[#4A2600] hover:bg-white rounded-lg transition-colors"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-bold text-[#4A2600]">
                            {row.qty}
                          </span>
                          <button
                            onClick={() => setQuantity(row.id, row.qty + 1)}
                            className="w-8 h-8 flex items-center justify-center font-black text-[#4A2600] hover:bg-white rounded-lg transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(row.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-center sm:text-right flex flex-col justify-center shrink-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Subtotal
                      </p>
                      <p className="text-xl font-black text-[#4A2600]">
                        ฿ {row.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-orange-50/50 p-4 border-t border-orange-100 flex justify-end">
                <button
                  onClick={clear}
                  className="text-xs font-black text-red-600 uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  ล้างตะกร้าสินค้า
                </button>
              </div>
            </div>

            <div className="bg-[#4A2600] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShoppingCart className="w-32 h-32 rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-orange-200/70 text-sm font-bold uppercase tracking-widest mb-1">
                      Total Items
                    </p>
                    <p className="text-2xl font-black">{totalItems} ชิ้น</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-200/70 text-sm font-bold uppercase tracking-widest mb-1">
                      Grand Total
                    </p>
                    <p className="text-4xl font-black text-[#FF914D]">
                      ฿ {totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Clear any pending service hire when switching to product checkout from cart
                    useServiceStore.getState().setSelectedServiceForHire(null);
                    router.navigate({ to: "/order-summary" });
                  }}
                  className="w-full bg-[#FF914D] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-lg hover:bg-white hover:text-[#D35400] transition-all duration-300 shadow-lg active:scale-95"
                >
                  Check Out Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
