import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import { useCartStore } from "@/stores/useCartStore";
import { useProductStore } from "@/stores/useProductStore";

const RecommendSection = () => {
	const router = useRouter();
	const { products, loadProducts, isLoading } = useProductStore();
	const cartItems = useCartStore((s) => s.items);

	useEffect(() => {
		loadProducts(8);
	}, [loadProducts]);

	return (
		<section className="recommend-section py-12">
			<div className="flex justify-between items-end px-2 mb-8">
				<div>
					<h3 className="text-3xl font-black text-[#9a3c0b] uppercase">
						Recommend
					</h3>
					<p className="text-gray-500 font-medium">
						สินค้าแนะนำคุณภาพดีเพื่อสัตว์เลี้ยงของคุณ
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{products.map((product) => (
					<ProductCard
						key={product.product_id || product.id}
						product={{
							...product,
							id: product.product_id || product.id || "",
							description:
								product.description || "High quality supplies for your pet",
						}}
						cartQuantity={
							cartItems[product.product_id || product.id || ""] || 0
						}
						roundedClassName="rounded-2xl"
					/>
				))}

				{isLoading &&
					products.length === 0 &&
					Array(4)
						.fill(0)
						.map((_, i) => (
							<div
								key={i}
								className="animate-pulse bg-white rounded-2xl h-80 border border-orange-50"
							></div>
						))}
			</div>

			{!isLoading && products.length > 0 && (
				<div className="flex justify-end mt-8">
					<button
						onClick={() => router.navigate({ to: "/product" })}
						className="flex items-center gap-2 px-8 py-3 bg-white text-[#9a3c0b] border-2 border-[#9a3c0b] rounded-full font-bold hover:bg-[#9a3c0b] hover:text-white transition-all duration-300 active:scale-95"
					>
						ดูเพิ่มเติม
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			)}

			{!isLoading && products.length === 0 && (
				<div className="py-20 text-center bg-white/50 rounded-2xl border-2 border-dashed border-orange-200">
					<p className="text-orange-300 font-bold">ยังไม่มีสินค้าแนะนำในขณะนี้</p>
				</div>
			)}
		</section>
	);
};

export default RecommendSection;
