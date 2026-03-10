/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  Package, 
  MapPin, 
  User, 
  Truck, 
  MessageSquare, 
  CheckCircle2, 
  CreditCard,
  Building,
  ArrowLeft,
  Phone,
  ChevronRight
} from "lucide-react";
import Loading from "@/components/shared/Loading";
import type { DeliveryTracking } from "@/types/order";
import { Link } from "@tanstack/react-router";
import { TrackingMap } from "./TrackingMap";

interface DeliveryTrackingViewProps {
  activeOrderId: string;
  status: string;
  accepted: boolean;
  isDelivered: boolean;
  trackingData: DeliveryTracking;
  trackingLoading: boolean;
  trackingError: string | null;
  routeUrl: string;
  pickupCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  freelancerCoords?: { lat: number; lng: number } | null;
  isTrackingWidgetOpen: boolean;
  setIsTrackingWidgetOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  showDeliveredNotice: boolean;
  acknowledgeDeliveredNotice: () => void;
  loadTracking: (id: string) => void;
  router: any;
  handlePay?: () => Promise<void>;
  isPaying?: boolean;
}

export function DeliveryTrackingView({
  status,
  trackingData,
  trackingLoading,
  trackingError,
  pickupCoords,
  destinationCoords,
  freelancerCoords,
  handlePay,
  isPaying = false
}: DeliveryTrackingViewProps) {
  
  const steps = [
    { id: 'WAITING', icon: Package },
    { id: 'ACCEPTED', icon: CheckCircle2 },
    { id: 'PICKING_UP', icon: Building },
    { id: 'DELIVERING', icon: Truck },
    { id: 'COMPLETE', icon: CheckCircle2 }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status);
  const isCompleteUnpaid = status === "COMPLETE" && !trackingData.paymentId;

  if (trackingLoading && !trackingData) return <Loading />;

  return (
    <div className="relative min-h-screen bg-[#FDFCFB] overflow-hidden">
      {/* 1. Interactive Tracking Map */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <TrackingMap 
          pickup={pickupCoords}
          destination={destinationCoords}
          freelancer={freelancerCoords}
          status={status}
        />
      </div>

      {/* 2. Top Minimalist Bar */}
      <div className="absolute top-28 left-0 right-0 z-50 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <Link to="/order-history" className="flex items-center gap-2 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-orange-100 shadow-xl hover:bg-orange-50 transition-all active:scale-95 group">
            <ArrowLeft className="w-4 h-4 text-orange-600 group-hover:-translate-x-0.5 transition-transform" />
          </Link>

          {/* Compact Status Stepper */}
          <div className="flex-1 max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-orange-100 shadow-xl px-6 py-3 flex items-center justify-between relative overflow-hidden">
             {/* Progress Background */}
             <div className="absolute bottom-0 left-0 h-1 bg-orange-50 w-full" />
             <div 
                className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-1000" 
                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
             />

             {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.id} className="relative z-10">
                    <Icon className={`w-4 h-4 transition-colors duration-500 ${
                      isCurrent ? 'text-orange-600 scale-110' : isActive ? 'text-orange-400' : 'text-gray-200'
                    }`} />
                  </div>
                );
             })}
             <div className="ml-4 h-4 w-px bg-gray-100" />
             <p className="ml-4 text-[10px] font-black text-[#4A2600] uppercase tracking-widest truncate">
                {status.replaceAll('_', ' ')}
             </p>
          </div>

          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-orange-100 shadow-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4A2600]">Live</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Minimalist Panel */}
      <div className="absolute bottom-8 left-0 right-0 z-50 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-orange-50 shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            
            {/* Freelancer Info */}
            <div className="flex items-center gap-3 pr-6 sm:border-r border-orange-50 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 overflow-hidden shrink-0 shadow-sm">
                {trackingData.freelanceAvatarUrl ? (
                  <img src={trackingData.freelanceAvatarUrl} alt={trackingData.freelanceName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#A03F00] font-black text-lg">
                    {(trackingData.freelanceName || "F").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-[#4A2600] truncate">{trackingData.freelanceName || "Searching..." }</h3>
                <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Courier</p>
              </div>
            </div>

            {/* Delivery Detail */}
            <div className="flex-1 min-w-0 hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-gray-300" />
                <p className="text-[11px] font-bold text-gray-500 truncate">{trackingData.productName}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-200" />
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-gray-300" />
                <p className="text-[11px] font-bold text-gray-500 truncate">{trackingData.destinationAddress?.address_detail || "Your Address"}</p>
              </div>
            </div>

            {/* Price & Actions */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right px-4">
                <p className="text-[14px] font-black text-[#4A2600] italic">฿{trackingData.price.toLocaleString()}</p>
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Total Price</p>
              </div>

              <div className="flex gap-2">
                <Link 
                  to={`/chat/${trackingData.roomId}` as any}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#A03F00] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-900/20 hover:bg-orange-800 transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </Link>
                
                {isCompleteUnpaid && handlePay && (
                  <button
                    onClick={handlePay}
                    disabled={isPaying}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-900/20 animate-pulse hover:bg-orange-600 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>
                )}
                
                <button className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 text-[#A03F00] border border-orange-100 hover:bg-orange-100 transition-all">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {trackingError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-red-50">
            <h3 className="text-xl font-black text-gray-900 mb-2">Tracking Error</h3>
            <p className="text-gray-500 font-bold mb-8">{trackingError}</p>
            <Link to="/order-history" className="block w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest">
              Back
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
