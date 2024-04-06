const Communication = new function() {
	let history = [];

	function addToStorage(index, item) {
		localStorage.setItem("taskData/" + index, JSON.stringify(item.taskData));
		if (item.imageData) {
			try {
				localStorage.setItem("imageData/" + index, item.imageData);
			} catch {
				console.warn("Storage has not enough space for image.");
			}
		}
		localStorage.setItem("seconds/" + index, item.seconds);
	}

	function loadFromStorage(index) {
		return {
			taskData: JSON.parse(localStorage.getItem("taskData/" + index)),
			imageData: localStorage.getItem("imageData/" + index),
			seconds: localStorage.getItem("seconds/" + index),
			index
		};
	}

	function removeFromStorage(index) {
		localStorage.removeItem("taskData/" + index);
		localStorage.removeItem("imageData/" + index);
		localStorage.removeItem("seconds/" + index);
	}

	function updateHistory(taskData) {
		const min = localStorage.getItem("historyMin");
		const max = localStorage.getItem("historyMax");
		for (let i = min; i < max; ++i) {
			removeFromStorage(i);
		}
		if (taskData) {
			localStorage.setItem("parameters", JSON.stringify(taskData));
		}
		const reduced = history.filter(Boolean);
		let index = reduced.length;
		localStorage.setItem("historyMax", index);
		while (index) {
			--index;
			try {
				addToStorage(index, reduced[index]);
				localStorage.setItem("historyMin", index);
			} catch {
				console.warn("Storage completely ran out of space.");
				removeFromStorage(index);
				break;
			}
		}
	}

	async function executeRequest(location, method, data) {
		let body;
		if (data) {
			body = JSON.stringify(data);
		}
		let request;
		if (method) {
			request = { method, body };
		}
		const response = await fetch(location, request);
		return await response.json();
	}

	this.loadHistory = async () => {
		const min = localStorage.getItem("historyMin");
		const max = localStorage.getItem("historyMax");
		for (let i = min; i < max; ++i) {
			history.push(loadFromStorage(i));
		}
		return history;
	};

	this.parameters = async () => {
		return JSON.parse(localStorage.getItem("parameters")) || await executeRequest("/parameters");
	};

	this.generate = async taskData => {
		const startTime = Date.now();
		const rawData = await executeRequest("/generate", "POST", taskData);
		const deltaTime = Date.now() - startTime;
		const seconds = Math.round(deltaTime / 1000);
		const result = [];
		if (rawData.images == null || rawData.images.length == 0) {
			throw "no image returned";
		}
		for (const imageData of rawData.images) {
			const index = history.length;
			const item = { taskData, imageData, seconds, index };
			history.push(item);
			result.push(item);
		}
		updateHistory(null);
		return result;
	};

	this.remove = async index => {
		delete history[index];
		updateHistory(null);
	};

	this.updateHistory = updateHistory;
};

const GenTask = function(taskData) {
	const placeHolder = GenTask.createPlaceHolder(taskData);
	DTControl.imageContainer.insertBefore(placeHolder, DTControl.imageContainer.firstChild);

	let seconds;
	let interval;

	function onInterval() {
		++seconds;
		placeHolder.textContent = GenTask.formatRunning(seconds, taskData);
	}

	this.taskData = taskData;

	this.onStart = () => {
		seconds = 0;
		interval = setInterval(onInterval, 1000);
		placeHolder.classList.add("started");
	};

	this.onError = () => {
		clearInterval(interval);
		const errorWrapper = GenTask.createErrorWrapper(taskData);
		DTControl.imageContainer.replaceChild(errorWrapper, placeHolder);
	};

	this.onResult = data => {
		clearInterval(interval);
		for (const item of data) {
			const imageWrapper = GenTask.createImageWrapper(item.seconds, item.taskData, item.imageData, item.index);
			DTControl.imageContainer.insertBefore(imageWrapper, placeHolder);
		}
		DTControl.imageContainer.removeChild(placeHolder);
	};
};

