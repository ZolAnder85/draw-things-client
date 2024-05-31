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

	export function applyParameters(parameters: any): void {
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
					input.value = value;
					break;
				case "nest":
					input.value = value || "";
					break;
			}
		}
	}

	function applyNextSeed(): void {
		const seedInput: any = document.getElementById("currentSeed");
		seedInput.value = XSRandom.next(parseInt(seedInput.value));
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
					target[key] = input.value;
					break;
				case "nest":
					target[key] = input.value || null;
					break;
			}
		}
		return taskData;
	}

	let preprocessor: STDPreprocessor;
	let commandEngine: SDCommandEngine;

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
		queue.push(new GenTask(container, taskData));
		console.log(queue.map(data => data.taskData));
	}

	async function executeAll() {
		waiting = false;
		while (queue.length) {
			console.log(queue.map(data => data.taskData));
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

	export function removeTask(taskData: GenParam): void {
		console.log("removeing task:");
		console.log(queue.map(data => data.taskData));
		const index = queue.find(genTask => genTask.taskData == taskData);
		queue.splice(index, 1);
		console.log(queue.map(data => data.taskData));
		console.log("removeing ended");
	}

	function initCollapsibleGroups() {
		const groups = document.querySelectorAll("[collapsible]");
		for (const group of groups) {
			const storageKey = `${group.id}-collapsed`;
			const storedState = localStorage.getItem(storageKey);
			if (storedState == "true") {
				group.classList.add("collapsed")
			} else if (storedState == "false") {
				group.classList.remove("collapsed")
			}
			group.firstElementChild.addEventListener("click", event => {
				if (group.classList.contains("collapsed")) {
					group.classList.remove("collapsed")
					localStorage.setItem(storageKey, "false")
				} else {
					group.classList.add("collapsed")
					localStorage.setItem(storageKey, "true")
				}
				event.stopPropagation();
			});
		}
	}

	function initCombinedInputs() {
		const rows = document.querySelectorAll("[combined]");
		for (const row of rows) {
			const slider: any = row.children[1];
			const numeric: any = row.children[2];
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

	function initControlInterface() {
		inputs = document.querySelectorAll("[SDTarget]");
		container = document.getElementById("images");
		const nextSeedButton = document.getElementById("nextSeed");
		nextSeedButton.addEventListener("click", () => applyNextSeed());
		const randomizeCheckBox: any = document.getElementById("randomize");
		const generateButton = document.getElementById("generate");
		generateButton.addEventListener("click", () => addAll(randomizeCheckBox.checked));
		const projectNameInput: any = document.getElementById("projectName");
		projectNameInput.value = SDConnector.project;
		const loadProjectButton = document.getElementById("loadProject");
		loadProjectButton.addEventListener("click", () => loadProject(projectNameInput.value));
	}

	function loadProject(projectName: string): void {
		window.location.href = `?p=${projectName}`;
	}

	async function loadServer() {
		await loadSettings();
		await loadParameters();
		await loadHistory();
	}

	async function loadSettings() {
		try {
			const settings = await SDConnector.getSettings();
			addGroupsTo(settings.models, document.getElementById("model"));
			addGroupsTo(settings.models, document.getElementById("refinerModel"));
			addGroupsTo(settings.LoRAs, document.getElementById("LoRA0Model"));
			addGroupsTo(settings.LoRAs, document.getElementById("LoRA1Model"));
			addGroupsTo(settings.LoRAs, document.getElementById("LoRA2Model"));
			addGroupsTo(settings.samplers, document.getElementById("sampler"));
			const positive = document.getElementById("positive") as HTMLTextAreaElement;
			positive.rows = settings.promptLines;
			const negative = document.getElementById("negative") as HTMLTextAreaElement;
			negative.rows = settings.negativeLines;
			modelCatalogue = createCatalogue("models", settings.models, CKPTCatalogue);
			loraCatalogue = createCatalogue("LoRAs", settings.LoRAs, CKPTCatalogue);
			controlCatalogue = createCatalogue("controls", settings.controls, CKPTCatalogue);
			samplerCatalogue = createCatalogue("samplers", settings.samplers, SimpleCatalogue);
			preprocessor = new STDPreprocessor();
			commandEngine = new SDCommandEngine();
		} catch (error) {
			console.warn("Unable to load settings.");
			console.trace(error);
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

	function addOptionsTo(options: any, target: HTMLElement): void {
		for (const key in options) {
			const option = document.createElement("option");
			option.textContent = key;
			option.value = options[key];
			target.appendChild(option);
		}
	}

	function createCatalogue(name: string, categories: any, CatalogueType: any): any {
		const map = { disabled: null };
		if (categories) {
			categories = Object.values(categories);
			for (const category of categories) {
				for (const key in category) {
					const dashed = key.replace(/[\s:-]+/g, "-");
					map[dashed] = category[key];
				}
			}
		}
		return new CatalogueType(name, map);
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
				const imageWrapper = TaskUtil.createImageWrapper(container, genData);
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
	loadServer();
}