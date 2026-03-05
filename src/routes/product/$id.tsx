import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import supabase from "@/utils/supabase";
import { useCartStore } from "@/stores/useCartStore";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { withTimeout } from "@/utils/helpers";

const PRODUCT_WITH_PICKUP_SELECT = `
  *,
  pickup_address:addresses (
    id,
    name,
    address_detail,
    lat,
    lng
  )
`;

const normalizeValue = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params: { id } }) => {
    // Try to find by product_id
    const { data: product, error: productError } = await withTimeout(
      supabase
        .from("products")
        .select(PRODUCT_WITH_PICKUP_SELECT)
        .eq("product_id", id)
        .maybeSingle()
    );

    if (productError) throw productError;
    if (!product) throw new Error("Product not found");

    let pickupAddress = product.pickup_address ?? null;
    let pickupLookupHint = null;

    if (!pickupAddress) {
      const pickupAddressId = normalizeValue(
        product.pickup_address_id ??
          null
      );

      if (!pickupAddressId) {
        const pickupText = normalizeValue(
          product.pickup_address ??
            product.pickup_location ??
            product.pickup_address_name ??
            product.pickup_address_detail ??
            null
        );

        if (pickupText) {
          const { data: addressByText } = await withTimeout(
            supabase
              .from("addresses")
              .select("id, name, address_detail, lat, lng")
              .or(`name.ilike.%${pickupText}%,address_detail.ilike.%${pickupText}%`)
              .limit(1)
              .maybeSingle()
          );

          if (addressByText) {
            pickupAddress = addressByText;
          } else {
            pickupLookupHint = `No linked address id on this product (value: ${pickupText}).`;
          }
        }
      } else {
        const { data: addressRow } = await withTimeout(
          supabase
            .from("addresses")
            .select("id, name, address_detail, lat, lng")
            .eq("id", pickupAddressId)
            .maybeSingle()
        );

        if (addressRow) {
          pickupAddress = addressRow;
        } else {
          pickupLookupHint = `Linked pickup_address_id not found in addresses: ${pickupAddressId}`;
        }
      }
    }

    return {
      product,
      pickupAddress,
      pickupLookupHint,
    };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
      <p className="text-red-600 font-bold">{error.message || "Failed to load product"}</p>
      <a
        href="/product"
        className="bg-[#D35400] text-white px-4 py-2 rounded-lg font-bold"
      >
        Back to Products
      </a>
    </div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D35400] font-bold animate-pulse">Loading Products...</p>
      </div>
    </div>
  ),
});

function RouteComponent() {
  const { product, pickupAddress, pickupLookupHint } = Route.useLoaderData();
  const { id } = Route.useParams();
  const router = useRouter();

  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const maxQty = product?.qty ?? 0;
  const existingQty = cartItems[id] || 0;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    const startQty = existingQty > 0 ? existingQty : 1;
    setQty(Math.min(Math.max(startQty, 1), product.qty ?? 1));
  }, [product, existingQty]);

  const isOutOfStock = useMemo(() => (product?.qty ?? 0) <= 0, [product]);

  return (
    <ProductDetailView
      product={product}
      pickupAddress={pickupAddress}
      pickupLookupHint={pickupLookupHint}
      maxQty={maxQty}
      qty={qty}
      setQty={setQty}
      isOutOfStock={isOutOfStock}
      existingQty={existingQty}
      onAddToCart={() => {
        if (isOutOfStock) return;
        setQuantity(id, Math.min(qty, maxQty));
        router.navigate({ to: "/product" });
      }}
      onBuyNow={() => {
        if (isOutOfStock) return;
        setQuantity(id, Math.min(qty, maxQty));
        router.navigate({ to: "/order-summary" });
      }}
    />
  );
}
