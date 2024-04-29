/// <reference path="SDConnector.ts" />
/// <reference path="GenTask.ts" />

// TODO: Unlimited LoRAs.
namespace SDControl {
	const defaults = {
		strength: 1,
		seed_mode: "Scale Alike",
		crop_left: 0,
		crop_top: 0,
		aesthetic_score: 6,
		negative_aesthetic_score: 2.5,
		zero_negative_prompt: false,
		num_frames: 21,
		fps: 7,
		motion_scale: 127,
		guiding_frame_noise: 0.02,
		start_frame_guidance: 1,
		mask_blur: 5,
		batch_size: 1,
		batch_count: 1,
		clip_weight: 1,
		image_guidance: 1.5,
		image_prior_steps: 5,
		negative_prompt_for_image_prior: true
	};

	let inputs;
	let container;

	const queue = [];
	let waiting = true;

	function applyRaw(parameters: any): void {
		for (const input of inputs) {
			const key = input.getAttribute("SDTarget");
			if (key in parameters) {
				const type = input.getAttribute("SDType");
				switch (type) {
					case "bool":
						input.checked = parameters[key];
						break;
					case "int":
						input.value = parameters[key].toFixed(0);
						break;
					case "float":
						input.value = Number(parameters[key].toFixed(2));
						break;
					case "string":
						input.value = parameters[key];
						break;
				}
			}
		}
	}

	function applyParameters(parameters: any): void {
		sanitizeInput(parameters);
		applyRaw(parameters);
	}

	function sanitizeInput(parameters: any): void {
		if (parameters.hires_fix_width == 0) {
			delete parameters.hires_fix_width;
			parameters.hires_fix = false;
		}
		if (parameters.hires_fix_height == 0) {
			delete parameters.hires_fix_height;
			parameters.hires_fix = false;
		}
		handleMember(parameters, "loras/0/file", "null");
		handleMember(parameters, "loras/0/weight", 1);
		handleMember(parameters, "loras/1/file", "null");
		handleMember(parameters, "loras/1/weight", 1);
	}

	function handleMember(parameters: any, key: string, fallback: any): void {
		let value = parameters;
		for (const part of key.split("/")) {
			if (value) {
				value = value[part];
			}
		}
		if (value) {
			parameters[key] = value;
		} else {
			parameters[key] = fallback;
		}
	}

	function createTaskData(): any {
		const taskData = { ...defaults };
		for (const input of inputs) {
			const key = input.getAttribute("SDTarget");
			const type = input.getAttribute("SDType");
			switch (type) {
				case "bool":
					taskData[key] = input.checked;
					break;
				case "int":
					taskData[key] = parseInt(input.value);
					break;
				case "float":
					taskData[key] = parseFloat(input.value);
					break;
				case "string":
					taskData[key] = input.value;
					break;
			}
		}
		sanitizeOutput(taskData);
		return taskData;
	}

	function sanitizeOutput(taskData: any): void {
		taskData.original_width = taskData.target_width = taskData.negative_original_width = taskData.width;
		taskData.original_height = taskData.target_height = taskData.negative_original_height = taskData.height;
		taskData.loras = [];
		let file = taskData["loras/0/file"];
		file = file == "null" ? null : file;
		if (file) {
			const weight = taskData["loras/0/weight"];
			taskData.loras.push({ file, weight });
		}
		delete taskData["loras/0/file"];
		delete taskData["loras/0/weight"];
		file = taskData["loras/1/file"];
		file = file == "null" ? null : file;
		if (file) {
			const weight = taskData["loras/1/weight"];
			taskData.loras.push({ file, weight });
		}
		delete taskData["loras/1/file"];
		delete taskData["loras/1/weight"];
	}

	function addTask(randomize): void {
		const taskData = createTaskData();
		let seed = taskData.seed >>> 0;
		for (const prompt of taskData.prompt.trim().split("\n\n")) {
			const subData = { ...taskData, seed, prompt };
			queue.push(new GenTask(container, subData, applyParameters, removeTask, SDConnector.removeGeneration));
			if (randomize) {
				seed = seed ^ (seed << 13);
				seed = seed ^ (seed >> 17);
				seed = seed ^ (seed << 5);
				seed = seed >>> 0;
			}
		}
		applyRaw({ seed });
		if (waiting) {
			executeAll();
		}
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

	function removeTask(taskData: any): void {
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
		} catch (error) {
			console.warn("Unable to load settings.");
			console.trace(error);
		}
	}

	function initControlInterface() {
		inputs = document.querySelectorAll("[SDTarget]");
		container = document.getElementById("images");
		const generateButton = document.getElementById("generate") as HTMLButtonElement;
		const randomizeCheckBox = document.getElementById("randomize") as HTMLInputElement;
		generateButton.addEventListener("click", () => addTask(randomizeCheckBox.checked));
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
	loadSettings();
	initControlInterface();
	loadParameters();
	loadHistory();
}