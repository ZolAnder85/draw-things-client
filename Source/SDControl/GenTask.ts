/// <reference path="Movement.ts" />
/// <reference path="GenParam.ts" />
/// <reference path="UIUtil.ts" />
/// <reference path="SDConnector.ts" />
/// <reference path="SDControl.ts" />

namespace TaskUtil {
	function addFlexStyle(element: HTMLElement, taskData: GenParam): void {
		let minWidth = Math.max(150, 150 * taskData.width / taskData.height);
		let maxWidth = Math.min(500, 500 * taskData.width / taskData.height);
		let initialWidth = Math.sqrt(100000 * taskData.width / taskData.height);
		element.style.width = `${initialWidth}px`;
		element.style.minWidth = `${minWidth}px`;
		element.style.maxWidth = `${maxWidth}px`;
		element.style.aspectRatio = `${taskData.width} / ${taskData.height}`;
		element.style.flexGrow = `${initialWidth}`;
		element.style.flexShrink = `${initialWidth}`;
	}

	function addHeader(container: HTMLElement, parent: HTMLElement, taskData: GenParam, moveCallback: any, removeCallback: any): void {
		const header = document.createElement("div");
		header.classList.add("itemHeader");
		parent.appendChild(header);

		UIUtil.addCopyPromptIcon(header, taskData, event => {
			SDControl.applyParameters({
				positivePrompt: taskData.positivePrompt,
				negativePrompt: taskData.negativePrompt
			});
			event.stopPropagation();
		});

		UIUtil.addCopySeedIcon(header, taskData, event => {
			SDControl.applyParameters({
				seed: taskData.seed
			});
			event.stopPropagation();
		});

		UIUtil.addCopyParamIcon(header, taskData, event => {
			SDControl.applyParameters({
				...taskData,
				positivePrompt: undefined,
				negativePrompt: undefined,
				seed: undefined
			});
			event.stopPropagation();
		});

		UIUtil.addIconSpacer(header);

		if (moveCallback) {
			UIUtil.addNextIcon(header, event => {
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

			UIUtil.addPrevIcon(header, event => {
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

		if (removeCallback) {
			UIUtil.addRemoveIcon(header, event => {
				container.removeChild(parent);
				removeCallback();
				event.stopPropagation();
			});
		}
	}

	function createGenericWrapper(container: HTMLElement, taskData: GenParam, moveCallback: any, removeCallback: any): HTMLElement {
		const result = document.createElement("div");
		addFlexStyle(result, taskData);
		addHeader(container, result, taskData, moveCallback, removeCallback);
		return result;
	}

	// TODO: It might be worth creating this callback only once.
	function addClickHandler(target: HTMLElement, taskData: GenParam): void {
		target.addEventListener("click", event => {
			SDControl.applyParameters(taskData);
			event.stopPropagation();
		});
	}

	export function createWaitingWrapper(container: HTMLElement, taskData: GenParam): HTMLElement {
		const result = createGenericWrapper(container, taskData, null, () => SDControl.removeTask(taskData));
		result.classList.add("itemWrapper");

		const content = document.createElement("div");
		content.classList.add("itemContent");
		content.textContent = UIUtil.waitingText(taskData);
		addClickHandler(content, taskData);
		result.appendChild(content);

		return result;
	}

	export function createRunninWrapper(taskData: GenParam): HTMLElement {
		const result = createGenericWrapper(null, taskData, null, null);
		result.classList.add("itemWrapper");
		result.classList.add("running");

		const content = document.createElement("div");
		content.classList.add("itemContent");
		addClickHandler(content, taskData);
		result.appendChild(content);

		let seconds = 0;
		content.innerText = UIUtil.runningText(seconds, taskData);
		const intervalCallback = () => {
			if (content.isConnected) {
				++seconds;
				content.innerText = UIUtil.runningText(seconds, taskData);
			} else {
				clearInterval(intervalID);
			}
		}

		const intervalID = setInterval(intervalCallback, 1000);

		return result;
	}

	export function createErrorWrapper(container: HTMLElement, taskData: GenParam): HTMLElement {
		const result = createGenericWrapper(container, taskData, null, () => {});
		result.classList.add("itemWrapper");
		result.classList.add("error");

		const content = document.createElement("div");
		content.classList.add("itemContent");
		content.textContent = UIUtil.errorText(taskData);
		addClickHandler(content, taskData);
		result.appendChild(content);

		return result;
	}

	export function createImageWrapper(container: HTMLElement, genData: GenData): HTMLElement {
		const result = createGenericWrapper(container, genData.taskData, (movement: Movement) => SDConnector.moveGen(genData.ID, movement), () => SDConnector.removeGen(genData.ID));
		result.classList.add("imageWrapper");

		const image = document.createElement("img");
		image.src = SDConnector.imageURL(genData.imageName);
		result.appendChild(image);

		const content = document.createElement("div");
		content.classList.add("itemContent");
		content.textContent = UIUtil.imageText(genData.genTime / 1000, genData.taskData);
		addClickHandler(content, genData.taskData);
		result.firstChild.appendChild(content);

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