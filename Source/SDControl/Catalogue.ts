/// <reference path="../Library/Catalogue.ts" />

let modelCatalogue: CKPTCatalogue;
let loraCatalogue: CKPTCatalogue;
let controlCatalogue: CKPTCatalogue;
let samplerCatalogue: SimpleCatalogue;

const seedModeCatalogue = new IntCatalogue("seed mode", {
	legacy: "Legacy",
	torch: "Torch CPU Compatible",
	default: "Scale Alike",
	nvidia: "NVIDIA GPU Compatible"
});