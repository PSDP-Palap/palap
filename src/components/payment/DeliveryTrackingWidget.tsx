import type { DeliveryTracking } from "@/types/order";

interface DeliveryTrackingWidgetProps {
	activeOrderId: string;
	isTrackingWidgetOpen: boolean;
	setIsTrackingWidgetOpen: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	accepted: boolean;
	trackingData: DeliveryTracking;
	status: string;
	trackingLoading: boolean;
	loadTracking: (id: string) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	router: any;
	routeUrl: string;
}

export function DeliveryTrackingWidget({
	activeOrderId,
	isTrackingWidgetOpen,
	setIsTrackingWidgetOpen,
	accepted,
	trackingData,
	status,
	trackingLoading,
	loadTracking,
	router,
	routeUrl,
}: DeliveryTrackingWidgetProps) {
	return (
		<aside
			data-floating-widget
			data-floating-corner="bottom-right"
			className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-70"
		>
			{isTrackingWidgetOpen && (
				<div className="mb-3 w-90 max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-2xl border border-orange-200 bg-[#F9E6D8] text-[#4A2600] shadow-2xl overflow-hidden">
					<div className="px-4 py-3 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between gap-2">
						<div>
							<p className="text-[10px] font-black uppercase tracking-wider text-white/85">
								Track Order
							</p>
							<p className="text-sm font-black text-white truncate">
								{activeOrderId}
							</p>
						</div>
						<span
							className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase ${accepted ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
						>
							{accepted ? "Serving" : "WAITING"}
						</span>
					</div>

					<div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto">
						<div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-1">
							<p>
								<span className="text-gray-500">Product:</span>{" "}
								<span className="font-bold">
									{trackingData.productName || "-"}
								</span>
							</p>
							<p>
								<span className="text-gray-500">Freelancer:</span>{" "}
								<span className="font-bold">{trackingData.freelanceName}</span>
							</p>
							<p>
								<span className="text-gray-500">Status:</span>{" "}
								<span className="font-bold uppercase">
									{status.replaceAll("_", " ") || "WAITING"}
								</span>
							</p>
							<p>
								<span className="text-gray-500">Updated:</span>{" "}
								{trackingData.updatedAt
									? new Date(trackingData.updatedAt).toLocaleString()
									: "-"}
							</p>
						</div>

						<div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
							<div>
								<p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
									Pickup
								</p>
								<p className="font-semibold text-[#4A2600]">
									{trackingData.pickupAddress?.name || "Pickup point"}
								</p>
								<p className="text-[#4A2600]/75">
									{trackingData.pickupAddress?.address_detail ||
										"No pickup address"}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">
									Destination
								</p>
								<p className="font-semibold text-[#4A2600]">
									{trackingData.destinationAddress?.name || "Destination"}
								</p>
								<p className="text-[#4A2600]/75">
									{trackingData.destinationAddress?.address_detail ||
										"No destination address"}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => loadTracking(activeOrderId)}
								disabled={trackingLoading}
								className="px-3 py-1.5 rounded-lg bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
							>
								{trackingLoading ? "Refreshing..." : "Refresh"}
							</button>
							<button
								type="button"
								onClick={() => {
									if (!trackingData.roomId) return;
									router.navigate({
										to: "/chat/$id",
										params: { id: trackingData.roomId },
									});
								}}
								disabled={!trackingData.roomId}
								className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-black disabled:bg-gray-100 disabled:text-gray-400"
							>
								Open Chat
							</button>
							<a
								href={routeUrl}
								target="_blank"
								rel="noreferrer"
								className="px-3 py-1.5 rounded-lg bg-orange-100 text-[#A03F00] text-xs font-black"
							>
								Open Map
							</a>
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-end">
				<button
					type="button"
					onClick={() => setIsTrackingWidgetOpen((prev: boolean) => !prev)}
					className="w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 font-black text-lg"
					aria-label="Toggle tracking widget"
				>
					{isTrackingWidgetOpen ? "×" : "🚚"}
				</button>
			</div>
		</aside>
	);
}
