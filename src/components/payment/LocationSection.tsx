import "leaflet/dist/leaflet.css";
import type { SavedAddressSnapshot } from "@/types/payment";
import {
	MapPin,
	Navigation,
	Map as MapIcon,
	RotateCcw,
	Maximize2,
	Minimize2,
	Search,
} from "lucide-react";
import MapPicker from "@/components/shared/MapPicker";

interface LocationSectionProps {
	isEditingLocation: boolean;
	setIsEditingLocation: (val: boolean | ((prev: boolean) => boolean)) => void;
	useCurrentLocation?: () => void;
	useSavedAddress?: () => void;
	detectingLocation?: boolean;
	resolvingAddress?: boolean;
	savingLocation?: boolean;
	savedAddress?: SavedAddressSnapshot | null;
	isMapExpanded: boolean;
	setIsMapExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
	locationName: string;
	setLocationName: (val: string) => void;
	locationDetail: string;
	setLocationDetail: (val: string) => void;
	locationLat: string;
	setLocationLat: (val: string) => void;
	locationLng: string;
	setLocationLng: (val: string) => void;
	updateLocationFromMapCenter: (lat: number, lng: number) => void;
	googleMapsUrl?: string;
	resolveAddressFromCoordinates?: (lat: number, lng: number) => void;
	toNumber?: (val: string) => number | null;
	saveLocation?: () => void;
	handleManualSearch?: () => void;
	locationError?: string | null;
	address?: string | null;
	mapSrc?: string;
}

export function LocationSection({
	isEditingLocation,
	setIsEditingLocation,
	useCurrentLocation,
	detectingLocation = false,
	resolvingAddress = false,
	isMapExpanded,
	setIsMapExpanded,
	locationName,
	setLocationName,
	locationDetail,
	setLocationDetail,
	locationLat,
	setLocationLat,
	locationLng,
	setLocationLng,
	updateLocationFromMapCenter,
	googleMapsUrl,
	saveLocation,
	handleManualSearch,
	address,
	mapSrc,
}: LocationSectionProps) {
	const latNum = parseFloat(locationLat) || null;
	const lngNum = parseFloat(locationLng) || null;

	const handleConfirm = async () => {
		if (saveLocation) {
			await saveLocation();
		}
		setIsEditingLocation(false);
	};

	return (
		<div className="space-y-6">
			{isEditingLocation ? (
				<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
					{/* Quick Actions */}
					<div className="flex flex-wrap gap-2">
						{useCurrentLocation && (
							<button
								type="button"
								onClick={useCurrentLocation}
								disabled={detectingLocation || resolvingAddress}
								className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-orange-100 text-[#A03F00] font-black text-[10px] uppercase tracking-widest hover:bg-orange-200 transition-all disabled:opacity-50"
							>
								<Navigation className="w-3.5 h-3.5" />
								{detectingLocation ? "Locating..." : "Use Current GPS"}
							</button>
						)}
						<button
							type="button"
							onClick={() => setIsMapExpanded(!isMapExpanded)}
							className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
						>
							{isMapExpanded ? (
								<Minimize2 className="w-3.5 h-3.5" />
							) : (
								<Maximize2 className="w-3.5 h-3.5" />
							)}
							{isMapExpanded ? "Compact" : "Expand Map"}
						</button>
					</div>

					{/* Map Container */}
					<div className="space-y-3">
						<div
							className={`rounded-3xl overflow-hidden border-4 border-white shadow-xl relative transition-all duration-500 z-0 ${isMapExpanded ? "h-96" : "h-80"}`}
						>
							<MapPicker
								lat={latNum}
								lng={lngNum}
								address={address}
								onChange={(lat, lng) => {
									setLocationLat(String(lat));
									setLocationLng(String(lng));
									updateLocationFromMapCenter(lat, lng);
								}}
							/>
						</div>

						<div className="flex justify-between items-center px-1">
							<p className="text-[10px] font-bold text-gray-400 italic">
								Click on the map to set delivery point
							</p>
							{resolvingAddress && (
								<div className="flex items-center gap-2 text-orange-600 animate-pulse">
									<RotateCcw className="w-3 h-3 animate-spin" />
									<span className="text-[10px] font-black uppercase tracking-widest">
										Resolving Address...
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Form Fields */}
					<div className="grid grid-cols-1 gap-4">
						<div className="space-y-1.5">
							<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
								Label (e.g. Home, Office)
							</label>
							<input
								value={locationName}
								onChange={(e) => setLocationName(e.target.value)}
								className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl px-4 py-3 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
								placeholder="Name this location"
							/>
						</div>
						<div className="space-y-1.5">
							<div className="flex justify-between items-center px-1">
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
									Address Details
								</label>
								{handleManualSearch && (
									<button
										type="button"
										onClick={handleManualSearch}
										className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 hover:underline"
									>
										<Search className="w-3 h-3" />
										Search & Pin
									</button>
								)}
							</div>
							<textarea
								value={locationDetail}
								onChange={(e) => setLocationDetail(e.target.value)}
								className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl px-4 py-3 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 transition-all h-24 resize-none"
								placeholder="Enter full address or use map to auto-fill..."
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={handleConfirm}
						className="w-full py-4 rounded-2xl bg-[#4A2600] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-black/10 hover:bg-black transition-all"
					>
						Confirm Location
					</button>
				</div>
			) : (
				<div className="space-y-6">
					<div className="flex items-start gap-4">
						<div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 shadow-sm border border-orange-100">
							<MapPin className="w-6 h-6" />
						</div>
						<div className="min-w-0 flex-1">
							<h4 className="font-black text-[#4A2600] text-lg truncate">
								{locationName || "No Name Set"}
							</h4>
							<p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
								{locationDetail || "No detail provided."}
							</p>
						</div>
					</div>

					<div className="rounded-3xl overflow-hidden border-4 border-white shadow-xl h-48 bg-orange-50 relative group">
						{mapSrc ? (
							<iframe
								title="Destination location"
								src={mapSrc}
								className="w-full h-full"
								loading="lazy"
							/>
						) : (
							<div className="w-full h-full grayscale-[0.5] contrast-[1.1]">
								<MapPicker
									lat={latNum}
									lng={lngNum}
									address={address}
									onChange={() => {}} // Read-only in this view
									readOnly={true}
								/>
								{/* Overlay to prevent interaction in non-edit mode */}
								<div className="absolute inset-0 z-10 cursor-default" />
							</div>
						)}
						<div className="absolute inset-0 bg-orange-900/5 group-hover:bg-transparent transition-colors" />
					</div>

					{googleMapsUrl && (
						<a
							href={googleMapsUrl}
							target="_blank"
							rel="noreferrer"
							className="flex items-center justify-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-50 py-2 rounded-xl transition-all"
						>
							<MapIcon className="w-3.5 h-3.5" />
							Open in Google Maps
						</a>
					)}
				</div>
			)}
		</div>
	);
}
