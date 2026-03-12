import { Link } from "@tanstack/react-router";

import Loading from "@/components/shared/Loading";
import { useUserStore } from "@/stores/useUserStore";

const ProfilePage = () => {
	const { profile, isLoading } = useUserStore();

	if (isLoading) {
		return <Loading />;
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
		<div className="min-h-screen bg-gray-50 pt-6 md:pt-24 pb-12">
			<div className="max-w-4xl mx-auto px-4">
				<div className="bg-white rounded-3xl shadow-xl overflow-hidden">
					<div className="bg-[#9a3c0b] h-32 md:h-48 relative"></div>

					<div className="pt-6 pb-8 px-8 md:px-16">
						<div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
							<div className="flex items-center gap-6">
								<div className="w-24 h-24 md:w-32 md:h-32 -mt-12 md:-mt-16 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl md:text-5xl overflow-hidden shrink-0 relative z-10">
									{profile.avatar_url ? (
										<img
											src={profile.avatar_url}
											alt={profile.full_name}
											className="w-full h-full object-cover"
										/>
									) : (
										profile.full_name?.charAt(0) || "👤"
									)}
								</div>
								<div>
									<h1 className="text-3xl font-bold text-gray-800">
										{profile.full_name}
									</h1>
									<p className="text-gray-500 font-medium">{profile.email}</p>
									<div className="flex gap-2 mt-2">
										<span className="px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
											{profile.role}
										</span>
									</div>
								</div>
							</div>
						</div>

						<hr className="my-8 border-gray-100" />

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-6">
								<h2 className="text-xl font-bold text-gray-800 mb-4">
									Account Information
								</h2>

								<div className="space-y-4">
									<div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
										<label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
											Full Name
										</label>
										<p className="text-lg font-bold text-gray-700">
											{profile.full_name}
										</p>
									</div>

									<div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
										<label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
											Email Address
										</label>
										<p className="text-lg font-bold text-gray-700">
											{profile.email}
										</p>
									</div>

									<div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
										<label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
											Phone Number
										</label>
										<p className="text-lg font-bold text-gray-700">
											{profile.phone_number || "Not provided"}
										</p>
									</div>
								</div>

								{profile.role === "customer" && (
									<div>
										<label className="block text-sm font-semibold text-gray-400 uppercase mb-1">
											Home Location
										</label>
										<p className="text-lg text-gray-700">
											{(profile as any).addressName || "Home"}:{" "}
											{profile.address || "Not provided"}
										</p>
										{profile.lat && profile.lng && (
											<p className="text-xs text-gray-400 mt-1">
												Coordinates: {profile.lat.toFixed(6)},{" "}
												{profile.lng.toFixed(6)}
											</p>
										)}
									</div>
								)}
							</div>

							{/* Only show Settings/Edit if it's my own profile (defaulting to true for private /profile route) */}
							<div className="space-y-6">
								<h2 className="text-xl font-bold text-gray-800 mb-4">
									Quick Actions
								</h2>

								<div className="space-y-3">
									<Link to="/edit-profile" className="block w-full">
										<button className="w-full text-left px-6 py-4 rounded-2xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors flex items-center justify-between group">
											<div>
												<p className="font-bold text-orange-800">
													Edit Profile
												</p>
												<p className="text-xs text-orange-700/60">
													Update your personal information
												</p>
											</div>
											<span className="text-orange-400 group-hover:translate-x-1 transition-transform">
												→
											</span>
										</button>
									</Link>

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
