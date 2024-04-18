interface GenData {
	imageURL: string;
	taskData: any;
	seconds: number;
	ID: string;
}

namespace SDConnector {
	async function execute(location: string, method = "GET", body = undefined) {
		const response = await fetch(location, { method, body });
		return response.json();
	}

	export async function getParameters() {
		return execute("/parameters");
	}

	export async function getHistory() {
		return execute("/get-history");
	}

	export async function generate(genData: any) {
		return execute("/generate", "POST", JSON.stringify(genData));
	}

	export async function removeGeneration(ID: number) {
		return execute("/remove-generation", "POST", ID);
	}

	export async function clearHistory() {
		return execute("/clear-history");
	}
}