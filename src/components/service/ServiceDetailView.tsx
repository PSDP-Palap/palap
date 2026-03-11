import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle,
	ChevronRight,
	MapPin,
	MessageSquare,
	Navigation,
	ShieldCheck,
	User,
} from "lucide-react";

import Loading from "@/components/shared/Loading";
import type { PendingHireRoomView, Service } from "@/types/service";
import type { FreelanceProfile } from "@/types/user";

interface ServiceDetailViewProps {
	service: Service;
	creator: FreelanceProfile;
	openChat: () => Promise<void>;
	startingChat: boolean;
	canTryHire: boolean;
	isHireRequested: boolean;
	hireRequestMessage: string;
	setHireRequestMessage: (val: string) => void;
	sendHireRequest: () => Promise<void>;
	sendingHireRequest: boolean;
	cancelHireRequest: () => Promise<void>;
	cancelingHireRequest: boolean;
	requestLoading: boolean;
	canRequestHire: boolean;
	hasPendingHire: boolean;
	isServiceOwner: boolean;
	pendingHireRequests: PendingHireRoomView[];
	acceptHireRequest: (request: PendingHireRoomView) => Promise<void>;
	acceptingRequestRoomId: string | null;
	declineHireRequest: (request: PendingHireRoomView) => Promise<void>;
	decliningRequestRoomId: string | null;
	chatError: string | null;
	activeOrderId: string | null;
	hasActiveOrder: boolean;
	isFreelancer?: boolean;
}

