function prettyFormat(object: object): string {
	return JSON.stringify(object, null, "\t");
}

function prettyPrint(object: object): void {
	console.log(prettyFormat(object));
}

function getAllPropertyNames(object: object): string[] {
	const result = [];
	let current = object;
	while (current) {
		result.push(...Object.getOwnPropertyNames(current));
		current = Object.getPrototypeOf(current);
	}
	return result;
}

function printProperties(object: object, propertyNames: string[]): void {
	for (const name of propertyNames) {
		const value = object[name];
		if (typeof value == "object") {
			console.log(name + ": " + prettyFormat(value));
		} else {
			console.log(name + ": " + value);
		}
	}
}

function printOwnProperties(object: object): void {
	printProperties(object, Object.getOwnPropertyNames(object));
}

function printAllProperties(object: object): void {
	printProperties(object, getAllPropertyNames(object));
}

function cleanString(value: string): string {
	return value.trim().replace(/\r\n|\r|\u2028/g, "\n");
}

class XSRandom {
	public static next(seed: number): number {
		seed = seed ^ (seed << 13);
		seed = seed ^ (seed >> 17);
		seed = seed ^ (seed << 5);
		return seed >>> 0;
	}

	private seed: number;

	public constructor(seed: number) {
		this.seed = seed || 3850;
	}

	public next(): number {
		const result = this.seed;
		this.seed = XSRandom.next(this.seed);
		return result;
	}
}

function formatIndex(index: number, digits = 1): string {
	let result = index.toString();
	while (result.length < digits) {
		result = "0" + result;
	}
	return result;
}