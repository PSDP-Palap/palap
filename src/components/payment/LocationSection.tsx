import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

import type { SavedAddressSnapshot } from "@/types/payment";

interface LocationSectionProps {
  isEditingLocation: boolean;
  setIsEditingLocation: (val: boolean | ((prev: boolean) => boolean)) => void;
  useCurrentLocation: () => void;
  useSavedAddress: () => void;
  detectingLocation: boolean;
  resolvingAddress: boolean;
  savingLocation: boolean;
  savedAddress: SavedAddressSnapshot | null;
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
  mapLeafletBounds: [[number, number], [number, number]];
  updateLocationFromMapCenter: (lat: number, lng: number) => void;
  googleMapsUrl: string;
  resolveAddressFromCoordinates: (lat: number, lng: number) => void;
  toNumber: (val: string) => number | null;
  saveLocation: () => void;
  locationError: string | null;
  mapSrc: string;
}

function MapCenterTracker({
  onCenterChange
}: {
  onCenterChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
    zoomend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    }
  });
  return null;
}

export function LocationSection({
  isEditingLocation,
  setIsEditingLocation,
  useCurrentLocation,
  useSavedAddress,
  detectingLocation,
  resolvingAddress,
  savingLocation,
  savedAddress,
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
  mapLeafletBounds,
  updateLocationFromMapCenter,
  googleMapsUrl,
  resolveAddressFromCoordinates,
  toNumber,
  saveLocation,
  locationError,
  mapSrc
}: LocationSectionProps) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-[#4A2600]">Location</h2>
        <button
          type="button"
          onClick={() => setIsEditingLocation((v: boolean) => !v)}
          className="text-xs font-black uppercase text-orange-600 hover:text-orange-700"
        >
          {isEditingLocation ? "Close" : "Edit"}
        </button>
      </div>

      {isEditingLocation ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={detectingLocation || resolvingAddress}
              className="px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 font-black text-xs uppercase hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {detectingLocation ? "Detecting..." : "Use My Current Location"}
            </button>
            <button
              type="button"
              onClick={useSavedAddress}
              disabled={
                !savedAddress ||
                savingLocation ||
                detectingLocation ||
                resolvingAddress
              }
              className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 font-black text-xs uppercase hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Use Saved Address
            </button>
            <button
              type="button"
              onClick={() => setIsMapExpanded((prev: boolean) => !prev)}
              className="px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 font-black text-xs uppercase hover:bg-orange-100"
            >
              {isMapExpanded ? "Collapse Map" : "Expand Map"}
            </button>
            {resolvingAddress && (
              <p className="text-xs font-semibold text-gray-500">
                Resolving address...
              </p>
            )}
          </div>

          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Location Name"
          />
          <textarea
            value={locationDetail}
            onChange={(e) => setLocationDetail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
            placeholder="Details of location"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={locationLat}
              onChange={(e) => setLocationLat(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Latitude"
            />
            <input
              value={locationLng}
              onChange={(e) => setLocationLng(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Longitude"
            />
          </div>
          <div
            className={`rounded-md overflow-hidden border border-gray-200 relative ${isMapExpanded ? "h-105" : "h-44"}`}
          >
            <MapContainer
              bounds={mapLeafletBounds}
              className="w-full h-full z-0"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapCenterTracker onCenterChange={updateLocationFromMapCenter} />
            </MapContainer>

            <div className="absolute inset-0 z-1000 pointer-events-none flex items-center justify-center">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-black/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/20" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-2 w-4 h-1.5 rounded-full bg-black/20 blur-[1px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90" />
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-500">
            Drag or zoom the map. The center pin is your selected destination.
          </p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-black uppercase text-orange-600 hover:text-orange-700"
          >
            View on Google Maps
          </a>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const nextLat = toNumber(locationLat);
                const nextLng = toNumber(locationLng);
                if (nextLat == null || nextLng == null) return;
                resolveAddressFromCoordinates(nextLat, nextLng);
              }}
              disabled={resolvingAddress}
              className="px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 font-black text-xs uppercase hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {resolvingAddress ? "Resolving..." : "Use Pin Address"}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveLocation}
              disabled={savingLocation}
              className="px-4 py-1.5 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase disabled:bg-gray-300 disabled:text-gray-500"
            >
              {savingLocation ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {locationName ? (
            <>
              <p className="text-sm font-bold text-[#4A2600]">{locationName}</p>
              <p className="text-xs text-gray-600 mt-1">{locationDetail}</p>
            </>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-md p-3 mb-2">
              <p className="text-sm font-bold text-red-700">No Address Set</p>
              <p className="text-xs text-red-600">
                Please click "Edit" or use your current location to set a delivery destination.
              </p>
            </div>
          )}
          <div className="rounded-md overflow-hidden border border-gray-200 mt-3">
            <iframe
              title="Destination location"
              src={mapSrc}
              className="w-full h-44"
              loading="lazy"
            />
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-xs font-black uppercase text-orange-600 hover:text-orange-700"
          >
            View on Google Maps
          </a>
        </div>
      )}

      {locationError && (
        <p className="text-xs font-semibold text-red-600 mt-2">
          {locationError}
        </p>
      )}
    </section>
  );
}
