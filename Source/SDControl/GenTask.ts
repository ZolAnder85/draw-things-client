/// <reference path="Movement.ts" />
/// <reference path="GenParam.ts" />
/// <reference path="SDConnector.ts" />
/// <reference path="SDControl.ts" />

namespace TaskUtil {
	function formatContent(taskData: GenParam, start: string): string {
		const positiveLine = taskData.positivePrompt.split("\n")[0];
		const negativeLine = taskData.negativePrompt.split("\n")[0];
		if (positiveLine) {
			if (negativeLine) {
				return `${start}\n${taskData.seed}\n${positiveLine}\n- ${negativeLine}`;
			}
			return `${start}\n${taskData.seed}\n${positiveLine}`;
		}
		if (negativeLine) {
			return `${start}\n${taskData.seed}\n- ${negativeLine}`;
		}
		return `${start}\n${taskData.seed}`;
	}

	function formatAspect(taskData: GenParam): string {
		return `${taskData.width} / ${taskData.height}`;
	}

	function createDiv(parent: HTMLElement, className: string, textContent: string, description: string): HTMLElement {
		const result = document.createElement("div");
		result.classList.add(className);
		result.textContent = textContent;
		result.title = description;
		parent.appendChild(result);
		return result;
	}

	function createHeader(container: HTMLElement, parent: HTMLElement, taskData: GenParam, moveCallback: any, removeCallback: any): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemHeader");

		const copyPrompt = createDiv(result, "iconPrompt", "✑", `copy prompts:\n${taskData.positivePrompt}\n- ${taskData.negativePrompt}`);
		copyPrompt.addEventListener("click", event => {
			SDControl.applyParameters({
				positivePrompt: taskData.positivePrompt,
				negativePrompt: taskData.negativePrompt
			});
			event.stopPropagation();
		});

		const copySeed = createDiv(result, "iconSeed", "⚅", `copy seed:\n${taskData.seed}`);
		switch (taskData.seed % 6) {
			case 1:
				copySeed.textContent = "⚀";
				break;
			case 2:
				copySeed.textContent = "⚁";
				break;
			case 3:
				copySeed.textContent = "⚂";
				break;
			case 4:
				copySeed.textContent = "⚃";
				break;
			case 5:
				copySeed.textContent = "⚄";
				break;
		}
		copySeed.addEventListener("click", event => {
			SDControl.applyParameters({
				seed: taskData.seed
			});
			event.stopPropagation();
		});

		// TODO: Construct param preview string.
		const copyParam = createDiv(result, "iconParam", "⚙", `copy parameters`);
		copyParam.addEventListener("click", event => {
			SDControl.applyParameters({
				...taskData,
				positivePrompt: undefined,
				negativePrompt: undefined,
				seed: undefined
			});
			event.stopPropagation();
		});

		createDiv(result, "iconStretch", "", "");

		if (moveCallback) {
			const moveUp = createDiv(result, "iconArrow", "◄", "move forward");
			moveUp.addEventListener("click", event => {
				const prev = parent.previousElementSibling;
				if (prev) {
					if (prev.classList.contains("imageWrapper")) {
						moveCallback(Movement.NEXT);
						container.insertBefore(parent, prev);
					} else if (prev.classList.contains("error")) {
						container.insertBefore(parent, prev);
					}
				}
				event.stopPropagation();
			});

			/*
			const moveTop = createDiv(result, "iconArrow", "▲", "move to top");
			moveTop.addEventListener("click", event => {
				container.insertBefore(parent, container.firstElementChild);
				moveCallback(Movement.LAST);
				event.stopPropagation();
			});

			const moveBottom = createDiv(result, "iconArrow", "▼", "move to bottom");
			moveBottom.addEventListener("click", event => {
				container.appendChild(parent);
				moveCallback(Movement.FIRST);
				event.stopPropagation();
			});
			*/

			const moveDown = createDiv(result, "iconArrow", "►", "move backward");
			moveDown.addEventListener("click", event => {
				const next = parent.nextElementSibling;
				if (next) {
					if (next.classList.contains("imageWrapper")) {
						moveCallback(Movement.PREV);
						container.insertBefore(next, parent);
					} else if (next.classList.contains("error")) {
						container.insertBefore(next, parent);
					}
				}
				event.stopPropagation();
			});
		}

