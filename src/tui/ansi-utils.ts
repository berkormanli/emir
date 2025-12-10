// ANSI escape sequence utilities for terminal control

export class AnsiUtils {
    // Cursor control
    static moveCursor(x: number, y: number): string {
        return `\x1b[${y};${x}H`;
    }

    static moveCursorUp(lines: number = 1): string {
        return `\x1b[${lines}A`;
    }

    static moveCursorDown(lines: number = 1): string {
        return `\x1b[${lines}B`;
    }

    static moveCursorRight(columns: number = 1): string {
        return `\x1b[${columns}C`;
    }

    static moveCursorLeft(columns: number = 1): string {
        return `\x1b[${columns}D`;
    }

    static saveCursorPosition(): string {
        return '\x1b[s';
    }

    static restoreCursorPosition(): string {
        return '\x1b[u';
    }

    static hideCursor(): string {
        return '\x1b[?25l';
    }

    static showCursor(): string {
        return '\x1b[?25h';
    }

    // Screen control
    static clearScreen(): string {
        return '\x1b[2J';
    }

    static clearLine(): string {
        return '\x1b[2K';
    }

    static clearLineFromCursor(): string {
        return '\x1b[0K';
    }

    static clearLineToCursor(): string {
        return '\x1b[1K';
    }

    static clearScreenFromCursor(): string {
        return '\x1b[0J';
    }

    static clearScreenToCursor(): string {
        return '\x1b[1J';
    }

    // Alternate screen
    static enterAlternateScreen(): string {
        return '\x1b[?1049h';
    }

    static exitAlternateScreen(): string {
        return '\x1b[?1049l';
    }

    // Colors (16-color support)
    static setForegroundColor(color: number): string {
        if (typeof color !== 'number' || color < 0) {
            return '';
        }
        if (color <= 7) {
            return `\x1b[3${color}m`;
        } else if (color <= 15) {
            return `\x1b[9${color - 8}m`;
        }
        return '';
    }

    static setBackgroundColor(color: number): string {
        if (typeof color !== 'number' || color < 0) {
            return '';
        }
        if (color <= 7) {
            return `\x1b[4${color}m`;
        } else if (color <= 15) {
            return `\x1b[10${color - 8}m`;
        }
        return '';
    }

    // 256-color support
    static setForegroundColor256(color: number): string {
        if (typeof color !== 'number' || color < 0 || color > 255) {
            return '';
        }
        return `\x1b[38;5;${color}m`;
    }

    static setBackgroundColor256(color: number): string {
        if (typeof color !== 'number' || color < 0 || color > 255) {
            return '';
        }
        return `\x1b[48;5;${color}m`;
    }

    // RGB color support (24-bit)
    static setForegroundColorRGB(r: number, g: number, b: number): string {
        return `\x1b[38;2;${r};${g};${b}m`;
    }

    static setBackgroundColorRGB(r: number, g: number, b: number): string {
        return `\x1b[48;2;${r};${g};${b}m`;
    }

    // Text styling
    static reset(): string {
        return '\x1b[0m';
    }

    static bold(): string {
        return '\x1b[1m';
    }

    static dim(): string {
        return '\x1b[2m';
    }

    static italic(): string {
        return '\x1b[3m';
    }

    static underline(): string {
        return '\x1b[4m';
    }

    static blink(): string {
        return '\x1b[5m';
    }

    static reverse(): string {
        return '\x1b[7m';
    }

    static strikethrough(): string {
        return '\x1b[9m';
    }

    // Reset specific styles
    static resetBold(): string {
        return '\x1b[22m';
    }

    static resetItalic(): string {
        return '\x1b[23m';
    }

    static resetUnderline(): string {
        return '\x1b[24m';
    }

    static resetBlink(): string {
        return '\x1b[25m';
    }

    static resetReverse(): string {
        return '\x1b[27m';
    }

    static resetStrikethrough(): string {
        return '\x1b[29m';
    }

    // Utility methods
    static writeAt(x: number, y: number, text: string): string {
        return this.moveCursor(x, y) + text;
    }

    static colorText(text: string, foreground?: number, background?: number): string {
        let result = '';
        if (foreground !== undefined) {
            result += this.setForegroundColor(foreground);
        }
        if (background !== undefined) {
            result += this.setBackgroundColor(background);
        }
        result += text + this.reset();
        return result;
    }
}