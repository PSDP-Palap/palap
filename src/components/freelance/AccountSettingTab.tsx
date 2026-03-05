import type { Session } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { Edit, ExternalLink, Mail, Phone, Shield, User } from "lucide-react";

import type { Profile } from "@/types/user";

interface AccountSettingTabProps {
  profile: Profile | null;
  session: Session | null;
}

const AccountSettingTab = ({ profile, session }: AccountSettingTabProps) => {
  const displayName =
    profile?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Freelance User";

  return (
    <div className="space-y-6 min-h-full pb-10">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-orange-100 p-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-r from-orange-100 to-amber-50 opacity-50" />

        <div className="relative flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-orange-100 flex items-center justify-center text-4xl font-black text-orange-600 mb-4 overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {displayName}
          </h2>
          <span className="mt-2 px-4 py-1 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            {profile?.role || "freelance"}
          </span>
        </div>
      </div>

      {/* Information Grid */}
      <div className="bg-white rounded-3xl border border-orange-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <User className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="text-lg font-black text-gray-800 tracking-tight">
            Personal Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
              Full Name
            </label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 transition-all hover:bg-white hover:border-orange-200 group">
              <User className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <p className="font-bold text-gray-700">
                {profile?.full_name || "Not set"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
              Email Address
            </label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 transition-all hover:bg-white hover:border-orange-200 group">
              <Mail className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <p className="font-bold text-gray-700">
                {profile?.email || session?.user?.email || "Not set"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
              Phone Number
            </label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 transition-all hover:bg-white hover:border-orange-200 group">
              <Phone className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <p className="font-bold text-gray-700">
                {profile?.phone_number || "Not set"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
              Account Role
            </label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 transition-all hover:bg-white hover:border-orange-200 group">
              <Shield className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <p className="font-bold text-gray-700 uppercase tracking-tight">
                {profile?.role || "freelance"}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-4">
          <Link
            to="/profile"
            className="flex-1 min-w-40 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-600 text-white font-black text-sm shadow-md hover:bg-orange-700 transition-all active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4" />
            View Public Profile
          </Link>
          <Link
            to="/edit-profile"
            className="flex-1 min-w-40 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-orange-100 text-orange-600 font-black text-sm shadow-sm hover:border-orange-200 hover:bg-orange-50 transition-all active:scale-[0.98]"
          >
            <Edit className="w-4 h-4" />
            Edit Profile Info
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingTab;
