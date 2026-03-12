import L from "leaflet";
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMap,
	Polyline,
} from "react-leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

(L.Icon.Default as any).mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

// Custom Icons
const pickupIcon = L.divIcon({
	html: `
    <div class="relative flex flex-col items-center">
      <div class="bg-blue-600 text-white p-2 rounded-full shadow-2xl border-2 border-white ring-4 ring-blue-500/20 translate-y-[-100%]">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="w-3 h-1.5 bg-black/20 rounded-full blur-[2px] absolute bottom-0 translate-y-[-50%]"></div>
    </div>
  `,
	className: "",
	iconSize: [36, 36],
	iconAnchor: [18, 2],
});

const destinationIcon = L.divIcon({
	html: `
    <div class="relative flex flex-col items-center">
      <div class="bg-[#A03F00] text-white p-2 rounded-full shadow-2xl border-2 border-white ring-4 ring-orange-500/20 translate-y-[-100%]">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="w-3 h-1.5 bg-black/20 rounded-full blur-[2px] absolute bottom-0 translate-y-[-50%]"></div>
    </div>
  `,
	className: "",
	iconSize: [36, 36],
	iconAnchor: [18, 2],
});

const freelancerIcon = L.divIcon({
	html: `
    <div class="relative flex flex-col items-center">
      <div class="bg-[#A03F00] text-white p-2 rounded-2xl shadow-2xl border-2 border-white ring-4 ring-orange-500/20 translate-y-[-100%] transition-transform duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-0.4 1-1v-3c0-0.9-0.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H5c-1.1 0-2 0.9-2 2v7c0 1.1 0.9 2 2 2h10"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
      </div>
    </div>
  `,
	className: "",
	iconSize: [40, 40],
	iconAnchor: [20, 0],
});

function MapResizer() {
	const map = useMap();
	useEffect(() => {
		setTimeout(() => {
			map.invalidateSize();
		}, 100);
	}, [map]);
	return null;
}

function AutoCenter({ points }: { points: [number, number][] }) {
	const map = useMap();
	const prevPointsRef = useRef<string>("");

	useEffect(() => {
		if (points.length > 0) {
			const pointsStr = JSON.stringify(points);
			if (pointsStr !== prevPointsRef.current) {
				const bounds = L.latLngBounds(points);
				map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
				prevPointsRef.current = pointsStr;
			}
		}
	}, [points, map]);
	return null;
}

interface TrackingMapProps {
	pickup?: { lat: number; lng: number } | null;
	destination?: { lat: number; lng: number } | null;
	freelancer?: { lat: number; lng: number } | null;
	status?: string;
}

export function TrackingMap({
	pickup,
	destination,
	freelancer,
}: TrackingMapProps) {
	const points: [number, number][] = [];
	if (pickup) points.push([pickup.lat, pickup.lng]);
	if (destination) points.push([destination.lat, destination.lng]);
	if (freelancer) points.push([freelancer.lat, freelancer.lng]);

	const center: [number, number] =
		points.length > 0 ? points[0] : [13.7563, 100.5018];

	return (
		<MapContainer
			center={center}
			zoom={13}
			style={{ height: "100%", width: "100%" }}
			zoomControl={false}
		>
			<TileLayer
				attribution="&copy; OpenStreetMap contributors"
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<MapResizer />
			<AutoCenter points={points} />

			{/* Path Line */}
			{pickup && destination && (
				<Polyline
					positions={[
						[pickup.lat, pickup.lng],
						[destination.lat, destination.lng],
					]}
					color="#A03F00"
					weight={3}
					opacity={0.2}
					dashArray="10, 10"
				/>
			)}

			{pickup && (
				<Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
					<Popup>
						<p className="font-bold text-blue-600">Pickup Point</p>
					</Popup>
				</Marker>
			)}

			{destination && (
				<Marker
					position={[destination.lat, destination.lng]}
					icon={destinationIcon}
				>
					<Popup>
						<p className="font-bold text-[#A03F00]">Your Destination</p>
					</Popup>
				</Marker>
			)}

			{freelancer && (
				<Marker
					position={[freelancer.lat, freelancer.lng]}
					icon={freelancerIcon}
				>
					<Popup>
						<div className="text-center">
							<p className="font-black text-[#A03F00] uppercase text-[10px]">
								Real-time Position
							</p>
							<p className="text-xs font-bold text-gray-500">
								Freelancer's location
							</p>
						</div>
					</Popup>
				</Marker>
			)}
		</MapContainer>
	);
}
