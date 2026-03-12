import type { FreelanceProfile, FreelanceStatus } from "@/types/user";

interface FreelanceManagementDialogProps {
	isOpen: boolean;
	freelance: FreelanceProfile | null;
	onClose: () => void;
	onUpdateStatus: (id: string, status: FreelanceStatus) => Promise<void>;
}

export const FreelanceManagementDialog = ({
	isOpen,
	freelance,
	onClose,
	onUpdateStatus,
}: FreelanceManagementDialogProps) => {
	if (!isOpen || !freelance) return null;

	const handleStatusUpdate = async (status: FreelanceStatus) => {
		await onUpdateStatus(freelance.id, status);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans">
			<div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
				<div className="p-8">
					<div className="flex flex-col md:flex-row gap-10">
						{/* Left Side: Image */}
						<div className="md:w-1/3 flex flex-col items-center">
							<div className="w-40 h-40 rounded-2xl bg-orange-50 border-2 border-orange-100 flex items-center justify-center overflow-hidden shadow-inner">
								{/* Since the schema doesn't have avatar_url, we use a placeholder or the logo */}
								<img
									src="/logo.png"
									alt="Freelance"
									className="w-24 h-24 object-contain opacity-50"
								/>
							</div>
							<div className="mt-4 text-center">
								<span className="text-xs font-bold text-orange-600 uppercase tracking-widest px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
									Freelancer
								</span>
							</div>
						</div>

						{/* Right Side: Details */}
						<div className="flex-1 space-y-6">
							<div>
								<h3 className="text-2xl font-black text-gray-900 mb-1">
									{freelance.full_name}
								</h3>
								<p className="text-sm text-gray-400 font-mono">
									{freelance.id}
								</p>
							</div>

							<div className="grid grid-cols-1 gap-4">
								<div>
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
										Email Address
									</label>
									<p className="text-gray-700 font-medium">{freelance.email}</p>
								</div>
								<div>
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
										Phone Number
									</label>
									<p className="text-gray-700 font-medium">
										{freelance.phone_number || "ไม่ได้ระบุ"}
									</p>
								</div>
								<div>
									<label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
										Current Status
									</label>
									<span
										className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${
											freelance.status === "verified"
												? "bg-green-50 text-green-700 border-green-100"
												: freelance.status === "banned"
													? "bg-red-50 text-red-700 border-red-100"
													: "bg-gray-50 text-gray-500 border-gray-100"
										}`}
									>
										{freelance.status.toUpperCase()}
									</span>
								</div>
							</div>

							{/* Action Buttons based on status */}
							<div className="pt-6 border-t border-gray-50 flex gap-3">
								{freelance.status === "unverified" && (
									<>
										<button
											onClick={() => handleStatusUpdate("verified")}
											className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
										>
											Verify / Submit
										</button>
										<button
											onClick={onClose}
											className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
										>
											Cancel
										</button>
									</>
								)}

								{freelance.status === "verified" && (
									<button
										onClick={() => handleStatusUpdate("banned")}
										className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
									>
										Ban Freelance
									</button>
								)}

								{freelance.status === "banned" && (
									<button
										onClick={() => handleStatusUpdate("verified")}
										className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
									>
										Unban Freelance
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="mt-10 flex justify-end">
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 font-bold flex items-center gap-2 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
									clipRule="evenodd"
								/>
							</svg>
							Back
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