		createDiv(result, "iconSpace", "", "");

		if (removeCallback) {
			const remove = createDiv(result, "iconRemove", "✖", "remove");
			remove.addEventListener("click", event => {
				container.removeChild(parent);
				removeCallback();
				event.stopPropagation();
			});
		}

		return result;
	}

	export function createWaitingWrapper(container: HTMLElement, taskData: GenParam): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.style.aspectRatio = formatAspect(taskData);

		// TODO: Could this be better?
		const header = createHeader(container, result, taskData, null, () => SDControl.removeTask(taskData));
		result.appendChild(header);

		const content = document.createElement("text");
		content.classList.add("itemContent");
		content.textContent = formatContent(taskData, "waiting");
		result.appendChild(content);

		// content.addEventListener("click", event => {
		// 	SDControl.applyParameters(taskData);
		// 	event.stopPropagation();
		// });

		return result;
	}

	export function createRunninWrapper(taskData: GenParam): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.classList.add("running");
		result.style.aspectRatio = formatAspect(taskData);

		const header = createHeader(null, result, taskData, null, null);
		result.appendChild(header);

		const content = document.createElement("text");
		content.classList.add("itemContent");
		result.appendChild(content);

		// TODO: Could this be better?
		let seconds = 0;
		content.textContent = formatContent(taskData, `${seconds.toFixed(0)} seconds`);
		const intervalCallback = () => {
			if (content.isConnected) {
				++seconds;
				content.textContent = formatContent(taskData, `${seconds.toFixed(0)} seconds`);
			} else {
				clearInterval(intervalID);
			}
		}

		const intervalID = setInterval(intervalCallback, 1000);

		// content.addEventListener("click", event => {
		// 	SDControl.applyParameters(taskData);
		// 	event.stopPropagation();
		// });

		return result;
	}

	export function createErrorWrapper(container: HTMLElement, taskData: GenParam): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.classList.add("error");
		result.style.aspectRatio = formatAspect(taskData);

		// TODO: Could this be better?
		const header = createHeader(container, result, taskData, null, () => {});
		result.appendChild(header);

		const content = document.createElement("text");
		content.classList.add("itemContent");
		content.textContent = formatContent(taskData, "error");
		result.appendChild(content);

		return result;
	}

	export function createImageWrapper(container: HTMLElement, genData: GenData): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("imageWrapper");
		result.style.aspectRatio = formatAspect(genData.taskData);

		// TODO: Could this be better?
		const header = createHeader(container, result, genData.taskData, (movement: Movement) => SDConnector.moveGen(genData.ID, movement), () => SDConnector.removeGen(genData.ID));
		result.appendChild(header);

		const image = document.createElement("img");
		image.src = genData.imageURL;
		result.appendChild(image);

		// const info = document.createElement("div");
		// info.classList.add("imageInfo");
		// info.textContent = formatResult(genData.taskData, genData.genTime / 1000);
		// result.appendChild(info);

		// info.addEventListener("click", event => {
		// 	SDControl.applyParameters(genData.taskData)
		// 	event.stopPropagation();
		// });

		result.addEventListener("click", event => {
			if (result.classList.contains("FullScreen")) {
				result.classList.remove("FullScreen");
			} else {
				result.classList.add("FullScreen");
			}
			event.stopPropagation();
		});

		return result;
	}
}

class GenTask {
	public onStart: Function;
	public onError: Function;
	public onResult: Function;
	public taskData: GenParam;

	public constructor(container: HTMLElement, taskData: GenParam) {
		let currentWrapper = TaskUtil.createWaitingWrapper(container, taskData);
		container.insertBefore(currentWrapper, container.firstChild);

		this.onStart = () => {
			const nextWrapper = TaskUtil.createRunninWrapper(taskData);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onError = () => {
			const nextWrapper = TaskUtil.createErrorWrapper(container, taskData);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onResult = (genResult: GenData[]) => {
			for (const genData of genResult) {
				const imageWrapper = TaskUtil.createImageWrapper(container, genData);
				container.insertBefore(imageWrapper, currentWrapper);
			}
			container.removeChild(currentWrapper);
		}

		this.taskData = taskData;
	}
}