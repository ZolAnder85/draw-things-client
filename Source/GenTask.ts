class GenTask {
	public onStart: Function;
	public onError: Function;
	public onResult: Function;

	public constructor(container: HTMLElement, taskData: any, paramsCallback: any, removeTaskCallback: Function, removeResultCallback: Function) {
		let currentWrapper = this.createWaitingWrapper(container, taskData, paramsCallback, removeTaskCallback);

		this.onStart = () => {
			const nextWrapper = this.createRunninWrapper(container, taskData, paramsCallback);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onError = () => {
			const nextWrapper = this.createErrorWrapper(container, taskData, paramsCallback);
			container.replaceChild(nextWrapper, currentWrapper);
			currentWrapper = nextWrapper;
		}

		this.onResult = (genResult: GenData[]) => {
			for (const genData of genResult) {
				const imageWrapper = this.createImageWrapper(container, genData, paramsCallback, removeResultCallback);
				container.insertBefore(imageWrapper, currentWrapper);
			}
			container.removeChild(currentWrapper);
		}
	}

	private createWaitingWrapper(container: HTMLElement, taskData: any, paramsCallback: Function, removeCallback: Function): HTMLElement {
	}

	private createRunninWrapper(container: HTMLElement, taskData: any, paramsCallback: Function): HTMLElement {
	}

	private createErrorWrapper(container: HTMLElement, taskData: any, paramsCallback: Function): HTMLElement {
	}

	private createImageWrapper(container: HTMLElement, genData: GenData, paramsCallback: Function, removeCallback: Function): HTMLElement {
	}
}