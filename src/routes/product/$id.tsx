import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import supabase from "@/utils/supabase";
import { useCartStore } from "@/stores/useCartStore";
import { ProductDetailView } from "@/components/product/ProductDetailView";

export const Route = createFileRoute("/product/$id")({
  component: RouteComponent
});

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

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();

  const [product, setProduct] = useState<any | null>(null);
  const [pickupAddress, setPickupAddress] = useState<{
    id?: string;
    name?: string | null;
    address_detail?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null>(null);
  const [pickupLookupHint, setPickupLookupHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const maxQty = product?.qty ?? 0;
  const existingQty = cartItems[id] || 0;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let isActive = true;

    const withTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs = 12000): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out. Please try again."));
        }, timeoutMs);

        Promise.resolve(promiseLike)
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };

    const loadProduct = async () => {
      try {
        if (!isActive) return;
        setLoading(true);
        setError(null);

        const byProductId = await withTimeout(
          supabase
            .from("products")
            .select(PRODUCT_WITH_PICKUP_SELECT)
            .eq("product_id", id)
            .maybeSingle()
        );

        if (!isActive) return;
        if (byProductId.error) throw byProductId.error;

        let foundProduct = byProductId.data;

        if (!foundProduct) {
          const byId = await withTimeout(
            supabase
              .from("products")
              .select(PRODUCT_WITH_PICKUP_SELECT)
              .eq("id", id)
              .maybeSingle()
          );

          if (!isActive) return;
          if (byId.error) throw byId.error;
          foundProduct = byId.data;
        }

        if (!foundProduct) {
          throw new Error("Product not found");
        }

        setProduct(foundProduct);

        const relationPickupAddress = foundProduct.pickup_address ?? null;
        if (relationPickupAddress) {
          setPickupAddress(relationPickupAddress);
          setPickupLookupHint(null);
          return;
        }

        const pickupAddressId = normalizeValue(
          foundProduct.pickup_address_id ??
          foundProduct.pickupAddressId ??
          foundProduct.address_id ??
          foundProduct.pickup_address_uuid ??
          null
        );

        if (!pickupAddressId) {
          const pickupText = normalizeValue(
            foundProduct.pickup_address ??
            foundProduct.pickup_location ??
            foundProduct.pickup_address_name ??
            foundProduct.pickup_address_detail ??
            null
          );

          if (!pickupText) {
            setPickupLookupHint(null);
            setPickupAddress(null);
            return;
          }

          const { data: addressByText, error: addressByTextError } = await withTimeout(
            supabase
              .from("addresses")
              .select("id, name, address_detail, lat, lng")
              .or(`name.ilike.%${pickupText}%,address_detail.ilike.%${pickupText}%`)
              .limit(1)
              .maybeSingle()
          );

          if (!isActive) return;
          if (addressByTextError || !addressByText) {
            setPickupLookupHint(`No linked address id on this product (value: ${pickupText}).`);
            setPickupAddress(null);
            return;
          }

          setPickupLookupHint(null);
          setPickupAddress(addressByText);
          return;
        }

        const { data: addressRow, error: addressError } = await withTimeout(
          supabase
            .from("addresses")
            .select("id, name, address_detail, lat, lng")
            .eq("id", pickupAddressId)
            .maybeSingle()
        );

        if (!isActive) return;
        if (addressError || !addressRow) {
          setPickupLookupHint(`Linked pickup_address_id not found in addresses: ${pickupAddressId}`);
          setPickupAddress(null);
          return;
        }

        setPickupLookupHint(null);
        setPickupAddress(addressRow ?? null);
      } catch (err: any) {
        if (!isActive) return;
        setProduct(null);
        setPickupAddress(null);
        setPickupLookupHint(null);
        setError(err.message || "Failed to load product");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    loadProduct();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const startQty = existingQty > 0 ? existingQty : 1;
    setQty(Math.min(Math.max(startQty, 1), product.qty ?? 1));
  }, [product, existingQty]);

  const isOutOfStock = useMemo(() => (product?.qty ?? 0) <= 0, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Products...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-red-600 font-bold">{error || "Product not found"}</p>
        <button
          className="bg-[#D35400] text-white px-4 py-2 rounded-lg font-bold"
          onClick={() => router.navigate({ to: "/product" })}
        >
          Back to Services
        </button>
      </div>
    );
  }

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
