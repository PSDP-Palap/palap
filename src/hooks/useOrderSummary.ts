/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useCartStore } from "@/stores/useCartStore";
import { useServiceStore } from "@/stores/useServiceStore";
import { useUserStore } from "@/stores/useUserStore";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

export function useOrderSummary() {
  const router = useRouter();
  const {
    profile,
    session,
    updateProfile: updateStoreProfile
  } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;

  // Items State (Merged Cart + Service)
  const { items: cartItems, hasHydrated } = useCartStore();
  const { selectedServiceForHire, setSelectedServiceForHire } = useServiceStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [locationName, setLocationName] = useState(
    (profile as any)?.addressName || "Home"
  );

  const [locationDetail, setLocationDetail] = useState(profile?.address || "");
  const [locationLat, setLocationLat] = useState(
    profile?.lat ? String(profile.lat) : ""
  );
  const [locationLng, setLocationLng] = useState(
    profile?.lng ? String(profile.lng) : ""
  );

  // Set default appointment to now + 1 hour, formatted for input[type="date"] and input[type="time"]
  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 1);

  const [appointmentDate, setAppointmentDate] = useState(
    defaultDate.toISOString().split("T")[0]
  );
  const [appointmentTime, setAppointmentTime] = useState(
    defaultDate.toTimeString().slice(0, 5)
  );

  const [orderNote, setOrderNote] = useState("");

  const [destinationAddressId, setDestinationAddressId] = useState<
    string | null
  >((profile as any)?.addressId || null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [proceedingToPayment, setProceedingToPayment] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const isCartReady = hasHydrated || cartHydrationTimedOut;

  const handleMapChange = async (lat: number, lng: number) => {
    setLocationLat(String(lat));
    setLocationLng(String(lng));
    setLocationError(null);

    // Reverse Geocoding
    try {
      setIsResolving(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
            "User-Agent": "PalapPetServices/1.0"
          }
        }
      );
      const data = await response.json();

      if (data && data.address) {
        const a = data.address;

        // Pick most relevant descriptive parts
        const main =
          a.amenity ||
          a.building ||
          a.house_number ||
          a.shop ||
          a.office ||
          a.tourism ||
          "";
        const road = a.road || a.highway || "";
        const area =
          a.suburb ||
          a.neighbourhood ||
          a.village ||
          a.hamlet ||
          a.city_district ||
          "";
        const city = a.city || a.town || a.municipality || a.province || "";

        // Combine parts and filter out empties
        const parts = [main, road, area, city].filter(Boolean);

        // Deduplicate identical parts
        const uniqueParts = parts.filter(
          (item, index) => parts.indexOf(item) === index
        );

        if (uniqueParts.length > 0) {
          setLocationDetail(uniqueParts.join(", "));
        } else {
          setLocationDetail(
            data.display_name ||
            `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          );
        }
      } else if (data && data.display_name) {
        setLocationDetail(data.display_name);
      } else {
        setLocationDetail(`Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setLocationDetail(`Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => setCartHydrationTimedOut(true), 1500);
    return () => clearTimeout(t);
  }, [hasHydrated]);

  // 1. Fetch Products - Only when the set of IDs changes, not quantities
  useEffect(() => {
    const fetchItems = async () => {
      const ids = Object.keys(cartItems)
        .filter((id) => cartItems[id] > 0)
        .sort();
      if (ids.length === 0) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      // Check if we already have these exact products to avoid re-fetching
      const currentIds = products.map((p) => p.id || p.product_id).sort();
      if (JSON.stringify(ids) === JSON.stringify(currentIds)) {
        setLoadingProducts(false);
        return;
      }

      try {
        setLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .in("product_id", ids);
        if (error) throw error;
        setProducts((data as any[]) || []);
      } finally {
        setLoadingProducts(false);
      }
    };
    if (isCartReady) fetchItems();
  }, [Object.keys(cartItems).join(","), isCartReady]);

  // 2. Fetch User Location from Profile if available, otherwise fetch
  useEffect(() => {
    if (profile) {
      // Only set local state if it's currently empty to avoid overwriting user's active edits
      if (!locationDetail) {
        setLocationName(profile.addressName || "Home");
        setLocationDetail(profile.address || "");
        setLocationLat(profile.lat ? String(profile.lat) : "");
        setLocationLng(profile.lng ? String(profile.lng) : "");
        setDestinationAddressId((profile as any).addressId || null);

        if (!profile.address) {
          setIsEditingLocation(true);
        }
      }
    }
  }, [profile, locationDetail]);

  const toNumber = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const persistLocation = async () => {
    if (!userId) return null;
    const latNum = toNumber(locationLat);
    const lngNum = toNumber(locationLng);

    if (!locationDetail.trim()) {
      setLocationError("Please provide an address detail.");
      return null;
    }

    try {
      const { error } = await updateStoreProfile({
        address: locationDetail,
        lat: latNum,
        lng: lngNum,
        name: locationName
      });

      if (error) throw error;

      const updatedProfile = useUserStore.getState().profile;
      const nextId = (updatedProfile as any)?.addressId;
      setDestinationAddressId(nextId);
      return nextId;
    } catch (err: any) {
      setLocationError(err.message || "Failed to save address.");
      return null;
    }
  };

  const orderRows = useMemo(() => {
    // If a service is selected for hire, it takes precedence in the summary
    if (selectedServiceForHire) {
      return [
        {
          id: selectedServiceForHire.service_id!,
          name: selectedServiceForHire.name,
          imageUrl: selectedServiceForHire.image_url || null,
          quantity: 1,
          unitPrice: selectedServiceForHire.price,
          subtotal: selectedServiceForHire.price,
          isService: true
        }
      ];
    }

    // Otherwise, use cart products
    return products
      .map((product) => {
        const productId = product.id || product.product_id || "";
        const quantity = cartItems[productId] || 0;
        return {
          id: String(productId),
          name: product.name,
          imageUrl: product.image_url || null,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
          isService: false
        };
      })
      .filter((row) => row.quantity > 0);
  }, [products, cartItems, selectedServiceForHire]);

  const subtotal = orderRows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalItems = orderRows.reduce((sum, row) => sum + row.quantity, 0);
  const deliveryFee = selectedServiceForHire ? 0 : Math.round(subtotal * 0.2);
  const tax = Math.round((subtotal + deliveryFee) * 0.03);
  const total = subtotal + deliveryFee + tax;

  const proceedToPayment = async () => {
    if (orderRows.length === 0) return;
    try {
      setProceedingToPayment(true);
      const nextAddressId = await persistLocation();
      if (nextAddressId) setIsReviewModalOpen(true);
    } catch (err: any) {
      setLocationError(err?.message || "Failed to save address.");
    } finally {
      setProceedingToPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsReviewModalOpen(false);
    setProceedingToPayment(true);

    try {
      const appointmentAt = new Date(
        `${appointmentDate}T${appointmentTime}`
      ).toISOString();

      if (selectedServiceForHire) {
        const currentUserId = profile?.id;
        if (!currentUserId) throw new Error("Please log in to continue");

        const freelancerId =
          (selectedServiceForHire as any).freelancer_id ||
          selectedServiceForHire.created_by ||
          (selectedServiceForHire as any).user_id ||
          (selectedServiceForHire as any).profile_id;

        if (!freelancerId) throw new Error("Freelancer not found");

        // 1. Create Order
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            customer_id: currentUserId,
            freelance_id: freelancerId,
            service_id: selectedServiceForHire.service_id,
            status: "WAITING",
            price: total,
            pickup_address_id: selectedServiceForHire.pickup_address_id,
            destination_address_id:
              destinationAddressId ||
              selectedServiceForHire.destination_address_id,
            appointment_at: appointmentAt
          })
          .select()
          .single();

        if (orderErr) throw orderErr;
        const actualOrderId = (newOrder as any).order_id;

        // 2. Create Chat Room
        const { data: newRoom, error: roomErr } = await supabase
          .from("chat_rooms")
          .insert({
            order_id: actualOrderId,
            customer_id: currentUserId,
            freelancer_id: freelancerId,
            created_by: currentUserId,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (roomErr && !roomErr.message.includes("duplicate")) throw roomErr;

        const roomId = newRoom?.id;
        if (roomId) {
          await supabase.from("chat_messages").insert({
            room_id: roomId,
            order_id: actualOrderId,
            sender_id: currentUserId,
            content: `[SYSTEM_HIRE_REQUEST] ${orderNote || "I want to hire this service."}`,
            message_type: "SYSTEM"
          });
        }

        setSelectedServiceForHire(null);
        toast.success("Hire request sent! Opening chat...");
        router.navigate({
          to: "/chat/$id",
          params: { id: roomId }
        });
      } else {
        router.navigate({
          to: "/payment",
          search: {
            subtotal,
            tax,
            total,
            deliveryFee,
            address_id: destinationAddressId || undefined,
            note: orderNote || undefined,
            appointment_at: appointmentAt
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setProceedingToPayment(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setIsResolving(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleMapChange(pos.coords.latitude, pos.coords.longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Failed to get your current location.");
          setIsResolving(false);
        }
      );
    }
  };

  return {
    state: {
      locationName,
      locationDetail,
      locationLat,
      locationLng,
      appointmentDate,
      appointmentTime,
      orderNote,
      destinationAddressId,
      isEditingLocation,
      proceedingToPayment,
      isMapExpanded,
      locationError,
      isResolving,
      isReviewModalOpen,
      isCartReady,
      loadingProducts,
      orderRows,
      subtotal,
      totalItems,
      deliveryFee,
      tax,
      total,
      selectedServiceForHire
    },
    actions: {
      setLocationName,
      setLocationDetail,
      setLocationLat,
      setLocationLng,
      setAppointmentDate,
      setAppointmentTime,
      setOrderNote,
      setIsEditingLocation,
      setIsMapExpanded,
      setIsReviewModalOpen,
      handleMapChange,
      persistLocation,
      proceedToPayment,
      handleConfirmPayment,
      handleUseCurrentLocation
    }
  };
}
