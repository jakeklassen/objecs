import { Frame } from "../entity.ts";

export const spriteFactory = (frame: Frame, opacity = 1) => ({
	frame,
	opacity,
});
