import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, Grid, List, ChevronDown, Filter } from "lucide-react";
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
  category: string | null;
  created_at: string;
  pickup_address_id: string | null;
}

const CATEGORIES = ["All", "Food", "Toys", "Treats", "Accessories", "Health"];

export const Route = createFileRoute("/product/")({
  loader: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("product_id, name, price, qty, image_url, category, created_at, pickup_address_id")
      .order("name", { ascending: true })
      .limit(100);

    if (error) throw error;

    const rawData = (data as unknown as RawProductRow[]) || [];
    const products: Product[] = rawData.map((item) => ({
      id: String(item.product_id),
      product_id: String(item.product_id),
      name: String(item.name),
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      image_url: item.image_url || null,
      category: item.category || null,
      created_at: String(item.created_at),
      pickup_address_id: item.pickup_address_id || null
    }));

    return { products };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center">
      <p className="text-red-600 font-bold mb-4">{error.message || "Failed to load products"}</p>
      <button className="bg-[#D35400] text-white px-6 py-2 rounded-xl" onClick={() => window.location.reload()}>Retry</button>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center pt-24">
      <Loading fullScreen={false} size={150} />
    </div>
  )
});

function RouteComponent() {
  const { products: initialProducts } = Route.useLoaderData();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const cartItems = useCartStore((s) => s.items);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const [isFooterCartExpanded, setIsFooterCartExpanded] = useState(false);

  useEffect(() => { setProducts(initialProducts); }, [initialProducts]);

  const totalPrice = Object.entries(cartItems).reduce((sum, [id, qty]) => {
    const item = products.find((p) => p.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);
  const selectedItemCount = Object.values(cartItems).reduce((a, b) => a + b, 0);

  const selectedCartRows = Object.entries(cartItems)
    .map(([id, qty]) => {
      const item = products.find((p) => p.id === id);
      if (!item) return null;
      return { id, name: item.name, imageUrl: item.image_url || null, qty, unitPrice: item.price, subtotal: item.price * qty };
    })
    .filter((row): row is any => !!row);

  const filteredProducts = products
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "All" || 
        (item.category?.toLowerCase() === selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans pb-32">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        {/* Banner Section */}
        <div className="relative rounded-[2.5rem] bg-linear-to-r from-[#FF914D] to-[#FF7F32] overflow-hidden shadow-2xl shadow-orange-900/20 mb-12 group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left space-y-4 max-w-lg">
              <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/30">New Season 2024</span>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                PREMIUM <span className="text-[#4A2600]">PET CARE</span> SUPPLIES
              </h1>
              <p className="text-white/90 text-sm md:text-lg font-bold">
                Give your furry friends the quality they deserve with our handpicked collection.
              </p>
            </div>
            <div className="mt-8 md:mt-0 transition-transform duration-700 group-hover:scale-105">
              <img src="/cat.png" alt="cat" className="w-64 md:w-80 drop-shadow-2xl" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mock Sidebar Filter */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#4A2600] uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-4 h-4" /> Categories
              </h3>
              <div className="flex flex-col gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left px-4 py-3 rounded-2xl text-sm font-black transition-all ${selectedCategory === cat ? "bg-[#4A2600] text-white shadow-lg" : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-orange-50 border border-orange-100">
              <h4 className="font-black text-[#4A2600] text-sm uppercase mb-2">Special Offer</h4>
              <p className="text-[10px] text-orange-800 font-bold mb-4 leading-relaxed">Get 20% off on all treats when you buy 3 or more!</p>
              <div className="w-full h-24 bg-white rounded-2xl border border-orange-100 flex items-center justify-center">
                <span className="text-2xl font-black text-orange-600">-20%</span>
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="What does your pet need today?"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative group w-full sm:w-48">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none w-full pl-4 pr-10 py-3 bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-wider outline-none cursor-pointer border-none"
                  >
                    <option value="newest">Sort by: Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  cartQuantity={cartItems[item.id || ""] || 0}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <div>
                  <p className="text-lg font-black text-[#4A2600]">No products found</p>
                  <p className="text-sm text-gray-500">Try searching for something else or clear your filters.</p>
                </div>
                <button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="text-sm font-black text-orange-600 hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        </div>
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
