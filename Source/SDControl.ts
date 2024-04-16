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

	const inputs = document.querySelectorAll("[SDTarget]");

	const container = document.getElementById("images");

	function applyParameters(parameters: any): void {
		for (const input of this.inputs) {
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

	function createGenData(): any {
		const genData = { ...this.defaults };
		for (const input of this.inputs) {
			const key = input.getAttribute("SDTarget");
			const type = input.getAttribute("SDType");
			switch (type) {
				case "bool":
					genData[key] = input.checked;
					break;
				case "int":
					genData[key] = parseInt(input.value);
					break;
				case "float":
					genData[key] = parseFloat(input.value);
					break;
				case "string":
					genData[key] = input.value;
					break;
			}
		}
		genData.original_width = genData.target_width = genData.negative_original_width = genData.width;
		genData.original_height = genData.target_height = genData.negative_original_height = genData.height;
		return genData;
	}

	async function loadParameters() {
		try {
			this.applyParameters(await SDConnector.getParameters());
		} catch {
			console.warn("Unable to load parameters.");
		}
	}

	async function loadHistory() {
		try {
			for (const genResult of await SDConnector.getHistory()) {
				const imageWrapper = GenTask.createImageWrapper(genResult);
				this.imageContainer.insertBefore(imageWrapper, this.imageContainer.firstChild);
			}
		} catch {
			console.warn("Unable to load history.");
		}
	}
}