import { Link } from "@tanstack/react-router";

export default function RegisterBackButton() {
	return (
		<Link to="/sign-in">
			<button
				type="button"
				className="text-lg text-slate-500 hover:text-slate-700 transition-colors"
			>
				←
			</button>
		</Link>
	);
}
