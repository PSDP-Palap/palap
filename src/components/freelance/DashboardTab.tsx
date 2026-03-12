import Loading from "@/components/shared/Loading";

interface DashboardTabProps {
	currentEarning: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	orders: any[];
	loadingOrders: boolean;
}

const DashboardTab = ({
	currentEarning,
	orders,
	loadingOrders,
}: DashboardTabProps) => {
	return (
		<div className="min-h-full flex flex-col gap-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
				<div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
					<h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
						฿ {currentEarning.toLocaleString()}
					</h3>
					<p className="text-gray-500 font-medium">Current Earning</p>
				</div>
				<div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
					<h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
						{orders.length}
					</h3>
					<p className="text-gray-500 font-medium">Assigned Orders</p>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm min-w-0 overflow-hidden flex-1 flex flex-col">
				<h2 className="text-xl font-black text-[#4A2600] mb-3">
					Recent Orders
				</h2>

				<div
					className={`flex-1 min-h-0 flex flex-col ${loadingOrders || orders.length === 0 ? "items-center justify-center" : ""}`}
				>
					{loadingOrders ? (
						<Loading fullScreen={false} size={60} />
					) : orders.length === 0 ? (
						<p className="text-sm text-gray-500">
							No orders found for this freelance account.
						</p>
					) : (
						<div className="space-y-3 overflow-y-auto pr-1">
							{orders.map((order, index) => {
								const itemName =
									order.service?.name || order.product?.name || "Order Item";
								const category =
									order.service?.category ||
									(order.product ? "PRODUCT" : "GENERAL");
								// Check for admin payment status (could be array if join is 1:N but usually 1:1)
								const earning = Array.isArray(order.earning)
									? order.earning[0]
									: order.earning;
								const adminPaid =
									earning?.status === "completed" || earning?.status === "paid";

								// Use the actual earning amount if available, otherwise fallback to order price
								const netAmount = earning?.amount ? Number(earning.amount) : Number(order.price ?? 0);
								const grossAmount = Number(order.price ?? 0);
								const actualFee = grossAmount - netAmount;

								return (
									<div
										key={order.order_id || index}
										className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100 min-w-0 overflow-hidden"
									>
										<div className="flex items-center gap-4 min-w-0">
											<div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
												{category === "DELIVERY"
													? "🚐"
													: category === "SHOPPING"
														? "🍲"
														: category === "CARE"
															? "🦮"
															: "📦"}
											</div>
											<div className="min-w-0">
												<h4 className="font-bold text-lg text-gray-800 truncate">
													{itemName}
												</h4>
												<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
													<p className="text-[10px] text-gray-400">
														Status:{" "}
														<span className="font-bold text-orange-600 uppercase">
															{order.status}
														</span>
													</p>
													{order.status === "COMPLETE" && (
														<span
															className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${adminPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
														>
															{adminPaid ? "Paid" : "Pending"}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="text-right shrink-0 ml-3">
											<div className="flex items-center justify-end gap-2 mb-1">
												<span className="text-[10px] text-gray-500">
													ID: {String(order.order_id).slice(0, 8)}
												</span>
												<span className="bg-[#FFD700] text-[10px] px-2 py-0.5 rounded-full font-bold">
													{category}
												</span>
											</div>
											<div className="flex flex-col items-end">
												<p className="text-xl font-bold text-green-600">
													฿ {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
												{actualFee > 0 && (
													<div className="flex gap-1 text-[8px] font-bold">
														<span className="text-gray-400 uppercase tracking-tighter">
															Original: ฿{grossAmount.toLocaleString()}
														</span>
														<span className="text-red-400 uppercase tracking-tighter">
															Fee: -฿{actualFee.toLocaleString()}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default DashboardTab;
