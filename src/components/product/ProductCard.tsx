import { useRouter } from "@tanstack/react-router";

import favoriteIcon from "@/assets/3d659b7bdc33c87baf693bc75bf90986.jpg";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  roundedClassName?: string;
}

export function ProductCard({
  product,
  cartQuantity,
  roundedClassName = "rounded-2xl"
}: ProductCardProps) {
  const router = useRouter();
  const isSelected = cartQuantity > 0;

  return (
    <div className="relative h-full">
      <div
        onClick={() => {
          router.navigate({
            to: "/product/$product_id",
            params: { product_id: product.id || product.product_id || "" }
          });
        }}
        className={`bg-white ${roundedClassName} p-5 shadow-sm transition-all cursor-pointer border-2 h-full flex flex-col group
          ${isSelected ? "border-orange-500 ring-4 ring-orange-500/10 scale-[1.02]" : "border-transparent hover:border-orange-200 hover:shadow-md"}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
            <img
              src={product.image_url || "/shiba.png"}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="relative">
            <img
              src={favoriteIcon}
              alt="favorite"
              className={`w-7 h-7 object-cover ${isSelected ? "opacity-100" : "opacity-30"} `}
            />
            {isSelected && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartQuantity}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-lg text-[#4A2600] leading-tight mb-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 grow leading-relaxed">
          {product.description}
        </p>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold mb-1">
              Stock: {product.qty ?? 0}
            </span>
            <span
              className={`text-2xl font-black transition-colors ${isSelected ? "text-orange-600" : "text-[#4A2600]"}`}
            >
              ฿{product.price}
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-tighter text-gray-400 group-hover:text-orange-600 transition-colors">
            View Product →
          </span>
        </div>
      </div>
    </div>
  );
}
