import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  Package, 
  MapPin, 
  Image as ImageIcon, 
  Plus, 
  X, 
  ChevronRight, 
  ArrowRight,
  Info
} from "lucide-react";

import Loading from "@/components/shared/Loading";
import MapPicker from "@/components/shared/MapPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ServiceCategory } from "@/types/service";

interface AddServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    name: string;
    price: number;
    category: ServiceCategory;
    pickupAddress?: string;
    destinationAddress?: string;
    imageFile?: File | null;
    mapLat?: number;
    mapLng?: number;
  }) => Promise<void>;
}

export const AddServiceDialog = ({
  isOpen,
  onClose,
  onSuccess
}: AddServiceDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  const [form, setForm] = useState({
    name: "",
    price: 0,
    category: "DELIVERY" as ServiceCategory,
    pickupAddress: "",
    destinationAddress: "",
    mapLat: 13.7563,
    mapLng: 100.5018
  });

  const [activeLocationField, setActiveLocationField] = useState<"pickup" | "destination">("pickup");
  const [resolvingAddress, setResolvingAddress] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "price" ? Number(value) || 0 : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const resolveAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      setResolvingAddress(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleMapChange = async (lat: number, lng: number) => {
    setForm(prev => ({ ...prev, mapLat: lat, mapLng: lng }));
    const address = await resolveAddressFromCoordinates(lat, lng);
    if (activeLocationField === "pickup") {
      setForm(prev => ({ ...prev, pickupAddress: address }));
    } else {
      setForm(prev => ({ ...prev, destinationAddress: address }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter service name");
      setActiveStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess({
        ...form,
        imageFile: selectedFile
      });
      
      // Reset
      setForm({
        name: "",
        price: 0,
        category: "DELIVERY",
        pickupAddress: "",
        destinationAddress: "",
        mapLat: 13.7563,
        mapLng: 100.5018
      });
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setActiveStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A2600]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border-4 border-orange-50">
        
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between border-b border-orange-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#4A2600]">Create New Service</h2>
              <div className="flex gap-1.5 mt-1">
                {[1, 2, 3].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeStep === s ? 'w-8 bg-orange-500' : 'w-2 bg-orange-100'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-orange-50 rounded-2xl text-orange-300 hover:text-orange-500 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-full h-56 rounded-[2rem] border-4 border-dashed border-orange-100 bg-orange-50/30 hover:bg-orange-50 hover:border-orange-300 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3"
                >
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <>
                      <div className="p-4 bg-white rounded-2xl text-orange-400 group-hover:scale-110 transition-transform shadow-sm">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-black text-orange-400 uppercase tracking-widest">Upload Service Image</p>
                    </>
                  )}
                  {previewUrl && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="bg-white/90 px-4 py-2 rounded-xl text-xs font-black text-[#A03F00] shadow-xl uppercase tracking-widest">Change Photo</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-2">Service Name</label>
                  <div className="relative group">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-200 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g., Fast Dog Walking, Food Delivery..."
                      className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl pl-12 pr-4 py-4 font-bold text-[#4A2600] placeholder:text-orange-200 focus:outline-none focus:border-orange-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-2">Price (฿)</label>
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl px-5 py-4 font-black text-[#4A2600] focus:outline-none focus:border-orange-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-2">Category</label>
                    <Select 
                      value={form.category} 
                      onValueChange={(v) => setForm(f => ({ ...f, category: v as ServiceCategory }))}
                    >
                      <SelectTrigger className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl h-auto px-5 py-4 font-bold text-[#4A2600] focus:ring-0 focus:border-orange-200 focus:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-orange-50 shadow-xl p-2">
                        <SelectItem value="DELIVERY" className="rounded-xl font-bold py-3">Delivery Service</SelectItem>
                        <SelectItem value="SHOPPING" className="rounded-xl font-bold py-3">Personal Shopping</SelectItem>
                        <SelectItem value="CARE" className="rounded-xl font-bold py-3">Pet Care</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-orange-50 rounded-2xl p-4 flex gap-3 border border-orange-100">
                <Info className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-xs font-bold text-orange-700 leading-relaxed">
                  Provide addresses for your service. For Delivery, you can use the map to pin exact locations.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Pickup Point</label>
                    {form.category === "DELIVERY" && (
                      <button 
                        onClick={() => setActiveLocationField("pickup")}
                        className={`text-[10px] font-black px-3 py-1 rounded-full border-2 transition-all ${
                          activeLocationField === "pickup" ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white border-orange-100 text-orange-300'
                        }`}
                      >
                        Pin on Map
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300" />
                    <input
                      name="pickupAddress"
                      value={form.pickupAddress}
                      onChange={handleChange}
                      placeholder="Store name or starting point..."
                      className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl pl-12 pr-4 py-4 font-bold text-[#4A2600] focus:outline-none focus:border-orange-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Destination / Coverage</label>
                    {form.category === "DELIVERY" && (
                      <button 
                        onClick={() => setActiveLocationField("destination")}
                        className={`text-[10px] font-black px-3 py-1 rounded-full border-2 transition-all ${
                          activeLocationField === "destination" ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white border-orange-100 text-orange-300'
                        }`}
                      >
                        Pin on Map
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300" />
                    <input
                      name="destinationAddress"
                      value={form.destinationAddress}
                      onChange={handleChange}
                      placeholder="Where will you deliver or serve?"
                      className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl pl-12 pr-4 py-4 font-bold text-[#4A2600] focus:outline-none focus:border-orange-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {form.category === "DELIVERY" && (
                <div className="h-64 rounded-3xl overflow-hidden border-4 border-orange-50 relative">
                  <MapPicker
                    lat={form.mapLat}
                    lng={form.mapLng}
                    onChange={handleMapChange}
                  />
                  {resolvingAddress && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1001] flex items-center justify-center">
                      <Loading size={32} fullScreen={false} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2 py-4">
                <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto text-green-500 mb-2">
                  <Package className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[#4A2600]">Ready to Launch!</h3>
                <p className="text-sm font-bold text-gray-400">Please review your service details before creating.</p>
              </div>

              <div className="bg-orange-50/50 rounded-[2rem] p-6 border-2 border-orange-50 space-y-4">
                <div className="flex gap-4">
                  {previewUrl && <img src={previewUrl} className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md" />}
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{form.category}</p>
                    <p className="text-lg font-black text-[#4A2600]">{form.name}</p>
                    <p className="text-xl font-black text-orange-600">฿ {form.price.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-orange-100">
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-orange-300 uppercase tracking-widest">Pickup</p>
                      <p className="text-xs font-bold text-[#4A2600] line-clamp-1">{form.pickupAddress || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ArrowRight className="absolute w-0 h-0 opacity-0" />
                    <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-orange-300 uppercase tracking-widest">Destination</p>
                      <p className="text-xs font-bold text-[#4A2600] line-clamp-1">{form.destinationAddress || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-xs font-bold text-blue-700 leading-relaxed">
                  Your service will be visible to all customers immediately after creation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex gap-3 border-t border-orange-50">
          {activeStep > 1 ? (
            <button
              onClick={prevStep}
              className="flex-1 px-8 py-4 rounded-2xl font-black text-orange-600 border-2 border-orange-50 hover:bg-orange-50 transition-all active:scale-95"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl font-black text-gray-400 border-2 border-gray-50 hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
          )}

          {activeStep < 3 ? (
            <button
              onClick={nextStep}
              className="flex-[2] bg-orange-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-[2] bg-[#A03F00] text-white px-8 py-4 rounded-2xl font-black hover:bg-[#803300] transition-all shadow-xl shadow-orange-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loading size={20} fullScreen={false} />
                  Creating...
                </>
              ) : (
                <>
                  Launch Service
                  <Plus className="w-5 h-5 stroke-[3]" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
