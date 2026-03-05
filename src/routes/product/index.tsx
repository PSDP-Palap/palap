import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import supabase from "@/utils/supabase";
import { Search } from 'lucide-react';

// router utilities and cart store
import { useCartStore } from "@/stores/useCartStore";

import { ProductCard } from '@/components/product/ProductCard';
import { CartFooter } from '@/components/product/CartFooter';
import type { Product } from '@/types/product';

export const Route = createFileRoute("/product/")({
  component: RouteComponent
});


function RouteComponent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // global cart state
  const cartItems = useCartStore((s) => s.items);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const [isFooterCartExpanded, setIsFooterCartExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("DEBUG: Calling supabase.from('products').select('*')...");

      const response = await supabase
            .from('products')
            .select('product_id, name, price, qty, image_url')
            .order('name', { ascending: true })
            .limit(100);

      console.log("DEBUG: Supabase response received:", response);
      const { data, error: fetchError } = response;

      if (fetchError) {
        console.error("DEBUG: Supabase fetch error:", fetchError);
        throw fetchError;
      }

      if (data) {
        const mapped: Product[] = data.map((item: any) => ({
          id: String(item.product_id),
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          image_url: item.image_url,
        }));
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        subtotal: item.price * qty,
      };
    })
    .filter((row): row is { id: string; name: string; imageUrl: string | null; qty: number; unitPrice: number; subtotal: number } => !!row);

  const filteredProducts = products.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      item.name.toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <button
          className="bg-[#D35400] text-white px-6 py-2 rounded-lg"
          onClick={() => {
            load();
          }}
        >Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-32"> 
      <main className="max-w-6xl mx-auto p-6 pt-28">

        <div className="bg-[#FF914D] rounded-2xl p-8 mb-8 relative overflow-hidden flex justify-between items-center shadow-lg border-b-4 border-orange-600/20">
          <div className="z-10">
            <h1 className="text-3xl font-black text-white uppercase">SELECT PRODUCTS</h1>
            <p className="text-white/90 text-sm font-semibold mt-1">High quality supplies for your pet</p>
          </div>
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
              cartQuantity={cartItems[item.id] || 0}
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
