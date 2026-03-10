import { useRouter } from "@tanstack/react-router";
import { Star, ShoppingCart, Eye, Heart } from "lucide-react";
import { useState } from "react";

import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  roundedClassName?: string;
}

export function ProductCard({
  product,
  cartQuantity,
  roundedClassName = "rounded-3xl"
}: ProductCardProps) {
  const router = useRouter();
  const isSelected = cartQuantity > 0;
  const setQuantity = useCartStore((s) => s.setQuantity);
  const [isHovered, setIsHovered] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((product.qty ?? 0) <= 0) {
      toast.error("Out of stock");
      return;
    }
    setQuantity(product.id || product.product_id || "", cartQuantity + 1);
    toast.success(`Added ${product.name} to cart`);
  };

  return (
    <div 
      className="relative h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => {
          router.navigate({
            to: "/product/$product_id",
            params: { product_id: product.id || product.product_id || "" }
          });
        }}
        className={`bg-white ${roundedClassName} overflow-hidden shadow-sm transition-all duration-500 cursor-pointer border border-transparent h-full flex flex-col
          ${isSelected ? "ring-2 ring-orange-500 shadow-lg shadow-orange-900/10" : "hover:shadow-xl hover:shadow-orange-900/5 hover:-translate-y-1"}`}
      >
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image_url || "https://via.placeholder.com/400x400"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {(product.qty ?? 0) <= 5 && (product.qty ?? 0) > 0 && (
              <span className="px-2 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                Low Stock
              </span>
            )}
            {(product.qty ?? 0) <= 0 && (
              <span className="px-2 py-1 rounded-lg bg-gray-800 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                Out of Stock
              </span>
            )}
          </div>

          <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all text-gray-400 hover:text-red-500">
            <Heart className="w-4 h-4" />
          </button>

          {/* Quick Action Overlay */}
          <div className={`absolute inset-0 bg-black/5 flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <button 
              onClick={handleQuickAdd}
              className="p-3 rounded-2xl bg-orange-600 text-white shadow-xl hover:bg-[#b34700] transition-all transform hover:scale-110 active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-2xl bg-white text-[#4A2600] shadow-xl hover:bg-gray-50 transition-all transform hover:scale-110 active:scale-95">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
            </div>
            <span className="text-[10px] font-black text-gray-400">4.8 (24)</span>
          </div>

          <h3 className="font-black text-[#4A2600] leading-tight mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
          
          <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed flex-1">
            {product.description || "Premium quality product for your beloved pet."}
          </p>

          <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-50">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                Price
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-orange-600">
                  ฿{product.price.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-400 line-through font-bold">
                  ฿{(product.price * 1.2).toFixed(0)}
                </span>
              </div>
            </div>
            
            {isSelected && (
              <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                <span className="text-[10px] font-black text-orange-600">{cartQuantity} in cart</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