export function ServiceDetailView({
	service,
	creator,
	openChat,
	startingChat,
	canTryHire,
	isHireRequested,
	hireRequestMessage,
	setHireRequestMessage,
	sendHireRequest,
	sendingHireRequest,
	cancelHireRequest,
	cancelingHireRequest,
	requestLoading,
	canRequestHire,
	hasPendingHire,
	isServiceOwner,
	pendingHireRequests,
	acceptHireRequest,
	acceptingRequestRoomId,
	declineHireRequest,
	decliningRequestRoomId,
	chatError,
	hasActiveOrder,
	isFreelancer,
}: ServiceDetailViewProps) {
	return (
		<div className="min-h-screen bg-[#F9E6D8] pt-6 md:pt-28 pb-20">
			<main className="max-w-6xl mx-auto px-4">
				{/* Back Button */}
				<Link
					to="/service"
					className="inline-flex items-center gap-2 text-orange-900/60 hover:text-orange-900 font-bold mb-6 transition-colors group"
				>
					<div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
						<ArrowLeft className="w-5 h-5" />
					</div>
					<span>Back to Services</span>
				</Link>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-8">
						{/* Gallery/Hero */}
						<div className="bg-white rounded-[2.5rem] p-4 shadow-xl shadow-orange-100/50 border-4 border-white overflow-hidden">
							<div className="relative aspect-video rounded-[2rem] overflow-hidden bg-orange-50">
								<img
									src={service.image_url || "/dog.png"}
									alt={service.name}
									className="w-full h-full object-cover"
								/>
								<div className="absolute top-6 left-6">
									<span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-black text-orange-600 uppercase tracking-widest shadow-lg border border-orange-50">
										{service.category || "General"}
									</span>
								</div>
							</div>
						</div>

						{/* Info Section */}
						<div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-orange-100/50 space-y-8">
							<div className="space-y-4">
								<h1 className="text-4xl md:text-5xl font-black text-[#4A2600] leading-tight">
									{service.name}
								</h1>
								<div className="flex flex-wrap gap-4 items-center">
									<div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
										<ShieldCheck className="w-4 h-4" />
										Verified Provider
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="text-xl font-black text-[#4A2600] flex items-center gap-2">
									About Service
								</h3>
								<p className="text-lg text-gray-600 leading-relaxed font-medium">
									{service.description ||
										"No description provided for this service."}
								</p>
							</div>

							{/* Location Details */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-orange-50/50 rounded-3xl p-6 border-2 border-orange-50 space-y-3">
									<div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
										<Navigation className="w-5 h-5" />
									</div>
									<div>
										<p className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em] mb-1">
											Pickup Point
										</p>
										<p className="text-sm font-bold text-[#4A2600] line-clamp-2">
											{typeof service.pickup_address === "object"
												? `${service.pickup_address?.name || ""} ${service.pickup_address?.address_detail || ""}`.trim() ||
													"Location shared after booking"
												: service.pickup_address ||
													service.detail_1 ||
													"Location shared after booking"}
										</p>
									</div>
								</div>

								<div className="bg-orange-50/50 rounded-3xl p-6 border-2 border-orange-50 space-y-3">
									<div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
										<MapPin className="w-5 h-5" />
									</div>
									<div>
										<p className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em] mb-1">
											Destination
										</p>
										<p className="text-sm font-bold text-[#4A2600] line-clamp-2">
											{typeof service.dest_address === "object"
												? `${service.dest_address?.name || ""} ${service.dest_address?.address_detail || ""}`.trim() ||
													"Location shared after booking"
												: service.dest_address ||
													service.detail_2 ||
													"Location shared after booking"}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Hire Requests Section (Owner Only) */}
						{isServiceOwner && (
							<div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-orange-100/50 space-y-6">
								<h3 className="text-2xl font-black text-[#4A2600] flex items-center gap-3">
									Hire Requests
									<span className="px-3 py-1 bg-orange-500 text-white text-xs rounded-full">
										{pendingHireRequests.length}
									</span>
								</h3>

								{requestLoading && (
									<div className="py-10 flex justify-center">
										<Loading fullScreen={false} size={40} />
									</div>
								)}

								{!requestLoading && pendingHireRequests.length === 0 && (
									<div className="py-10 text-center border-2 border-dashed border-orange-50 rounded-3xl">
										<p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
											No pending requests
										</p>
									</div>
								)}

								<div className="space-y-4">
									{!requestLoading &&
										pendingHireRequests.map((request) => (
											<div
												key={request.room_id}
												className="bg-orange-50/30 border-2 border-orange-50 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
											>
												<div className="flex items-center gap-4">
													<div className="w-16 h-16 rounded-[1.5rem] bg-white border-2 border-orange-100 overflow-hidden flex items-center justify-center shadow-sm">
														{request.customer_avatar_url ? (
															<img
																src={request.customer_avatar_url}
																alt={request.customer_name}
																className="w-full h-full object-cover"
															/>
														) : (
															<span className="text-xl font-black text-orange-600">
																{request.customer_name.charAt(0).toUpperCase()}
															</span>
														)}
													</div>
													<div>
														<p className="text-lg font-black text-[#4A2600]">
															{request.customer_name}
														</p>
														<p className="text-sm font-medium text-gray-500 line-clamp-1 italic">
															"
															{request.request_message ||
																"Hi, I'd like to hire you!"}
															"
														</p>
													</div>
												</div>

												<div className="flex gap-2">
													<button
														onClick={() => declineHireRequest(request)}
														disabled={
															decliningRequestRoomId === request.room_id ||
															acceptingRequestRoomId === request.room_id
														}
														className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-white text-gray-400 font-black text-sm hover:bg-gray-50 transition-all border-2 border-gray-50"
													>
														{decliningRequestRoomId === request.room_id
															? "..."
															: "Decline"}
													</button>
													<button
														onClick={() => acceptHireRequest(request)}
														disabled={
															acceptingRequestRoomId === request.room_id ||
															decliningRequestRoomId === request.room_id
														}
														className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-orange-600 text-white font-black text-sm hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95"
													>
														{acceptingRequestRoomId === request.room_id
															? "Accepting..."
															: "Accept Job"}
													</button>
												</div>
											</div>
										))}
								</div>
							</div>
						)}
					</div>

					{/* Sidebar Area */}
					<div className="space-y-8">
						{/* Price & Action Card */}
						<div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-orange-100 border-4 border-[#FF914D] sticky top-28 overflow-hidden">
							{/* Decoration Circle */}
							<div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full -z-10" />

							<div className="space-y-6 relative">
								<div>
									<p className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em] mb-1">
										Service Fee
									</p>
									<p className="text-5xl font-black text-[#A03F00]">
										฿{Number(service.price).toLocaleString()}
									</p>
								</div>

								<div className="space-y-3">
									{hasActiveOrder ? (
										<button
											type="button"
											onClick={openChat}
											disabled={startingChat}
											className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all active:scale-95 flex items-center justify-center gap-2"
										>
											{startingChat ? (
												<Loading fullScreen={false} size={20} />
											) : (
												<MessageSquare className="w-5 h-5" />
											)}
											{startingChat ? "Opening..." : "View Active Order"}
										</button>
									) : (
										<>
											{canTryHire && !isHireRequested && (
												<div className="space-y-4">
													<textarea
														value={hireRequestMessage}
														onChange={(e) =>
															setHireRequestMessage(e.target.value)
														}
														className="w-full bg-orange-50/50 border-2 border-orange-50 rounded-2xl px-4 py-3 text-sm font-bold text-[#4A2600] placeholder:text-orange-200 focus:outline-none focus:border-orange-200 focus:bg-white transition-all min-h-[120px]"
														placeholder="Message for freelancer (optional)..."
													/>
													<button
														type="button"
														onClick={sendHireRequest}
														disabled={
															sendingHireRequest ||
															requestLoading ||
															!canRequestHire
														}
														className="w-full bg-[#A03F00] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#803300] shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
													>
														{sendingHireRequest ? (
															<Loading fullScreen={false} size={20} />
														) : (
															<CheckCircle className="w-5 h-5" />
														)}
														{sendingHireRequest
															? "Sending..."
															: "Request to Hire"}
													</button>
												</div>
											)}

											{canTryHire && hasPendingHire && (
												<div className="space-y-3">
													<div className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-black text-center text-sm cursor-not-allowed border-2 border-gray-50 flex items-center justify-center gap-2">
														<Loading fullScreen={false} size={16} />
														Awaiting Approval
													</div>
													<button
														type="button"
														onClick={cancelHireRequest}
														disabled={cancelingHireRequest}
														className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-sm hover:bg-red-100 transition-all active:scale-95 border-2 border-red-50"
													>
														{cancelingHireRequest
															? "Canceling..."
															: "Cancel My Request"}
													</button>
												</div>
											)}
										</>
									)}
								</div>

								{/* Freelancer Profile Shortcut */}
								<div className="pt-6 border-t border-orange-50">
									<p className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em] mb-4">
										Service Provider
									</p>
									<div className="flex items-center gap-4 bg-orange-50/30 p-4 rounded-3xl border-2 border-orange-50">
										<div className="w-14 h-14 rounded-2xl bg-white border-2 border-white overflow-hidden flex items-center justify-center shadow-md shadow-orange-100">
											{creator?.avatar_url ? (
												<img
													src={creator.avatar_url}
													className="w-full h-full object-cover"
													alt={creator.full_name || ""}
												/>
											) : (
												<User className="w-6 h-6 text-orange-200" />
											)}
										</div>
										<div className="flex-1">
											<p className="text-base font-black text-[#4A2600] line-clamp-1">
												{creator?.full_name ||
													creator?.email ||
													"Freelance User"}
											</p>
										</div>
										<ChevronRight className="w-5 h-5 text-orange-200" />
									</div>
								</div>

								{isFreelancer && !isServiceOwner && !hasActiveOrder && (
									<div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 flex gap-3">
										<CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
										<p className="text-[10px] font-bold text-blue-700 leading-relaxed">
											You are logged in as a Freelancer. Only Customers can
											request to hire services.
										</p>
									</div>
								)}
							</div>
						</div>

						{/* Safety Tips */}
						<div className="bg-green-50/50 rounded-[2.5rem] p-8 border-2 border-green-50 space-y-4">
							<h4 className="text-sm font-black text-green-700 flex items-center gap-2">
								<ShieldCheck className="w-5 h-5" />
								Palap Safety Tips
							</h4>
							<ul className="space-y-3">
								{[
									"Verify location before booking",
									"Use in-app chat for coordination",
									"Release payment after completion",
								].map((tip, i) => (
									<li key={i} className="flex items-start gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-green-300 mt-1.5 shrink-0" />
										<p className="text-[11px] font-bold text-green-700/80">
											{tip}
										</p>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{chatError && (
					<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-sm animate-in slide-in-from-bottom-4">
						{chatError}
					</div>
				)}
			</main>
		</div>
	);
}
