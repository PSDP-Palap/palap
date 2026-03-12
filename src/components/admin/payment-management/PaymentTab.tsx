import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
	RefreshCcw,
	DollarSign,
	AlertCircle,
	Package,
	CheckCircle2,
	ArrowRight,
} from "lucide-react";

import Loading from "@/components/shared/Loading";
import { TooltipProvider } from "@/components/ui/tooltip";
import supabase from "@/utils/supabase";

interface EarningDetail {
	id: string;
	order_id: string;
	freelance_id: string;
	amount: number;
	status: string;
	paid_at: string | null;
	created_at: string;
}

const PaymentTab = () => {
	const [activeView, setActiveTab] = useState<"earnings" | "transactions">(
		"earnings",
	);
	const [earnings, setEarnings] = useState<EarningDetail[]>([]);
	const [transactions, setTransactions] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState<string | null>(null);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			if (activeView === "earnings") {
				const { data, error } = await supabase
					.from("freelance_earnings")
					.select("*")
					.order("created_at", { ascending: false });

				if (error) throw error;
				console.log("Fetched earnings:", data); // Debugging
				setEarnings(data || []);
			} else {
				const { data, error } = await supabase
					.from("transactions")
					.select("*")
					.order("created_at", { ascending: false });

				if (error) throw error;
				setTransactions(data || []);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast.error("Failed to load data");
		} finally {
			setIsLoading(false);
		}
	};

	const handleApprovePayout = async (earning: EarningDetail) => {
		if (!window.confirm("Confirm payment transfer to Freelancer?")) return;

		setIsUpdating(earning.id);
		const loadingToast = toast.loading("Finalizing payout...");
		try {
			// 1. Update the earning status to 'paid'
			const { error: earningError } = await supabase
				.from("freelance_earnings")
				.update({
					status: "paid",
					paid_at: new Date().toISOString(),
				})
				.eq("id", earning.id);

			if (earningError) throw earningError;

			// 2. Automatically close the order session by setting status to COMPLETE
			if (earning.order_id) {
				await supabase
					.from("orders")
					.update({ status: "COMPLETE" })
					.eq("order_id", earning.order_id);
			}

			toast.success("Payout successful and order closed!", {
				id: loadingToast,
			});
			fetchData(); // Refresh list
		} catch (error) {
			console.error(error);
			toast.error("Failed to update payout", { id: loadingToast });
		} finally {
			setIsUpdating(null);
		}
	};

	useEffect(() => {
		fetchData();
	}, [activeView]);

	const getStatusBadge = (status: string) => {
		const s = String(status || "").toLowerCase();
		if (s === "paid" || s === "completed" || s === "success")
			return "bg-green-100 text-green-700 border-green-200";
		if (s === "pending" || s === "waiting")
			return "bg-orange-100 text-orange-700 border-orange-200";
		return "bg-gray-100 text-gray-600 border-gray-200";
	};

	if (isLoading && earnings.length === 0 && transactions.length === 0) {
		return (
			<div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center h-full min-h-[400px]">
				<Loading fullScreen={false} size={150} />
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-white rounded-[2.5rem] shadow-xl border border-orange-50 overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
				{/* Header */}
				<div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-linear-to-b from-orange-50/30 to-transparent">
					<div className="flex items-center gap-6">
						<div>
							<h2 className="text-2xl font-black text-[#4A2600] tracking-tight">
								{activeView === "earnings"
									? "Freelance Payouts"
									: "Payment History"}
							</h2>
							<p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
								{activeView === "earnings"
									? "Finalize earnings for completed jobs"
									: "Logs of all customer transactions"}
							</p>
						</div>

						<div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-inner">
							<button
								onClick={() => setActiveTab("earnings")}
								className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "earnings" ? "bg-white text-[#A03F00] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
							>
								Approve Payouts
							</button>
							<button
								onClick={() => setActiveTab("transactions")}
								className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "transactions" ? "bg-white text-[#A03F00] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
							>
								History
							</button>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={() => fetchData()}
							className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all shadow-sm active:scale-95"
						>
							<RefreshCcw
								className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
							/>
						</button>
					</div>
				</div>

				{/* List Section */}
				<div className="flex-1 overflow-y-auto">
					{activeView === "earnings" ? (
						<table className="w-full text-left">
							<thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10">
								<tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
									<th className="px-8 py-5">Payout Detail</th>
									<th className="px-8 py-5 text-center">Amount</th>
									<th className="px-8 py-5 text-center">Current Status</th>
									<th className="px-8 py-5 text-center">Management Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{earnings.map((e) => (
									<tr
										key={e.id}
										className="hover:bg-orange-50/30 transition-colors group"
									>
										<td className="px-8 py-6">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
													<DollarSign className="w-5 h-5" />
												</div>
												<div className="min-w-0">
													<p className="text-xs font-black text-[#4A2600] truncate">
														#{e.order_id?.split("-")[0] || "No ID"}
													</p>
													<p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 font-mono">
														{e.freelance_id || "No Freelancer"}
													</p>
												</div>
											</div>
										</td>
										<td className="px-8 py-6 text-center">
											<span className="font-black text-green-600 text-lg">
												฿{e.amount?.toLocaleString()}
											</span>
										</td>
										<td className="px-8 py-6 text-center">
											<span
												className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusBadge(e.status)}`}
											>
												{e.status || "WAITING"}
											</span>
										</td>
										<td className="px-8 py-6 text-center">
											{String(e.status).toLowerCase() !== "paid" ? (
												<button
													onClick={() => handleApprovePayout(e)}
													disabled={isUpdating === e.id}
													className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#4A2600] text-white hover:bg-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 overflow-hidden"
												>
													<div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
													{isUpdating === e.id
														? "Syncing..."
														: "Release Payment"}
													<ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
												</button>
											) : (
												<div className="flex flex-col items-center gap-1">
													<div className="flex items-center gap-1.5 text-green-600">
														<CheckCircle2 className="w-4 h-4" />
														<span className="text-[10px] font-black uppercase tracking-widest">
															Payout Cleared
														</span>
													</div>
													<p className="text-[8px] text-gray-400 font-bold uppercase">
														{new Date(e.paid_at!).toLocaleDateString()}
													</p>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<table className="w-full text-left">
							<thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10">
								<tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
									<th className="px-8 py-5">Order Detail</th>
									<th className="px-8 py-5">Amount</th>
									<th className="px-8 py-5">Method</th>
									<th className="px-8 py-5">Status</th>
									<th className="px-8 py-5 text-right">Date</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{transactions.map((t) => (
									<tr
										key={t.id}
										className="hover:bg-orange-50/30 transition-colors group"
									>
										<td className="px-8 py-6">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
													<Package className="w-5 h-5" />
												</div>
												<div className="min-w-0">
													<p className="text-xs font-black text-[#4A2600] truncate">
														#{t.order_id?.split("-")[0] || "No ID"}
													</p>
													<p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
														Order ID
													</p>
												</div>
											</div>
										</td>
										<td className="px-8 py-6 font-black text-[#A03F00] text-sm">
											฿{t.amount?.toLocaleString()}
										</td>
										<td className="px-8 py-6">
											<span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-[9px] font-black uppercase tracking-wider">
												{t.payment_method}
											</span>
										</td>
										<td className="px-8 py-6">
											<span
												className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${getStatusBadge(t.status || "paid")}`}
											>
												{t.status || "paid"}
											</span>
										</td>
										<td className="px-8 py-6 text-right text-[10px] font-bold text-gray-400">
											{new Date(t.created_at).toLocaleDateString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}

					{(activeView === "earnings" ? earnings : transactions).length ===
						0 && (
						<div className="py-20 text-center">
							<div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
								<AlertCircle className="w-10 h-10 text-gray-200" />
							</div>
							<h3 className="text-xl font-black text-[#4A2600]">
								No database records found
							</h3>
							<p className="text-gray-400 font-bold mt-1 uppercase text-[10px] tracking-widest text-center">
								The {activeView} table in Supabase appears to be empty.
							</p>
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
};

export default PaymentTab;
