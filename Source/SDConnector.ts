interface GenData {
	imageURL: string;
	taskData: any;
	genTime: number;
	ID: number;
}

namespace SDConnector {
	function sanitize(taskData: any): any {
		if (taskData.hires_fix == false || taskData.hires_fix_width == 0 || taskData.hires_fix_height == 0) {
			taskData.hires_fix = false;
			delete taskData.hires_fix_width;
			delete taskData.hires_fix_height;
		}
		return taskData;
	}

	async function execute(location: string, method = "GET", body = undefined) {
		const response = await fetch(location, { method, body });
		return response.json();
	}

	export async function getParameters() {
		const parameters = sanitize(await execute("/parameters"));
		if (parameters.loras) {
			let lora = parameters.loras[0];
			if (lora) {
				parameters.lora_1_model = lora.file;
				parameters.lora_1_weight = lora.weight;
			}
			lora = parameters.loras[1];
			if (lora) {
				parameters.lora_2_model = lora.file;
				parameters.lora_2_weight = lora.weight;
			}
		}
		return parameters;
	}

	export async function getHistory() {
		return execute("/get-history");
	}

	export async function generate(taskData: any) {
		const loras = [];
		if (taskData.lora_1_model) {
			loras.push({ file: taskData.lora_1_model, weight: taskData.lora_1_weight });
		}
		if (taskData.lora_2_model) {
			loras.push({ file: taskData.lora_2_model, weight: taskData.lora_2_weight });
		}
		const parameters = { ...taskData, loras };
		delete parameters.lora_1_model;
		delete parameters.lora_1_weight;
		delete parameters.lora_2_model;
		delete parameters.lora_2_weight;
		parameters.original_width = parameters.target_width = parameters.negative_original_width = parameters.width;
		parameters.original_height = parameters.target_height = parameters.negative_original_height = parameters.height;
		return execute("/generate", "POST", JSON.stringify(sanitize(parameters)));
	}

	export async function removeGeneration(ID: number) {
		return execute("/remove-generation", "POST", ID);
	}

	export async function clearHistory() {
		return execute("/clear-history");
	}
}