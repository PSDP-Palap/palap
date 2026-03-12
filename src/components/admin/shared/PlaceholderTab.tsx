const PlaceholderTab = ({ label }: { label: string }) => (
	<div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
		<div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-8 w-8 text-gray-300"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
				/>
			</svg>
		</div>
		<h3 className="text-xl font-bold text-gray-800 mb-2">
			กำลังพัฒนาระบบ {label}
		</h3>
		<p className="text-gray-500">ส่วนจัดการ {label} จะเปิดให้บริการเร็วๆ นี้</p>
	</div>
);

export default PlaceholderTab;
