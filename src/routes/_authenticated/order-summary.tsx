import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Truck
} from "lucide-react";

import { DateTimeSection } from "@/components/payment/DateTimeSection";
import { LocationSection } from "@/components/payment/LocationSection";
import { OrderItemsList } from "@/components/payment/OrderItemsList";
import { OrderReviewModal } from "@/components/payment/OrderReviewModal";
import { PriceSummarySide } from "@/components/payment/PriceSummarySide";
import Loading from "@/components/shared/Loading";
import { useOrderSummary } from "@/hooks/useOrderSummary";

export const Route = createFileRoute("/_authenticated/order-summary")({
  component: RouteComponent
});

function RouteComponent() {
  const { state, actions } = useOrderSummary();

  const {
    locationName,
    locationDetail,
    locationLat,
    locationLng,
    appointmentDate,
    appointmentTime,
    orderNote,
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
  } = state;

  const {
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
  } = actions;

  if (!isCartReady || loadingProducts) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Visual Stepper */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center w-full max-w-2xl">
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-[#A03F00] text-white flex items-center justify-center font-black z-10 shadow-lg shadow-orange-900/20 ring-4 ring-orange-50">
                1
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-[#A03F00]">
                Summary
              </p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-orange-100 z-0" />
            </div>
            <div className="flex flex-col items-center flex-1 relative">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-300 flex items-center justify-center font-black z-10">
                2
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-300">
                Payment
              </p>
              <div className="absolute left-1/2 top-5 w-full h-0.5 bg-gray-100 z-0" />
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-300 flex items-center justify-center font-black z-10">
                3
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-300">
                Complete
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-8">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-[#4A2600]">
                  Order Summary
                </h1>
                <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">
                  Review items and delivery details
                </p>
              </div>
              <Link
                to="/product"
                className="p-3 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Items Card */}
            <section className="bg-white rounded-[2.5rem] border border-orange-50 shadow-xl shadow-orange-900/5 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-[#4A2600]">
                  Your Items ({totalItems})
                </h2>
              </div>

              <OrderItemsList orderRows={orderRows} />

              {/* Order Note */}
              <div className="mt-10 pt-8 border-t border-gray-50 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-black text-[#4A2600] uppercase tracking-widest">
                    Note to Freelancer
                  </h3>
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
                <h2 className="text-xl font-black text-[#4A2600]">
                  Delivery Information
                </h2>
              </div>

              <div className="space-y-8">
                <DateTimeSection
                  appointmentDate={appointmentDate}
                  setAppointmentDate={setAppointmentDate}
                  appointmentTime={appointmentTime}
                  setAppointmentTime={setAppointmentTime}
                />

                <div className="h-px bg-gray-50" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Destination
                    </h3>
                    {!isEditingLocation && (
                      <button
                        onClick={() => setIsEditingLocation(true)}
                        className="text-xs font-black text-orange-600 hover:underline uppercase"
                      >
                        Change
                      </button>
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
                isService={!!selectedServiceForHire}
              />

              {/* Trust & Guarantees */}
              <div className="bg-white rounded-[2rem] border border-orange-50 shadow-lg p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">
                      Buyer Protection
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                      Money-back guarantee if the service is not delivered as
                      promised.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">
                      Trackable Delivery
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                      Real-time GPS tracking available for all delivery orders.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest mb-1">
                      Verified Freelancers
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                      All freelancers are background-checked and
                      identity-verified.
                    </p>
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
        displayDate={appointmentDate}
        displayTime={appointmentTime}
        isService={!!selectedServiceForHire}
      />
    </div>
  );
}
