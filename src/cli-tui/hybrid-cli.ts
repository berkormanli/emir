import { CLI, Command, type Option } from '../index';
import { TUI } from '../tui/tui';
import { Menu, MenuItem } from '../tui/menu';
import { Form, FormData } from '../tui/form';
import { Dialog, DialogResult } from '../tui/dialog';
import { TerminalController } from '../tui/terminal-controller';

/**
 * Mode of operation for the hybrid CLI
 */
export type CLIMode = 'cli' | 'tui' | 'auto';

/**
 * Options for hybrid CLI
 */
export interface HybridCLIOptions {
    defaultMode?: CLIMode;
    allowModeSwitch?: boolean;
    tuiEnabled?: boolean;
    preserveCliOutput?: boolean;
}

/**
 * State for managing CLI-TUI transitions
 */
interface CLIState {
    currentMode: CLIMode;
    tuiActive: boolean;
    currentTUI: TUI | null;
    terminalController: TerminalController | null;
    previousOutput: string[];
}

/**
 * Hybrid CLI class that supports both traditional CLI and TUI modes
 */
export class HybridCLI extends CLI {
    private options: Required<HybridCLIOptions>;
    private state: CLIState;
    private tuiCommands: Map<string, TUICommand>;
    private globalInteractiveFlag: boolean;

    constructor(
        name: string,
        version: string,
        description: string,
        options: HybridCLIOptions = {}
    ) {
        super(name, version, description);
        
        this.options = {
            defaultMode: options.defaultMode ?? 'cli',
            allowModeSwitch: options.allowModeSwitch ?? true,
            tuiEnabled: options.tuiEnabled ?? true,
            preserveCliOutput: options.preserveCliOutput ?? false
        };

        this.state = {
            currentMode: this.options.defaultMode,
            tuiActive: false,
            currentTUI: null,
            terminalController: null,
            previousOutput: []
        };

        this.tuiCommands = new Map();
        this.globalInteractiveFlag = false;

        // Add global interactive flag
        this.addGlobalOption({
            short: 'i',
            long: 'interactive',
            description: 'Launch in interactive TUI mode'
        });
    }

    /**
     * Get current mode
     */
    getCurrentMode(): CLIMode {
        return this.state.currentMode;
    }

    /**
     * Set operating mode
     */
    setMode(mode: CLIMode): void {
        if (!this.options.allowModeSwitch) {
            console.warn('Mode switching is disabled');
            return;
        }

        if (mode === 'tui' && !this.options.tuiEnabled) {
            console.warn('TUI mode is disabled');
            return;
        }

        const previousMode = this.state.currentMode;
        this.state.currentMode = mode;

        // Handle transition
        if (previousMode === 'tui' && mode !== 'tui') {
            this.exitTUIMode();
        }
    }

    /**
     * Add a command with optional TUI support
     */
    addHybridCommand(command: Command, tuiCommand?: TUICommand): void {
        this.addCommand(command);
        
        if (tuiCommand) {
            this.tuiCommands.set(command.name, tuiCommand);
        }
    }

    /**
     * Parse arguments with hybrid mode support
     */
    parse(args: string[]): void {
        // Check for global interactive flag
        this.globalInteractiveFlag = args.includes('-i') || args.includes('--interactive');
        
        if (this.globalInteractiveFlag && this.options.tuiEnabled) {
            // Remove the interactive flag from args
            args = args.filter(arg => arg !== '-i' && arg !== '--interactive');
            
            // Switch to TUI mode for this execution
            const previousMode = this.state.currentMode;
            this.state.currentMode = 'tui';
            
            // Check if we should launch interactive menu or specific command
            if (args.length === 0 || !this.commands.find(cmd => cmd.name === args[0])) {
                // Launch interactive command menu
                this.launchInteractiveMenu();
            } else {
                // Execute specific command in TUI mode
                this.executeHybridCommand(args);
            }
            
            // Restore previous mode
            this.state.currentMode = previousMode;
        } else {
            // Normal CLI execution
            super.parse(args);
        }
    }

    /**
     * Execute a command in hybrid mode
     */
    private executeHybridCommand(args: string[]): void {
        const [commandName, ...commandArgs] = args;
        const command = this.commands.find(cmd => cmd.name === commandName);
        
        if (!command) {
            console.log(`Unknown command: ${commandName}`);
            this.showHelp();
            return;
        }

        const tuiCommand = this.tuiCommands.get(commandName);
        
        if (this.state.currentMode === 'tui' && tuiCommand) {
            // Execute in TUI mode
            this.enterTUIMode();
            tuiCommand.execute(commandArgs, this.state.terminalController!);
            this.exitTUIMode();
        } else if (this.state.currentMode === 'auto') {
            // Auto-detect based on TTY and command support
            if (process.stdout.isTTY && tuiCommand) {
                this.enterTUIMode();
                tuiCommand.execute(commandArgs, this.state.terminalController!);
                this.exitTUIMode();
            } else {
                command.parseArgs(commandArgs);
            }
        } else {
            // Execute in CLI mode
            command.parseArgs(commandArgs);
        }
    }

