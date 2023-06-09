// https://spicyyoghurt.com/tools/easing-functions

export const Easing = {
	InSine: "inSine",
	Linear: "linear",
	OutSine: "outSine",
	OutQuart: "outQuart",
} as const;

export const easeLinear = (
	time: number,
	start: number,
	change: number,
	duration: number,
): number => (change * time) / duration + start;

export const easeInSine = (
	time: number,
	start: number,
	change: number,
	duration: number,
): number =>
	-change * Math.cos((time / duration) * (Math.PI / 2)) + change + start;

export const easeOutSine = (
	time: number,
	start: number,
	change: number,
	duration: number,
): number => change * Math.sin((time / duration) * (Math.PI / 2)) + start;

export const easeOutQuart = (
	time: number,
	start: number,
	change: number,
	duration: number,
): number =>
	-change * ((time = time / duration - 1) * time * time * time - 1) + start;
