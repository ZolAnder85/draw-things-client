/// <reference path="BasePreprocessor.ts" />

class STDPreprocessor extends BasePreprocessor {
	private timesHandler = (parameters: ParameterList) => {
		return this.handleTimes(parameters.nextInt(), parameters.nextInt(1));
	}

	private forHandler = (parameters: ParameterList) => {
		return this.handleFor(parameters.nextFloat(), parameters.nextFloat(), parameters.nextFloat());
	}

	private randomDigitsHandler = (parameters: ParameterList) => {
		let result = "";
		const count = parameters.nextInt();
		for (let i = 0; i < count; ++i) {
			result += String.fromCharCode(48 + this.random.next() % 10);
		}
		return [ result ];
	}

	private randomLettersHandler = (parameters: ParameterList) => {
		let result = "";
		const count = parameters.nextInt();
		for (let i = 0; i < count; ++i) {
			result += String.fromCharCode(97 + this.random.next() % 25);
		}
		return [ result ];
	}

	private localIndexHandler = (parameters: ParameterList) => {
		return [ formatIndex(this.localIndex, parameters.nextInt(1)) ];
	}

	private globalIndexHandler = (parameters: ParameterList) => {
		return [ formatIndex(this.globalIndex, parameters.nextInt(1)) ];
	}

	protected wildcards = {
		"times": this.timesHandler,
		"for": this.forHandler,
		"randomDigits": this.randomDigitsHandler,
		"num": this.randomDigitsHandler,
		"randomLetters": this.randomLettersHandler,
		"word": this.randomLettersHandler,
		"localIndex": this.localIndexHandler,
		"i": this.localIndexHandler,
		"globalIndex": this.globalIndexHandler,
		"n": this.globalIndexHandler
	};
}