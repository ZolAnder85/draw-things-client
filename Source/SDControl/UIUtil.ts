/// <reference path="GenParam.ts" />

namespace UIUtil {
	function combineText(start: string, positive: string, negative: string, delimiter: string): string {
		if (positive) {
			start += delimiter;
			start += positive;
		}
		if (negative) {
			start += delimiter;
			start += "- ";
			start += negative;
		}
		return start;
	}

	export function waitingText(taskData: GenParam): string {
		return combineText(
			`waiting\n${taskData.seed}`,
			taskData.positivePrompt.split("\n")[0],
			taskData.negativePrompt.split("\n")[0],
			"\n"
		);
	}

	export function errorText(taskData: GenParam): string {
		return combineText(
			`error\n${taskData.seed}`,
			taskData.positivePrompt.split("\n")[0],
			taskData.negativePrompt.split("\n")[0],
			"\n"
		);
	}

	export function runningText(seconds: number, taskData: GenParam): string {
		return combineText(
			`${seconds.toFixed(0)} seconds\n${taskData.seed}`,
			taskData.positivePrompt.split("\n")[0],
			taskData.negativePrompt.split("\n")[0],
			"\n"
		);
	}

	export function imageText(seconds: number, taskData: GenParam): string {
		return combineText(
			`${seconds.toFixed(1)} seconds | ${taskData.seed}`,
			taskData.positivePrompt.split("\n")[0],
			taskData.negativePrompt.split("\n")[0],
			" | "
		);
	}

	function createHeaderIcon(parent: HTMLElement, clickCallback: any, className: string, icon: string): HTMLElement {
		const result = document.createElement("div");
		result.classList.add(className);
		result.textContent = icon;
		result.addEventListener("click", clickCallback);
		parent.appendChild(result);
		return result;
	}

	function diceForSeed(seed: number): string {
		switch (seed % 6) {
			case 1:
				return "⚀";
			case 2:
				return "⚁";
			case 3:
				return "⚂";
			case 4:
				return "⚃";
			case 5:
				return "⚄";
			default:
				return "⚅";
		}
	}

	export function addCopyPromptIcon(parent: HTMLElement, taskData: GenParam, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconPrompt", "✑");
		icon.title = combineText(
			`Copy Prompt:`,
			taskData.positivePrompt,
			taskData.negativePrompt,
			"\n"
		);
	}

	export function addCopySeedIcon(parent: HTMLElement, taskData: GenParam, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconSeed", diceForSeed(taskData.seed));
		icon.title = `Copy Seed:\n${taskData.seed}`;
	}

	export function addCopyParamIcon(parent: HTMLElement, taskData: GenParam, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconParam", "⚙");
		icon.title = `Copy Parameters:
Model: ${taskData.model}
Refiner Model: ${taskData.refinerModel}
Refiner Start: ${taskData.refinerStart}
First LoRA File: ${taskData.loras[0].file}
First LoRA Weight: ${taskData.loras[0].weight}
Second LoRA File: ${taskData.loras[1].file}
Second LoRA Weight: ${taskData.loras[1].weight}
Sampler: ${taskData.sampler}
Steps: ${taskData.steps}
CFG: ${taskData.CFG}
Shift: ${taskData.shift}
SSS: ${taskData.SSS}
Width: ${taskData.width}
Height: ${taskData.height}
HiResFix: ${taskData.hiResFix}
HiResFix Width: ${taskData.hiResFixWidth}
HiResFix Height: ${taskData.hiResFixHeight}
HiResFix Strength: ${taskData.hiResFixStrength}`;
	}

	export function addIconSpacer(parent: HTMLElement): void {
		const result = document.createElement("div");
		result.classList.add("iconSpacer");
		parent.appendChild(result);
	}

	export function addNextIcon(parent: HTMLElement, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconArrow", "◄");
		icon.title = "Move Forward";
	}

	export function addPrevIcon(parent: HTMLElement, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconArrow", "►");
		icon.title = "Move Backward";
	}

	export function addRemoveIcon(parent: HTMLElement, clickCallback: any): void {
		const icon = createHeaderIcon(parent, clickCallback, "iconRemove", "✖");
		icon.title = "Remove";
	}
}