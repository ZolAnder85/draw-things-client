/// <reference path="../Library/BaseCommandEngine.ts" />
/// <reference path="../Library/CommonUtil.ts" />
/// <reference path="GenParam.ts" />
/// <reference path="Catalogue.ts" />

type GenHandler = (taskData: GenParam) => void;

class SDCommandEngine extends BaseCommandEngine {
	private initial: GenParam;
	private current: GenParam;
	private positive: string;
	private negative: string;
	private handler: GenHandler;

	public constructor() {
		super();
		this.commands = {
			...this.buildAPIMap(),
			...this.buildCustomMap()
		};
	}

	public init(taskData: GenParam, handler: GenHandler): void {
		this.initial = ParamUtil.duplicateSDGen(taskData);
		this.current = ParamUtil.duplicateSDGen(taskData);
		this.positive = "";
		this.negative = taskData.negativePrompt;
		this.handler = handler;
	}

	private buildAPIMap(): CommandMap {
		const result = {};
		for (const key in defaultGenParam) {
			switch (typeof defaultGenParam[key]) {
				case "string":
					result[key] = (parameters: ParameterList) => this.current[key] = parameters.nextString();
					break;
				case "number":
					result[key] = (parameters: ParameterList) => this.current[key] = parameters.nextFloat();
					break;
				case "boolean":
					result[key] = (parameters: ParameterList) => this.current[key] = parameters.nextBool();
					break;
			}
		}
		return result;
	}

	private buildCustomMap(): CommandMap {
		return {
			generate: this.handleGenerate,
			defaults: this.handleDefaults,
			reset: this.handleReset,
			empty: this.handleEmpty,
			model: this.createStandardHandler(
				"model", modelCatalogue, undefined
			),
			refinerModel: this.createStandardHandler(
				"refinerModel", modelCatalogue, undefined
			),
			lora: this.handleLoRA,
			control: this.handleControl,
			sampler: this.createStandardHandler(
				"sampler", samplerCatalogue, undefined
			),
			seed: this.handleSeed,
			seedMode: this.createStandardHandler(
				"seedMode", seedModeCatalogue, undefined
			),
			size: this.handleSize,
			aspect: this.handleAspect,
			enableHiResFix: this.createStandardHandler(
				"hiResFix", "const", true
			),
			setHiResFix: this.createStandardHandler(
				"hiResFix", "const", true,
				"hiResFixWidth", "int", undefined,
				"hiResFixHeight", "int", undefined,
				"hiResFixStrength", "float", undefined
			),
			disableHiResFix: this.createStandardHandler(
				"hiResFix", "const", false
			)
		};
	}

	private createStandardHandler(...targets): CommandHandler {
		return (parameterList) => {
			let i = 0;
			while (i < targets.length) {
				const key = targets[i++];
				const type = targets[i++];
				const fallback = targets[i++];
				if (type instanceof SimpleCatalogue) {
					this.current[key] = type.get(parameterList.nextString(fallback))
				} else if (type == "const") {
					this.current[key] = fallback;
				} else if (type == "string") {
					this.current[key] = parameterList.nextString(fallback);
				} else if (type == "float") {
					this.current[key] = parameterList.nextFloat(fallback);
				} else if (type == "int") {
					this.current[key] = parameterList.nextInt(fallback);
				} else {
					this.current[key] = fallback;
				}
			}
		};
	}

	private handleDefaults = (parameters: ParameterList) => {
		ParamUtil.overrideGen(this.current, defaultGenParam);
	}

	private handleReset = (parameters: ParameterList) => {
		ParamUtil.overrideGen(this.current, this.initial);
	}

	private handleEmpty = (parameters: ParameterList) => {
		this.positive = "";
		this.negative = "";
	}

	private handleLoRA = (parameters: ParameterList) => {
		const index = parameters.nextInt();
		if (index < 1) {
			throw "LoRA indexing should start from 1.";
		}
		this.current.loras[index - 1] = {
			file: loraCatalogue.get(parameters.nextString()),
			weight: parameters.nextFloat(1)
		}
	}

	private handleControl = (parameters: ParameterList) => {
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
	}

	private handleSeed = (parameters: ParameterList) => {
		this.current.seed = parameters.nextInt(XSRandom.next(this.current.seed));
	}

	private handleSize = (parameters: ParameterList) => {
		this.current.width = parameters.nextInt();
		this.current.height = parameters.nextInt();
	}

	private swapHorizontal(widthKey: string, heightKey: string) {
		const width = this.current[widthKey];
		const height = this.current[heightKey];
		this.current[widthKey] = Math.max(width, height);
		this.current[heightKey] = Math.min(width, height);
	}

	private swapVertical(widthKey: string, heightKey: string) {
		const width = this.current[widthKey];
		const height = this.current[heightKey];
		this.current[widthKey] = Math.min(width, height);
		this.current[heightKey] = Math.max(width, height);
	}

	private handleAspect = (parameters: ParameterList) => {
		const aspect = parameters.nextString();
		if (aspect == "horizontal") {
			this.swapHorizontal("width", "height");
			this.swapHorizontal("hiResFixWidth", "hiResFixHeight");
		} else if (aspect == "vertical") {
			this.swapVertical("width", "height");
			this.swapVertical("hiResFixWidth", "hiResFixHeight");
		} else {
			throw "Aspect should be horizontal or vertical.";
		}
	}

	private handleGenerate = (parameters: ParameterList) => {
		if (typeof this.negative == "string") {
			this.current.negativePrompt = this.negative;
			this.negative = null;
		}
		if (typeof this.positive == "string") {
			this.current.positivePrompt = this.positive;
			this.positive = null;
		}
		this.handler(ParamUtil.duplicateSDGen(this.current));
	}

	protected override handlePositive(line: string): void {
		if (this.positive) {
			this.positive += "\n";
			this.positive += line;
		} else {
			this.positive = line;
		}
	}

	protected override handleNegative(line: string): void {
		if (this.negative) {
			this.negative += "\n";
			this.negative += line;
		} else {
			this.negative = line;
		}
	}

	protected override handleEnd(): void {
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