import type { ChangeEvent } from "react";

interface QrPaymentFormProps {
	qrIcon: string;
	total: number;
	qrSlipName: string | null;
	qrSlipPreview: string | null;
	handleQrSlipUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function QrPaymentForm({
	qrIcon,
	total,
	qrSlipName,
	qrSlipPreview,
	handleQrSlipUpload,
}: QrPaymentFormProps) {
	return (
		<section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
			<h2 className="text-2xl font-black text-[#4A2600] mb-2 text-left">
				Qr code
			</h2>
			<p className="text-sm text-gray-500 mb-2">Scan only one time</p>
			<div className="inline-flex flex-col items-center bg-[#FCE7D8] border border-[#E7C7B1] rounded-lg p-4">
				<img
					src={qrIcon}
					alt="Payment QR"
					className="w-32 h-32 object-contain bg-white rounded-md border border-[#E7C7B1]"
				/>
				<p className="text-xs mt-2 text-gray-500">Price</p>
				<p className="text-lg font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
			</div>
			<div className="mt-4">
				<label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600] cursor-pointer">
					Upload Slip
					<input
						type="file"
						accept="image/*"
						onChange={handleQrSlipUpload}
						className="hidden"
					/>
				</label>
				{qrSlipName && (
					<p className="mt-2 text-xs font-semibold text-green-700">
						Uploaded: {qrSlipName}
					</p>
				)}
				{qrSlipPreview && (
					<img
						src={qrSlipPreview}
						alt="Uploaded payment slip"
						className="mx-auto mt-3 w-44 h-44 object-cover rounded-md border border-orange-200"
					/>
				)}
			</div>
		</section>
	);
}
