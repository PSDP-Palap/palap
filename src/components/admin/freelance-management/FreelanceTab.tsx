import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FreelanceProfile, FreelanceStatus } from "@/types/user";
import supabase from "@/utils/supabase";

import { FreelanceManagementDialog } from "./FreelanceManagementDialog";

const FreelanceTab = () => {
	const [freelances, setFreelances] = useState<FreelanceProfile[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedFreelance, setSelectedFreelance] =
		useState<FreelanceProfile | null>(null);

	const fetchFreelances = async () => {
		setIsLoading(true);
		try {
			// Query profiles joined with freelances
			const { data, error } = await supabase
				.from("profiles")
				.select(
					`
          id, email, full_name, phone_number, role, created_at,
          freelances (
            status, job_category, bio, rating, updated_at
          )
        `,
				)
				.eq("role", "freelance");

			if (error) throw error;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const transformed = (data || []).map((item: any) => {
				// Handle freelances as a single object or first element of array
				const fData = Array.isArray(item.freelances)
					? item.freelances[0]
					: item.freelances;
				const freelanceInfo = fData || {};

				return {
					...item,
					status: (freelanceInfo.status || "unverified") as FreelanceStatus,
					job_category: freelanceInfo.job_category || null,
					bio: freelanceInfo.bio || null,
					rating: Number(freelanceInfo.rating) || 0,
					updated_at: freelanceInfo.updated_at || item.created_at,
				};
			}) as FreelanceProfile[];

			setFreelances(transformed);
		} catch (error) {
			console.error("Error fetching freelances:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const updateFreelanceStatus = async (id: string, status: FreelanceStatus) => {
		try {
			const { error } = await supabase
				.from("freelances")
				.upsert({ id, status, updated_at: new Date().toISOString() }, { onConflict: "id" });

			if (error) throw error;
			toast.success(`สถานะเปลี่ยนเป็น ${status} เรียบร้อยแล้ว`);
			fetchFreelances(); // Refresh data
		} catch (error) {
			console.error("Error updating freelance status:", error);
			toast.error("ไม่สามารถเปลี่ยนสถานะได้ โปรดลองอีกครั้ง");
		}
	};

	useEffect(() => {
		fetchFreelances();
	}, []);

	const filteredFreelances = freelances.filter(
		(f) =>
			f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			f.id.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const getStatusBadge = (status: FreelanceStatus) => {
		switch (status) {
			case "verified":
				return "bg-green-100 text-green-700 border-green-200";
			case "banned":
				return "bg-red-100 text-red-700 border-red-200";
			case "unverified":
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
		}
	};

	if (isLoading) {
		return (
			<div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center h-full min-h-100">
				<Loading fullScreen={false} size={150} />
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col h-full">
				<div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
					<div className="flex items-center gap-4">
						<h2 className="text-xl font-bold text-gray-800">Freelance</h2>
						<button
							onClick={() => fetchFreelances()}
							disabled={isLoading}
							className="p-2 text-gray-500 hover:text-[#A6411C] hover:bg-orange-50 rounded-xl transition-all disabled:opacity-50"
							title="รีเฟรชข้อมูล"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						</button>
					</div>
					<div className="relative w-64">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<input
							type="text"
							placeholder="ค้นหาชื่อ, อีเมล, ID..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A6411C] focus:bg-white transition-all"
						/>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto">
					<table className="w-full text-left border-collapse">
						<thead className="sticky top-0 z-10">
							<tr className="bg-gray-50 text-gray-600 text-sm">
								<th className="px-6 py-4 font-semibold">ID</th>
								<th className="px-6 py-4 font-semibold">Name</th>
								<th className="px-6 py-4 font-semibold">Email</th>
								<th className="px-6 py-4 font-semibold">Phone</th>
								<th className="px-6 py-4 font-semibold">Status</th>
								<th className="px-6 py-4 font-semibold text-center">
									Management
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredFreelances.length > 0 ? (
								filteredFreelances.map((freelance) => (
									<tr
										key={freelance.id}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="px-6 py-4 text-sm font-mono text-gray-500">
											<Tooltip>
												<TooltipTrigger asChild>
													<span
														className="cursor-pointer hover:text-[#A6411C] transition-colors"
														onClick={() => {
															navigator.clipboard.writeText(freelance.id);
															toast.success("คัดลอก ID เรียบร้อยแล้ว");
														}}
													>
														{freelance.id.split("-")[0]}...
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>{freelance.id}</p>
												</TooltipContent>
											</Tooltip>
										</td>
										<td className="px-6 py-4 text-sm font-medium text-gray-800">
											{freelance.full_name}
										</td>
										<td className="px-6 py-4 text-sm text-gray-600">
											{freelance.email}
										</td>
										<td className="px-6 py-4 text-sm text-gray-600">
											{freelance.phone_number || "-"}
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
													freelance.status,
												)}`}
											>
												{freelance.status}
											</span>
										</td>
										<td className="px-6 py-4 text-center">
											<button
												onClick={() => setSelectedFreelance(freelance)}
												className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#A6411C] border border-gray-100 rounded-xl text-xs font-bold transition-all"
											>
												Show more
											</button>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-10 text-center text-gray-500"
									>
										{searchTerm
											? "ไม่พบข้อมูลที่ตรงกับการค้นหา"
											: "ไม่พบข้อมูล Freelance"}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<FreelanceManagementDialog
					isOpen={!!selectedFreelance}
					freelance={selectedFreelance}
					onClose={() => setSelectedFreelance(null)}
					onUpdateStatus={updateFreelanceStatus}
				/>
			</div>
		</TooltipProvider>
	);
};

export default FreelanceTab;
