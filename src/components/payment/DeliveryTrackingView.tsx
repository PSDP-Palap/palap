import Loading from "@/components/shared/Loading";
import type { DeliveryTracking } from "@/types/payment";

import { DeliveryTrackingWidget } from "./DeliveryTrackingWidget";

interface DeliveryTrackingViewProps {
  activeOrderId: string;
  status: string;
  accepted: boolean;
  isDelivered: boolean;
  trackingData: DeliveryTracking;
  trackingLoading: boolean;
  trackingError: string | null;
  mapSrc: string;
  routeUrl: string;
  pickupPoint: { x: number; y: number } | null;
  destinationPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
  hasPickupCoordinates: boolean;
  hasDestinationCoordinates: boolean;
  hasCurrentProductCoordinates: boolean;
  currentProductLat: number | null;
  currentProductLng: number | null;
  isTrackingWidgetOpen: boolean;
  setIsTrackingWidgetOpen: (
    val: boolean | ((prev: boolean) => boolean)
  ) => void;
  showDeliveredNotice: boolean;
  acknowledgeDeliveredNotice: () => void;
  loadTracking: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
  handlePay?: () => Promise<void>;
  isPaying?: boolean;
}

export function DeliveryTrackingView({
  activeOrderId,
  status,
  accepted,
  isDelivered,
  trackingData,
  trackingLoading,
  trackingError,
  mapSrc,
  routeUrl,
  pickupPoint,
  destinationPoint,
  currentPoint,
  hasPickupCoordinates,
  hasDestinationCoordinates,
  hasCurrentProductCoordinates,
  currentProductLat,
  currentProductLng,
  isTrackingWidgetOpen,
  setIsTrackingWidgetOpen,
  showDeliveredNotice,
  acknowledgeDeliveredNotice,
  loadTracking,
  router,
  handlePay,
  isPaying = false
}: DeliveryTrackingViewProps) {
  const isCompleteUnpaid = status === "COMPLETE";

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#4A2600]">
                Your Delivery Order
              </h1>
              <p className="text-sm text-orange-700/80 font-semibold">
                Order ID: {activeOrderId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${accepted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
              >
                {accepted ? "Freelancer Accepted" : "WAITING FOR FREELANCE"}
              </span>
            </div>
          </div>

          {isCompleteUnpaid && handlePay && (
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-black text-orange-800 uppercase tracking-tight">
                  Payment Required
                </h3>
                <p className="text-sm text-orange-700 font-bold">
                  The freelancer has completed the work. Please release the
                  payment of ฿ {trackingData?.price.toFixed(2)}.
                </p>
              </div>
              <button
                onClick={handlePay}
                disabled={isPaying}
                className="w-full md:w-auto px-10 py-3 rounded-xl bg-[#FF914D] text-white font-black text-lg shadow-lg hover:bg-[#e67e3d] transition-all transform hover:scale-105 active:scale-95 disabled:bg-gray-300 disabled:scale-100"
              >
                {isPaying ? "Processing..." : "Pay Now"}
              </button>
            </div>
          )}

          {(trackingLoading || !trackingData) && !trackingError && (
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <Loading fullScreen={false} size={60} />
              <p className="text-sm font-semibold text-[#4A2600] text-center mt-2">
                Loading delivery details...
              </p>
            </div>
          )}

          {trackingError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                {trackingError}
              </p>
            </div>
          )}

          {trackingData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">
                    Pickup Address (Product)
                  </p>
                  <p className="font-bold text-[#4A2600]">
                    {trackingData.pickupAddress?.name || "Pickup point"}
                  </p>
                  <p className="text-sm text-[#4A2600]/80 mt-1">
                    {trackingData.pickupAddress?.address_detail ||
                      "No pickup address"}
                  </p>
                </section>

                <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">
                    Destination Address (Customer)
                  </p>
                  <p className="font-bold text-[#4A2600]">
                    {trackingData.destinationAddress?.name || "Destination"}
                  </p>
                  <p className="text-sm text-[#4A2600]/80 mt-1">
                    {trackingData.destinationAddress?.address_detail ||
                      "No destination address"}
                  </p>
                </section>
              </div>

              <section className="rounded-xl border border-orange-100 bg-white p-4">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">
                    Delivery Route
                  </p>{" "}
                  <a
                    href={routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-black text-orange-700 hover:text-orange-800"
                  >
                    Open full map
                  </a>
                </div>

                <div className="rounded-lg overflow-hidden border border-orange-100 relative">
                  <iframe
                    title="Delivery map"
                    src={mapSrc}
                    className="w-full h-65"
                    loading="lazy"
                  />

                  {(pickupPoint || destinationPoint || currentPoint) && (
                    <div className="absolute inset-0 pointer-events-none">
                      {pickupPoint && destinationPoint && (
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <polyline
                            points={
                              currentPoint
                                ? `${pickupPoint.x},${pickupPoint.y} ${currentPoint.x},${currentPoint.y} ${destinationPoint.x},${destinationPoint.y}`
                                : `${pickupPoint.x},${pickupPoint.y} ${destinationPoint.x},${destinationPoint.y}`
                            }
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="0"
                          />
                        </svg>
                      )}

                      {pickupPoint && (
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${pickupPoint.x}%`,
                            top: `${pickupPoint.y}%`
                          }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow" />
                        </div>
                      )}

                      {currentPoint && (
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${currentPoint.x}%`,
                            top: `${currentPoint.y}%`
                          }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
                        </div>
                      )}

                      {destinationPoint && (
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${destinationPoint.x}%`,
                            top: `${destinationPoint.y}%`
                          }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  {hasPickupCoordinates && hasDestinationCoordinates
                    ? "Route preview from pickup to destination."
                    : "Showing current area preview. Add lat/lng to addresses for full route line in external map."}
                </p>
                {hasCurrentProductCoordinates && (
                  <p className="mt-1 text-xs text-orange-700 font-semibold">
                    Current product location: {currentProductLat?.toFixed(5)},{" "}
                    {currentProductLng?.toFixed(5)}
                  </p>
                )}
              </section>

              <div className="rounded-xl border border-orange-100 p-4 bg-white">
                <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">
                  Delivery Detail
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Product</p>
                    <p className="font-bold text-[#4A2600]">
                      {trackingData.productName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Freelancer</p>
                    <p className="font-bold text-[#4A2600]">
                      {trackingData.freelanceName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-bold text-[#4A2600] uppercase">
                      {status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="font-bold text-[#4A2600]">
                      ฿ {trackingData.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {isDelivered ? (
                <section className="rounded-xl border border-orange-200 p-6 md:p-8 bg-linear-to-r from-[#FFE2CF] via-[#FFD5B8] to-[#FFC79E] flex justify-center items-center min-h-55">
                  <div className="w-full max-w-70 rounded-xl border-2 border-orange-300 bg-[#fff7f0] px-4 py-5 text-center shadow-sm">
                    <div className="mx-auto w-16 h-16 rounded-full border-[3px] border-orange-500 overflow-hidden bg-orange-50 flex items-center justify-center text-xl font-black text-[#4A2600]">
                      {trackingData.freelanceAvatarUrl ? (
                        <img
                          src={trackingData.freelanceAvatarUrl}
                          alt={trackingData.freelanceName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (trackingData.freelanceName || "F")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                    <p className="mt-3 text-2xl font-black text-[#4A2600]">
                      {trackingData.freelanceName}
                    </p>
                    <p className="text-sm text-gray-500">Driver</p>
                    <p className="mt-3 text-base font-black text-orange-600 uppercase">
                      Thank You
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <section className="rounded-xl border border-orange-100 p-4 bg-white">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">
                      Delivery Guy
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-2 border-orange-300 overflow-hidden bg-orange-50 flex items-center justify-center font-black text-[#4A2600]">
                        {trackingData.freelanceAvatarUrl ? (
                          <img
                            src={trackingData.freelanceAvatarUrl}
                            alt={trackingData.freelanceName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (trackingData.freelanceName || "F")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-black text-[#4A2600]">
                          {trackingData.freelanceName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {trackingData.freelanceId
                            ? "Accepted this order"
                            : "Waiting for acceptance"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="rounded-xl border border-orange-100 p-4 bg-[#fff7f0]">
                    <p className="text-sm font-black text-[#4A2600] mb-2">
                      Order Status
                    </p>
                    <div className="space-y-2 text-sm text-[#4A2600]">
                      <p
                        className={
                          status === "PENDING" || !trackingData.freelanceId
                            ? "font-black text-orange-600"
                            : ""
                        }
                      >
                        Looking for a freelancer
                      </p>
                      <p
                        className={accepted ? "font-black text-orange-600" : ""}
                      >
                        Freelancer has accepted
                      </p>
                      <p
                        className={
                          accepted && !isDelivered
                            ? "font-black text-orange-600"
                            : ""
                        }
                      >
                        Currently serving
                      </p>
                      <p
                        className={
                          isDelivered ? "font-black text-orange-600" : ""
                        }
                      >
                        Service has ended
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.navigate({ to: "/" })}
              className="px-5 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>

      {trackingData && !isDelivered && (
        <DeliveryTrackingWidget
          activeOrderId={activeOrderId}
          isTrackingWidgetOpen={isTrackingWidgetOpen}
          setIsTrackingWidgetOpen={setIsTrackingWidgetOpen}
          accepted={accepted}
          trackingData={trackingData}
          status={status}
          trackingLoading={trackingLoading}
          loadTracking={loadTracking}
          router={router}
          routeUrl={routeUrl}
        />
      )}

      {showDeliveredNotice && (
        <div className="fixed inset-0 z-100 bg-black/35 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-orange-200 shadow-2xl p-6 text-center">
            <p className="text-2xl font-black text-green-600 uppercase">
              Order Succeed
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Your order has been completed by the freelancer.
            </p>
            <button
              type="button"
              onClick={acknowledgeDeliveredNotice}
              className="mt-5 px-6 py-2 rounded-lg bg-green-600 text-white font-black hover:bg-green-700"
            >
              Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
