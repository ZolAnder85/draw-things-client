/// <reference path="../Library/DTGenParam.ts" />

namespace ParamUtil {
	function toDTHLoRA(param: LoRAParam): DTHLoRAParam {
		if (param.file) {
			return {
				file: param.file,
				weight: param.weight
			};
		}
		return null;
	}

	function toDTHControl(param: ControlParam): DTHControlParam {
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

	export function toDTHGen(param: GenParam): DTHGenParam {
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

		return result;
	}

	function fromDTHLoRA(param: DTHLoRAParam): LoRAParam {
		if (param.file) {
			return {
				file: param.file,
				weight: param.weight
			};
		}
		return null;
	}

	function fromDTHControl(param: DTHControlParam): ControlParam {
		if (param.file) {
			return {
				file: param.file,
				weight: param.weight,
				priority: param.control_importance,
				start: param.guidance_start,
				end: param.guidance_end
			}
		}
		return null;
	}

	export function fromDTHGen(param: DTHGenParam): GenParam {
		const result = { ...defaultGenParam };

		result.model = param.model;
		result.refinerModel = param.refiner_model;
		result.refinerStart = param.refiner_start;

		if (param.loras) {
			result.loras = param.loras.map(fromDTHLoRA).filter(Boolean);
		}

		result.loras[0] = result.loras[0] || { file: null, weight: 0 }
		result.loras[1] = result.loras[1] || { file: null, weight: 0 }

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

	function duplicateLoRA(param: LoRAParam): LoRAParam {
		return { ...param };
	}

	function duplicateControl(param: ControlParam): ControlParam {
		return { ...param };
	}

	export function duplicateSDGen(param: GenParam): GenParam {
		const result = { ...param };

		if (param.loras) {
			result.loras = param.loras.map(duplicateLoRA);
		}

		if (param.controls) {
			result.controls = param.controls.map(duplicateControl);
		}

		return result;
	}

	export function overrideGen(target: GenParam, source: GenParam): void {
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
}