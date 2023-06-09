import {
	Tween,
	TweenableEntity,
	TweenablePaths,
	TweenOptions,
} from "../entity.ts";

export function tweenFactory<P extends TweenablePaths>(
	property: P,
	options: TweenOptions,
): Tween<TweenableEntity, P> {
	return {
		completed: false,
		progress: 0,
		iterations: 0,
		maxIterations: options.maxIterations ?? Infinity,
		time: 0,
		property,
		start: options.from,
		end: options.to,
		change: options.to - options.from,
		duration: options.duration / 1000,
		from: options.from,
		to: options.to,
		easing: options.easing,
		yoyo: options.yoyo ?? false,
		onComplete: options.onComplete ?? "remove",
	};
}
