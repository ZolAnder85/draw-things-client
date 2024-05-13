/// <reference path="CommonUtil.ts" />
/// <reference path="ParameterList.ts" />

type WildcardHandler = (parameters: ParameterList) => string[];

type WildcardMap = {[key: string]: WildcardHandler};

type VariableMap = {[key: string]: string};

type BlockHandler = (block: string) => void;

abstract class BasePreprocessor {
	protected static readonly limitThreshold = 0.000001;

	protected wildcards: WildcardMap;
	protected variables: VariableMap;
	protected random: XSRandom;
	protected localIndex: number;
	protected globalIndex: number;
	protected handler: BlockHandler;

	public init(seed: number, handler: BlockHandler) {
		this.variables = {};
		this.random = new XSRandom(seed);
		this.localIndex = 1;
		this.globalIndex = 1;
		this.handler = handler;
	}

	public handleBlock(block: string): void {
		this.localIndex = 1;
		const list = [ block ];
		while (list.length) {
			const current = list.pop();
			const match = current.match(/{[^{}]+}/);
			if (match) {
				const original = match[0];
				try {
					const result = this.handleWildcard(original);
					for (const replacement of result.reverse()) {
						list.push(current.replace(original, replacement));
					}
				} catch (message) {
					console.log(`Error at wildcard: ${original}`);
					console.log(`Error message: ${message}`);
				}
			} else {
				this.handler(current);
				++this.localIndex;
				++this.globalIndex;
			}
		}
	}

	public handleWildcard(original: string): string[] {
		let parts;
		if (parts = original.match(/{@(\w+)=(.*)}/)) {
			return this.handleAssignment(parts[1], parts[2]);
		}
		if (original.match(/\+/)) {
			return this.handleAll(original.substring(1, original.length - 1));
		}
		if (original.match(/\|/)) {
			return this.handleSelect(original.substring(1, original.length - 1));
		}
		if (parts = original.match(/{(\+?\d+)}/)) {
			const count = parseInt(parts[1]);
			return this.handleTimes(count, 1);
		}
		if (parts = original.match(/{([+-]?\d+\.?\d*|[+-]?\.\d+):([+-]?\d+\.?\d*|[+-]?\.\d+):([+-]?\d+\.?\d*|[+-]?\.\d+)}/)) {
			const start = parseFloat(parts[1]);
			const limit = parseFloat(parts[2]);
			const step = parseFloat(parts[3]);
			return this.handleFor(start, limit, step);
		}
		if (original.match(/{@/)) {
			return this.handleFunction(original.substring(2, original.length - 1));
		}
		throw "Wrong wildcard format.";
	}

	protected handleAssignment(name: string, value: string): string[] {
		if (name in this.wildcards) {
			throw "Trying to override function.";
		}
		value = value.trim();
		this.variables[name] = value;
		return [ value ];
	}

	protected handleAll(content: string): string[] {
		return content.split("+").map(value => value.trim());
	}

	protected handleSelect(content: string): string[] {
		const options = content.split("|").map(value => value.trim());
		const value = options[this.random.next() % options.length];
		return [ value ];
	}

	protected handleTimes(count: number, digits: number): string[] {
		const result = [];
		for (let i = 0; i < count; ++i) {
			result.push(formatIndex(i + 1, digits));
		}
		return result;
	}

	protected handleFor(start: number, limit: number, step: number): string[] {
		const result = [];
		step = Math.sign(limit - start) * Math.abs(step);
		if (step > 0) {
			for (let i = start; i < limit + BasePreprocessor.limitThreshold; i += step) {
				result.push(String(i));
			}
		} else if (step < 0) {
			for (let i = start; i > limit - BasePreprocessor.limitThreshold; i += step) {
				result.push(String(i));
			}
		} else {
			throw "Step should not be 0.";
		}
		return result;
	}

	protected handleFunction(content: string): string[] {
		const parts = content.split(/\s*[:\s]\s*/);
		const name = parts[0];
		if (name in this.wildcards) {
			const parameters = new ParameterList(parts.slice(1));
			return this.wildcards[name](parameters);
		}
		if (name in this.variables) {
			const value = this.variables[name];
			return [ value ];
		}
		throw "No such wildcard.";
	}
}