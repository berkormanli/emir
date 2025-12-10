export interface Option {
    short?: string;
    long: string;
    description: string;
    hasValue?: boolean;
    defaultValue?: any;
}

export class Command {
    name: string;
    description: string;
    action: (args: string[], options: Record<string, any>) => void;
    args: string[] = [];
    options: Option[] = [];

    constructor(name: string, description: string, action: (args: string[], options: Record<string, any>) => void) {
        this.name = name;
        this.description = description;
        this.action = action;
    }

    addOption(option: Option): void {
        this.options.push(option);
    }

    parseArgs(args: string[]): void {
        // Check for help flag first
        if (args.includes('-h') || args.includes('--help')) {
            this.showHelp();
            return;
        }
        
        const { parsedArgs, parsedOptions } = this.parseArgsAndOptions(args);
        this.args = parsedArgs;
        this.action(this.args, parsedOptions);
    }

    showHelp(): void {
        console.log(`${this.name}: ${this.description}\n`);
        console.log(`Usage: ${this.name} [options] [arguments]`);
        
        if (this.options.length > 0) {
            console.log("\nOptions:");
            this.options.forEach(option => {
                const shortFlag = option.short ? `-${option.short}, ` : '';
                const longFlag = `--${option.long}`;
                const valueIndicator = option.hasValue ? ' <value>' : '';
                const defaultValue = option.defaultValue !== undefined ? ` (default: ${option.defaultValue})` : '';
                console.log(`  ${shortFlag}${longFlag}${valueIndicator}\t\t${option.description}${defaultValue}`);
            });
        }
    }

    private parseArgsAndOptions(args: string[]): { parsedArgs: string[], parsedOptions: Record<string, any> } {
        const parsedArgs: string[] = [];
        const parsedOptions: Record<string, any> = {};

        // Set default values
        this.options.forEach(option => {
            if (option.defaultValue !== undefined) {
                parsedOptions[option.long] = option.defaultValue;
            }
        });

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg.startsWith('--')) {
                const optionName = arg.slice(2);
                const option = this.options.find(opt => opt.long === optionName);
                
                if (option) {
                    if (option.hasValue) {
                        parsedOptions[option.long] = args[++i] || '';
                    } else {
                        parsedOptions[option.long] = true;
                    }
                }
            } else if (arg.startsWith('-') && arg.length === 2) {
                const shortName = arg.slice(1);
                const option = this.options.find(opt => opt.short === shortName);
                
                if (option) {
                    if (option.hasValue) {
                        parsedOptions[option.long] = args[++i] || '';
                    } else {
                        parsedOptions[option.long] = true;
                    }
                }
            } else {
                parsedArgs.push(arg);
            }
        }

        return { parsedArgs, parsedOptions };
    }
}

export class CLI {
    commands: Command[] = [];
    name: string;
    version: string;
    description: string;
    globalOptions: Option[] = [];

    constructor(name: string, version: string, description: string) {
        this.name = name;
        this.version = version;
        this.description = description;
        
        // Add default global options
        this.addGlobalOption({
            short: 'v',
            long: 'version',
            description: 'Show version number'
        });
        
        this.addGlobalOption({
            short: 'h',
            long: 'help',
            description: 'Show help message'
        });
    }

    addCommand(command: Command): void {
        this.commands.push(command);
    }

    addGlobalOption(option: Option): void {
        this.globalOptions.push(option);
    }

    parse(args: string[]): void {
        const [commandName, ...commandArgs] = args;
        
        // If no command provided, check for global options
        if (!commandName) {
            this.showHelp();
            return;
        }
        
        // Check for global options when no command is provided or command doesn't exist
        if (!this.commands.find(cmd => cmd.name === commandName)) {
            if (args.includes('-v') || args.includes('--version')) {
                this.showVersion();
                return;
            }
            
            if (args.includes('-h') || args.includes('--help')) {
                this.showHelp();
                return;
            }
            
            console.log(`Unknown command: ${commandName}`);
            this.showHelp();
            return;
        }

        const command = this.commands.find(cmd => cmd.name === commandName);
        if (command) {
            command.parseArgs(commandArgs);
        }
    }

    showVersion(): void {
        console.log(`${this.name} v${this.version}`);
    }

    showHelp(): void {
        console.log(`${this.name}: ${this.description}\n`);
        console.log("Usage: <command> [options]");
        
        if (this.commands.length > 0) {
            console.log("\nCommands:");
            this.commands.forEach(command => {
                console.log(`  ${command.name}\t\t${command.description}`);
            });
        }
        
        if (this.globalOptions.length > 0) {
            console.log("\nGlobal Options:");
            this.globalOptions.forEach(option => {
                const shortFlag = option.short ? `-${option.short}, ` : '';
                const longFlag = `--${option.long}`;
                const valueIndicator = option.hasValue ? ' <value>' : '';
                console.log(`  ${shortFlag}${longFlag}${valueIndicator}\t\t${option.description}`);
            });
        }
    }

    showCommandHelp(commandName: string): void {
        const command = this.commands.find(cmd => cmd.name === commandName);
        
        if (!command) {
            console.log(`Unknown command: ${commandName}`);
            return;
        }

        console.log(`${command.name}: ${command.description}\n`);
        console.log(`Usage: ${commandName} [options] [arguments]`);
        
        if (command.options.length > 0) {
            console.log("\nOptions:");
            command.options.forEach(option => {
                const shortFlag = option.short ? `-${option.short}, ` : '';
                const longFlag = `--${option.long}`;
                const valueIndicator = option.hasValue ? ' <value>' : '';
                const defaultValue = option.defaultValue !== undefined ? ` (default: ${option.defaultValue})` : '';
                console.log(`  ${shortFlag}${longFlag}${valueIndicator}\t\t${option.description}${defaultValue}`);
            });
        }
    }
}

// Export TUI functionality
export * from './tui/index.js';