GenTask.formatWaiting = function(taskData) {
	return `waiting\n${taskData.seed}\n${taskData.prompt}`;
};

GenTask.formatRunning = function(seconds, taskData) {
	return `${seconds} seconds\n${taskData.seed}\n${taskData.prompt}`;
};

GenTask.formatError = function(taskData) {
	return `error\n${taskData.seed}\n${taskData.prompt}`;
};

GenTask.formatResult = function(seconds, taskData) {
	return `${seconds} seconds | ${taskData.seed} | ${taskData.prompt}`;
};

GenTask.formatSource = function(imageData) {
	return `data:image/png;base64,${imageData}`;
};

GenTask.createPlaceHolder = function(taskData) {
	const result = document.createElement("div");
	result.classList.add("placeHolder");
	result.style.aspectRatio = taskData.width / taskData.height;
	result.textContent = GenTask.formatWaiting(taskData);

	result.addEventListener("click", event => {
		DTControl.applyData(taskData);
		event.stopPropagation();
	});

	return result;
};

GenTask.createErrorWrapper = function(taskData) {
	const result = document.createElement("div");
	result.classList.add("itemWrapper");
	result.classList.add("error");
	result.style.aspectRatio = taskData.width / taskData.height;

	const content = document.createElement("div");
	content.classList.add("itemContent");
	content.textContent = GenTask.formatError(taskData);
	result.appendChild(content);

	content.addEventListener("click", event => {
		DTControl.applyData(taskData);
		event.stopPropagation();
	});

	const remove = document.createElement("div");
	remove.classList.add("itemRemove");
	remove.textContent = "remove";
	result.appendChild(remove);

	remove.addEventListener("click", event => {
		DTControl.imageContainer.removeChild(result);
		event.stopPropagation();
	});

	return result;
};

GenTask.createImageWrapper = function(seconds, taskData, imageData, index) {
	const result = document.createElement("div");
	result.classList.add("imageWrapper");

	const image = document.createElement("img");
	image.src = GenTask.formatSource(imageData);
	result.appendChild(image);

	const info = document.createElement("div");
	info.classList.add("imageInfo");
	info.textContent = GenTask.formatResult(seconds, taskData);
	result.appendChild(info);

	info.addEventListener("click", event => {
		DTControl.applyData(taskData);
		event.stopPropagation();
	});

	const remove = document.createElement("div");
	remove.classList.add("imageRemove");
	remove.textContent = "remove";
	result.appendChild(remove);

	remove.addEventListener("click", event => {
		DTControl.imageContainer.removeChild(result);
		Communication.remove(index);
		event.stopPropagation();
	});

	result.addEventListener("click", event => {
		if (result.classList.contains("FullScreen")) {
			result.classList.remove("FullScreen");
			result.style.aspectRatio = null;
		} else {
			result.classList.add("FullScreen");
			result.style.aspectRatio = taskData.width / taskData.height;
		}
		event.stopPropagation();
	});

	return result;
};

GenTask.createHistoryWrapper = function(seconds, taskData, index) {
	const result = document.createElement("div");
	result.classList.add("itemWrapper");
	result.classList.add("history");
	result.style.aspectRatio = 3;

	const content = document.createElement("div");
	content.classList.add("itemContent");
	content.textContent = GenTask.formatRunning(seconds, taskData);
	result.appendChild(content);

	content.addEventListener("click", event => {
		DTControl.applyData(taskData);
		event.stopPropagation();
	});

	const remove = document.createElement("div");
	remove.classList.add("itemRemove");
	remove.textContent = "remove";
	result.appendChild(remove);

	remove.addEventListener("click", event => {
		DTControl.imageContainer.removeChild(result);
		Communication.remove(index);
		event.stopPropagation();
	});

	return result;
};

