import Lottie from "lottie-react";

import animationData from "@/assets/loading.json";

interface LoadingProps {
	fullScreen?: boolean;
	size?: number;
}

export default function Loading({
	fullScreen = true,
	size = 200,
}: LoadingProps) {
	const content = (
		<div className="flex items-center justify-center w-full">
			<div style={{ width: size, height: size }}>
				<Lottie animationData={animationData} loop={true} />
			</div>
		</div>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 z-9999 flex items-center justify-center bg-white">
				{content}
			</div>
		);
	}

	return content;
}
