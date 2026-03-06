import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ProductDetailView } from "@/components/product/ProductDetailView";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { withTimeout } from "@/utils/helpers";
import supabase from "@/utils/supabase";

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

export const Route = createFileRoute("/product/$product_id")({
  loader: async ({ params: { product_id } }) => {
    // Try to find by product_id
    const { data: product, error: productError } = await withTimeout(
      supabase
        .from("products")
        .select(PRODUCT_WITH_PICKUP_SELECT)
        .eq("product_id", product_id)
        .maybeSingle()
    );

    if (productError) throw productError;
    if (!product) throw new Error("Product not found");

    let pickupAddress = product.pickup_address ?? null;
    let pickupLookupHint = null;

    if (!pickupAddress) {
      const pickupAddressId = normalizeValue(product.pickup_address_id ?? null);

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
              .or(
                `name.ilike.%${pickupText}%,address_detail.ilike.%${pickupText}%`
              )
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
      pickupLookupHint
    };
  },
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
      <p className="text-red-600 font-bold">
        {error.message || "Failed to load product"}
      </p>
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
      <Loading fullScreen={false} size={150} />
    </div>
  )
});

function RouteComponent() {
  const { product, pickupAddress, pickupLookupHint } = Route.useLoaderData();
  const { product_id } = Route.useParams();
  const router = useRouter();

  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const maxQty = product?.qty ?? 0;
  const existingQty = cartItems[product_id] || 0;

  // Initialize qty from existing cart quantity or default to 1
  const [qty, setQty] = useState(() => {
    const startQty = existingQty > 0 ? existingQty : 1;
    return Math.min(Math.max(startQty, 1), product?.qty ?? 1);
  });

  // Adjust qty state if the product_id changes (navigation between products)
  const [prevProductId, setPrevProductId] = useState(product_id);
  if (product_id !== prevProductId) {
    setPrevProductId(product_id);
    const startQty = existingQty > 0 ? existingQty : 1;
    setQty(Math.min(Math.max(startQty, 1), product?.qty ?? 1));
  }

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
        setQuantity(product_id, Math.min(qty, maxQty));
        router.navigate({ to: "/product" });
      }}
      onBuyNow={() => {
        if (isOutOfStock) return;
        setQuantity(product_id, Math.min(qty, maxQty));
        router.navigate({ to: "/order-summary" });
      }}
    />
  );
}
