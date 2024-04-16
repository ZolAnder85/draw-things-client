interface GenData {
	imageURL: string;
	taskData: any;
	seconds: number;
	ID: string;
}

namespace SDConnector {
	async function execute(location: string, method = "GET", body = undefined): Promise<any> {
		const response = await fetch(location, { method, body });
		return await response.json();
	}

	export async function getParameters(): Promise<any> {
		return await execute("/get-parameters");
	}

	export async function getHistory(): Promise<GenData[]> {
		return await execute("/get-history");
	}

	export async function generate(genData: any): Promise<GenData[]> {
		return await execute("/generate", "POST", JSON.stringify(genData));
	}

	export async function removeGeneration(ID: string): Promise<void> {
		await execute("/remove-generation", "POST", ID);
	}

	export async function clearHistory(): Promise<void> {
		await execute("/clear-history");
	}
}