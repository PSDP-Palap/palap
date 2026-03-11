/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { 
  MapPin, 
  ShoppingBag, 
  Map as MapIcon,
  AlertCircle,
  ArrowLeft,
  Tag,
  MessageSquare,
  ShieldCheck,
  Truck,
  CheckCircle2
} from "lucide-react";

import { DateTimeSection } from "@/components/payment/DateTimeSection";
import { LocationSection } from "@/components/payment/LocationSection";
import { OrderItemsList } from "@/components/payment/OrderItemsList";
import { OrderReviewModal } from "@/components/payment/OrderReviewModal";
import { PriceSummarySide } from "@/components/payment/PriceSummarySide";
import Loading from "@/components/shared/Loading";
import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/order-summary")({
  component: RouteComponent
});

function RouteComponent() {
  const router = useRouter();
  const { profile, session, updateProfile: updateStoreProfile } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;

  // Cart & Items
  const { items: cartItems, hasHydrated } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [locationName, setLocationName] = useState((profile as any)?.addressName || "Home");
  const [locationDetail, setLocationDetail] = useState(profile?.address || "");
  const [locationLat, setLocationLat] = useState(profile?.lat ? String(profile.lat) : "");
  const [locationLng, setLocationLng] = useState(profile?.lng ? String(profile.lng) : "");
  const [displayDate] = useState(new Date().toLocaleDateString());
  const [displayTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  
  const [orderNote, setOrderNote] = useState("");
  
  const [destinationAddressId, setDestinationAddressId] = useState<string | null>((profile as any)?.addressId || null);
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
            'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
            'User-Agent': 'PalapPetServices/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const a = data.address;
        
        // Pick most relevant descriptive parts
        const main = a.amenity || a.building || a.house_number || a.shop || a.office || a.tourism || "";
        const road = a.road || a.highway || "";
        const area = a.suburb || a.neighbourhood || a.village || a.hamlet || a.city_district || "";
        const city = a.city || a.town || a.municipality || a.province || "";
        
        // Combine parts and filter out empties
        const parts = [main, road, area, city].filter(Boolean);
        
        // Deduplicate identical parts
        const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);
        
        if (uniqueParts.length > 0) {
          setLocationDetail(uniqueParts.join(", "));
        } else {
          setLocationDetail(data.display_name || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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
      const ids = Object.keys(cartItems).filter((id) => cartItems[id] > 0).sort();
      if (ids.length === 0) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      // Check if we already have these exact products to avoid re-fetching
      const currentIds = products.map(p => p.id || p.product_id).sort();
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
  }, [Object.keys(cartItems).join(','), isCartReady]);

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
          subtotal: product.price * quantity
        };
      })
      .filter((row) => row.quantity > 0);
  }, [products, cartItems]);

  const subtotal = orderRows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalItems = orderRows.reduce((sum, row) => sum + row.quantity, 0);
  // Increased to 20% so 50 Baht order = 10 Baht earning
  const deliveryFee = Math.round(subtotal * 0.20);
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

  const handleConfirmPayment = () => {
    setIsReviewModalOpen(false);
    router.navigate({
      to: "/payment",
      search: {
        subtotal,
        tax,
        total,
        deliveryFee,
        address_id: destinationAddressId || undefined
      }
    });
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

  if (!isCartReady || loadingProducts) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Visual Stepper */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center w-full max-w-2xl">
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-[#A03F00] text-white flex items-center justify-center font-black z-10 shadow-lg shadow-orange-900/20 ring-4 ring-orange-50">1</div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-[#A03F00]">Summary</p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-orange-100 -z-0" />
            </div>
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-300 flex items-center justify-center font-black z-10">2</div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-300">Payment</p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-gray-100 -z-0" />
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-300 flex items-center justify-center font-black z-10">3</div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-300">Complete</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-8">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-[#4A2600]">Order Summary</h1>
                <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Review items and delivery details</p>
              </div>
              <Link to="/product" className="p-3 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Items Card */}
            <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-[#4A2600]">Your Items ({totalItems})</h2>
              </div>
              
              <OrderItemsList orderRows={orderRows} />

              {/* Order Note */}
              <div className="mt-10 pt-8 border-t border-gray-50 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-black text-[#4A2600] uppercase tracking-widest">Note to Freelancer</h3>
                </div>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="e.g. Please leave at the front door, handle with care..."
                  className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl p-4 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all placeholder:text-orange-200 resize-none min-h-[100px]"
                />
              </div>
            </section>

            {/* Delivery Card */}
            <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
                  <MapIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-[#4A2600]">Delivery Information</h2>
              </div>
              
              <div className="space-y-8">
                <DateTimeSection
                  displayDate={displayDate}
                  displayTime={displayTime}
                />

                <div className="h-px bg-gray-50" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Destination
                    </h3>
                    {!isEditingLocation && (
                      <button onClick={() => setIsEditingLocation(true)} className="text-xs font-black text-orange-600 hover:underline uppercase">Change</button>
                    )}
                  </div>

                  {locationError && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {locationError}
                    </div>
                  )}

                  <LocationSection
                    isEditingLocation={isEditingLocation}
                    setIsEditingLocation={setIsEditingLocation}
                    locationName={locationName}
                    setLocationName={setLocationName}
                    locationDetail={locationDetail}
                    setLocationDetail={setLocationDetail}
                    locationLat={locationLat}
                    setLocationLat={setLocationLat}
                    locationLng={locationLng}
                    setLocationLng={setLocationLng}
                    address={locationDetail}
                    isMapExpanded={isMapExpanded}
                    setIsMapExpanded={setIsMapExpanded}
                    resolvingAddress={isResolving}
                    updateLocationFromMapCenter={handleMapChange}
                    useCurrentLocation={handleUseCurrentLocation}
                    saveLocation={persistLocation}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Summary Side */}
          <div className="lg:w-[400px]">
            <div className="sticky top-28 space-y-6">
              <PriceSummarySide
                totalItems={totalItems}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                tax={tax}
                total={total}
                proceedingToPayment={proceedingToPayment}
                proceedToPayment={proceedToPayment}
                orderRowsCount={orderRows.length}
              />

              {/* Trust & Guarantees */}
              <div className="bg-white rounded-[2rem] border border-orange-50 shadow-lg p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">Buyer Protection</p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Money-back guarantee if the service is not delivered as promised.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">Trackable Delivery</p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Real-time GPS tracking available for all delivery orders.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">Verified Freelancers</p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">All freelancers are background-checked and identity-verified.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OrderReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleConfirmPayment}
        orderRows={orderRows}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        tax={tax}
        total={total}
        addressName={locationName}
        addressDetail={locationDetail}
        displayDate={displayDate}
        displayTime={displayTime}
      />
    </div>
  );
}
