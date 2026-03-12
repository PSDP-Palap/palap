import { Package, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";

interface OrderItem {
	id: string;
	name: string;
	imageUrl: string | null;
	quantity: number;
	unitPrice: number;
	subtotal: number;
}

interface OrderItemsListProps {
	orderRows: OrderItem[];
}

export function OrderItemsList({ orderRows }: OrderItemsListProps) {
	const { setQuantity, remove } = useCartStore();

	const handleDecrease = (id: string, currentQty: number) => {
		if (currentQty > 1) {
			setQuantity(id, currentQty - 1);
		} else {
			remove(id);
		}
	};

	const handleIncrease = (id: string, currentQty: number) => {
		setQuantity(id, currentQty + 1);
	};

	return (
		<section className="space-y-4">
			{orderRows.length === 0 ? (
				<div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl">
					<div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
						<Package className="w-8 h-8 text-gray-300" />
					</div>
					<p className="text-sm font-bold text-gray-400">
						Your cart is currently empty
					</p>
				</div>
			) : (
				<div className="divide-y divide-gray-50">
					{orderRows.map((row) => (
						<div
							key={row.id}
							className="py-6 first:pt-0 last:pb-0 flex items-center gap-6 group"
						>
							<div className="w-24 h-24 rounded-2xl bg-orange-50/50 border border-orange-100 overflow-hidden flex-shrink-0 transition-transform duration-500 group-hover:scale-105 shadow-sm">
								<img
									src={row.imageUrl || "https://via.placeholder.com/100"}
									alt={row.name}
									className="w-full h-full object-cover"
								/>
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between gap-4">
									<div>
										<h3 className="font-black text-[#4A2600] text-lg leading-tight group-hover:text-orange-600 transition-colors truncate">
											{row.name}
										</h3>
										<p className="text-xs font-black text-orange-600/60 uppercase tracking-widest mt-1">
											Premium Supplies
										</p>
									</div>
									<div className="text-right">
										<p className="font-black text-[#4A2600] text-xl">
											฿{row.subtotal.toLocaleString()}
										</p>
										<p className="text-[10px] font-bold text-gray-400 mt-1">
											฿{row.unitPrice.toLocaleString()} / unit
										</p>
									</div>
								</div>

								<div className="flex items-center justify-between mt-4">
									{/* Quantity Controls */}
									<div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100 shadow-inner">
										<button
											onClick={() => handleDecrease(row.id, row.quantity)}
											className="p-2 rounded-lg hover:bg-white hover:text-orange-600 hover:shadow-sm transition-all active:scale-90 text-gray-400"
										>
											<Minus className="w-3.5 h-3.5" />
										</button>
										<div className="px-4 min-w-[40px] text-center">
											<span className="text-sm font-black text-[#4A2600]">
												{row.quantity}
											</span>
										</div>
										<button
											onClick={() => handleIncrease(row.id, row.quantity)}
											className="p-2 rounded-lg hover:bg-white hover:text-orange-600 hover:shadow-sm transition-all active:scale-90 text-gray-400"
										>
											<Plus className="w-3.5 h-3.5" />
										</button>
									</div>

									{/* Remove Button */}
									<button
										onClick={() => remove(row.id)}
										className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group/remove"
									>
										<Trash2 className="w-4 h-4 group-hover/remove:scale-110 transition-transform" />
										<span className="text-[10px] font-black uppercase tracking-widest">
											Remove
										</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
