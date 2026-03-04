import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { UserRole } from "@/types/user";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

const ProfilePage = () => {
  const { profile, session, isLoading, setProfile } = useUserStore();
  const [isRecoveringProfile, setIsRecoveringProfile] = useState(false);

  useEffect(() => {
    let isActive = true;

    const recoverProfile = async () => {
      if (isLoading || profile || !session?.user?.id) return;

      try {
        setIsRecoveringProfile(true);

        const { data: fetchedProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!isActive) return;

        const roleFromMeta = session.user.app_metadata?.role as UserRole | undefined;

        if (fetchedProfile) {
          setProfile({
            ...fetchedProfile,
            role: roleFromMeta || fetchedProfile.role,
          });
          return;
        }

        setProfile({
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "",
          role: roleFromMeta || "customer",
          phone_number: null,
          created_at: new Date().toISOString(),
          address: null,
        });
      } finally {
        if (isActive) {
          setIsRecoveringProfile(false);
        }
      }
    };

    recoverProfile();

    return () => {
      isActive = false;
    };
  }, [isLoading, profile, session, setProfile]);

  if (isLoading || (session && !profile && isRecoveringProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9a3c0b]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">
          Please log in to view your profile
        </h2>
        <Link
          to="/sign-in"
          className="bg-[#9a3c0b] text-white px-6 py-2 rounded-full font-bold"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-[#9a3c0b] h-32 md:h-48 relative">
            <div className="absolute -bottom-12 left-8 md:left-16">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl md:text-5xl overflow-hidden">
                {profile.full_name?.charAt(0) || "👤"}
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8 md:px-16">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {profile.full_name}
                </h1>
                <p className="text-gray-500 font-medium">{profile.email}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold uppercase tracking-wider">
                  {profile.role}
                </span>
              </div>
            </div>

            <hr className="my-8 border-gray-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Account Information
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 uppercase mb-1">
                    Full Name
                  </label>
                  <p className="text-lg text-gray-700">{profile.full_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 uppercase mb-1">
                    Email Address
                  </label>
                  <p className="text-lg text-gray-700">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 uppercase mb-1">
                    Phone Number
                  </label>
                  <p className="text-lg text-gray-700">
                    {profile.phone_number || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Settings
                </h2>

                <div className="space-y-3">
                  <Link to="/edit-profile" className="block w-full">
                    <button className="w-full text-left px-6 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group">
                      <div>
                        <p className="font-bold text-gray-700">Edit Profile</p>
                        <p className="text-xs text-gray-400">
                          Update your personal information
                        </p>
                      </div>
                      <span className="group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </button>
                  </Link>

                  <button className="w-full text-left px-6 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-gray-700">Change Password</p>
                      <p className="text-xs text-gray-400">
                        Secure your account
                      </p>
                    </div>
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </button>

                  {profile.role === "customer" && (
                    <Link to="/freelance-sign-up" className="block w-full">
                      <button className="w-full text-left px-6 py-4 rounded-2xl bg-[#9a3c0b]/5 hover:bg-[#9a3c0b]/10 transition-colors flex items-center justify-between group">
                        <div>
                          <p className="font-bold text-[#9a3c0b]">
                            Apply as Freelance
                          </p>
                          <p className="text-xs text-[#9a3c0b]/60">
                            Start providing pet care services
                          </p>
                        </div>
                        <span className="text-[#9a3c0b] group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
