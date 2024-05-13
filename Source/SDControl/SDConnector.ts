/// <reference path="GenParam.ts" />
/// <reference path="ParamUtil.ts" />

interface GenData {
	imageURL: string;
	taskData: GenParam;
	genTime: number;
	ID: number;
}

namespace SDConnector {
	async function execute(location: string, method = "GET", body = undefined) {
		const response = await fetch(location, { method, body });
		return response.json();
	}

	export async function getParameters() {
		const result = await execute("/parameters");
		return ParamUtil.fromDTHGen(result);
	}

	export async function getHistory() {
		const result = await execute("/get-history");
		for (const item of result) {
			item.taskData = ParamUtil.fromDTHGen(item.taskData);
		}
		return result;
	}

	export async function generate(taskData: GenParam) {
		const converted = ParamUtil.toDTHGen(taskData);
		const result = await execute("/generate", "POST", JSON.stringify(converted));
		for (const item of result) {
			item.taskData = ParamUtil.fromDTHGen(item.taskData);
		}
		return result;
	}

	export async function removeGeneration(ID: number) {
		return execute("/remove-generation", "POST", ID);
	}

	export async function clearHistory() {
		return execute("/clear-history");
	}

	export async function getSettings() {
		return execute("/settings");
	}
}