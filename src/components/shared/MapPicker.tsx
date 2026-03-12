import L from "leaflet";
import { useEffect, useState, useCallback } from "react";
import {
	MapContainer,
	TileLayer,
	useMap,
	useMapEvents,
	Marker,
} from "react-leaflet";
import { MapPin, Search, Navigation, X, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Create a custom div icon for the marker
const customMarkerIcon = L.divIcon({
	html: `
    <div class="relative flex flex-col items-center">
      <div class="bg-[#A03F00] text-white p-2 rounded-full shadow-2xl border-2 border-white ring-4 ring-orange-500/20 translate-y-[-100%]">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="w-3 h-1.5 bg-black/20 rounded-full blur-[2px] absolute bottom-0 translate-y-[-50%]"></div>
    </div>
  `,
	className: "",
	iconSize: [40, 40],
	iconAnchor: [20, 2], // Anchor near the bottom of the pin tip
});

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

interface MapPickerProps {
	lat?: number | null;
	lng?: number | null;
	onChange: (lat: number, lng: number) => void;
	address?: string | null;
	readOnly?: boolean;
}

function ChangeView({ center }: { center: [number, number] }) {
	const map = useMap();
	useEffect(() => {
		if (center) {
			map.setView(center, map.getZoom());
			// Small delay to ensure tiles are loaded and container is stable
			const timer = setTimeout(() => map.invalidateSize(), 100);
			return () => clearTimeout(timer);
		}
	}, [center, map]);
	return null;
}

function MapInteractionHandler({
	onChange,
	readOnly,
}: {
	onChange: (lat: number, lng: number) => void;
	readOnly?: boolean;
}) {
	useMapEvents({
		click: (e) => {
			if (!readOnly) onChange(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

const MapPicker = ({
	lat,
	lng,
	onChange,
	address,
	readOnly = false,
}: MapPickerProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [isLocating, setIsLocating] = useState(false);

	// Sync coordinates - if props are missing, use default
	const hasCoords = typeof lat === "number" && typeof lng === "number";
	const currentPos: [number, number] = hasCoords
		? [lat as number, lng as number]
		: DEFAULT_CENTER;

	const handleGeolocation = useCallback(() => {
		if (readOnly) return;
		setIsLocating(true);
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					onChange(pos.coords.latitude, pos.coords.longitude);
					setIsLocating(false);
				},
				(error) => {
					console.error("Error getting geolocation:", error);
					setIsLocating(false);
				},
				{ enableHighAccuracy: true },
			);
		}
	}, [onChange, readOnly]);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim() || readOnly) return;
		try {
			setIsSearching(true);
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
			);
			const data = await res.json();
			if (data?.[0]) {
				onChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
			}
		} catch (err) {
			console.error("Search error:", err);
		} finally {
			setIsSearching(false);
		}
	};

	// Auto-locate only if strictly needed
	useEffect(() => {
		if (!readOnly && lat === null && lng === null) {
			const timer = setTimeout(() => handleGeolocation(), 800);
			return () => clearTimeout(timer);
		}
	}, [lat, lng, handleGeolocation, readOnly]);

	return (
		<div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner z-0 bg-orange-50 relative group">
			{!readOnly && (
				<>
					<div className="absolute top-4 left-4 right-4 z-[1000]">
						<form
							onSubmit={handleSearch}
							className="relative shadow-2xl rounded-2xl overflow-hidden"
						>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search for an address..."
								className="w-full bg-white/95 backdrop-blur-md px-12 py-3.5 text-sm font-bold text-orange-900 outline-none placeholder:text-orange-300"
							/>
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
							<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="p-2 hover:bg-orange-50 rounded-xl transition-colors"
									>
										<X className="w-4 h-4 text-orange-400" />
									</button>
								)}
								<button
									type="submit"
									disabled={isSearching}
									className="bg-orange-600 text-white p-2 rounded-xl hover:bg-orange-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
								>
									{isSearching ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Search className="w-4 h-4" />
									)}
								</button>
							</div>
						</form>
					</div>

					<div className="absolute right-4 bottom-10 z-[1000]">
						<button
							onClick={handleGeolocation}
							disabled={isLocating}
							className="p-4 bg-white/95 backdrop-blur-md text-orange-600 rounded-2xl shadow-2xl hover:bg-orange-50 transition-all active:scale-95 border border-orange-100 disabled:opacity-50"
						>
							<Navigation
								className={`w-6 h-6 ${isLocating ? "animate-pulse" : ""}`}
							/>
						</button>
					</div>
				</>
			)}

			<MapContainer
				center={currentPos}
				zoom={15}
				scrollWheelZoom={true}
				dragging={!readOnly}
				zoomControl={false}
				style={{ height: "100%", width: "100%" }}
			>
				<ChangeView center={currentPos} />
				<TileLayer
					attribution="&copy; OpenStreetMap contributors"
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>

				{/* Always show the marker in both edit and read-only mode */}
				<Marker
					position={currentPos}
					icon={customMarkerIcon}
					draggable={!readOnly}
					eventHandlers={{
						dragend: (e) => {
							const pos = e.target.getLatLng();
							onChange(pos.lat, pos.lng);
						},
					}}
				/>
				<MapInteractionHandler onChange={onChange} readOnly={readOnly} />
			</MapContainer>

			{/* Address Text Display at Bottom */}
			{hasCoords && address && (
				<div className="absolute bottom-4 left-4 right-16 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-orange-100 shadow-xl pointer-events-none flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
					<div className="p-2 bg-orange-100 rounded-xl text-orange-600 shrink-0 mt-0.5">
						<MapPin className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">
							Current Selection
						</p>
						<p className="text-xs font-bold text-orange-950 leading-relaxed line-clamp-2">
							{address}
						</p>
					</div>
				</div>
			)}

			{!hasCoords && !readOnly && (
				<div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-orange-100 shadow-xl pointer-events-none flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
					<div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
					<p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">
						Move map or tap to select location
					</p>
				</div>
			)}
		</div>
	);
};

export default MapPicker;
