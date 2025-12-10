import { describe, it, expect } from 'vitest';
import { AnsiUtils } from '../ansi-utils.js';

describe('AnsiUtils', () => {
    describe('Cursor control', () => {
        it('should generate correct cursor movement sequences', () => {
            expect(AnsiUtils.moveCursor(10, 5)).toBe('\x1b[5;10H');
            expect(AnsiUtils.moveCursor(1, 1)).toBe('\x1b[1;1H');
        });

        it('should generate correct directional cursor movements', () => {
            expect(AnsiUtils.moveCursorUp()).toBe('\x1b[1A');
            expect(AnsiUtils.moveCursorUp(3)).toBe('\x1b[3A');
            expect(AnsiUtils.moveCursorDown()).toBe('\x1b[1B');
            expect(AnsiUtils.moveCursorDown(2)).toBe('\x1b[2B');
            expect(AnsiUtils.moveCursorRight()).toBe('\x1b[1C');
            expect(AnsiUtils.moveCursorRight(5)).toBe('\x1b[5C');
            expect(AnsiUtils.moveCursorLeft()).toBe('\x1b[1D');
            expect(AnsiUtils.moveCursorLeft(4)).toBe('\x1b[4D');
        });

        it('should generate cursor save/restore sequences', () => {
            expect(AnsiUtils.saveCursorPosition()).toBe('\x1b[s');
            expect(AnsiUtils.restoreCursorPosition()).toBe('\x1b[u');
        });

        it('should generate cursor visibility sequences', () => {
            expect(AnsiUtils.hideCursor()).toBe('\x1b[?25l');
            expect(AnsiUtils.showCursor()).toBe('\x1b[?25h');
        });
    });

    describe('Screen control', () => {
        it('should generate screen clearing sequences', () => {
            expect(AnsiUtils.clearScreen()).toBe('\x1b[2J');
            expect(AnsiUtils.clearLine()).toBe('\x1b[2K');
            expect(AnsiUtils.clearLineFromCursor()).toBe('\x1b[0K');
            expect(AnsiUtils.clearLineToCursor()).toBe('\x1b[1K');
            expect(AnsiUtils.clearScreenFromCursor()).toBe('\x1b[0J');
            expect(AnsiUtils.clearScreenToCursor()).toBe('\x1b[1J');
        });

        it('should generate alternate screen sequences', () => {
            expect(AnsiUtils.enterAlternateScreen()).toBe('\x1b[?1049h');
            expect(AnsiUtils.exitAlternateScreen()).toBe('\x1b[?1049l');
        });
    });

    describe('Color control', () => {
        it('should generate 16-color foreground sequences', () => {
            expect(AnsiUtils.setForegroundColor(0)).toBe('\x1b[30m');
            expect(AnsiUtils.setForegroundColor(7)).toBe('\x1b[37m');
            expect(AnsiUtils.setForegroundColor(8)).toBe('\x1b[90m');
            expect(AnsiUtils.setForegroundColor(15)).toBe('\x1b[97m');
            expect(AnsiUtils.setForegroundColor(16)).toBe(''); // Invalid color
        });

        it('should generate 16-color background sequences', () => {
            expect(AnsiUtils.setBackgroundColor(0)).toBe('\x1b[40m');
            expect(AnsiUtils.setBackgroundColor(7)).toBe('\x1b[47m');
            expect(AnsiUtils.setBackgroundColor(8)).toBe('\x1b[100m');
            expect(AnsiUtils.setBackgroundColor(15)).toBe('\x1b[107m');
            expect(AnsiUtils.setBackgroundColor(16)).toBe(''); // Invalid color
        });

        it('should generate 256-color sequences', () => {
            expect(AnsiUtils.setForegroundColor256(0)).toBe('\x1b[38;5;0m');
            expect(AnsiUtils.setForegroundColor256(255)).toBe('\x1b[38;5;255m');
            expect(AnsiUtils.setForegroundColor256(256)).toBe(''); // Invalid color
            
            expect(AnsiUtils.setBackgroundColor256(0)).toBe('\x1b[48;5;0m');
            expect(AnsiUtils.setBackgroundColor256(255)).toBe('\x1b[48;5;255m');
            expect(AnsiUtils.setBackgroundColor256(256)).toBe(''); // Invalid color
        });

        it('should generate RGB color sequences', () => {
            expect(AnsiUtils.setForegroundColorRGB(255, 128, 0)).toBe('\x1b[38;2;255;128;0m');
            expect(AnsiUtils.setBackgroundColorRGB(0, 255, 128)).toBe('\x1b[48;2;0;255;128m');
        });
    });

    describe('Text styling', () => {
        it('should generate text style sequences', () => {
            expect(AnsiUtils.reset()).toBe('\x1b[0m');
            expect(AnsiUtils.bold()).toBe('\x1b[1m');
            expect(AnsiUtils.dim()).toBe('\x1b[2m');
            expect(AnsiUtils.italic()).toBe('\x1b[3m');
            expect(AnsiUtils.underline()).toBe('\x1b[4m');
            expect(AnsiUtils.blink()).toBe('\x1b[5m');
            expect(AnsiUtils.reverse()).toBe('\x1b[7m');
            expect(AnsiUtils.strikethrough()).toBe('\x1b[9m');
        });

        it('should generate style reset sequences', () => {
            expect(AnsiUtils.resetBold()).toBe('\x1b[22m');
            expect(AnsiUtils.resetItalic()).toBe('\x1b[23m');
            expect(AnsiUtils.resetUnderline()).toBe('\x1b[24m');
            expect(AnsiUtils.resetBlink()).toBe('\x1b[25m');
            expect(AnsiUtils.resetReverse()).toBe('\x1b[27m');
            expect(AnsiUtils.resetStrikethrough()).toBe('\x1b[29m');
        });
    });

    describe('Utility methods', () => {
        it('should combine cursor movement with text', () => {
            expect(AnsiUtils.writeAt(10, 5, 'Hello')).toBe('\x1b[5;10HHello');
        });

        it('should apply colors to text', () => {
            expect(AnsiUtils.colorText('Hello')).toBe('Hello\x1b[0m');
            expect(AnsiUtils.colorText('Hello', 1)).toBe('\x1b[31mHello\x1b[0m');
            expect(AnsiUtils.colorText('Hello', 1, 2)).toBe('\x1b[31m\x1b[42mHello\x1b[0m');
            expect(AnsiUtils.colorText('Hello', undefined, 2)).toBe('\x1b[42mHello\x1b[0m');
        });
    });
});