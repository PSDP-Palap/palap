import type { Session } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { Edit, Mail, Phone, Shield, User } from "lucide-react";

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
		<div className="space-y-4 min-h-full pb-10 flex flex-col">
			{/* Profile Header Card */}
			<div className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm overflow-hidden relative shrink-0">
				<div className="flex flex-col md:flex-row items-center gap-6">
					<div className="w-24 h-24 rounded-2xl border-2 border-orange-50 shadow-sm bg-orange-100 flex items-center justify-center text-3xl font-black text-orange-600 overflow-hidden shrink-0">
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

					<div className="flex-1 text-center md:text-left">
						<h2 className="text-2xl font-black text-[#4A2600] tracking-tight">
							{displayName}
						</h2>
						<div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
							<span className="px-3 py-1 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
								{profile?.role || "freelance"}
							</span>
							<span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider">
								ID: {String(profile?.id || "").slice(0, 8)}...
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-2 w-full md:w-auto">
						<Link
							to="/edit-profile"
							className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-black text-xs shadow-md hover:bg-orange-700 transition-all active:scale-[0.98]"
						>
							<Edit className="w-3.5 h-3.5" />
							Edit Profile
						</Link>
					</div>
				</div>
			</div>

			{/* Information Grid */}
			<div className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm flex-1">
				<div className="flex items-center gap-2 mb-6">
					<div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
						<User className="w-4 h-4 text-orange-600" />
					</div>
					<h3 className="text-lg font-black text-[#4A2600] tracking-tight">
						Account Details
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
							Full Name
						</label>
						<div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 transition-all hover:bg-white hover:border-orange-200 group">
							<User className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
							<p className="font-bold text-gray-700 text-sm">
								{profile?.full_name || "Not set"}
							</p>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
							Email Address
						</label>
						<div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 transition-all hover:bg-white hover:border-orange-200 group">
							<Mail className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
							<p className="font-bold text-gray-700 text-sm truncate">
								{profile?.email || session?.user?.email || "Not set"}
							</p>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
							Phone Number
						</label>
						<div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 transition-all hover:bg-white hover:border-orange-200 group">
							<Phone className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
							<p className="font-bold text-gray-700 text-sm">
								{profile?.phone_number || "Not set"}
							</p>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
							Account Security
						</label>
						<div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 transition-all hover:bg-white hover:border-orange-200 group">
							<Shield className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
							<div>
								<p className="font-bold text-gray-700 text-sm uppercase tracking-tight">
									Verified Account
								</p>
								<p className="text-[10px] text-green-600 font-bold">
									Role: {profile?.role || "Freelance"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AccountSettingTab;
