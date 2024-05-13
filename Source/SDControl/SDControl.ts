/// <reference path="../Library/STDPreprocessor.ts" />
/// <reference path="SDCommandEngine.ts" />
/// <reference path="SDConnector.ts" />
/// <reference path="GenTask.ts" />
/// <reference path="Catalogue.ts" />

namespace SDControl {
	let inputs;
	let container;

	const queue = [];
	let waiting = true;

	function applyParameters(parameters: any): void {
		for (const input of inputs) {
			let value = parameters;
			const key = input.getAttribute("SDTarget");
			for (const part of key.split("/")) {
				if (value) {
					value = value[part];
				}
			}
			if (value === undefined) {
				continue;
			}
			const type = input.getAttribute("SDType");
			switch (type) {
				case "bool":
					input.checked = value;
					break;
				case "int":
					input.value = value.toFixed(0);
					break;
				case "float":
					input.value = Number(value.toFixed(2));
					break;
				case "string":
					input.value = value || "";
					break;
			}
		}
	}

	function createTaskData(): GenParam {
		const taskData = ParamUtil.duplicateSDGen(defaultGenParam);
		for (const input of inputs) {
			let target = taskData;
			let key = input.getAttribute("SDTarget");
			const parts = key.split("/");
			key = parts.pop();
			for (const part of parts) {
				target = target[part] = target[part] || {};
			}
			const type = input.getAttribute("SDType");
			switch (type) {
				case "bool":
					target[key] = input.checked;
					break;
				case "int":
					target[key] = parseInt(input.value);
					break;
				case "float":
					target[key] = parseFloat(input.value);
					break;
				case "string":
					target[key] = input.value || null;
					break;
			}
		}
		return taskData;
	}

	const preprocessor = new STDPreprocessor()
	const commandEngine = new SDCommandEngine()

	function addAll(randomize: boolean): void {
		const taskData = createTaskData();
		commandEngine.init(taskData, taskData => addTask(taskData));
		let seed = taskData.seed;
		preprocessor.init(seed, block => commandEngine.handleBlock(block));
		const input = cleanString(taskData.positivePrompt);
		for(const block of input.split(/\n\n+/)) {
			preprocessor.handleBlock(block);
		}
		if (randomize) {
			seed = XSRandom.next(seed);
			applyParameters({ seed });
		}
		if (waiting) {
			executeAll();
		}
	}

	export function addTask(taskData: GenParam): void {
		queue.push(new GenTask(container, taskData, applyParameters, removeTask, SDConnector.removeGeneration));
	}

	async function executeAll() {
		waiting = false;
		while (queue.length) {
			await executeTask(queue.shift());
		}
		waiting = true;
	}

	async function executeTask(genTask: GenTask) {
		genTask.onStart();
		try {
			genTask.onResult(await SDConnector.generate(genTask.taskData));
		} catch(error) {
			genTask.onError();
			console.warn("Unable to execute generation.");
			console.trace(error);
		}
	}

	function removeTask(taskData: GenParam): void {
		const index = queue.find(genTask => genTask.taskData == taskData);
		queue.splice(index, 1);
	}

	function initCollapsibleGroups() {
		const groups = document.querySelectorAll("[collapsible]");
		for (const group of groups) {
			group.firstElementChild.addEventListener("click", event => {
				if (group.classList.contains("collapsed")) {
					group.classList.remove("collapsed")
				} else {
					group.classList.add("collapsed")
				}
				event.stopPropagation();
			});
		}
	}

	function initCombinedInputs() {
		const rows = document.querySelectorAll("[combined]");
		for (const row of rows) {
			const slider = row.children[1] as HTMLInputElement;
			const numeric = row.children[2] as HTMLInputElement;
			slider.setAttribute("SDTarget", numeric.getAttribute("SDTarget"));
			slider.setAttribute("SDType", numeric.getAttribute("SDType"));
			numeric.min = slider.min;
			numeric.max = slider.max;
			numeric.step = slider.step;
			numeric.value = slider.value;
			slider.addEventListener("input", event => {
				numeric.value = slider.value;
			});
			numeric.addEventListener("input", event => {
				slider.value = numeric.value;
			});
		}
	}

	function addOptionsTo(options: any, target: HTMLElement): void {
		for (const key in options) {
			const option = document.createElement("option");
			option.textContent = key;
			option.value = options[key];
			target.appendChild(option);
		}
	}

	function addGroupsTo(groups: any, target: HTMLElement): void {
		for (const key in groups) {
			const optgroup = document.createElement("optgroup");
			optgroup.label = key;
			const options = groups[key];
			addOptionsTo(options, optgroup);
			target.appendChild(optgroup);
		}
	}

	function initControlInterface() {
		inputs = document.querySelectorAll("[SDTarget]");
		container = document.getElementById("images");
		const generateButton = document.getElementById("generate") as HTMLButtonElement;
		const randomizeCheckBox = document.getElementById("randomize") as HTMLInputElement;
		generateButton.addEventListener("click", () => addAll(randomizeCheckBox.checked));
	}

	async function loadSettings() {
		try {
			const settings = await SDConnector.getSettings();
			addGroupsTo(settings.models, document.getElementById("model"));
			addGroupsTo(settings.models, document.getElementById("refinerModel"));
			addGroupsTo(settings.LoRAs, document.getElementById("LoRA0Model"));
			addGroupsTo(settings.LoRAs, document.getElementById("LoRA1Model"));
			const positive = document.getElementById("positive") as HTMLTextAreaElement;
			positive.rows = settings.promptLines;
			const negative = document.getElementById("negative") as HTMLTextAreaElement;
			negative.rows = settings.negativeLines;
			modelCatalogue = createCatalogues("models", settings.models);
			loraCatalogue = createCatalogues("LoRAs", settings.LoRAs);
			controlCatalogue = createCatalogues("controls", settings.controls);
		} catch (error) {
			console.warn("Unable to load settings.");
			console.trace(error);
		}
	}

	function createCatalogues(name: string, categories: any): CKPTCatalogue {
		categories = Object.values(categories);
		let models = { disabled: null };
		for (const category of categories) {
			models = { ...models, ...category };
		}
		return new CKPTCatalogue(name, models);
	}

	async function loadParameters() {
		try {
			applyParameters(await SDConnector.getParameters());
		} catch (error) {
			console.warn("Unable to load parameters.");
			console.trace(error);
		}
	}

	async function loadHistory() {
		try {
			for (const genData of await SDConnector.getHistory()) {
				const imageWrapper = TaskUtil.createImageWrapper(container, genData, applyParameters, SDConnector.removeGeneration);
				container.insertBefore(imageWrapper, container.firstChild);
			}
		} catch (error) {
			console.warn("Unable to load history.");
			console.trace(error);
		}
	}

	initCollapsibleGroups();
	initCombinedInputs();
	initControlInterface();
	loadSettings();
	loadParameters();
	loadHistory();
}