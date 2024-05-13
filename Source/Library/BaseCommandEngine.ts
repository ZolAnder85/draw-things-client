/// <reference path="ParameterList.ts" />

type CommandHandler = (parameters: ParameterList) => void;

type CommandMap = {[key: string]: CommandHandler};

abstract class BaseCommandEngine {
	protected commands: CommandMap;

	public handleBlock(block: string): void {
		for (const line of block.split("\n")) {
			this.handleLine(line.trim());
		}
		this.handleEnd();
	}

	public handleLine(line: string): void {
		if (line.startsWith("//")) {
			console.log(line.substring(2).trim());
		} else if (line.startsWith("/")) {
			try {
				this.handleCommand(line.substring(1).trim());
			} catch (message) {
				if (message == "ABORT") {
					throw "ABORT";
				}
				console.log(`Error at line: ${line}`);
				console.log(`Error message: ${message}`);
			}
		} else if (line.startsWith("-")) {
			line = line.substring(1).trim();
			if (line) {
				this.handleNegative(this.cleanLine(line));
			}
		} else if (line) {
			this.handlePositive(this.cleanLine(line));
		}
	}

	protected handleCommand(line: string): void {
		const parts = line.split(/\s*[:\s]\s*/);
		const name = parts[0];
		if (name in this.commands) {
			const parameters = new ParameterList(parts.slice(1));
			this.commands[name](parameters);
			parameters.checkEmpty(name);
		} else {
			throw "No such command.";
		}
	}

	protected cleanLine(line: string): string {
		return line
		.replace(/\s+/g, " ")
		.replace(/\s\./g, ".")
		.replace(/\.+/g, ".")
		.replace(/\s,/g, ",")
		.replace(/,+/g, ",");
	}

	protected abstract handlePositive(line: string): void

	protected abstract handleNegative(line: string): void

	protected abstract handleEnd(): void
}