    /**
     * Launch interactive command menu
     */
    private async launchInteractiveMenu(): Promise<void> {
        if (!this.options.tuiEnabled) {
            console.error('TUI mode is not enabled');
            return;
        }

        this.enterTUIMode();

        const tui = new TUI(this.name, this.version, this.description);
        this.state.currentTUI = tui;

        // Create menu items from available commands
        const menuItems: MenuItem[] = this.commands.map(cmd => ({
            id: cmd.name,
            label: cmd.name,
            description: cmd.description,
            value: cmd
        }));

        // Add exit option
        menuItems.push({
            id: 'exit',
            label: 'Exit',
            description: 'Exit the application',
            value: null
        });

        const menu = new Menu(
            'main-menu',
            menuItems, // Pass items directly
            {
                title: `${this.name} - Interactive Mode`,
                showBorder: true
            }
        );

        menu.setOnSelect((item) => {
            if (item.id === 'exit') {
                tui.stop();
                return;
            }

            const command = item.value as Command;
            const tuiCommand = this.tuiCommands.get(command.name);

            if (tuiCommand) {
                // Execute TUI version
                tuiCommand.execute([], this.state.terminalController!);
            } else {
                // Fall back to CLI version with a dialog
                this.showCommandDialog(command);
            }
        });

        tui.addComponent(menu);
        
        try {
            await tui.start();
        } finally {
            this.exitTUIMode();
        }
    }

    /**
     * Show a dialog for CLI command execution
     */
    private async showCommandDialog(command: Command): Promise<void> {
        const dialog = new Dialog('command-dialog', {
            type: 'confirm',
            title: command.name,
            message: `Execute "${command.name}"?\n\n${command.description}`,
            buttons: 'ok-cancel'
        });

        const tui = new TUI('dialog', '1.0.0', 'Dialog');
        tui.addComponent(dialog);

        dialog.setOnResult((result: DialogResult) => {
            if (result.buttonId === 'ok') {
                // Exit TUI temporarily to run CLI command
                this.exitTUIMode();
                command.parseArgs([]);
                this.enterTUIMode();
            }
            tui.stop();
        });

        await tui.start();
    }

    /**
     * Enter TUI mode
     */
    private enterTUIMode(): void {
        if (this.state.tuiActive) return;

        // Save current terminal state
        if (this.options.preserveCliOutput) {
            // TODO: Capture current screen content
            this.state.previousOutput = [];
        }

        // Initialize terminal controller
        this.state.terminalController = new TerminalController();
        
        // Enter alternate screen if supported
        if (this.state.terminalController.capabilities.alternateScreen) {
            this.state.terminalController.enterAlternateScreen();
        }

        this.state.terminalController.hideCursor();
        this.state.terminalController.clearScreen();
        this.state.tuiActive = true;
    }

    /**
     * Exit TUI mode
     */
    private exitTUIMode(): void {
        if (!this.state.tuiActive) return;

        // Clean up current TUI if exists
        if (this.state.currentTUI) {
            this.state.currentTUI.stop();
            this.state.currentTUI = null;
        }

        // Restore terminal state
        if (this.state.terminalController) {
            this.state.terminalController.restore();
            this.state.terminalController = null;
        }

        // Restore previous output if needed
        if (this.options.preserveCliOutput && this.state.previousOutput.length > 0) {
            this.state.previousOutput.forEach(line => console.log(line));
        }

        this.state.tuiActive = false;
    }

    /**
     * Create a confirmation dialog in TUI mode
     */
    async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
        if (this.state.currentMode !== 'tui' || !this.state.tuiActive) {
            // Fall back to CLI mode (would need readline-sync or similar)
            console.log(`${title}: ${message} (y/n)`);
            // For now, return true as placeholder
            return true;
        }

        return new Promise((resolve) => {
            const dialog = new Dialog('confirm-dialog', {
                type: 'confirm',
                title,
                message,
                buttons: 'yes-no'
            });

            const tui = new TUI('confirm', '1.0.0', 'Confirmation');
            tui.addComponent(dialog);

            dialog.setOnResult((result: DialogResult) => {
                resolve(result.buttonId === 'yes');
                tui.stop();
            });

            tui.start();
        });
    }

    /**
     * Create a prompt dialog in TUI mode
     */
    async prompt(message: string, title: string = 'Input', defaultValue?: string): Promise<string | null> {
        if (this.state.currentMode !== 'tui' || !this.state.tuiActive) {
            // Fall back to CLI mode
            console.log(`${title}: ${message}`);
            // For now, return default value as placeholder
            return defaultValue || null;
        }

        return new Promise((resolve) => {
            const dialog = new Dialog('prompt-dialog', {
                type: 'prompt',
                title,
                message,
                inputDefaultValue: defaultValue,
                buttons: 'ok-cancel'
            });

            const tui = new TUI('prompt', '1.0.0', 'Prompt');
            tui.addComponent(dialog);

            dialog.setOnResult((result: DialogResult) => {
                resolve(result.buttonId === 'ok' ? result.inputValue || null : null);
                tui.stop();
            });

            tui.start();
        });
    }

    /**
     * Show alert in TUI mode
     */
    async alert(message: string, title: string = 'Alert'): Promise<void> {
        if (this.state.currentMode !== 'tui' || !this.state.tuiActive) {
            // Fall back to CLI mode
            console.log(`${title}: ${message}`);
            return;
        }

        return new Promise((resolve) => {
            const dialog = new Dialog('alert-dialog', {
                type: 'alert',
                title,
                message,
                buttons: 'ok'
            });

            const tui = new TUI('alert', '1.0.0', 'Alert');
            tui.addComponent(dialog);

            dialog.setOnResult(() => {
                resolve();
                tui.stop();
            });

            tui.start();
        });
    }

    /**
     * Clean up on exit
     */
    dispose(): void {
        this.exitTUIMode();
    }
}

/**
 * Base class for TUI commands
 */
export abstract class TUICommand {
    name: string;
    description: string;

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    /**
     * Execute the command in TUI mode
     */
    abstract execute(args: string[], terminal: TerminalController): Promise<void> | void;
}
