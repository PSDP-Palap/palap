import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
    lng: null as number | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
        address: profile.address || "",
        lat: null, // We'll need to fetch these if we want them initially
        lng: null
      });
    }
  }, [profile]);

  if (isLoading) {
    return <Loading />;
  }

  if (!profile) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapChange = async (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
    
    // Reverse Geocoding
    try {
      setIsResolving(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setFormData(prev => ({ ...prev, address: data.display_name }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving changes...");

    try {
      const { error } = await updateProfile(formData);

      if (error) {
        toast.error(
          typeof error === "string" ? error : "Failed to update profile",
          { id: loadingToast }
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
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
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
                    <div className="mb-2">
                      <MapPicker lat={formData.lat} lng={formData.lng} onChange={handleMapChange} />
                      <p className="text-[10px] text-gray-400 mt-2 px-2 italic">
                        Click on the map to pin your exact delivery location.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-500 uppercase mb-1">
                      Home Address Detail {isResolving && <span className="text-[10px] lowercase animate-pulse">(resolving...)</span>}
                    </label>
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
