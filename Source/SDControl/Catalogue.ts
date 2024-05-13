/// <reference path="../Library/Catalogue.ts" />

let modelCatalogue: CKPTCatalogue;
let loraCatalogue: CKPTCatalogue;
let controlCatalogue: CKPTCatalogue;

const seedModeCatalogue = new IntCatalogue("seed mode", {
	legacy: "Legacy",
	torch: "Torch CPU Compatible",
	default: "Scale Alike",
	nvidia: "NVIDIA GPU Compatible"
});

const samplerCatalogue = new SimpleCatalogue("sampler", {
	"DPM++-2M-Karras": "DPM++ 2M Karras",
	"Euler-Ancestral": "Euler a",
	"DDIM": "DDIM",
	"PLMS": "PLMS",
	"DPM++-SDE-Karras": "DPM++ SDE Karras",
	"UniPC": "UniPC",
	"LCM": "LCM",
	"Euler-A-SubStep": "Euler A SubStep",
	"DPM++-SDE-SubStep": "DPM++ SDE SubStep",
	"TCD": "TCD",
	"Euler-A-Trailing": "Euler A Trailing",
	"DPM++-SDE-Trailing": "DPM++ SDE Trailing"
});