import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProductStore } from "@/stores/useProductStore";
import type { Product } from "@/types/product";

import { AddProductDialog } from "./AddProductDialog";
import { ProductManagementDialog } from "./ProductManagementDialog";

const ShopTab = () => {
	const {
		products,
		isLoading,
		loadProducts,
		createProduct,
		updateProduct,
		deleteProduct,
	} = useProductStore();

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

	useEffect(() => {
		loadProducts();
	}, [loadProducts]);

	const filteredProducts = products.filter(
		(p) =>
			p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			p.product_id!.toLowerCase().includes(searchTerm.toLowerCase()),
	);

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
						<h2 className="text-xl font-bold text-gray-800">Shop Products</h2>
						<button
							onClick={() => loadProducts()}
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
							placeholder="ค้นหาชื่อสินค้า, ID..."
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
								<th className="px-6 py-4 font-semibold">Image</th>
								<th className="px-6 py-4 font-semibold">Product Name</th>
								<th className="px-6 py-4 font-semibold text-right">Price</th>
								<th className="px-6 py-4 font-semibold text-right">Qty</th>
								<th className="px-6 py-4 font-semibold text-center">
									Management
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredProducts.length > 0 ? (
								filteredProducts.map((product) => (
									<tr
										key={product.product_id!}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="px-6 py-4 text-sm font-mono text-gray-500">
											<Tooltip>
												<TooltipTrigger asChild>
													<span
														className="cursor-pointer hover:text-[#A6411C] transition-colors"
														onClick={() => {
															navigator.clipboard.writeText(
																product.product_id!,
															);
															toast.success("คัดลอก ID เรียบร้อยแล้ว");
														}}
													>
														{product.product_id!.split("-")[0]}...
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>{product.product_id!}</p>
												</TooltipContent>
											</Tooltip>
										</td>
										<td className="px-6 py-4">
											<div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center overflow-hidden border border-orange-100">
												{product.image_url ? (
													<img
														src={product.image_url}
														alt={product.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<img
														src="/logo.png"
														className="w-6 h-6 object-contain opacity-20"
													/>
												)}
											</div>
										</td>
										<td className="px-6 py-4 text-sm font-medium text-gray-800">
											{product.name}
										</td>
										<td className="px-6 py-4 text-sm font-bold text-right text-[#A6411C]">
											{product.price.toLocaleString()} ฿
										</td>
										<td className="px-6 py-4 text-sm text-right text-gray-600">
											{product.qty!.toLocaleString()}
										</td>
										<td className="px-6 py-4 text-center">
											<button
												onClick={() => setSelectedProduct(product)}
												className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#A6411C] border border-gray-100 rounded-xl text-xs font-bold transition-all"
											>
												Manage
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
										{searchTerm ? "ไม่พบข้อมูลที่ตรงกับการค้นหา" : "ไม่พบข้อมูลสินค้า"}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Floating Add Button */}
				<div className="fixed bottom-8 right-8 z-50">
					<button
						onClick={() => setIsAddDialogOpen(true)}
						className="bg-white text-[#A6411C] p-4 rounded-full shadow-2xl hover:bg-orange-50 transition-all flex items-center gap-2 group hover:scale-110 active:scale-95 border border-orange-100"
						title="เพิ่มสินค้าใหม่"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						<span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-semibold">
							เพิ่มสินค้าใหม่
						</span>
					</button>
				</div>

				<ProductManagementDialog
					key={selectedProduct?.product_id || "new"}
					isOpen={!!selectedProduct}
					product={selectedProduct}
					onClose={() => setSelectedProduct(null)}
					onUpdate={updateProduct}
					onDelete={deleteProduct}
				/>

				<AddProductDialog
					isOpen={isAddDialogOpen}
					onClose={() => setIsAddDialogOpen(false)}
					onSuccess={createProduct}
				/>
			</div>
		</TooltipProvider>
	);
};
export default ShopTab;
