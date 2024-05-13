interface DTHLoRAParam {
	file: string;
	weight: number;
}

interface DTHControlParam {
	file: string;
	weight: number;
	control_importance: string;
	guidance_start: number;
	guidance_end: number;
	no_prompt: boolean;
	down_sampling_rate: number;
	global_average_pooling: boolean;
}

interface DTHGenParam {
	// models
	model?: string;
	refiner_model?: string;
	refiner_start?: number;
	loras?: DTHLoRAParam[];
	controls?: DTHControlParam[];
	// generation
	sampler?: string;
	steps?: number;
	guidance_scale?: number;
	shift?: number;
	stochastic_sampling_gamma?: number;
	seed?: number;
	seed_mode?: string;
	strength?: number;
	// size
	width?: number;
	height?: number;
	hires_fix?: boolean;
	hires_fix_width?: number;
	hires_fix_height?: number;
	hires_fix_strength?: number;
	// extra
	sharpness?: number;
	clip_skip?: number;
	clip_weight?: number;
	zero_negative_prompt?: boolean;
	// image_guidance_scale?: number;
	batch_count?: number;
	batch_size?: number;
	// postprocess
	upscaler?: string;
	upscaler_scale?: number,
	// face_restoration?: string;
	// SDXL
	original_width?: number;
	original_height?: number;
	target_width?: number;
	target_height?: number;
	negative_original_width?: number;
	negative_original_height?: number;
	crop_top?: number,
	crop_left?: number,
	aesthetic_score?: number;
	negative_aesthetic_score?: number;
	// inpainting
	mask_blur?: number;
	mask_blur_outset?: number;
	preserve_original_after_inpaint?: boolean;
	// SVD
	fps?: number;
	num_frames?: number;
	start_frame_guidance?: number;
	guiding_frame_noise?: number;
	motion_scale?: number
	// Cascade
	// stage_2_steps?: number;
	// stage_2_guidance?: number;
	// stage_2_shift?: number;
	// tiling
	tiled_decoding?: boolean;
	decoding_tile_width?: number;
	decoding_tile_height?: number;
	decoding_tile_overlap?: number;
	tiled_diffusion?: boolean;
	diffusion_tile_width?: number;
	diffusion_tile_height?: number;
	diffusion_tile_overlap?: number;
	// unknown
	// id?: number;
	image_prior_steps?: number;
	negative_prompt_for_image_prior?: boolean;
	// prompt
	prompt?: string;
	negative_prompt?: string;
}

const defaultDTHGenParam: DTHGenParam = {
	// models
	// model: null,
	refiner_model: null,
	refiner_start: 0.5,
	loras: [],
	controls: [],
	// generation
	sampler: "DPM++ 2M Karras",
	steps: 20,
	guidance_scale: 5,
	shift: 1,
	stochastic_sampling_gamma: 0.3,
	// seed: 0,
	seed_mode: "Scale Alike",
	strength: 1,
	// size
	width: 512,
	height: 512,
	hires_fix: false,
	hires_fix_width: 512,
	hires_fix_height: 512,
	hires_fix_strength: 0.5,
	// extra
	sharpness: 0,
	clip_skip: 1,
	clip_weight: 1,
	zero_negative_prompt: false,
	// image_guidance_scale: 1.5,
	batch_count: 1,
	batch_size: 1,
	// postprocess
	upscaler: null,
	upscaler_scale: 1,
	// face_restoration: null,
	// SDXL
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
	// inpainting
	mask_blur: 5,
	mask_blur_outset: 0,
	preserve_original_after_inpaint: true,
	// SVD
	fps: 5,
	num_frames: 21,
	start_frame_guidance: 1,
	guiding_frame_noise: 0.02,
	motion_scale: 127,
	// Cascade
	// stage_2_steps: 10,
	// stage_2_guidance: 1,
	// stage_2_shift: 1,
	// tiling
	tiled_decoding: false,
	decoding_tile_width: 768,
	decoding_tile_height: 768,
	decoding_tile_overlap: 128,
	tiled_diffusion: false,
	diffusion_tile_width: 1536,
	diffusion_tile_height: 1536,
	diffusion_tile_overlap: 256,
	// unknown
	// id: 0,
	image_prior_steps: 5,
	negative_prompt_for_image_prior: true
	// prompt
	// prompt: "",
	// negative_prompt: ""
};

