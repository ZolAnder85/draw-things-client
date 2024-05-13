/// <reference path="GenParam.ts" />
/// <reference path="SDConnector.ts" />

namespace TaskUtil {
	function formatWaiting(taskData: GenParam): string {
		return `waiting\n${taskData.seed}\n${taskData.positivePrompt}`;
	}

	function formatRunning(taskData: GenParam, seconds: number): string {
		return `${seconds.toFixed(0)} seconds\n${taskData.seed}\n${taskData.positivePrompt}`;
	}

	function formatError(taskData: GenParam): string {
		return `error\n${taskData.seed}\n${taskData.positivePrompt}`;
	}

	function formatResult(taskData: GenParam, seconds: number): string {
		return `${seconds.toFixed(1)} seconds | ${taskData.seed} | ${taskData.positivePrompt}`;
	}

	function formatAspect(taskData: GenParam): string {
		return String(taskData.width / taskData.height);
	}

	export function createWaitingWrapper(container: HTMLElement, taskData: GenParam, paramsCallback: Function, removeCallback: Function): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.style.aspectRatio = formatAspect(taskData);

		const remove = document.createElement("text");
		remove.classList.add("itemRemove");
		remove.textContent = "remove";
		result.appendChild(remove);

		remove.addEventListener("click", event => {
			container.removeChild(result);
			removeCallback(taskData);
			event.stopPropagation();
		});

		const content = document.createElement("text");
		content.classList.add("itemContent");
		content.textContent = formatWaiting(taskData);
		result.appendChild(content);

		result.addEventListener("click", event => {
			paramsCallback(taskData);
			event.stopPropagation();
		});

		return result;
	}

	export function createRunninWrapper(taskData: GenParam, paramsCallback: Function): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.classList.add("running");
		result.style.aspectRatio = formatAspect(taskData);

		const content = document.createElement("text");
		content.classList.add("itemContent");
		result.appendChild(content);

		let seconds = 0;
		content.textContent = formatRunning(taskData, seconds);
		const intervalCallback = () => {
			if (content.isConnected) {
				++seconds;
				content.textContent = formatRunning(taskData, seconds);
			} else {
				clearInterval(intervalID);
			}
		}

		const intervalID = setInterval(intervalCallback, 1000);

		result.addEventListener("click", event => {
			paramsCallback(taskData);
			event.stopPropagation();
		});

		return result;
	}

	export function createErrorWrapper(container: HTMLElement, taskData: GenParam, paramsCallback: Function): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("itemWrapper");
		result.classList.add("error");
		result.style.aspectRatio = formatAspect(taskData);

		const remove = document.createElement("text");
		remove.classList.add("itemRemove");
		remove.textContent = "remove";
		result.appendChild(remove);

		remove.addEventListener("click", event => {
			container.removeChild(result);
			event.stopPropagation();
		});

		const content = document.createElement("text");
		content.classList.add("itemContent");
		content.textContent = formatError(taskData);
		result.appendChild(content);

		result.addEventListener("click", event => {
			paramsCallback(taskData);
			event.stopPropagation();
		});

		return result;
	}

	export function createImageWrapper(container: HTMLElement, genData: GenData, paramsCallback: Function, removeCallback: Function): HTMLElement {
		const result = document.createElement("div");
		result.classList.add("imageWrapper");
		result.style.aspectRatio = formatAspect(genData.taskData);

		const image = document.createElement("img");
		image.src = genData.imageURL;
		result.appendChild(image);

		const info = document.createElement("div");
		info.classList.add("imageInfo");
		info.textContent = formatResult(genData.taskData, genData.genTime / 1000);
		result.appendChild(info);

		info.addEventListener("click", event => {
			paramsCallback(genData.taskData)
			event.stopPropagation();
		});

		const remove = document.createElement("div");
		remove.classList.add("imageRemove");
		remove.textContent = "remove";
		result.appendChild(remove);

		remove.addEventListener("click", event => {
			container.removeChild(result);
			removeCallback(genData.ID);
			event.stopPropagation();
		});

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

	public constructor(container: HTMLElement, taskData: GenParam, paramsCallback: any, removeTaskCallback: Function, removeResultCallback: Function) {
		let currentWrapper = TaskUtil.createWaitingWrapper(container, taskData, paramsCallback, removeTaskCallback);
		container.insertBefore(currentWrapper, container.firstChild);

		this.onStart = () => {
			const nextWrapper = TaskUtil.createRunninWrapper(taskData, paramsCallback);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onError = () => {
			const nextWrapper = TaskUtil.createErrorWrapper(container, taskData, paramsCallback);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onResult = (genResult: GenData[]) => {
			for (const genData of genResult) {
				const imageWrapper = TaskUtil.createImageWrapper(container, genData, paramsCallback, removeResultCallback);
				container.insertBefore(imageWrapper, currentWrapper);
			}
			container.removeChild(currentWrapper);
		}

		this.taskData = taskData;
	}
}