const TaskFactory = new function() {
	let seed = 35880;

	function setSeed(value) {
		if (value) {
			seed = value;
		} else {
			seed = 35880;
		}
	}

	function nextSeed() {
		seed = seed ^ (seed << 13);
		seed = seed ^ (seed >> 17);
		seed = seed ^ (seed << 5);
		return seed >>> 0;
	}

	function createOne(taskData, prompt) {
		taskData = { ...taskData, prompt };
		if (taskData.seed < 0) {
			taskData.seed = nextSeed();
		} else {
			setSeed(taskData.seed);
		}
		return new GenTask(taskData);
	}

	this.createAll = taskData => {
		Communication.updateHistory(taskData);
		return taskData.prompt.trim().split("\n\n").map(prompt => createOne(taskData, prompt));
	};
}

const DTControl = new function() {
	const defaults = {
		strength: 1,
		seed_mode: "Scale Alike",
		crop_left: 0,
		crop_top: 0,
		aesthetic_score: 6,
		negative_aesthetic_score: 2.5,
		zero_negative_prompt: false,
		num_frames: 20,
		fps: 5,
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

	const imageContainer = document.getElementById("images");
	const inputArray = document.querySelectorAll("[DTTarget]");

	function generateData() {
		const data = { ...defaults };
		for (input of inputArray) {
			const key = input.getAttribute("DTTarget");
			const type = input.getAttribute("DTType");
			switch (type) {
				case "bool":
					data[key] = input.checked;
					break;
				case "int":
					data[key] = parseInt(input.value);
					break;
				case "float":
					data[key] = parseFloat(input.value);
					break;
				case "string":
					data[key] = input.value;
					break;
			}
		}
		data.original_width = data.target_width = data.negative_original_width = data.width;
		data.original_height = data.target_height = data.negative_original_height = data.height;
		return data;
	}

	function applyData(data) {
		for (input of inputArray) {
			const key = input.getAttribute("DTTarget");
			const type = input.getAttribute("DTType");
			switch (type) {
				case "bool":
					input.checked = data[key];
					break;
				case "int":
					input.value = data[key].toFixed(0);
					break;
				case "float":
					input.value = Number(data[key].toFixed(2));
					break;
				case "string":
					input.value = data[key];
					break;
			}
		}
	}

	async function loadData() {
		try {
			applyData(await Communication.parameters());
		} catch {
			console.warn("Unable to load parameters.");
		}
	}

	async function loadHistory() {
		try {
			const history = await Communication.loadHistory();
			for (const item of history) {
				if (item.imageData) {
					const imageWrapper = GenTask.createImageWrapper(item.seconds, item.taskData, item.imageData, item.index);
					imageContainer.insertBefore(imageWrapper, imageContainer.firstChild);
				} else {
					const historyWrapper = GenTask.createHistoryWrapper(item.seconds, item.taskData, item.index);
					imageContainer.insertBefore(historyWrapper, imageContainer.firstChild);
				}
			}
		} catch {
			console.warn("Unable to load history.");
		}
	}

	async function executeTask(task) {
		task.onStart();
		try {
			task.onResult(await Communication.generate(task.taskData));
		} catch (error) {
			task.onError();
			console.warn("Unable to execute generation.");
		}
	}

	const queue = [];
	let waiting = true;

	async function executeAll() {
		waiting = false;
		while (queue.length) {
			await executeTask(queue.shift());
		}
		waiting = true;
	}

	const generateButton = document.getElementById("generate");
	const groupArray = document.querySelectorAll("[collapsible]");

	function initInterface() {
		generateButton.addEventListener("click", () => {
			queue.push(...TaskFactory.createAll(generateData()));
			if (waiting) {
				executeAll();
			}
		});

		for (const group of groupArray) {
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

	this.imageContainer = imageContainer;
	this.applyData = applyData;

	loadData();
	loadHistory();
	initInterface();
};