interface DTSLoRAParam {
	file: string;
	weight: number;
}

interface DTSControlParam {
	file: string;
	weight: number;
	controlImportance: string;
	guidanceStart: number;
	guidanceEnd: number;
	noPrompt: boolean;
	downSamplingRate: number;
	globalAveragePooling: boolean;
}

interface DTSGenParam {
	// models
	model?: string;
	refinerModel?: string;
	refinerStart?: number;
	loras?: DTSLoRAParam[];
	controls?: DTSControlParam[];
	// generation
	sampler?: number;
	steps?: number;
	guidanceScale?: number;
	shift?: number;
	stochasticSamplingGamma?: number;
	seed?: number;
	seedMode?: number;
	strength?: number;
	// size
	width?: number;
	height?: number;
	hiresFix?: boolean;
	hiresFixWidth?: number;
	hiresFixHeight?: number;
	hiresFixStrength?: number;
	// extra
	sharpness?: number;
	clipSkip?: number;
	clipWeight?: number;
	zeroNegativePrompt?: boolean;
	imageGuidanceScale?: number;
	batchCount?: number;
	batchSize?: number;
	// postprocess
	upscaler?: string;
	upscalerScale?: number,
	faceRestoration?: string;
	// SDXL
	originalImageWidth?: number;
	originalImageHeight?: number;
	targetImageWidth?: number;
	targetImageHeight?: number;
	negativeOriginalImageWidth?: number;
	negativeOriginalImageHeight?: number;
	cropTop?: number;
	cropLeft?: number;
	aestheticScore?: number;
	negativeAestheticScore?: number;
	// inpainting
	maskBlur?: number;
	maskBlurOutset?: number;
	preserveOriginalAfterInpaint?: boolean;
	// SVD
	fps?: number;
	numFrames?: number;
	startFrameGuidance?: number;
	guidingFrameNoise?: number;
	motionScale?: number
	// Cascade
	stage2Steps?: number;
	stage2Guidance?: number;
	stage2Shift?: number;
	// tiling
	tiledDecoding?: boolean;
	decodingTileWidth?: number;
	decodingTileHeight?: number;
	decodingTileOverlap?: number;
	tiledDiffusion?: boolean;
	diffusionTileWidth?: number;
	diffusionTileHeight?: number;
	diffusionTileOverlap?: number;
	// unknown
	id?: number;
	imagePriorSteps?: number;
	negativePromptForImagePrior?: boolean;
}

const defaultDTSGenParam: DTSGenParam = {
	// models
	// model: null,
	refinerModel: null,
	refinerStart: 0.5,
	loras: [],
	controls: [],
	// generation
	sampler: 0,
	steps: 20,
	guidanceScale: 5,
	shift: 1,
	stochasticSamplingGamma: 0.3,
	// seed: 0,
	seedMode: 2,
	strength: 1,
	// size
	width: 512,
	height: 512,
	hiresFix: false,
	hiresFixWidth: 512,
	hiresFixHeight: 512,
	hiresFixStrength: 0.5,
	// extra
	sharpness: 0,
	clipSkip: 1,
	clipWeight: 1,
	zeroNegativePrompt: false,
	imageGuidanceScale: 1.5,
	batchCount: 1,
	batchSize: 1,
	// postprocess
	upscaler: null,
	upscalerScale: 0,
	faceRestoration: null,
	// SDXL
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
	// inpainting
	maskBlur: 5,
	maskBlurOutset: 0,
	preserveOriginalAfterInpaint: true,
	// SVD
	fps: 5,
	numFrames: 21,
	startFrameGuidance: 1,
	guidingFrameNoise: 0.02,
	motionScale: 127,
	// Cascade
	stage2Steps: 10,
	stage2Guidance: 1,
	stage2Shift: 1,
	// tiling
	tiledDecoding: false,
	decodingTileWidth: 512,
	decodingTileHeight: 512,
	decodingTileOverlap: 128,
	tiledDiffusion: false,
	diffusionTileWidth: 1536,
	diffusionTileHeight: 1536,
	diffusionTileOverlap: 256,
	// unknown
	// id: 0,
	imagePriorSteps: 5,
	negativePromptForImagePrior: true
};