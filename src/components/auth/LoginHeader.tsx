const LoginHeader = () => {
	return (
		<div className="flex flex-col items-center space-y-6">
			<div className="relative group">
				<div className="absolute -inset-1 bg-linear-to-r from-orange-400 to-amber-400 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
				<div className="relative w-24 h-24 rounded-[2rem] bg-white flex items-center justify-center shrink-0 shadow-2xl border border-orange-100 p-4 transform transition-transform duration-500 group-hover:scale-105">
					<img
						src="/logo.png"
						alt="Palap"
						className="w-full h-full object-contain"
					/>
				</div>
			</div>
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-black tracking-tight text-[#4A2600] uppercase">
					WELCOME BACK
				</h2>
				<div className="flex items-center justify-center gap-2">
					<div className="h-px w-8 bg-orange-200" />
					<p className="text-sm font-black text-orange-600/60 uppercase tracking-widest">
						Login to Palap
					</p>
					<div className="h-px w-8 bg-orange-200" />
				</div>
			</div>
		</div>
	);
};

export default LoginHeader;
