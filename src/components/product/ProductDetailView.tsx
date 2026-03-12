import { Link } from "@tanstack/react-router";
import {
	ShieldCheck,
	Truck,
	RefreshCcw,
	ChevronLeft,
	ChevronRight,
	Package,
	MapPin,
} from "lucide-react";
import { useState } from "react";

import type { Address } from "@/types/address";
import type { Product } from "@/types/product";

interface ProductDetailViewProps {
	product: Product;
	pickupAddress: Address | null;
	pickupLookupHint: string | null;
	maxQty: number;
	qty: number;
	setQty: (val: number | ((prev: number) => number)) => void;
	isOutOfStock: boolean;
	existingQty: number;
	onAddToCart: () => void;
	onBuyNow: () => void;
	relatedProducts: Product[];
}

export function ProductDetailView({
	product,
	pickupAddress,
	maxQty,
	qty,
	setQty,
	isOutOfStock,
	onAddToCart,
	onBuyNow,
	relatedProducts,
}: ProductDetailViewProps) {
	const [activeTab, setActiveTab] = useState<"description" | "shipping">(
		"description",
	);

	return (
		<div className="min-h-screen bg-[#FDFCFB] pt-24 pb-20">
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Breadcrumbs */}
				<nav className="flex mb-8 text-sm font-medium text-gray-500">
					<Link to="/" className="hover:text-orange-600 transition-colors">
						Home
					</Link>
					<span className="mx-2">/</span>
					<Link
						to="/product"
						className="hover:text-orange-600 transition-colors"
					>
						Products
					</Link>
					<span className="mx-2">/</span>
					<span className="text-gray-900 truncate">{product.name}</span>
				</nav>

				<div className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-50 overflow-hidden">
					<div className="grid grid-cols-1 lg:grid-cols-2">
						{/* Left: Image Gallery */}
						<div className="p-6 md:p-10 bg-orange-50/30 flex flex-col gap-6">
							<div className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-orange-100 shadow-inner group">
								<img
									src={
										product.image_url || "https://via.placeholder.com/800x800"
									}
									alt={product.name}
									className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
								/>
							</div>

							{/* Thumbnail Mockup */}
							<div className="grid grid-cols-4 gap-4">
								<div
									className={`aspect-square rounded-xl border-2 overflow-hidden bg-white cursor-pointer transition-all border-orange-500 shadow-md`}
								>
									<img
										src={
											product.image_url || "https://via.placeholder.com/200x200"
										}
										className="w-full h-full object-cover"
									/>
								</div>
								{[2, 3, 4].map((i) => (
									<div
										key={i}
										className={`aspect-square rounded-xl border-2 overflow-hidden bg-white cursor-pointer transition-all border-transparent hover:border-orange-400`}
									>
										<img
											src="https://via.placeholder.com/200x200"
											className="w-full h-full object-cover opacity-40"
										/>
									</div>
								))}
							</div>
						</div>

						{/* Right: Product Info */}
						<div className="p-6 md:p-10 flex flex-col">
							<div className="flex justify-between items-start mb-2">
								<span
									className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isOutOfStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
								>
									{isOutOfStock ? "Out of Stock" : "In Stock"}
								</span>
							</div>

							<h1 className="text-3xl md:text-4xl font-black text-[#4A2600] mb-6 leading-tight">
								{product.name}
							</h1>

							<div className="bg-linear-to-br from-orange-50 to-orange-100/50 rounded-3xl p-6 mb-8 border border-orange-100 shadow-sm">
								<p className="text-xs text-orange-800/60 font-black uppercase tracking-widest mb-1">
									Current Price
								</p>
								<div className="flex items-baseline gap-2">
									<span className="text-5xl font-black text-orange-600">
										฿{product.price.toLocaleString()}
									</span>
									<span className="text-lg text-gray-400 line-through font-bold">
										฿{(product.price * 1.2).toLocaleString()}
									</span>
								</div>
							</div>

							{/* Purchase Section */}
							<div className="space-y-6 mb-8">
								<div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
									<div className="space-y-1">
										<p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
											Quantity
										</p>
										<p className="text-[10px] font-bold text-gray-400">
											{maxQty} items available
										</p>
									</div>
									<div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
										<button
											onClick={() => setQty((q: number) => Math.max(1, q - 1))}
											disabled={isOutOfStock || qty <= 1}
											className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
										>
											<ChevronLeft className="w-5 h-5" />
										</button>
										<span className="w-12 text-center font-black text-lg">
											{qty}
										</span>
										<button
											onClick={() =>
												setQty((q: number) => Math.min(maxQty || 1, q + 1))
											}
											disabled={isOutOfStock || qty >= maxQty}
											className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
										>
											<ChevronRight className="w-5 h-5" />
										</button>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<button
										onClick={onAddToCart}
										disabled={isOutOfStock}
										className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white border-2 border-orange-600 text-orange-600 font-black uppercase tracking-wider hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-orange-900/5"
									>
										<Package className="w-5 h-5" />
										Add to cart
									</button>
									<button
										onClick={onBuyNow}
										disabled={isOutOfStock}
										className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-wider hover:bg-[#b34700] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xl shadow-orange-900/20"
									>
										Buy now
									</button>
								</div>
							</div>

							{/* Trust Badges */}
							<div className="grid grid-cols-3 gap-2 py-6 border-t border-gray-100">
								<div className="flex flex-col items-center text-center gap-2">
									<div className="p-3 rounded-2xl bg-green-50 text-green-600">
										<ShieldCheck className="w-6 h-6" />
									</div>
									<span className="text-[10px] font-black text-gray-500 uppercase leading-tight">
										Secure Payment
									</span>
								</div>
								<div className="flex flex-col items-center text-center gap-2">
									<div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
										<Truck className="w-6 h-6" />
									</div>
									<span className="text-[10px] font-black text-gray-500 uppercase leading-tight">
										Fast Delivery
									</span>
								</div>
								<div className="flex flex-col items-center text-center gap-2">
									<div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
										<RefreshCcw className="w-6 h-6" />
									</div>
									<span className="text-[10px] font-black text-gray-500 uppercase leading-tight">
										Easy Returns
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Tabs Section */}
					<div className="border-t border-gray-100">
						<div className="flex overflow-x-auto no-scrollbar border-b border-gray-100">
							{(["description", "shipping"] as const).map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`px-12 py-5 text-sm font-black uppercase tracking-widest whitespace-nowrap border-b-4 transition-all ${
										activeTab === tab
											? "border-orange-600 text-orange-600 bg-orange-50/30"
											: "border-transparent text-gray-400 hover:text-orange-400"
									}`}
								>
									{tab}
								</button>
							))}
						</div>

						<div className="p-8 md:p-12 min-h-[300px]">
							{activeTab === "description" && (
								<div className="max-w-3xl space-y-6">
									<div className="prose prose-orange">
										<p className="text-gray-600 leading-relaxed text-lg">
											{product.description ||
												"No detailed description provided for this item."}
										</p>
									</div>
									<div className="space-y-4 pt-6">
										<h4 className="font-black text-[#4A2600] uppercase tracking-wider">
											Pickup Availability
										</h4>
										{pickupAddress ? (
											<div className="flex items-start gap-4 p-6 rounded-3xl bg-orange-50/50 border border-orange-100">
												<div className="p-3 rounded-2xl bg-white shadow-sm">
													<MapPin className="w-6 h-6 text-orange-600" />
												</div>
												<div className="space-y-1">
													<p className="font-black text-[#4A2600]">
														{pickupAddress.name || "Main Warehouse"}
													</p>
													<p className="text-sm text-gray-600">
														{pickupAddress.address_detail}
													</p>
												</div>
											</div>
										) : (
											<p className="text-gray-400 italic">Delivery only item</p>
										)}
									</div>
								</div>
							)}

							{activeTab === "shipping" && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl">
									<div className="space-y-4">
										<div className="flex items-center gap-3 text-orange-600">
											<Truck className="w-6 h-6" />
											<h4 className="font-black uppercase tracking-wider">
												Shipping Info
											</h4>
										</div>
										<ul className="space-y-3 text-gray-600">
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
												Free standard shipping on orders over ฿500
											</li>
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
												Estimated delivery: 2-4 business days
											</li>
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
												Tracking number provided within 24h
											</li>
										</ul>
									</div>
									<div className="space-y-4">
										<div className="flex items-center gap-3 text-blue-600">
											<ShieldCheck className="w-6 h-6" />
											<h4 className="font-black uppercase tracking-wider">
												Our Guarantee
											</h4>
										</div>
										<ul className="space-y-3 text-gray-600">
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
												100% Pet-Safe Materials guaranteed
											</li>
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
												30-day money back return policy
											</li>
											<li className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
												Genuine product from authorized seller
											</li>
										</ul>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Real Related Products Section */}
				{relatedProducts && relatedProducts.length > 0 && (
					<section className="mt-20">
						<div className="flex justify-between items-end mb-8">
							<div>
								<p className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] mb-2">
									You might also like
								</p>
								<h2 className="text-3xl font-black text-[#4A2600]">
									Related Products
								</h2>
							</div>
							<Link
								to="/product"
								className="hidden sm:flex items-center gap-2 text-sm font-black text-orange-600 hover:translate-x-1 transition-transform"
							>
								View All <ChevronRight className="w-4 h-4" />
							</Link>
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
							{relatedProducts.map((item) => (
								<Link
									key={item.product_id}
									to="/product/$product_id"
									params={{ product_id: item.product_id }}
									className="group cursor-pointer"
								>
									<div className="aspect-square rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm mb-4 relative">
										<img
											src={
												item.image_url || "https://via.placeholder.com/400x400"
											}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
										/>
									</div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
										{item.category || "General"}
									</p>
									<h4 className="font-black text-[#4A2600] group-hover:text-orange-600 transition-colors truncate">
										{item.name}
									</h4>
									<p className="text-orange-600 font-black">
										฿ {item.price.toLocaleString()}
									</p>
								</Link>
							))}
						</div>
					</section>
				)}
			</main>
		</div>
	);
}
