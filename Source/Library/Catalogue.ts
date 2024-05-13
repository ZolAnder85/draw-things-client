class SimpleCatalogue {
	protected name: string;
	protected map: any;

	public constructor(name: string, map: any) {
		this.name = name;
		this.map = map;
	}

	public get(key: string): any {
		if (key in this.map) {
			return this.map[key];
		}
		return this.handle(key);
	}

	protected handle(value: string): any {
		throw `No such ${this.name} registered in catalogue: ${value}`;
	}
}

class CKPTCatalogue extends SimpleCatalogue {
	protected handle(value: string): any {
		if (value.endsWith(".ckpt")) {
			return value;
		}
		throw `No such ${this.name} registered in catalogue (nor is it a ckpt name): ${value}`;
	}
}

class IntCatalogue extends SimpleCatalogue {
	protected handle(value: string): any {
		const result = parseInt(value);
		if (isNaN(result)) {
			throw `No such ${this.name} registered in catalogue (nor is it an integer): ${value}`;
		}
		return result;
	}
}