export class Command {
    name: string;
    description: string;
    action: (...args: any[]) => void;
    args: string[] = [];

    constructor(name: string, description: string, action: (...args: any[]) => void) {
        this.name = name;
        this.description = description;
        this.action = action;
    }

    parseArgs(args: string[]): void {
        this.args = args;
        this.action(...this.args);
    }
}

export class CLI {
    commands: Command[] = [];
    name: string;
    version: string;
    description: string;

    constructor(name: string, version: string, description: string) {
        this.name = name;
        this.version = version;
        this.description = description;
    }

    addCommand(command: Command): void {
        this.commands.push(command);
    }

    parse(args: string[]): void {
        const [commandName, ...commandArgs] = args;
        const command = this.commands.find(cmd => cmd.name === commandName);

        if (command) {
            command.parseArgs(commandArgs);
        } else {
            console.log('Unknown command');
        }
    }


    showVersion(): void {
        console.log(`${this.name} v${this.version}`);
    }

    showHelp(): void {
        console.log(`${this.name}: ${this.description}\n`);
        console.log("Usage: <command> [options]");
        console.log("\nCommands:");
        this.commands.forEach(command => {
            console.log(`  ${command.name}\t\t${command.description}`);
        });
        console.log("\nOptions:");
        console.log("  -v, --version\t\tShow version number");
        console.log("  -h, --help\t\tShow help message");
    }
}
