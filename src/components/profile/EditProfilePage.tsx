import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";

import Loading from "@/components/shared/Loading";
import MapPicker from "@/components/shared/MapPicker";
import { useUserStore } from "@/stores/useUserStore";

const EditProfilePage = () => {
	const router = useRouter();
	const { profile, updateProfile, isLoading } = useUserStore();

	const [formData, setFormData] = useState({
		full_name: "",
		phone_number: "",
		address: "",
		lat: null as number | null,
		lng: null as number | null,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResolving, setIsResolving] = useState(false);

	useEffect(() => {
		if (profile) {
			setFormData({
				full_name: profile.full_name || "",
				phone_number: profile.phone_number || "",
				address: profile.address || "",
				lat: profile.lat || null,
				lng: profile.lng || null,
			});
		}
	}, [profile]);

	if (isLoading) {
		return <Loading />;
	}

	if (!profile) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleManualSearch = async () => {
		if (!formData.address.trim()) {
			toast.error("Please enter an address to search");
			return;
		}

		try {
			setIsResolving(true);
			const loadingToast = toast.loading("Searching for address...");

			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`,
				{
					headers: {
						"Accept-Language": "en-US,en;q=0.9,th;q=0.8",
						"User-Agent": "PalapPetServices/1.0",
					},
				},
			);
			const data = await response.json();

			if (data && data.length > 0) {
				const { lat, lon } = data[0];
				const newLat = parseFloat(lat);
				const newLng = parseFloat(lon);

				setFormData((prev) => ({ ...prev, lat: newLat, lng: newLng }));
				toast.success("Location found and pinned!", { id: loadingToast });
			} else {
				toast.error(
					"Could not find that location. Please be more specific or use the map.",
					{ id: loadingToast },
				);
			}
		} catch (error) {
			console.error("Search error:", error);
			toast.error("Failed to search address");
		} finally {
			setIsResolving(false);
		}
	};

	const handleMapChange = async (lat: number, lng: number) => {
		setFormData((prev) => ({ ...prev, lat, lng }));

		// Reverse Geocoding
		try {
			setIsResolving(true);
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
				{
					headers: {
						"Accept-Language": "en-US,en;q=0.9,th;q=0.8",
						"User-Agent": "PalapPetServices/1.0",
					},
				},
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
					(item, index) => parts.indexOf(item) === index,
				);

				if (uniqueParts.length > 0) {
					setFormData((prev) => ({ ...prev, address: uniqueParts.join(", ") }));
				} else {
					setFormData((prev) => ({
						...prev,
						address:
							data.display_name ||
							`Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
					}));
				}
			} else if (data && data.display_name) {
				setFormData((prev) => ({ ...prev, address: data.display_name }));
			} else {
				setFormData((prev) => ({
					...prev,
					address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
				}));
			}
		} catch (error) {
			console.error("Geocoding error:", error);
			setFormData((prev) => ({
				...prev,
				address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
			}));
		} finally {
			setIsResolving(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSubmitting(true);
		const loadingToast = toast.loading("Saving changes...");

		try {
			// Standardize payload for updateProfile
			const { error } = await updateProfile({
				full_name: formData.full_name,
				phone_number: formData.phone_number,
				address: formData.address,
				lat: formData.lat,
				lng: formData.lng,
			});

			if (error) {
				toast.error(
					typeof error === "string" ? error : "Failed to update profile",
					{ id: loadingToast },
				);
			} else {
				toast.success("Profile updated successfully!", { id: loadingToast });
				setTimeout(() => {
					router.navigate({ to: "/profile" });
				}, 1500);
			}
		} catch (err) {
			console.error("Submit error:", err);
			toast.error("An unexpected error occurred", { id: loadingToast });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 pt-6 md:pt-24 pb-12">
			<div className="max-w-2xl mx-auto px-4">
				<div className="bg-white rounded-3xl shadow-xl overflow-hidden">
					<div className="bg-[#9a3c0b] py-6 px-8 text-white flex justify-between items-center">
						<h1 className="text-2xl font-bold">Edit Profile</h1>
						<Link
							to="/profile"
							className="text-sm bg-white/20 hover:bg-white/30 px-4 py-1 rounded-full transition-colors"
						>
							Cancel
						</Link>
					</div>

					<form onSubmit={handleSubmit} className="p-8 space-y-6">
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-gray-500 uppercase mb-1">
									Full Name
								</label>
								<input
									type="text"
									name="full_name"
									value={formData.full_name}
									onChange={handleChange}
									required
									className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9a3c0b]/20 focus:border-[#9a3c0b] transition-all"
									placeholder="Your Name"
								/>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-500 uppercase mb-1">
									Email Address
								</label>
								<input
									type="email"
									value={profile.email}
									disabled
									className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
								/>
								<p className="text-[10px] text-gray-400 mt-1 ml-2">
									Email cannot be changed
								</p>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-500 uppercase mb-1">
									Phone Number
								</label>
								<input
									type="tel"
									name="phone_number"
									value={formData.phone_number}
									onChange={handleChange}
									className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9a3c0b]/20 focus:border-[#9a3c0b] transition-all"
									placeholder="08XXXXXXXX"
								/>
							</div>

							{profile.role === "customer" && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-semibold text-gray-500 uppercase mb-1">
											Home Location
										</label>
										<div className="mb-2 h-80 w-full relative">
											<MapPicker
												lat={formData.lat}
												lng={formData.lng}
												address={formData.address}
												onChange={handleMapChange}
											/>
											<p className="text-[10px] text-gray-400 mt-2 px-2 italic">
												Click on the map to pin your exact delivery location.
											</p>
										</div>
									</div>

									<div className="pt-4">
										<div className="flex justify-between items-center mb-1">
											<label className="block text-sm font-semibold text-gray-500 uppercase">
												Home Address Detail{" "}
												{isResolving && (
													<span className="text-[10px] lowercase animate-pulse">
														(resolving...)
													</span>
												)}
											</label>
											<button
												type="button"
												onClick={handleManualSearch}
												className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 hover:underline"
											>
												<Search className="w-3 h-3" />
												Search & Pin
											</button>
										</div>
										<textarea
											name="address"
											value={formData.address}
											onChange={handleChange}
											rows={3}
											className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9a3c0b]/20 focus:border-[#9a3c0b] transition-all"
											placeholder="Your detailed address..."
										/>
									</div>
								</div>
							)}
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full bg-[#9a3c0b] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#7a2f09] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
						>
							{isSubmitting ? "Saving Changes..." : "Save Changes"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default EditProfilePage;
