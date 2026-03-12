import { Link } from "@tanstack/react-router";
import { Loader2, ArrowRight } from "lucide-react";

interface PriceSummarySideProps {
	totalItems: number;
	subtotal: number;
	tax: number;
	total: number;
	deliveryFee: number;
	proceedingToPayment: boolean;
	proceedToPayment: () => void;
	orderRowsCount: number;
	isService?: boolean;
}

export function PriceSummarySide({
	totalItems,
	subtotal,
	tax,
	total,
	deliveryFee,
	proceedingToPayment,
	proceedToPayment,
	orderRowsCount,
	isService,
}: PriceSummarySideProps) {
	return (
		<aside className="bg-white rounded-[2.5rem] border border-orange-50 p-8 shadow-xl shadow-orange-900/5 h-fit overflow-hidden relative">
			<div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-full blur-3xl -mr-16 -mt-16" />

			<h2 className="text-2xl font-black text-[#4A2600] mb-8 relative">
				{isService ? "Hire Summary" : "Payment Summary"}
			</h2>

			<div className="space-y-4 mb-8 relative">
				<div className="flex items-center justify-between text-sm">
					<p className="font-bold text-gray-400 uppercase tracking-widest">
						Items ({totalItems})
					</p>
					<p className="font-black text-[#4A2600]">
						฿{subtotal.toLocaleString()}
					</p>
				</div>

				<div className="flex items-center justify-between text-sm">
					<p className="font-bold text-gray-400 uppercase tracking-widest">
						Delivery Fee
					</p>
					<p className="font-black text-orange-600">
						฿{deliveryFee.toLocaleString()}
					</p>
				</div>

				<div className="flex items-center justify-between text-sm">
					<p className="font-bold text-gray-400 uppercase tracking-widest">
						Web Service Fee (3%)
					</p>
					<p className="font-black text-[#4A2600]">฿{tax.toLocaleString()}</p>
				</div>

				<div className="h-px bg-gray-50 my-6" />

				<div className="flex items-center justify-between">
					<p className="font-black text-[#4A2600] text-lg uppercase tracking-tighter">
						Total Amount
					</p>
					<p className="font-black text-3xl text-orange-600">
						฿{total.toLocaleString()}
					</p>
				</div>
			</div>

			<div className="space-y-4 relative">
				<button
					onClick={proceedToPayment}
					disabled={proceedingToPayment || orderRowsCount === 0}
					className="group w-full py-5 rounded-2xl bg-linear-to-r from-[#FF914D] to-[#FF7F32] text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-900/20 hover:shadow-orange-900/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
				>
					{proceedingToPayment ? (
						<Loader2 className="w-5 h-5 animate-spin" />
					) : (
						<>
							{isService ? "Confirm Order" : "Proceed to Payment"}
							<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</>
					)}
				</button>

				{!isService && (
					<Link
						to="/product"
						className="block w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
					>
						Modify Selection
					</Link>
				)}
			</div>
		</aside>
	);
}
