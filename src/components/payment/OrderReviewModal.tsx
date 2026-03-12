import { X, MapPin, Calendar, Clock, CreditCard } from "lucide-react";

interface OrderItem {
	id: string;
	name: string;
	imageUrl: string | null;
	quantity: number;
	unitPrice: number;
	subtotal: number;
}

interface OrderReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	orderRows: OrderItem[];
	subtotal: number;
	deliveryFee: number;
	tax: number;
	total: number;
	addressName: string;
	addressDetail: string;
	displayDate: string;
	displayTime: string;
	isService?: boolean;
}

export function OrderReviewModal({
	isOpen,
	onClose,
	onConfirm,
	orderRows,
	subtotal,
	deliveryFee,
	tax,
	total,
	addressName,
	addressDetail,
	displayDate,
	displayTime,
	isService,
}: OrderReviewModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
			<div
				className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="bg-[#A03F00] p-4 flex items-center justify-between text-white">
					<h2 className="text-xl font-black flex items-center gap-2">
						<CreditCard className="w-6 h-6" />
						Review Your Order
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-white/20 rounded-full transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Items Section */}
					<div className="space-y-3">
						<h3 className="font-black text-[#4A2600] text-sm uppercase tracking-wider">
							Order Items
						</h3>
						<div className="bg-orange-50/50 rounded-xl p-3 space-y-3">
							{orderRows.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between text-sm"
								>
									<div className="flex items-center gap-3">
										<img
											src={item.imageUrl || "https://via.placeholder.com/48"}
											alt={item.name}
											className="w-10 h-10 rounded-lg object-cover bg-white border border-orange-100"
										/>
										<div>
											<p className="font-bold text-[#4A2600]">{item.name}</p>
											<p className="text-xs text-gray-500">
												{item.quantity} x ฿{item.unitPrice.toFixed(2)}
											</p>
										</div>
									</div>
									<p className="font-black text-[#A03F00]">
										฿{item.subtotal.toFixed(2)}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Delivery Details */}
					<div className="grid grid-cols-1 gap-4">
						<div className="space-y-2">
							<h3 className="font-black text-[#4A2600] text-sm uppercase tracking-wider flex items-center gap-2">
								<MapPin className="w-4 h-4 text-[#A03F00]" />
								Delivery Address
							</h3>
							<div className="bg-white border border-orange-100 rounded-xl p-3">
								<p className="font-bold text-[#4A2600] text-sm">
									{addressName || "Home Address"}
								</p>
								<p className="text-gray-600 text-xs leading-relaxed">
									{addressDetail}
								</p>
							</div>
						</div>

						<div className="flex gap-4">
							<div className="flex-1 space-y-2">
								<h3 className="font-black text-[#4A2600] text-sm uppercase tracking-wider flex items-center gap-2">
									<Calendar className="w-4 h-4 text-[#A03F00]" />
									Date
								</h3>
								<div className="bg-white border border-orange-100 rounded-xl p-3 text-sm font-bold text-[#4A2600]">
									{displayDate}
								</div>
							</div>
							<div className="flex-1 space-y-2">
								<h3 className="font-black text-[#4A2600] text-sm uppercase tracking-wider flex items-center gap-2">
									<Clock className="w-4 h-4 text-[#A03F00]" />
									Time
								</h3>
								<div className="bg-white border border-orange-100 rounded-xl p-3 text-sm font-bold text-[#4A2600]">
									{displayTime}
								</div>
							</div>
						</div>
					</div>

					{/* Summary */}
					<div className="border-t border-dashed border-orange-200 pt-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Items Subtotal</span>
							<span className="font-bold text-[#4A2600]">
								฿{subtotal.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Delivery Fee</span>
							<span className="font-bold text-[#4A2600]">
								฿{deliveryFee.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">Web Service Fee (3%)</span>
							<span className="font-bold text-[#4A2600]">
								฿{tax.toFixed(2)}
							</span>
						</div>{" "}
						<div className="flex justify-between items-center pt-2">
							<span className="font-black text-[#4A2600] text-lg">
								Total Amount
							</span>
							<span className="font-black text-2xl text-[#A03F00]">
								฿{total.toFixed(2)}
							</span>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 bg-orange-50 border-t border-orange-100 flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="flex-1 py-3 px-4 rounded-xl font-black text-white bg-[#A03F00] hover:bg-[#8a3600] shadow-lg shadow-orange-900/20 transition-all hover:-translate-y-0.5"
					>
						{isService ? "Confirm" : "Confirm & Pay"}
					</button>
				</div>
			</div>
		</div>
	);
}
