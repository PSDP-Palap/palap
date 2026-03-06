import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { CartFooter } from "@/components/product/CartFooter";
import { ProductCard } from "@/components/product/ProductCard";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

interface RawProductRow {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
  created_at: string;
  pickup_address_id: string | null;
}

export const Route = createFileRoute("/product/")({
  loader: async () => {
    // Direct query without withTimeout, similar to AdminTab fetch pattern
    const { data, error } = await supabase
      .from("products")
      .select("product_id, name, price, qty, image_url, created_at, pickup_address_id")
      .order("name", { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    const rawData = (data as unknown as RawProductRow[]) || [];
    const products: Product[] = rawData.map((item) => ({
      id: String(item.product_id),
      product_id: String(item.product_id),
      name: String(item.name),
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      image_url: item.image_url || null,
      created_at: String(item.created_at),
      pickup_address_id: item.pickup_address_id || null
    }));

    return { products };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center">
      <p className="text-red-600 font-bold mb-4">
        {error.message || "Failed to load products"}
      </p>
      <button
        className="bg-[#D35400] text-white px-6 py-2 rounded-lg"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
      <Loading fullScreen={false} size={150} />
    </div>
  )
});

function RouteComponent() {
  const { products: initialProducts } = Route.useLoaderData();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");

  // global cart state
  const cartItems = useCartStore((s) => s.items);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const [isFooterCartExpanded, setIsFooterCartExpanded] = useState(false);

  // Sync products if loader data changes
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const totalPrice = Object.entries(cartItems).reduce((sum, [id, qty]) => {
    const item = products.find((p) => p.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);
  const selectedItemCount = Object.values(cartItems).reduce((a, b) => a + b, 0);

  const selectedCartRows = Object.entries(cartItems)
    .map(([id, qty]) => {
      const item = products.find((p) => p.id === id);
      if (!item) return null;
      return {
        id,
        name: item.name,
        imageUrl: item.image_url || null,
        qty,
        unitPrice: item.price,
        subtotal: item.price * qty
      };
    })
    .filter(
      (
        row
      ): row is {
        id: string;
        name: string;
        imageUrl: string | null;
        qty: number;
        unitPrice: number;
        subtotal: number;
      } => !!row
    );

  const filteredProducts = products.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return item.name.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-32">
      <main className="max-w-6xl mx-auto p-6 pt-28">
        <div className="flex items-center pl-8 bg-[#FF914D] rounded-2xl mb-8 relative overflow-hidden shadow-lg">
          <div className="z-10">
            <h1 className="text-3xl font-black text-white uppercase">
              SELECT PRODUCTS
            </h1>
            <p className="text-white/90 text-sm font-semibold mt-1">
              High quality supplies for your pet
            </p>
          </div>
          <img src="/cat.png" alt="cat" className="ml-auto" />
        </div>

        <div className="mb-8 bg-white rounded-xl border border-orange-200 p-2 shadow-sm flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search products"
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <button
            type="button"
            className="bg-[#A74607] hover:bg-[#923c05] text-white text-xs font-black uppercase tracking-wide px-5 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              cartQuantity={cartItems[item.id || ""] || 0}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No products found for "{searchQuery}".
          </div>
        )}
      </main>

      <CartFooter
        isFooterCartExpanded={isFooterCartExpanded}
        setIsFooterCartExpanded={setIsFooterCartExpanded}
        selectedCartRows={selectedCartRows}
        setCartQuantity={setCartQuantity}
        removeCartItem={removeCartItem}
        selectedItemCount={selectedItemCount}
        totalPrice={totalPrice}
        cartItems={cartItems}
      />
    </div>
  );
}
