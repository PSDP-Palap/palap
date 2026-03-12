interface CashPaymentFormProps {
	setCashSubmitted: (val: boolean) => void;
	setSubmitError: (val: string | null) => void;
}

export function CashPaymentForm({
	setCashSubmitted,
	setSubmitError,
}: CashPaymentFormProps) {
	return (
		<section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
			<h2 className="text-2xl font-black text-[#4A2600] mb-3">Cash</h2>
			<div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-gray-700">
				<p className="mb-2">Please read the message.</p>
				<ul className="list-disc pl-5 space-y-1">
					<li>Please have the money ready.</li>
					<li>Pay the freelancer.</li>
					<li>Please wait for a call from the freelancer.</li>
				</ul>
			</div>
			<div className="mt-4 text-center">
				<button
					type="button"
					onClick={() => {
						setCashSubmitted(true);
						setSubmitError(null);
					}}
					className="px-6 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
				>
					I Understand
				</button>
			</div>
		</section>
	);
}
