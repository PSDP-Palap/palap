const HeaderSection = () => {
	const scrollToServices = () => {
		const servicesSection = document.getElementById("services");
		if (servicesSection) {
			servicesSection.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<div className="absolute inset-0 flex items-center">
			<div className="max-w-6xl mx-auto px-4 w-full">
				<div className="flex flex-col items-center md:items-start text-center md:text-left">
					<h1 className="text-xl md:text-3xl lg:text-5xl font-black text-[#9a3c0b] tracking-[0.05em] uppercase mb-2">
						Palap
					</h1>
					<h2
						className="lg:text-3xl font-extrabold text-white mb-8"
						style={{ textShadow: "2px 2px 5px rgba(0, 0, 0, 0.4)" }}
					>
						ให้เราดูแลสัตว์เลี้ยงของคุณ
					</h2>
					<button
						onClick={scrollToServices}
						className="bg-white text-black font-bold text-sm md:text-base py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300"
					>
						ลองเลย
					</button>
				</div>
			</div>
		</div>
	);
};

export default HeaderSection;
