var SDConnector;
(function (SDConnector) {
    async function execute(location, method = "GET", body = undefined) {
        const response = await fetch(location, { method, body });
        return response.json();
    }
    async function getParameters() {
        return execute("/parameters");
    }
    SDConnector.getParameters = getParameters;
    async function getHistory() {
        return execute("/get-history");
    }
    SDConnector.getHistory = getHistory;
    async function generate(taskData) {
        return execute("/generate", "POST", JSON.stringify(taskData));
    }
    SDConnector.generate = generate;
    async function removeGeneration(ID) {
        return execute("/remove-generation", "POST", ID);
    }
    SDConnector.removeGeneration = removeGeneration;
    async function clearHistory() {
        return execute("/clear-history");
    }
    SDConnector.clearHistory = clearHistory;
    async function getSettings() {
        return execute("/settings");
    }
    SDConnector.getSettings = getSettings;
})(SDConnector || (SDConnector = {}));
var TaskUtil;
(function (TaskUtil) {
    function formatWaiting(taskData) {
        return `waiting\n${taskData.seed}\n${taskData.prompt}`;
    }
    function formatRunning(taskData, seconds) {
        return `${seconds.toFixed(0)} seconds\n${taskData.seed}\n${taskData.prompt}`;
    }
    function formatError(taskData) {
        return `error\n${taskData.seed}\n${taskData.prompt}`;
    }
    function formatResult(taskData, seconds) {
        return `${seconds.toFixed(1)} seconds | ${taskData.seed} | ${taskData.prompt}`;
    }
    function formatAspect(taskData) {
        return String(taskData.width / taskData.height);
    }
    function createWaitingWrapper(container, taskData, paramsCallback, removeCallback) {
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
    TaskUtil.createWaitingWrapper = createWaitingWrapper;
    function createRunninWrapper(taskData, paramsCallback) {
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
            }
            else {
                clearInterval(intervalID);
            }
        };
        const intervalID = setInterval(intervalCallback, 1000);
        result.addEventListener("click", event => {
            paramsCallback(taskData);
            event.stopPropagation();
        });
        return result;
    }
    TaskUtil.createRunninWrapper = createRunninWrapper;
    function createErrorWrapper(container, taskData, paramsCallback) {
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
    TaskUtil.createErrorWrapper = createErrorWrapper;
    function createImageWrapper(container, genData, paramsCallback, removeCallback) {
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
            paramsCallback(genData.taskData);
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
            }
            else {
                result.classList.add("FullScreen");
            }
            event.stopPropagation();
        });
        return result;
    }
    TaskUtil.createImageWrapper = createImageWrapper;
})(TaskUtil || (TaskUtil = {}));
class GenTask {
    constructor(container, taskData, paramsCallback, removeTaskCallback, removeResultCallback) {
        let currentWrapper = TaskUtil.createWaitingWrapper(container, taskData, paramsCallback, removeTaskCallback);
        container.insertBefore(currentWrapper, container.firstChild);
        this.onStart = () => {
            const nextWrapper = TaskUtil.createRunninWrapper(taskData, paramsCallback);
            container.replaceChild(nextWrapper, currentWrapper);
            currentWrapper = nextWrapper;
        };
        this.onError = () => {
            const nextWrapper = TaskUtil.createErrorWrapper(container, taskData, paramsCallback);
            container.replaceChild(nextWrapper, currentWrapper);
            currentWrapper = nextWrapper;
        };
        this.onResult = (genResult) => {
            for (const genData of genResult) {
                const imageWrapper = TaskUtil.createImageWrapper(container, genData, paramsCallback, removeResultCallback);
                container.insertBefore(imageWrapper, currentWrapper);
            }
            container.removeChild(currentWrapper);
        };
        this.taskData = taskData;
    }
}
var SDControl;
(function (SDControl) {
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
    function applyRaw(parameters) {
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
    function applyParameters(parameters) {
        sanitizeInput(parameters);
        applyRaw(parameters);
    }
    function sanitizeInput(parameters) {
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
    function handleMember(parameters, key, fallback) {
        let value = parameters;
        for (const part of key.split("/")) {
            if (value) {
                value = value[part];
            }
        }
        if (value) {
            parameters[key] = value;
        }
        else {
            parameters[key] = fallback;
        }
    }
    function createTaskData() {
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
    function sanitizeOutput(taskData) {
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
    function addTask(randomize) {
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
    async function executeTask(genTask) {
        genTask.onStart();
        try {
            genTask.onResult(await SDConnector.generate(genTask.taskData));
        }
        catch (error) {
            genTask.onError();
            console.warn("Unable to execute generation.");
            console.trace(error);
        }
    }
    function removeTask(taskData) {
        const index = queue.find(genTask => genTask.taskData == taskData);
        queue.splice(index, 1);
    }
    function initCollapsibleGroups() {
        const groups = document.querySelectorAll("[collapsible]");
        for (const group of groups) {
            group.firstElementChild.addEventListener("click", event => {
                if (group.classList.contains("collapsed")) {
                    group.classList.remove("collapsed");
                }
                else {
                    group.classList.add("collapsed");
                }
                event.stopPropagation();
            });
        }
    }
    function initCombinedInputs() {
        const rows = document.querySelectorAll("[combined]");
        for (const row of rows) {
            const slider = row.children[1];
            const numeric = row.children[2];
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
    function addOptionsTo(options, target) {
        for (const key in options) {
            const option = document.createElement("option");
            option.textContent = key;
            option.value = options[key];
            target.appendChild(option);
        }
    }
    function addGroupsTo(groups, target) {
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
            const positive = document.getElementById("positive");
            positive.rows = settings.promptLines;
            const negative = document.getElementById("negative");
            negative.rows = settings.negativeLines;
        }
        catch (error) {
            console.warn("Unable to load settings.");
            console.trace(error);
        }
    }
    function initControlInterface() {
        inputs = document.querySelectorAll("[SDTarget]");
        container = document.getElementById("images");
        const generateButton = document.getElementById("generate");
        const randomizeCheckBox = document.getElementById("randomize");
        generateButton.addEventListener("click", () => addTask(randomizeCheckBox.checked));
    }
    async function loadParameters() {
        try {
            applyParameters(await SDConnector.getParameters());
        }
        catch (error) {
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
        }
        catch (error) {
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
})(SDControl || (SDControl = {}));
