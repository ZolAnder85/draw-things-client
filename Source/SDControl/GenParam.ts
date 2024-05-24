interface LoRAParam {
	file: string;
	weight: number;
}

interface ControlParam {
	file: string;
	weight: number;
	priority: string;
	start: number;
	end: number;
}

interface GenParam {
	// models
	model?: string;
	refinerModel?: string;
	refinerStart?: number;
	loras?: LoRAParam[];
	controls?: ControlParam[];
	// generation
	sampler?: string;
	steps?: number;
	CFG?: number;
	shift?: number;
	SSS?: number;
	seed?: number;
	// size
	width?: number;
	height?: number;
	hiResFix?: boolean;
	hiResFixWidth?: number;
	hiResFixHeight?: number;
	hiResFixStrength?: number;
	// prompt
	positivePrompt?: string;
	negativePrompt?: string;
	batchCount?: number;
}

const defaultGenParam: GenParam = {
	// models
	// model: null,
	refinerModel: null,
	refinerStart: 0.5,
	loras: [],
	controls: [],
	// generation
	sampler: "DPM++ 2M Karras",
	steps: 20,
	CFG: 5,
	shift: 1,
	SSS: 0.3,
	// seed: 0,
	// size
	width: 512,
	height: 512,
	hiResFix: false,
	hiResFixWidth: 512,
	hiResFixHeight: 512,
	hiResFixStrength: 0.5,
	// prompt
	// positivePrompt: "",
	// negativePrompt: "",
	batchCount: 1
};