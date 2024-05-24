/// <reference path="Movement.ts" />
/// <reference path="GenParam.ts" />
/// <reference path="ParamUtil.ts" />

interface GenData {
	imageName: string;
	taskData: GenParam;
	genTime: number;
	ID: number;
}

namespace SDConnector {
	export const project = new URLSearchParams(window.location.search).get("p") || "main";

	async function getResponse(location: string, method = "GET", body = undefined) {
		const headers = { project };
		const request = { method, body, headers };
		const response = await fetch(location, request);
		const result = await response.json();
		return result;
	}

	function sendRequest(location: string, method = "GET", body = undefined): void {
		const headers = { project };
		const request = { method, body, headers };
		fetch(location, request);
	}

	export async function getParameters() {
		const result = await getResponse("/parameters");
		return ParamUtil.fromDTHGen(result);
	}

	export async function getHistory() {
		const result = await getResponse("/get-history");
		for (const item of result) {
			item.taskData = ParamUtil.fromDTHGen(item.taskData);
		}
		return result;
	}

	export async function generate(taskData: GenParam) {
		const converted = ParamUtil.toDTHGen(taskData);
		const result = await getResponse("/generate", "POST", JSON.stringify(converted));
		for (const item of result) {
			item.taskData = ParamUtil.fromDTHGen(item.taskData);
		}
		return result;
	}

	export function moveGen(ID: number, movement: Movement): void {
		switch (movement) {
			case Movement.PREV:
				return sendRequest("/move-gen-prev", "POST", ID);
			case Movement.NEXT:
				return sendRequest("/move-gen-next", "POST", ID);
			// case Movement.FIRST:
			// 	return sendRequest("/move-gen-first", "POST", ID);
			// case Movement.LAST:
			// 	return sendRequest("/move-gen-last", "POST", ID);
		}
	}

	export function removeGen(ID: number): void {
		sendRequest("/remove-gen", "POST", ID);
	}

	export async function clearHistory() {
		return getResponse("/clear-history");
	}

	export async function getSettings() {
		return getResponse("/settings");
	}

	export function imageURL(name: string): string {
		return `results/${project}/${name}`;
	}
}