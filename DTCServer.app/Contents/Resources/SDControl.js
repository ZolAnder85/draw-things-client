function prettyFormat(object) {
    return JSON.stringify(object, null, "\t");
}
function prettyPrint(object) {
    console.log(prettyFormat(object));
}
function getAllPropertyNames(object) {
    const result = [];
    let current = object;
    while (current) {
        result.push(...Object.getOwnPropertyNames(current));
        current = Object.getPrototypeOf(current);
    }
    return result;
}
function printProperties(object, propertyNames) {
    for (const name of propertyNames) {
        const value = object[name];
        if (typeof value == "object") {
            console.log(name + ": " + prettyFormat(value));
        }
        else {
            console.log(name + ": " + value);
        }
    }
}
function printOwnProperties(object) {
    printProperties(object, Object.getOwnPropertyNames(object));
}
function printAllProperties(object) {
    printProperties(object, getAllPropertyNames(object));
}
function cleanString(value) {
    return value.trim().replace(/\r\n|\r|\u2028/g, "\n");
}
class XSRandom {
    static next(seed) {
        seed = seed ^ (seed << 13);
        seed = seed ^ (seed >> 17);
        seed = seed ^ (seed << 5);
        return seed >>> 0;
    }
    constructor(seed) {
        this.seed = seed;
    }
    next() {
        const result = this.seed;
        this.seed = XSRandom.next(this.seed);
        return result;
    }
}
function formatIndex(index, digits = 1) {
    let result = index.toString();
    while (result.length < digits) {
        result = "0" + result;
    }
    return result;
}
class ParameterList {
    constructor(parameters) {
        this.parameters = parameters.filter(Boolean);
        this.count = 0;
    }
    nextString(fallBack = undefined) {
        if (this.parameters.length) {
            ++this.count;
            return this.parameters.shift();
        }
        if (fallBack === undefined) {
            throw `String parameter at ${this.count} is missing.`;
        }
        return fallBack;
    }
    nextFloat(fallBack = undefined) {
        if (this.parameters.length) {
            ++this.count;
            const result = parseFloat(this.parameters.shift());
            if (isNaN(result)) {
                throw `Parameter at ${this.count} is not a number.`;
            }
            return result;
        }
        if (fallBack === undefined) {
            throw `Number parameter at ${this.count} is missing.`;
        }
        return fallBack;
    }
    nextInt(fallBack = undefined) {
        if (this.parameters.length) {
            ++this.count;
            const result = parseInt(this.parameters.shift());
            if (isNaN(result)) {
                throw `Parameter at ${this.count} is not an integer.`;
            }
            return result;
        }
        if (fallBack === undefined) {
            throw `Integer parameter at ${this.count} is missing.`;
        }
        return fallBack;
    }
    nextBool(fallBack = undefined) {
        if (this.parameters.length) {
            ++this.count;
            switch (this.parameters.shift()) {
                case "false":
                case "no":
                case "0":
                    return false;
                case "true":
                case "yes":
                case "1":
                    return true;
                default:
                    throw `Parameter at ${this.count} is not a boolean.`;
            }
        }
        if (fallBack === undefined) {
            throw `Boolean parameter at ${this.count} is missing.`;
        }
        return fallBack;
    }
    checkEmpty(name) {
        if (this.parameters.length) {
            throw `Too many arguments for ${name} command.`;
        }
    }
}
class BasePreprocessor {
    init(seed, handler) {
        this.variables = {};
        this.random = new XSRandom(seed);
        this.localIndex = 1;
        this.globalIndex = 1;
        this.handler = handler;
    }
    handleBlock(block) {
        this.localIndex = 1;
        const list = [block];
        while (list.length) {
            const current = list.pop();
            const match = current.match(/{[^{}]+}/);
            if (match) {
                const original = match[0];
                try {
                    const result = this.handleWildcard(original);
                    for (const replacement of result.reverse()) {
                        list.push(current.replace(original, replacement));
                    }
                }
                catch (message) {
                    console.log(`Error at wildcard: ${original}`);
                    console.log(`Error message: ${message}`);
                }
            }
            else {
                this.handler(current);
                ++this.localIndex;
                ++this.globalIndex;
            }
        }
    }
    handleWildcard(original) {
        let parts;
        if (parts = original.match(/{@(\w+)=(.*)}/)) {
            return this.handleAssignment(parts[1], parts[2]);
        }
        if (original.match(/\+/)) {
            return this.handleAll(original.substring(1, original.length - 1));
        }
        if (original.match(/\|/)) {
            return this.handleSelect(original.substring(1, original.length - 1));
        }
        if (parts = original.match(/{(\+?\d+)}/)) {
            const count = parseInt(parts[1]);
            return this.handleTimes(count, 1);
        }
        if (parts = original.match(/{([+-]?\d+\.?\d*|[+-]?\.\d+):([+-]?\d+\.?\d*|[+-]?\.\d+):([+-]?\d+\.?\d*|[+-]?\.\d+)}/)) {
            const start = parseFloat(parts[1]);
            const limit = parseFloat(parts[2]);
            const step = parseFloat(parts[3]);
            return this.handleFor(start, limit, step);
        }
        if (original.match(/{@/)) {
            return this.handleFunction(original.substring(2, original.length - 1));
        }
        throw "Wrong wildcard format.";
    }
    handleAssignment(name, value) {
        if (name in this.wildcards) {
            throw "Trying to override function.";
        }
        value = value.trim();
        this.variables[name] = value;
        return [value];
    }
    handleAll(content) {
        return content.split("+").map(value => value.trim());
    }
    handleSelect(content) {
        const options = content.split("|").map(value => value.trim());
        const value = options[this.random.next() % options.length];
        return [value];
    }
    handleTimes(count, digits) {
        const result = [];
        for (let i = 0; i < count; ++i) {
            result.push(formatIndex(i + 1, digits));
        }
        return result;
    }
    handleFor(start, limit, step) {
        const result = [];
        step = Math.sign(limit - start) * Math.abs(step);
        if (step > 0) {
            for (let i = start; i < limit + BasePreprocessor.limitThreshold; i += step) {
                result.push(String(i));
            }
        }
        else if (step < 0) {
            for (let i = start; i > limit - BasePreprocessor.limitThreshold; i += step) {
                result.push(String(i));
            }
        }
        else {
            throw "Step should not be 0.";
        }
        return result;
    }
    handleFunction(content) {
        const parts = content.split(/\s*[:\s]\s*/);
        const name = parts[0];
        if (name in this.wildcards) {
            const parameters = new ParameterList(parts.slice(1));
            return this.wildcards[name](parameters);
        }
        if (name in this.variables) {
            const value = this.variables[name];
            return [value];
        }
        throw "No such wildcard.";
    }
}
BasePreprocessor.limitThreshold = 0.000001;
class STDPreprocessor extends BasePreprocessor {
    constructor() {
        super(...arguments);
        this.timesHandler = (parameters) => {
            return this.handleTimes(parameters.nextInt(), parameters.nextInt(1));
        };
        this.forHandler = (parameters) => {
            return this.handleFor(parameters.nextFloat(), parameters.nextFloat(), parameters.nextFloat());
        };
        this.randomDigitsHandler = (parameters) => {
            let result = "";
            for (let i = 0; i < parameters.nextInt(); ++i) {
                result += String.fromCharCode(48 + this.random.next() % 10);
            }
            return [result];
        };
        this.randomLettersHandler = (parameters) => {
            let result = "";
            for (let i = 0; i < parameters.nextInt(); ++i) {
                result += String.fromCharCode(97 + this.random.next() % 25);
            }
            return [result];
        };
        this.localIndexHandler = (parameters) => {
            return [formatIndex(this.localIndex, parameters.nextInt(1))];
        };
        this.globalIndexHandler = (parameters) => {
            return [formatIndex(this.globalIndex, parameters.nextInt(1))];
        };
        this.wildcards = {
            "times": this.timesHandler,
            "for": this.forHandler,
            "randomDigits": this.randomDigitsHandler,
            "num": this.randomDigitsHandler,
            "randomLetters": this.randomLettersHandler,
            "word": this.randomLettersHandler,
            "localIndex": this.localIndexHandler,
            "i": this.localIndexHandler,
            "globalIndex": this.globalIndexHandler,
            "n": this.globalIndexHandler
        };
    }
}
class BaseCommandEngine {
    handleBlock(block) {
        for (const line of block.split("\n")) {
            this.handleLine(line.trim());
        }
        this.handleEnd();
    }
    handleLine(line) {
        if (line.startsWith("//")) {
            console.log(line.substring(2).trim());
        }
        else if (line.startsWith("/")) {
            try {
                this.handleCommand(line.substring(1).trim());
            }
            catch (message) {
                if (message == "ABORT") {
                    throw "ABORT";
                }
                console.log(`Error at line: ${line}`);
                console.log(`Error message: ${message}`);
            }
        }
        else if (line.startsWith("-")) {
            line = line.substring(1).trim();
            if (line) {
                this.handleNegative(this.cleanLine(line));
            }
        }
        else if (line) {
            this.handlePositive(this.cleanLine(line));
        }
    }
    handleCommand(line) {
        const parts = line.split(/\s*[:\s]\s*/);
        const name = parts[0];
        if (name in this.commands) {
            const parameters = new ParameterList(parts.slice(1));
            this.commands[name](parameters);
            parameters.checkEmpty(name);
        }
        else {
            throw "No such command.";
        }
    }
    cleanLine(line) {
        return line
            .replace(/\s+/g, " ")
            .replace(/\s\./g, ".")
            .replace(/\.+/g, ".")
            .replace(/\s,/g, ",")
            .replace(/,+/g, ",");
    }
}
const defaultGenParam = {
    refinerModel: null,
    refinerStart: 0.5,
    loras: [],
    controls: [],
    sampler: "DPM++ 2M Karras",
    steps: 20,
    CFG: 5,
    shift: 1,
    SSS: 0.3,
    width: 512,
    height: 512,
    hiResFix: false,
    hiResFixWidth: 512,
    hiResFixHeight: 512,
    hiResFixStrength: 0.5,
    batchCount: 1
};
class SimpleCatalogue {
    constructor(name, map) {
        this.name = name;
        this.map = map;
    }
    get(key) {
        if (key in this.map) {
            return this.map[key];
        }
        return this.handle(key);
    }
    handle(value) {
        throw `No such ${this.name} registered in catalogue: ${value}`;
    }
}
class CKPTCatalogue extends SimpleCatalogue {
    handle(value) {
        if (value.endsWith(".ckpt")) {
            return value;
        }
        throw `No such ${this.name} registered in catalogue (nor is it a ckpt name): ${value}`;
    }
}
class IntCatalogue extends SimpleCatalogue {
    handle(value) {
        const result = parseInt(value);
        if (isNaN(result)) {
            throw `No such ${this.name} registered in catalogue (nor is it an integer): ${value}`;
        }
        return result;
    }
}
let modelCatalogue;
let loraCatalogue;
let controlCatalogue;
let samplerCatalogue;
const seedModeCatalogue = new IntCatalogue("seed mode", {
    legacy: "Legacy",
    torch: "Torch CPU Compatible",
    default: "Scale Alike",
    nvidia: "NVIDIA GPU Compatible"
});
class SDCommandEngine extends BaseCommandEngine {
    constructor() {
        super();
        this.handleDefaults = (parameters) => {
            ParamUtil.overrideGen(this.current, defaultGenParam);
        };
        this.handleReset = (parameters) => {
            ParamUtil.overrideGen(this.current, this.initial);
        };
        this.handleEmpty = (parameters) => {
            this.positive = "";
            this.negative = "";
        };
        this.handleLoRA = (parameters) => {
            const index = parameters.nextInt();
            if (index < 1) {
                throw "LoRA indexing should start from 1.";
            }
            this.current.loras[index - 1] = {
                file: loraCatalogue.get(parameters.nextString()),
                weight: parameters.nextFloat(1)
            };
        };
        this.handleControl = (parameters) => {
            const index = parameters.nextInt();
            if (index < 1) {
                throw "Control indexing should start from 1.";
            }
            this.current.controls[index - 1] = {
                file: controlCatalogue.get(parameters.nextString()),
                weight: parameters.nextFloat(1),
                priority: parameters.nextString("balanced"),
                start: parameters.nextFloat(0),
                end: parameters.nextFloat(1)
            };
        };
        this.handleSeed = (parameters) => {
            this.current.seed = parameters.nextInt(XSRandom.next(this.current.seed));
        };
        this.handleSize = (parameters) => {
            this.current.width = parameters.nextInt();
            this.current.height = parameters.nextInt();
        };
        this.handleAspect = (parameters) => {
            const aspect = parameters.nextString();
            if (aspect == "horizontal") {
                this.swapHorizontal("width", "height");
                this.swapHorizontal("hiResFixWidth", "hiResFixHeight");
            }
            else if (aspect == "vertical") {
                this.swapVertical("width", "height");
                this.swapVertical("hiResFixWidth", "hiResFixHeight");
            }
            else {
                throw "Aspect should be horizontal or vertical.";
            }
        };
        this.handleGenerate = (parameters) => {
            if (typeof this.negative == "string") {
                this.current.negativePrompt = this.negative;
                this.negative = null;
            }
            if (typeof this.positive == "string") {
                this.current.positivePrompt = this.positive;
                this.positive = null;
            }
            this.handler(ParamUtil.duplicateSDGen(this.current));
        };
        this.commands = {
            ...this.buildAPIMap(),
            ...this.buildCustomMap()
        };
    }
    init(taskData, handler) {
        this.initial = ParamUtil.duplicateSDGen(taskData);
        this.current = ParamUtil.duplicateSDGen(taskData);
        this.positive = "";
        this.negative = "";
        this.handler = handler;
    }
    buildAPIMap() {
        const result = {};
        for (const key in defaultGenParam) {
            switch (typeof defaultGenParam[key]) {
                case "string":
                    result[key] = (parameters) => this.current[key] = parameters.nextString();
                    break;
                case "number":
                    result[key] = (parameters) => this.current[key] = parameters.nextFloat();
                    break;
                case "boolean":
                    result[key] = (parameters) => this.current[key] = parameters.nextBool();
                    break;
            }
        }
        return result;
    }
    buildCustomMap() {
        return {
            generate: this.handleGenerate,
            defaults: this.handleDefaults,
            reset: this.handleReset,
            empty: this.handleEmpty,
            model: this.createStandardHandler("model", modelCatalogue, undefined),
            refinerModel: this.createStandardHandler("refinerModel", modelCatalogue, undefined),
            lora: this.handleLoRA,
            control: this.handleControl,
            sampler: this.createStandardHandler("sampler", samplerCatalogue, undefined),
            seed: this.handleSeed,
            seedMode: this.createStandardHandler("seedMode", seedModeCatalogue, undefined),
            size: this.handleSize,
            aspect: this.handleAspect,
            enableHiResFix: this.createStandardHandler("hiResFix", "const", true),
            setHiResFix: this.createStandardHandler("hiResFix", "const", true, "hiResFixWidth", "int", undefined, "hiResFixHeight", "int", undefined, "hiResFixStrength", "float", undefined),
            disableHiResFix: this.createStandardHandler("hiResFix", "const", false)
        };
    }
    createStandardHandler(...targets) {
        return (parameterList) => {
            let i = 0;
            while (i < targets.length) {
                const key = targets[i++];
                const type = targets[i++];
                const fallback = targets[i++];
                if (type instanceof SimpleCatalogue) {
                    this.current[key] = type.get(parameterList.nextString(fallback));
                }
                else if (type == "const") {
                    this.current[key] = fallback;
                }
                else if (type == "string") {
                    this.current[key] = parameterList.nextString(fallback);
                }
                else if (type == "float") {
                    this.current[key] = parameterList.nextFloat(fallback);
                }
                else if (type == "int") {
                    this.current[key] = parameterList.nextInt(fallback);
                }
                else {
                    this.current[key] = fallback;
                }
            }
        };
    }
    swapHorizontal(widthKey, heightKey) {
        const width = this.current[widthKey];
        const height = this.current[heightKey];
        this.current[widthKey] = Math.max(width, height);
        this.current[heightKey] = Math.min(width, height);
    }
    swapVertical(widthKey, heightKey) {
        const width = this.current[widthKey];
        const height = this.current[heightKey];
        this.current[widthKey] = Math.min(width, height);
        this.current[heightKey] = Math.max(width, height);
    }
    handlePositive(line) {
        if (this.positive) {
            this.positive += "\n";
            this.positive += line;
        }
        else {
            this.positive = line;
        }
    }
    handleNegative(line) {
        if (this.negative) {
            this.negative += "\n";
            this.negative += line;
        }
        else {
            this.negative = line;
        }
    }
    handleEnd() {
        if (typeof this.negative == "string") {
            this.current.negativePrompt = this.negative;
            this.negative = null;
        }
        if (typeof this.positive == "string") {
            this.current.positivePrompt = this.positive;
            this.positive = null;
            this.handler(ParamUtil.duplicateSDGen(this.current));
        }
    }
}
const defaultDTHGenParam = {
    refiner_model: null,
    refiner_start: 0.5,
    loras: [],
    controls: [],
    sampler: "DPM++ 2M Karras",
    steps: 20,
    guidance_scale: 5,
    shift: 1,
    stochastic_sampling_gamma: 0.3,
    seed_mode: "Scale Alike",
    strength: 1,
    width: 512,
    height: 512,
    hires_fix: false,
    hires_fix_width: 512,
    hires_fix_height: 512,
    hires_fix_strength: 0.5,
    sharpness: 0,
    clip_skip: 1,
    clip_weight: 1,
    zero_negative_prompt: false,
    batch_count: 1,
    batch_size: 1,
    upscaler: null,
    upscaler_scale: 1,
    original_width: 512,
    original_height: 512,
    target_width: 512,
    target_height: 512,
    negative_original_width: 512,
    negative_original_height: 512,
    crop_top: 0,
    crop_left: 0,
    aesthetic_score: 6,
    negative_aesthetic_score: 2,
    mask_blur: 5,
    mask_blur_outset: 0,
    preserve_original_after_inpaint: true,
    fps: 5,
    num_frames: 21,
    start_frame_guidance: 1,
    guiding_frame_noise: 0.02,
    motion_scale: 127,
    tiled_decoding: false,
    decoding_tile_width: 768,
    decoding_tile_height: 768,
    decoding_tile_overlap: 128,
    tiled_diffusion: false,
    diffusion_tile_width: 1536,
    diffusion_tile_height: 1536,
    diffusion_tile_overlap: 256,
    image_prior_steps: 5,
    negative_prompt_for_image_prior: true
};
const defaultDTSGenParam = {
    refinerModel: null,
    refinerStart: 0.5,
    loras: [],
    controls: [],
    sampler: 0,
    steps: 20,
    guidanceScale: 5,
    shift: 1,
    stochasticSamplingGamma: 0.3,
    seedMode: 2,
    strength: 1,
    width: 512,
    height: 512,
    hiresFix: false,
    hiresFixWidth: 512,
    hiresFixHeight: 512,
    hiresFixStrength: 0.5,
    sharpness: 0,
    clipSkip: 1,
    clipWeight: 1,
    zeroNegativePrompt: false,
    imageGuidanceScale: 1.5,
    batchCount: 1,
    batchSize: 1,
    upscaler: null,
    upscalerScale: 0,
    faceRestoration: null,
    originalImageWidth: 512,
    originalImageHeight: 512,
    targetImageWidth: 512,
    targetImageHeight: 512,
    negativeOriginalImageWidth: 512,
    negativeOriginalImageHeight: 512,
    cropTop: 0,
    cropLeft: 0,
    aestheticScore: 6,
    negativeAestheticScore: 2,
    maskBlur: 5,
    maskBlurOutset: 0,
    preserveOriginalAfterInpaint: true,
    fps: 5,
    numFrames: 21,
    startFrameGuidance: 1,
    guidingFrameNoise: 0.02,
    motionScale: 127,
    stage2Steps: 10,
    stage2Guidance: 1,
    stage2Shift: 1,
    tiledDecoding: false,
    decodingTileWidth: 512,
    decodingTileHeight: 512,
    decodingTileOverlap: 128,
    tiledDiffusion: false,
    diffusionTileWidth: 1536,
    diffusionTileHeight: 1536,
    diffusionTileOverlap: 256,
    imagePriorSteps: 5,
    negativePromptForImagePrior: true
};
var ParamUtil;
(function (ParamUtil) {
    function toDTHLoRA(param) {
        if (param.file) {
            return {
                file: param.file,
                weight: param.weight
            };
        }
        return null;
    }
    function toDTHControl(param) {
        if (param.file) {
            return {
                file: param.file,
                weight: param.weight,
                control_importance: param.priority,
                guidance_start: param.start,
                guidance_end: param.end,
                no_prompt: false,
                down_sampling_rate: 1,
                global_average_pooling: false
            };
        }
        return null;
    }
    function toDTHGen(param) {
        const result = { ...defaultDTHGenParam };
        result.model = param.model;
        result.refiner_model = param.refinerModel;
        result.refiner_start = param.refinerStart;
        if (param.loras) {
            result.loras = param.loras.map(toDTHLoRA).filter(Boolean);
        }
        if (param.controls) {
            result.controls = param.controls.map(toDTHControl).filter(Boolean);
        }
        result.sampler = param.sampler;
        result.steps = param.steps;
        result.guidance_scale = param.CFG;
        result.shift = param.shift;
        result.stochastic_sampling_gamma = param.SSS;
        result.seed = param.seed;
        result.width = param.width;
        result.height = param.height;
        result.hires_fix = param.hiResFix;
        result.hires_fix_width = param.hiResFixWidth;
        result.hires_fix_height = param.hiResFixHeight;
        result.hires_fix_strength = param.hiResFixStrength;
        result.original_width = param.width;
        result.original_height = param.height;
        result.target_width = param.width;
        result.target_height = param.height;
        result.negative_original_width = param.width;
        result.negative_original_height = param.height;
        result.prompt = param.positivePrompt;
        result.negative_prompt = param.negativePrompt;
        result.batch_count = param.batchCount;
        return result;
    }
    ParamUtil.toDTHGen = toDTHGen;
    function fromDTHLoRA(param) {
        if (param.file) {
            return {
                file: param.file,
                weight: param.weight
            };
        }
        return null;
    }
    function fromDTHControl(param) {
        if (param.file) {
            return {
                file: param.file,
                weight: param.weight,
                priority: param.control_importance,
                start: param.guidance_start,
                end: param.guidance_end
            };
        }
        return null;
    }
    function fromDTHGen(param) {
        const result = { ...defaultGenParam };
        result.model = param.model;
        result.refinerModel = param.refiner_model;
        result.refinerStart = param.refiner_start;
        if (param.loras) {
            result.loras = param.loras.map(fromDTHLoRA).filter(Boolean);
        }
        for (let i = 0; i < 3; ++i) {
            result.loras[i] = result.loras[i] || { file: null, weight: 0 };
        }
        if (param.controls) {
            result.controls = param.controls.map(fromDTHControl).filter(Boolean);
        }
        result.sampler = param.sampler;
        result.steps = param.steps;
        result.CFG = param.guidance_scale;
        result.shift = param.shift;
        result.SSS = param.stochastic_sampling_gamma;
        result.seed = param.seed;
        result.width = param.width;
        result.height = param.height;
        result.hiResFix = param.hires_fix;
        result.hiResFixWidth = param.hires_fix_width;
        result.hiResFixHeight = param.hires_fix_height;
        result.hiResFixStrength = param.hires_fix_strength;
        if (param.hires_fix_width == 0) {
            delete result.hiResFixWidth;
            result.hiResFix = false;
        }
        if (param.hires_fix_height == 0) {
            delete result.hiResFixHeight;
            result.hiResFix = false;
        }
        result.positivePrompt = param.prompt;
        result.negativePrompt = param.negative_prompt;
        return result;
    }
    ParamUtil.fromDTHGen = fromDTHGen;
    function duplicateLoRA(param) {
        return { ...param };
    }
    function duplicateControl(param) {
        return { ...param };
    }
    function duplicateSDGen(param) {
        const result = { ...param };
        if (param.loras) {
            result.loras = param.loras.map(duplicateLoRA);
        }
        if (param.controls) {
            result.controls = param.controls.map(duplicateControl);
        }
        return result;
    }
    ParamUtil.duplicateSDGen = duplicateSDGen;
    function overrideGen(target, source) {
        for (const key in source) {
            target[key] = source[key];
        }
        if (source.loras) {
            target.loras = source.loras.map(duplicateLoRA);
        }
        if (source.controls) {
            target.controls = source.controls.map(duplicateControl);
        }
    }
    ParamUtil.overrideGen = overrideGen;
})(ParamUtil || (ParamUtil = {}));
var SDConnector;
(function (SDConnector) {
    SDConnector.project = new URLSearchParams(window.location.search).get("p") || "main";
    async function getResponse(location, method = "GET", body = undefined) {
        const headers = { project: SDConnector.project };
        const request = { method, body, headers };
        const response = await fetch(location, request);
        const result = await response.json();
        return result;
    }
    function sendRequest(location, method = "GET", body = undefined) {
        const headers = { project: SDConnector.project };
        const request = { method, body, headers };
        fetch(location, request);
    }
    async function getParameters() {
        const result = await getResponse("/parameters");
        return ParamUtil.fromDTHGen(result);
    }
    SDConnector.getParameters = getParameters;
    async function getHistory() {
        const result = await getResponse("/get-history");
        for (const item of result) {
            item.taskData = ParamUtil.fromDTHGen(item.taskData);
        }
        return result;
    }
    SDConnector.getHistory = getHistory;
    async function generate(taskData) {
        const converted = ParamUtil.toDTHGen(taskData);
        const result = await getResponse("/generate", "POST", JSON.stringify(converted));
        for (const item of result) {
            item.taskData = ParamUtil.fromDTHGen(item.taskData);
        }
        return result;
    }
    SDConnector.generate = generate;
    function moveGen(ID, movement) {
        switch (movement) {
            case 0:
                return sendRequest("/move-gen-prev", "POST", ID);
            case 1:
                return sendRequest("/move-gen-next", "POST", ID);
        }
    }
    SDConnector.moveGen = moveGen;
    function removeGen(ID) {
        sendRequest("/remove-gen", "POST", ID);
    }
    SDConnector.removeGen = removeGen;
    async function clearHistory() {
        return getResponse("/clear-history");
    }
    SDConnector.clearHistory = clearHistory;
    async function getSettings() {
        return getResponse("/settings");
    }
    SDConnector.getSettings = getSettings;
    function imageURL(name) {
        return `results/${SDConnector.project}/${name}`;
    }
    SDConnector.imageURL = imageURL;
})(SDConnector || (SDConnector = {}));
var UIUtil;
(function (UIUtil) {
    function combineText(start, positive, negative, delimiter) {
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
    function waitingText(taskData) {
        return combineText(`waiting\n${taskData.seed}`, taskData.positivePrompt.split("\n")[0], taskData.negativePrompt.split("\n")[0], "\n");
    }
    UIUtil.waitingText = waitingText;
    function errorText(taskData) {
        return combineText(`error\n${taskData.seed}`, taskData.positivePrompt.split("\n")[0], taskData.negativePrompt.split("\n")[0], "\n");
    }
    UIUtil.errorText = errorText;
    function runningText(seconds, taskData) {
        return combineText(`${seconds.toFixed(0)} seconds\n${taskData.seed}`, taskData.positivePrompt.split("\n")[0], taskData.negativePrompt.split("\n")[0], "\n");
    }
    UIUtil.runningText = runningText;
    function imageText(seconds, taskData) {
        return combineText(`${seconds.toFixed(1)} seconds | ${taskData.seed}`, taskData.positivePrompt.split("\n")[0], taskData.negativePrompt.split("\n")[0], " | ");
    }
    UIUtil.imageText = imageText;
    function createHeaderIcon(parent, clickCallback, className, icon) {
        const result = document.createElement("div");
        result.classList.add(className);
        result.textContent = icon;
        result.addEventListener("click", clickCallback);
        parent.appendChild(result);
        return result;
    }
    function diceForSeed(seed) {
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
    function addCopyPromptIcon(parent, taskData, clickCallback) {
        const icon = createHeaderIcon(parent, clickCallback, "iconPrompt", "✑");
        icon.title = combineText(`Copy Prompt:`, taskData.positivePrompt, taskData.negativePrompt, "\n");
    }
    UIUtil.addCopyPromptIcon = addCopyPromptIcon;
    function addCopySeedIcon(parent, taskData, clickCallback) {
        const icon = createHeaderIcon(parent, clickCallback, "iconSeed", diceForSeed(taskData.seed));
        icon.title = `Copy Seed:\n${taskData.seed}`;
    }
    UIUtil.addCopySeedIcon = addCopySeedIcon;
    function addCopyParamIcon(parent, taskData, clickCallback) {
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
    UIUtil.addCopyParamIcon = addCopyParamIcon;
    function addIconSpacer(parent) {
        const result = document.createElement("div");
        result.classList.add("iconSpacer");
        parent.appendChild(result);
    }
    UIUtil.addIconSpacer = addIconSpacer;
    function addNextIcon(parent, clickCallback) {
        const icon = createHeaderIcon(parent, clickCallback, "iconArrow", "◄");
        icon.title = "Move Forward";
    }
    UIUtil.addNextIcon = addNextIcon;
    function addPrevIcon(parent, clickCallback) {
        const icon = createHeaderIcon(parent, clickCallback, "iconArrow", "►");
        icon.title = "Move Backward";
    }
    UIUtil.addPrevIcon = addPrevIcon;
    function addRemoveIcon(parent, clickCallback) {
        const icon = createHeaderIcon(parent, clickCallback, "iconRemove", "✖");
        icon.title = "Remove";
    }
    UIUtil.addRemoveIcon = addRemoveIcon;
})(UIUtil || (UIUtil = {}));
var TaskUtil;
(function (TaskUtil) {
    function addFlexStyle(element, taskData) {
        let minWidth = Math.max(150, 150 * taskData.width / taskData.height);
        let maxWidth = Math.min(800, 500 * taskData.width / taskData.height);
        let initialWidth = Math.max(250, 250 * taskData.width / taskData.height, Math.sqrt(80000 * taskData.width / taskData.height));
        initialWidth = Math.max(minWidth, Math.min(maxWidth, initialWidth));
        maxWidth = Math.max(initialWidth, 800 * taskData.width / taskData.height);
        element.style.width = `${initialWidth}px`;
        element.style.maxWidth = `${maxWidth}px`;
        element.style.minHeight = `135px`;
        element.style.aspectRatio = `${taskData.width} / ${taskData.height}`;
        element.style.flexGrow = `${initialWidth}`;
        element.style.flexShrink = `${initialWidth}`;
    }
    function addHeader(container, parent, taskData, moveCallback, removeCallback) {
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
                seed: undefined,
                batchCount: undefined
            });
            event.stopPropagation();
        });
        UIUtil.addIconSpacer(header);
        if (moveCallback) {
            UIUtil.addNextIcon(header, event => {
                const prev = parent.previousElementSibling;
                if (prev) {
                    if (prev.classList.contains("imageWrapper")) {
                        moveCallback(1);
                        container.insertBefore(parent, prev);
                    }
                    else if (prev.classList.contains("error")) {
                        container.insertBefore(parent, prev);
                    }
                }
                event.stopPropagation();
            });
            UIUtil.addPrevIcon(header, event => {
                const next = parent.nextElementSibling;
                if (next) {
                    if (next.classList.contains("imageWrapper")) {
                        moveCallback(0);
                        container.insertBefore(next, parent);
                    }
                    else if (next.classList.contains("error")) {
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
    function createGenericWrapper(container, taskData, moveCallback, removeCallback) {
        const result = document.createElement("div");
        addFlexStyle(result, taskData);
        addHeader(container, result, taskData, moveCallback, removeCallback);
        return result;
    }
    function addClickHandler(target, taskData) {
        target.addEventListener("click", event => {
            SDControl.applyParameters(taskData);
            event.stopPropagation();
        });
    }
    function createWaitingWrapper(container, taskData) {
        const result = createGenericWrapper(container, taskData, null, () => SDControl.removeTask(taskData));
        result.classList.add("itemWrapper");
        const content = document.createElement("div");
        content.classList.add("itemContent");
        content.textContent = UIUtil.waitingText(taskData);
        addClickHandler(content, taskData);
        result.appendChild(content);
        return result;
    }
    TaskUtil.createWaitingWrapper = createWaitingWrapper;
    function createRunninWrapper(taskData) {
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
            }
            else {
                clearInterval(intervalID);
            }
        };
        const intervalID = setInterval(intervalCallback, 1000);
        return result;
    }
    TaskUtil.createRunninWrapper = createRunninWrapper;
    function createErrorWrapper(container, taskData) {
        const result = createGenericWrapper(container, taskData, null, () => { });
        result.classList.add("itemWrapper");
        result.classList.add("error");
        const content = document.createElement("div");
        content.classList.add("itemContent");
        content.textContent = UIUtil.errorText(taskData);
        addClickHandler(content, taskData);
        result.appendChild(content);
        return result;
    }
    TaskUtil.createErrorWrapper = createErrorWrapper;
    function createImageWrapper(container, genData) {
        const result = createGenericWrapper(container, genData.taskData, (movement) => SDConnector.moveGen(genData.ID, movement), () => SDConnector.removeGen(genData.ID));
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
    constructor(container, taskData) {
        let currentWrapper = TaskUtil.createWaitingWrapper(container, taskData);
        container.insertBefore(currentWrapper, container.firstChild);
        this.onStart = () => {
            const nextWrapper = TaskUtil.createRunninWrapper(taskData);
            container.replaceChild(nextWrapper, currentWrapper);
            currentWrapper = nextWrapper;
        };
        this.onError = () => {
            const nextWrapper = TaskUtil.createErrorWrapper(container, taskData);
            container.replaceChild(nextWrapper, currentWrapper);
            currentWrapper = nextWrapper;
        };
        this.onResult = (genResult) => {
            for (const genData of genResult) {
                const imageWrapper = TaskUtil.createImageWrapper(container, genData);
                container.insertBefore(imageWrapper, currentWrapper);
            }
            container.removeChild(currentWrapper);
        };
        this.taskData = taskData;
    }
}
var SDControl;
(function (SDControl) {
    let inputs;
    let container;
    const queue = [];
    let waiting = true;
    function applyParameters(parameters) {
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
    SDControl.applyParameters = applyParameters;
    function applyNextSeed() {
        const seedInput = document.getElementById("currentSeed");
        seedInput.value = XSRandom.next(parseInt(seedInput.value));
    }
    function createTaskData() {
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
    let preprocessor;
    let commandEngine;
    function addAll(randomize) {
        const taskData = createTaskData();
        commandEngine.init(taskData, taskData => addTask(taskData));
        let seed = taskData.seed;
        preprocessor.init(seed, block => commandEngine.handleBlock(block));
        const input = cleanString(taskData.positivePrompt);
        for (const block of input.split(/\n\n+/)) {
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
    function addTask(taskData) {
        queue.push(new GenTask(container, taskData));
        console.log(queue.map(data => data.taskData));
    }
    SDControl.addTask = addTask;
    async function executeAll() {
        waiting = false;
        while (queue.length) {
            console.log(queue.map(data => data.taskData));
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
        console.log("removeing task:");
        console.log(queue.map(data => data.taskData));
        const index = queue.find(genTask => genTask.taskData == taskData);
        queue.splice(index, 1);
        console.log(queue.map(data => data.taskData));
        console.log("removeing ended");
    }
    SDControl.removeTask = removeTask;
    function initCollapsibleGroups() {
        const groups = document.querySelectorAll("[collapsible]");
        for (const group of groups) {
            const storageKey = `${group.id}-collapsed`;
            const storedState = localStorage.getItem(storageKey);
            if (storedState == "true") {
                group.classList.add("collapsed");
            }
            else if (storedState == "false") {
                group.classList.remove("collapsed");
            }
            group.firstElementChild.addEventListener("click", event => {
                if (group.classList.contains("collapsed")) {
                    group.classList.remove("collapsed");
                    localStorage.setItem(storageKey, "false");
                }
                else {
                    group.classList.add("collapsed");
                    localStorage.setItem(storageKey, "true");
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
    function initControlInterface() {
        inputs = document.querySelectorAll("[SDTarget]");
        container = document.getElementById("images");
        const nextSeedButton = document.getElementById("nextSeed");
        nextSeedButton.addEventListener("click", () => applyNextSeed());
        const randomizeCheckBox = document.getElementById("randomize");
        const generateButton = document.getElementById("generate");
        generateButton.addEventListener("click", () => addAll(randomizeCheckBox.checked));
        const projectNameInput = document.getElementById("projectName");
        projectNameInput.value = SDConnector.project;
        const loadProjectButton = document.getElementById("loadProject");
        loadProjectButton.addEventListener("click", () => loadProject(projectNameInput.value));
    }
    function loadProject(projectName) {
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
            const positive = document.getElementById("positive");
            positive.rows = settings.promptLines;
            const negative = document.getElementById("negative");
            negative.rows = settings.negativeLines;
            modelCatalogue = createCatalogue("models", settings.models, CKPTCatalogue);
            loraCatalogue = createCatalogue("LoRAs", settings.LoRAs, CKPTCatalogue);
            controlCatalogue = createCatalogue("controls", settings.controls, CKPTCatalogue);
            samplerCatalogue = createCatalogue("samplers", settings.samplers, SimpleCatalogue);
            preprocessor = new STDPreprocessor();
            commandEngine = new SDCommandEngine();
        }
        catch (error) {
            console.warn("Unable to load settings.");
            console.trace(error);
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
    function addOptionsTo(options, target) {
        for (const key in options) {
            const option = document.createElement("option");
            option.textContent = key;
            option.value = options[key];
            target.appendChild(option);
        }
    }
    function createCatalogue(name, categories, CatalogueType) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.warn("Unable to load history.");
            console.trace(error);
        }
    }
    initCollapsibleGroups();
    initCombinedInputs();
    initControlInterface();
    loadServer();
})(SDControl || (SDControl = {}));
