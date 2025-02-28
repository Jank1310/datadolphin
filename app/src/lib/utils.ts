import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function hexToCssHsl(hex: string): string {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		return "hsl(0,0%,0%)";
	}
	let r = Number.parseInt(result[1], 16);
	let g = Number.parseInt(result[2], 16);
	let b = Number.parseInt(result[3], 16);
	// biome-ignore lint/style/noCommaOperator: <explanation>
	(r /= 255), (g /= 255), (b /= 255);
	// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	// biome-ignore lint/style/useSingleVarDeclarator: <explanation>
	let h = 0;
	let s: number;
	let l = (max + min) / 2;
	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	h = Math.round(h * 360);
	s = Math.round(s * 100);
	l = Math.round(l * 100);

	return `${h} ${s}% ${l}%`;
}
