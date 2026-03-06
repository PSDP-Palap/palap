import { Link } from "@tanstack/react-router";

import favoriteIcon from "@/assets/3d659b7bdc33c87baf693bc75bf90986.jpg";
import type { Address } from "@/types/address";
import type { Product } from "@/types/product";

interface ProductDetailViewProps {
  product: Product;
  pickupAddress: Address | null;
  pickupLookupHint: string | null;
  maxQty: number;
  qty: number;
  setQty: (val: number | ((prev: number) => number)) => void;
  isOutOfStock: boolean;
  existingQty: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export function ProductDetailView({
  product,
  pickupAddress,
  pickupLookupHint,
  maxQty,
  qty,
  setQty,
  isOutOfStock,
  existingQty,
  onAddToCart,
  onBuyNow
}: ProductDetailViewProps) {
  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                <img
                  src={
                    product.image_url || "https://via.placeholder.com/600x600"
                  }
                  alt={product.name}
                  className="w-full aspect-square object-cover rounded-xl"
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-orange-900/60 font-semibold">
                <img
                  src={favoriteIcon}
                  alt="favorite"
                  className="w-5 h-5 rounded-full object-cover"
                />
                Favorite style matches your product cards
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700/70">
                Product Detail
              </p>
              <h1 className="text-3xl font-black text-[#4A2600] leading-tight">
                {product.name}
              </h1>

              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <p className="text-sm text-orange-800/70 font-bold uppercase">
                  Price
                </p>
                <p className="text-4xl font-black text-orange-600">
                  ฿{product.price}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-500 mb-2">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.description || "No description available"}
                </p>
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm font-bold text-orange-700 mb-2">
                  Pickup Address
                </p>

                {pickupAddress ? (
                  <div className="space-y-1 text-sm text-[#4A2600]">
                    <p className="font-semibold">
                      {pickupAddress.name || "Pickup point"}
                    </p>
                    <p>{pickupAddress.address_detail || "No address detail"}</p>
                    {pickupAddress.lat != null && pickupAddress.lng != null && (
                      <p className="text-xs text-orange-900/70">
                        Lat: {pickupAddress.lat}, Lng: {pickupAddress.lng}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      No pickup address linked to this product.
                    </p>
                    {pickupLookupHint && (
                      <p className="text-xs text-red-600">{pickupLookupHint}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-orange-100 p-4 bg-white">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">
                    Stock
                  </p>
                  <p className="text-lg font-black text-[#4A2600]">{maxQty}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q: number) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 font-black"
                    disabled={isOutOfStock}
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-black text-lg">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQty((q: number) => Math.min(maxQty || 1, q + 1))
                    }
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 font-black"
                    disabled={isOutOfStock || qty >= maxQty}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={isOutOfStock}
                  className={`px-5 py-3 rounded-xl font-black uppercase tracking-wide ${
                    isOutOfStock
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#D35400] text-white hover:bg-[#b34700]"
                  }`}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={onBuyNow}
                  disabled={isOutOfStock}
                  className={`px-5 py-3 rounded-xl font-black uppercase tracking-wide ${
                    isOutOfStock
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  Buy now
                </button>
              </div>

              <div className="pt-2">
                <Link
                  to="/product"
                  className="inline-flex w-full justify-center px-5 py-3 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 uppercase tracking-wide transition-all"
                >
                  Back to Products
                </Link>
              </div>

              {existingQty > 0 && (
                <p className="text-xs font-bold text-orange-700/70">
                  Currently selected: {existingQty}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
