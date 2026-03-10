/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { DateTimeSection } from "@/components/payment/DateTimeSection";
import { LocationSection } from "@/components/payment/LocationSection";
import { OrderItemsList } from "@/components/payment/OrderItemsList";
import { PriceSummarySide } from "@/components/payment/PriceSummarySide";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import type { SavedAddressSnapshot } from "@/types/payment";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/order-summary")({
  component: RouteComponent
});

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [locationLat, setLocationLat] = useState("13.7563");
  const [locationLng, setLocationLng] = useState("100.5018");
  const [destinationAddressId, setDestinationAddressId] = useState<
    string | null
  >(null);
  const [savedAddress, setSavedAddress] = useState<SavedAddressSnapshot | null>(
    null
  );
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [proceedingToPayment, setProceedingToPayment] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);

  const isCartReady = hasHydrated || cartHydrationTimedOut;

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      setCartHydrationTimedOut(true);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasHydrated]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!isCartReady) {
        return;
      }

      const selectedIds = Object.keys(cartItems);

      if (selectedIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*");

        if (error) throw error;

        const selectedSet = new Set(selectedIds.map((value) => String(value)));

        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            description: item.description,
            price: Number(item.price ?? 0),
            qty: item.qty,
            image_url: item.image_url
          }))
          .filter((item) => item.id && selectedSet.has(item.id));

        setProducts(normalized as Product[]);
      } catch (err) {
        console.error("Failed to load selected products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedProducts();
  }, [cartItems, isCartReady]);

  useEffect(() => {
    const loadCustomerLocation = async () => {
      if (!currentUserId) return;

      try {
        setLoading(true);
        setLocationError(null);

        const { data: customerRow, error: customerError } = await supabase
          .from("customers")
          .select("address_id")
          .eq("id", currentUserId)
          .maybeSingle();

        if (customerError) throw customerError;

        const addressId = customerRow?.address_id
          ? String(customerRow.address_id)
          : null;
        
        if (!addressId) {
          // Fallback to profile address text if available
          if (profile?.address) {
            setLocationName("Home Address");
            setLocationDetail(profile.address);
            setIsEditingLocation(true); // Open edit so they can confirm/adjust on map
          } else {
            setDestinationAddressId(null);
            setSavedAddress(null);
            setLocationName("");
            setLocationDetail("");
            setLocationError("No address found. Please provide your delivery location.");
            setIsEditingLocation(true); // Force edit mode if no address
          }
          return;
        }

        const { data: addressRow, error: addressError } = await supabase
          .from("addresses")
          .select("id, name, address_detail, lat, lng")
          .eq("id", addressId)
          .maybeSingle();

        if (addressError) throw addressError;
        if (!addressRow) {
          setLocationError("Your saved address record was not found. Please set a new one.");
          setIsEditingLocation(true);
          return;
        }

        const snapshot: SavedAddressSnapshot = {
          id: String(addressRow.id),
          name: addressRow.name || "Location Main",
          detail: addressRow.address_detail || "",
          lat: addressRow.lat != null ? String(addressRow.lat) : "13.7563",
          lng: addressRow.lng != null ? String(addressRow.lng) : "100.5018"
        };

        setDestinationAddressId(snapshot.id);
        setSavedAddress(snapshot);
        setLocationName(snapshot.name);
        setLocationDetail(snapshot.detail);
        setLocationLat(snapshot.lat);
        setLocationLng(snapshot.lng);
      } catch (err: any) {
        setLocationError(err?.message || "Unable to load your saved location.");
      } finally {
        setLoading(false);
      }
    };

    loadCustomerLocation();
  }, [currentUserId, profile?.id, profile?.address]);

  const persistLocation = async () => {
    if (!currentUserId) {
      setLocationError("Please sign in to save location.");
      return null;
    }

    const payload = {
      name: locationName.trim() || "Location Main",
      address_detail: locationDetail.trim() || null,
      lat: toNumber(locationLat),
      lng: toNumber(locationLng)
    };

    let nextAddressId = destinationAddressId;

    if (destinationAddressId) {
      const { error: updateAddressError } = await supabase
        .from("addresses")
        .update(payload)
        .eq("id", destinationAddressId);

      if (updateAddressError) throw updateAddressError;
    } else {
      const { data: insertedAddress, error: insertAddressError } =
        await supabase
          .from("addresses")
          .insert([
            {
              ...payload,
              profile_id: currentUserId
            }
          ])
          .select("id")
          .single();

      if (insertAddressError) throw insertAddressError;
      nextAddressId = insertedAddress?.id ? String(insertedAddress.id) : null;
      setDestinationAddressId(nextAddressId);
    }

    if (!nextAddressId) {
      throw new Error("Unable to resolve destination address id.");
    }

    const { error: upsertCustomerError } = await supabase
      .from("customers")
      .upsert([
        {
          id: currentUserId,
          address_id: nextAddressId,
          updated_at: new Date().toISOString()
        }
      ]);

    if (upsertCustomerError) throw upsertCustomerError;

    setSavedAddress({
      id: nextAddressId,
      name: payload.name,
      detail: payload.address_detail ?? "",
      lat: payload.lat != null ? String(payload.lat) : "13.7563",
      lng: payload.lng != null ? String(payload.lng) : "100.5018"
    });

    return nextAddressId;
  };

  const saveLocation = async () => {
    try {
      setSavingLocation(true);
      setLocationError(null);

      const nextAddressId = await persistLocation();
      if (!nextAddressId) return;

      setIsEditingLocation(false);
    } catch (err: any) {
      setLocationError(err?.message || "Failed to save location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const resolveAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      setResolvingAddress(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) return;
      const data = await response.json();

      const nextName =
        data?.address?.road ||
        data?.address?.suburb ||
        data?.address?.city ||
        data?.address?.town ||
        "Current Location";
      const nextDetail = data?.display_name || "";

      if (nextName) setLocationName(nextName);
      if (nextDetail) setLocationDetail(nextDetail);
    } catch (error) {
      console.log(error);
    } finally {
      setResolvingAddress(false);
    }
  };

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not available in this browser.");
      return;
    }

    setDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocationLat(String(latitude));
        setLocationLng(String(longitude));
        await resolveAddressFromCoordinates(latitude, longitude);
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
        setLocationError(
          "Unable to get your current location. Please allow location permission."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000
      }
    );
  };

  const useSavedAddress = () => {
    if (!savedAddress) {
      setLocationError("No saved address found yet.");
      return;
    }

    setLocationError(null);
    setDestinationAddressId(savedAddress.id);
    setLocationName(savedAddress.name);
    setLocationDetail(savedAddress.detail);
    setLocationLat(savedAddress.lat);
    setLocationLng(savedAddress.lng);
  };

  const updateLocationFromMapCenter = (nextLat: number, nextLng: number) => {
    setLocationLat(String(Number(nextLat.toFixed(6))));
    setLocationLng(String(Number(nextLng.toFixed(6))));
    setLocationError(null);
  };

  const proceedToPayment = async () => {
    if (orderRows.length === 0) return;

    try {
      setProceedingToPayment(true);
      setLocationError(null);

      const nextAddressId = await persistLocation();
      if (!nextAddressId) return;

      router.navigate({
        to: "/payment",
        search: {
          subtotal,
          tax,
          total,
          address_id: nextAddressId
        }
      });
    } catch (err: any) {
      setLocationError(
        err?.message || "Failed to save destination before payment."
      );
    } finally {
      setProceedingToPayment(false);
    }
  };

  const orderRows = useMemo(() => {
    return products
      .map((product) => {
        const productId = product.id || "";
        const quantity = cartItems[productId] || 0;
        return {
          id: productId,
          name: product.name,
          imageUrl: product.image_url || null,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity
        };
      })
      .filter((row) => row.quantity > 0);
  }, [products, cartItems]);

  const subtotal = orderRows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalItems = orderRows.reduce((sum, row) => sum + row.quantity, 0);
  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;
  const lat = toNumber(locationLat) ?? 13.7563;
  const lng = toNumber(locationLng) ?? 100.5018;
  const mapLeafletBounds: [[number, number], [number, number]] = [
    [lat - 0.02, lng - 0.02],
    [lat + 0.02, lng + 0.02]
  ];
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const today = new Date();
  const displayDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const displayTime = today.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  if (!isCartReady || loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-5xl mx-auto px-4">
        <div className="bg-[#FF914D] rounded-xl px-6 py-5 mb-4 text-white">
          <h1 className="text-3xl font-black">Order Summary</h1>
          <p className="text-sm text-orange-100 font-semibold">
            Review your booking details
          </p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <OrderItemsList
                orderRows={orderRows}
                setCartQuantity={setCartQuantity}
                removeCartItem={removeCartItem}
              />

              <DateTimeSection
                displayDate={displayDate}
                displayTime={displayTime}
              />

              <LocationSection
                isEditingLocation={isEditingLocation}
                setIsEditingLocation={setIsEditingLocation}
                useCurrentLocation={useCurrentLocation}
                useSavedAddress={useSavedAddress}
                detectingLocation={detectingLocation}
                resolvingAddress={resolvingAddress}
                savingLocation={savingLocation}
                savedAddress={savedAddress}
                isMapExpanded={isMapExpanded}
                setIsMapExpanded={setIsMapExpanded}
                locationName={locationName}
                setLocationName={setLocationName}
                locationDetail={locationDetail}
                setLocationDetail={setLocationDetail}
                locationLat={locationLat}
                setLocationLat={setLocationLat}
                locationLng={locationLng}
                setLocationLng={setLocationLng}
                mapLeafletBounds={mapLeafletBounds}
                updateLocationFromMapCenter={updateLocationFromMapCenter}
                googleMapsUrl={googleMapsUrl}
                resolveAddressFromCoordinates={resolveAddressFromCoordinates}
                toNumber={toNumber}
                saveLocation={saveLocation}
                locationError={locationError}
                mapSrc={mapSrc}
              />
            </div>

            <PriceSummarySide
              totalItems={totalItems}
              subtotal={subtotal}
              tax={tax}
              total={total}
              proceedingToPayment={proceedingToPayment}
              proceedToPayment={proceedToPayment}
              orderRowsCount={orderRows.length}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
