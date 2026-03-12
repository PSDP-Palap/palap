interface CardDetailsFormProps {
	cardNumber: string;
	setCardNumber: (val: string) => void;
	cardholderName: string;
	setCardholderName: (val: string) => void;
	cardExpiry: string;
	setCardExpiry: (val: string) => void;
	cardCvv: string;
	setCardCvv: (val: string) => void;
	formatCardNumber: (val: string) => string;
	formatExpiry: (val: string) => string;
	errors: {
		cardNumber?: string;
		cardholderName?: string;
		cardExpiry?: string;
		cardCvv?: string;
	};
}

export function CardDetailsForm({
	cardNumber,
	setCardNumber,
	cardholderName,
	setCardholderName,
	cardExpiry,
	setCardExpiry,
	cardCvv,
	setCardCvv,
	formatCardNumber,
	formatExpiry,
	errors,
}: CardDetailsFormProps) {
	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm font-bold text-[#4A2600] mb-1">Card Number</p>
				<input
					value={cardNumber}
					onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
					className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.cardNumber ? "border-red-500" : "border-gray-300"}`}
					placeholder="1234 5678 9012 3456"
				/>
				{errors.cardNumber && (
					<p className="text-[10px] text-red-500 mt-1 font-bold">
						{errors.cardNumber}
					</p>
				)}
			</div>
			<div>
				<p className="text-sm font-bold text-[#4A2600] mb-1">Cardholder Name</p>
				<input
					value={cardholderName}
					onChange={(e) => setCardholderName(e.target.value)}
					className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.cardholderName ? "border-red-500" : "border-gray-300"}`}
					placeholder="Somsuk Kumkeaw"
				/>
				{errors.cardholderName && (
					<p className="text-[10px] text-red-500 mt-1 font-bold">
						{errors.cardholderName}
					</p>
				)}
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<p className="text-sm font-bold text-[#4A2600] mb-1">Expiry Date</p>
					<input
						value={cardExpiry}
						onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
						className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.cardExpiry ? "border-red-500" : "border-gray-300"}`}
						placeholder="MM/YY"
					/>
					{errors.cardExpiry && (
						<p className="text-[10px] text-red-500 mt-1 font-bold">
							{errors.cardExpiry}
						</p>
					)}
				</div>
				<div>
					<p className="text-sm font-bold text-[#4A2600] mb-1">CVV</p>
					<input
						value={cardCvv}
						onChange={(e) =>
							setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
						}
						className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.cardCvv ? "border-red-500" : "border-gray-300"}`}
						placeholder="123"
					/>
					{errors.cardCvv && (
						<p className="text-[10px] text-red-500 mt-1 font-bold">
							{errors.cardCvv}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
