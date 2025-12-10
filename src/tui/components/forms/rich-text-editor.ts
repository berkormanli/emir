import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface TextFormat {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    color?: string;
    backgroundColor?: string;
}

export interface RichTextConfig {
    wordWrap?: boolean;
    lineNumbers?: boolean;
    syntaxHighlighting?: boolean;
    showCursor?: boolean;
    readOnly?: boolean;
    maxLength?: number;
    placeholder?: string;
    autoIndent?: boolean;
    tabSize?: number;
}

interface TextSpan {
    text: string;
    format: TextFormat;
}

interface Line {
    spans: TextSpan[];
    text: string;
}

export class RichTextEditor extends BaseComponent {
    private lines: Line[] = [{ spans: [{ text: '', format: {} }], text: '' }];
    private cursorLine = 0;
    private cursorColumn = 0;
    private selectionStart: { line: number; column: number } | null = null;
    private selectionEnd: { line: number; column: number } | null = null;
    private config: Required<RichTextConfig>;
    private theme: ThemeManager;
    private currentFormat: TextFormat = {};
    private scrollX = 0;
    private scrollY = 0;
    private history: Line[][] = [];
    private historyIndex = -1;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: RichTextConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            wordWrap: config.wordWrap ?? true,
            lineNumbers: config.lineNumbers ?? false,
            syntaxHighlighting: config.syntaxHighlighting ?? false,
            showCursor: config.showCursor ?? true,
            readOnly: config.readOnly ?? false,
            maxLength: config.maxLength ?? Infinity,
            placeholder: config.placeholder ?? '',
            autoIndent: config.autoIndent ?? false,
            tabSize: config.tabSize ?? 4
        };
        this.theme = ThemeManager.getInstance();
        this.saveState();
    }

    setText(text: string): void {
        this.lines = this.parseText(text);
        this.cursorLine = 0;
        this.cursorColumn = 0;
        this.clearSelection();
        this.saveState();
        this.markDirty();
    }

    getText(): string {
        return this.lines.map(line => line.spans.map(span => span.text).join('')).join('\n');
    }

    getSelectedText(): string {
        if (!this.hasSelection()) return '';

        const start = this.getSelectionStart();
        const end = this.getSelectionEnd();

        if (start.line === end.line) {
            const line = this.lines[start.line];
            return line.text.substring(start.column, end.column);
        }

        let text = this.lines[start.line].text.substring(start.column);
        for (let i = start.line + 1; i < end.line; i++) {
            text += '\n' + this.lines[i].text;
        }
        text += '\n' + this.lines[end.line].text.substring(0, end.column);

        return text;
    }

    insertText(text: string): void {
        if (this.config.readOnly) return;

        this.deleteSelection();

        const line = this.lines[this.cursorLine];
        const before = line.text.substring(0, this.cursorColumn);
        const after = line.text.substring(this.cursorColumn);

        const newSpans: TextSpan[] = [];

        if (before) {
            const beforeSpans = this.splitSpanAt(line.spans, this.cursorColumn);
            newSpans.push(...beforeSpans.before);
        }

        newSpans.push({ text, format: { ...this.currentFormat } });

        if (after) {
            const afterSpans = this.splitSpanAt(line.spans, this.cursorColumn);
            newSpans.push(...afterSpans.after);
        }

        this.lines[this.cursorLine] = {
            spans: this.mergeAdjacentSpans(newSpans),
            text: before + text + after
        };

        this.cursorColumn += text.length;
        this.saveState();
        this.markDirty();
    }

    setFormat(format: Partial<TextFormat>): void {
        this.currentFormat = { ...this.currentFormat, ...format };

        if (this.hasSelection()) {
            this.applyFormatToSelection(format);
        }
    }

    undo(): boolean {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.lines = this.history[this.historyIndex].map(line => ({
                ...line,
                spans: line.spans.map(span => ({ ...span, format: { ...span.format } }))
            }));
            this.clearSelection();
            this.markDirty();
            return true;
        }
        return false;
    }

    redo(): boolean {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.lines = this.history[this.historyIndex].map(line => ({
                ...line,
                spans: line.spans.map(span => ({ ...span, format: { ...span.format } }))
            }));
            this.clearSelection();
            this.markDirty();
            return true;
        }
        return false;
    }

    handleInput(input: InputEvent): boolean {
        if (this.config.readOnly) return false;

        if (input.type === 'key') {
            return this.handleKeyInput(input);
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleKeyInput(input: InputEvent): boolean {
        const isCtrl = input.ctrl || false;
        const isShift = input.shift || false;

        switch (input.key) {
            case 'enter':
            case 'Return':
                this.insertNewLine();
                return true;

            case 'tab':
                this.insertTab();
                return true;

            case 'backspace':
                if (isCtrl) {
                    this.deleteWord();
                } else {
                    this.deleteCharacter(-1);
                }
                return true;

            case 'delete':
                if (isCtrl) {
                    this.deleteWordForward();
                } else {
                    this.deleteCharacter(1);
                }
                return true;

            case 'left':
            case 'ArrowLeft':
                if (isCtrl) {
                    this.moveWord(-1);
                } else {
                    this.moveCursor(-1, isShift);
                }
                return true;

            case 'right':
            case 'ArrowRight':
                if (isCtrl) {
                    this.moveWord(1);
                } else {
                    this.moveCursor(1, isShift);
                }
                return true;

            case 'up':
            case 'ArrowUp':
                this.moveCursorVertical(-1, isShift);
                return true;

            case 'down':
            case 'ArrowDown':
                this.moveCursorVertical(1, isShift);
                return true;

            case 'home':
                this.moveToLineStart(isShift);
                return true;

            case 'end':
                this.moveToLineEnd(isShift);
                return true;

            case 'pageup':
                this.movePage(-1, isShift);
                return true;

            case 'pagedown':
                this.movePage(1, isShift);
                return true;

            case 'a':
                if (isCtrl) {
                    this.selectAll();
                    return true;
                }
                break;

            case 'c':
                if (isCtrl) {
                    this.copy();
                    return true;
                }
                break;

            case 'x':
                if (isCtrl) {
                    this.cut();
                    return true;
                }
                break;

            case 'v':
                if (isCtrl) {
                    this.paste();
                    return true;
                }
                break;

            case 'z':
                if (isCtrl) {
                    if (isShift) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    return true;
                }
                break;

            case 'y':
                if (isCtrl) {
                    this.redo();
                    return true;
                }
                break;

            default:
                if (input.key && input.key.length === 1) {
                    this.insertText(input.key);
                    return true;
                }
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const lineIndex = this.scrollY + y;
        const columnIndex = this.scrollX + x - (this.config.lineNumbers ? 4 : 0);

        if (lineIndex >= 0 && lineIndex < this.lines.length &&
            columnIndex >= 0 && columnIndex <= this.lines[lineIndex].text.length) {

            if (input.mouse.action === 'press') {
                this.cursorLine = lineIndex;
                this.cursorColumn = columnIndex;
                this.selectionStart = { line: lineIndex, column: columnIndex };
                this.selectionEnd = null;
                this.markDirty();
            } else if (input.mouse.action === 'move' && this.selectionStart) {
                this.cursorLine = lineIndex;
                this.cursorColumn = columnIndex;
                this.selectionEnd = { line: lineIndex, column: columnIndex };
                this.markDirty();
            }
        }

        return false;
    }

    private insertNewLine(): void {
        const line = this.lines[this.cursorLine];
        const before = line.text.substring(0, this.cursorColumn);
        const after = line.text.substring(this.cursorColumn);

        let indent = '';
        if (this.config.autoIndent) {
            const match = before.match(/^(\s*)/);
            if (match) {
                indent = match[1];
            }
        }

        const beforeSpans = this.splitSpanAt(line.spans, this.cursorColumn);
        const afterSpans = this.splitSpanAt(line.spans, this.cursorColumn);

        this.lines[this.cursorLine] = {
            spans: beforeSpans.before,
            text: before
        };

        const newLine: Line = {
            spans: indent ? [{ text: indent, format: {} }, ...afterSpans.after] : afterSpans.after,
            text: indent + after
        };

        this.lines.splice(this.cursorLine + 1, 0, newLine);
        this.cursorLine++;
        this.cursorColumn = indent.length;

        this.saveState();
        this.markDirty();
    }

    private insertTab(): void {
        const spaces = ' '.repeat(this.config.tabSize);
        this.insertText(spaces);
    }

    private deleteCharacter(direction: number): void {
        if (this.hasSelection()) {
            this.deleteSelection();
            return;
        }

        if (direction === -1) {
            if (this.cursorColumn === 0) {
                if (this.cursorLine === 0) return;

                const prevLine = this.lines[this.cursorLine - 1];
                const currentLine = this.lines[this.cursorLine];

                this.cursorColumn = prevLine.text.length;
                this.cursorLine--;

                this.lines[this.cursorLine] = {
                    spans: this.mergeAdjacentSpans([...prevLine.spans, ...currentLine.spans]),
                    text: prevLine.text + currentLine.text
                };

                this.lines.splice(this.cursorLine + 1, 1);
            } else {
                this.deleteAtPosition(this.cursorLine, this.cursorColumn - 1, 1);
                this.cursorColumn--;
            }
        } else {
            if (this.cursorColumn >= this.lines[this.cursorLine].text.length) {
                if (this.cursorLine >= this.lines.length - 1) return;

                const nextLine = this.lines[this.cursorLine + 1];
                const currentLine = this.lines[this.cursorLine];

                this.lines[this.cursorLine] = {
                    spans: this.mergeAdjacentSpans([...currentLine.spans, ...nextLine.spans]),
                    text: currentLine.text + nextLine.text
                };

                this.lines.splice(this.cursorLine + 1, 1);
            } else {
                this.deleteAtPosition(this.cursorLine, this.cursorColumn, 1);
            }
        }

        this.saveState();
        this.markDirty();
    }

    private deleteWord(): void {
        const line = this.lines[this.cursorLine];
        const text = line.text;
        let newColumn = this.cursorColumn;

        if (newColumn > 0 && /\s/.test(text[newColumn - 1])) {
            while (newColumn > 0 && /\s/.test(text[newColumn - 1])) {
                newColumn--;
            }
        }

        while (newColumn > 0 && !/\s/.test(text[newColumn - 1])) {
            newColumn--;
        }

        if (newColumn < this.cursorColumn) {
            this.deleteAtPosition(this.cursorLine, newColumn, this.cursorColumn - newColumn);
            this.cursorColumn = newColumn;
            this.saveState();
            this.markDirty();
        }
    }

    private deleteWordForward(): void {
        const line = this.lines[this.cursorLine];
        const text = line.text;
        let newColumn = this.cursorColumn;

        if (newColumn < text.length && /\s/.test(text[newColumn])) {
            while (newColumn < text.length && /\s/.test(text[newColumn])) {
                newColumn++;
            }
        }

        while (newColumn < text.length && !/\s/.test(text[newColumn])) {
            newColumn++;
        }

        if (newColumn > this.cursorColumn) {
            this.deleteAtPosition(this.cursorLine, this.cursorColumn, newColumn - this.cursorColumn);
            this.saveState();
            this.markDirty();
        }
    }

    private deleteSelection(): void {
        if (!this.hasSelection()) return;

        const start = this.getSelectionStart();
        const end = this.getSelectionEnd();

        if (start.line === end.line) {
            const line = this.lines[start.line];
            const newText = line.text.substring(0, start.column) + line.text.substring(end.column);
            const newSpans = this.deleteFromSpans(line.spans, start.column, end.column - start.column);
            this.lines[start.line] = { spans: newSpans, text: newText };
        } else {
            const firstLine = this.lines[start.line];
            const lastLine = this.lines[end.line];

            const newSpans = [
                ...this.deleteFromSpans(firstLine.spans, start.column, firstLine.text.length - start.column),
                ...this.deleteFromSpans(lastLine.spans, 0, end.column)
            ];

            const newText = firstLine.text.substring(0, start.column) + lastLine.text.substring(end.column);

            this.lines[start.line] = { spans: newSpans, text: newText };
            this.lines.splice(start.line + 1, end.line - start.line);
        }

        this.cursorLine = start.line;
        this.cursorColumn = start.column;
        this.clearSelection();
        this.saveState();
        this.markDirty();
    }

    private moveCursor(direction: number, shift: boolean): void {
        if (direction < 0 && this.cursorColumn > 0) {
            this.cursorColumn--;
        } else if (direction > 0 && this.cursorColumn < this.lines[this.cursorLine].text.length) {
            this.cursorColumn++;
        } else if (direction < 0 && this.cursorLine > 0) {
            this.cursorLine--;
            this.cursorColumn = this.lines[this.cursorLine].text.length;
        } else if (direction > 0 && this.cursorLine < this.lines.length - 1) {
            this.cursorLine++;
            this.cursorColumn = 0;
        }

        if (shift) {
            this.extendSelection();
        } else {
            this.clearSelection();
        }

        this.markDirty();
    }

    private moveCursorVertical(direction: number, shift: boolean): void {
        const newLine = Math.max(0, Math.min(this.lines.length - 1, this.cursorLine + direction));
        const targetColumn = Math.min(this.cursorColumn, this.lines[newLine].text.length);

        this.cursorLine = newLine;
        this.cursorColumn = targetColumn;

        if (shift) {
            this.extendSelection();
        } else {
            this.clearSelection();
        }

        this.markDirty();
    }

    private moveWord(direction: number): void {
        const text = this.lines[this.cursorLine].text;
        let newColumn = this.cursorColumn;

        if (direction < 0) {
            if (newColumn > 0) {
                newColumn--;
                while (newColumn > 0 && /\s/.test(text[newColumn])) {
                    newColumn--;
                }
                while (newColumn > 0 && !/\s/.test(text[newColumn])) {
                    newColumn--;
                }
                if (newColumn < text.length && !/\s/.test(text[newColumn])) {
                    newColumn++;
                }
            }
        } else {
            if (newColumn < text.length) {
                while (newColumn < text.length && !/\s/.test(text[newColumn])) {
                    newColumn++;
                }
                while (newColumn < text.length && /\s/.test(text[newColumn])) {
                    newColumn++;
                }
            }
        }

        this.cursorColumn = newColumn;
        this.clearSelection();
        this.markDirty();
    }

    private moveToLineStart(shift: boolean): void {
        this.cursorColumn = 0;
        if (shift) {
            this.extendSelection();
        } else {
            this.clearSelection();
        }
        this.markDirty();
    }

    private moveToLineEnd(shift: boolean): void {
        this.cursorColumn = this.lines[this.cursorLine].text.length;
        if (shift) {
            this.extendSelection();
        } else {
            this.clearSelection();
        }
        this.markDirty();
    }

    private movePage(direction: number, shift: boolean): void {
        this.moveCursorVertical(direction * (this.size.height - 2), shift);
    }

    private selectAll(): void {
        this.selectionStart = { line: 0, column: 0 };
        this.selectionEnd = { line: this.lines.length - 1, column: this.lines[this.lines.length - 1].text.length };
        this.cursorLine = this.selectionEnd.line;
        this.cursorColumn = this.selectionEnd.column;
        this.markDirty();
    }

    private copy(): void {
        if (this.hasSelection()) {
            // In a real implementation, this would copy to system clipboard
            // For now, we just have the method placeholder
        }
    }

    private cut(): void {
        if (this.hasSelection()) {
            this.copy();
            this.deleteSelection();
        }
    }

    private paste(): void {
        // In a real implementation, this would paste from system clipboard
        // For now, we just have the method placeholder
        this.insertText(''); // Placeholder
    }

    private hasSelection(): boolean {
        return this.selectionStart !== null && this.selectionEnd !== null;
    }

    private getSelectionStart(): { line: number; column: number } {
        if (!this.selectionStart || !this.selectionEnd) {
            return { line: this.cursorLine, column: this.cursorColumn };
        }

        if (this.selectionStart.line < this.selectionEnd.line ||
            (this.selectionStart.line === this.selectionEnd.line && this.selectionStart.column <= this.selectionEnd.column)) {
            return this.selectionStart;
        } else {
            return this.selectionEnd;
        }
    }

    private getSelectionEnd(): { line: number; column: number } {
        if (!this.selectionStart || !this.selectionEnd) {
            return { line: this.cursorLine, column: this.cursorColumn };
        }

        if (this.selectionStart.line > this.selectionEnd.line ||
            (this.selectionStart.line === this.selectionEnd.line && this.selectionStart.column > this.selectionEnd.column)) {
            return this.selectionStart;
        } else {
            return this.selectionEnd;
        }
    }

    private clearSelection(): void {
        this.selectionStart = null;
        this.selectionEnd = null;
    }

    private extendSelection(): void {
        if (!this.selectionStart) {
            this.selectionStart = { line: this.cursorLine, column: this.cursorColumn };
        }
        this.selectionEnd = { line: this.cursorLine, column: this.cursorColumn };
    }

    private parseText(text: string): Line[] {
        const lines = text.split('\n');
        return lines.map(line => ({
            text: line,
            spans: [{ text: line, format: {} }]
        }));
    }

    private splitSpanAt(spans: TextSpan[], position: number): { before: TextSpan[]; after: TextSpan[] } {
        const before: TextSpan[] = [];
        const after: TextSpan[] = [];
        let currentPos = 0;

        for (const span of spans) {
            if (currentPos + span.text.length <= position) {
                before.push(span);
            } else if (currentPos >= position) {
                after.push(span);
            } else {
                const beforeText = span.text.substring(0, position - currentPos);
                const afterText = span.text.substring(position - currentPos);
                before.push({ text: beforeText, format: { ...span.format } });
                after.push({ text: afterText, format: { ...span.format } });
            }
            currentPos += span.text.length;
        }

        return { before, after };
    }

    private mergeAdjacentSpans(spans: TextSpan[]): TextSpan[] {
        if (spans.length === 0) return [];

        const merged: TextSpan[] = [spans[0]];

        for (let i = 1; i < spans.length; i++) {
            const last = merged[merged.length - 1];
            const current = spans[i];

            if (JSON.stringify(last.format) === JSON.stringify(current.format)) {
                last.text += current.text;
            } else {
                merged.push(current);
            }
        }

        return merged;
    }

    private deleteFromSpans(spans: TextSpan[], position: number, length: number): TextSpan[] {
        const result: TextSpan[] = [];
        let currentPos = 0;

        for (const span of spans) {
            const spanEnd = currentPos + span.text.length;

            if (spanEnd <= position || currentPos >= position + length) {
                result.push(span);
            } else {
                const beforeLength = Math.max(0, position - currentPos);
                const afterStart = Math.min(span.text.length, position + length - currentPos);

                if (beforeLength > 0) {
                    result.push({
                        text: span.text.substring(0, beforeLength),
                        format: { ...span.format }
                    });
                }

                if (afterStart < span.text.length) {
                    result.push({
                        text: span.text.substring(afterStart),
                        format: { ...span.format }
                    });
                }
            }

            currentPos = spanEnd;
        }

        return this.mergeAdjacentSpans(result);
    }

    private deleteAtPosition(line: number, column: number, length: number): void {
        const currentLine = this.lines[line];
        const newSpans = this.deleteFromSpans(currentLine.spans, column, length);
        const newText = currentLine.text.substring(0, column) +
                       currentLine.text.substring(column + length);

        this.lines[line] = { spans: newSpans, text: newText };
    }

    private applyFormatToSelection(format: Partial<TextFormat>): void {
        if (!this.hasSelection()) return;

        const start = this.getSelectionStart();
        const end = this.getSelectionEnd();

        if (start.line === end.line) {
            const line = this.lines[start.line];
            const newSpans = this.applyFormatToSpans(line.spans, start.column, end.column - start.column, format);
            this.lines[start.line] = { ...line, spans: newSpans };
        } else {
            for (let i = start.line; i <= end.line; i++) {
                const line = this.lines[i];
                let startCol = i === start.line ? start.column : 0;
                let endCol = i === end.line ? end.column : line.text.length;
                const newSpans = this.applyFormatToSpans(line.spans, startCol, endCol - startCol, format);
                this.lines[i] = { ...line, spans: newSpans };
            }
        }

        this.saveState();
        this.markDirty();
    }

    private applyFormatToSpans(spans: TextSpan[], position: number, length: number, format: Partial<TextFormat>): TextSpan[] {
        const result: TextSpan[] = [];
        let currentPos = 0;

        for (const span of spans) {
            const spanEnd = currentPos + span.text.length;

            if (spanEnd <= position || currentPos >= position + length) {
                result.push(span);
            } else {
                const beforeLength = Math.max(0, position - currentPos);
                const afterStart = Math.min(span.text.length, position + length - currentPos);

                if (beforeLength > 0) {
                    result.push({
                        text: span.text.substring(0, beforeLength),
                        format: { ...span.format }
                    });
                }

                const formatLength = Math.min(span.text.length - beforeLength, length);
                if (formatLength > 0) {
                    result.push({
                        text: span.text.substring(beforeLength, beforeLength + formatLength),
                        format: { ...span.format, ...format }
                    });
                }

                if (afterStart < span.text.length) {
                    result.push({
                        text: span.text.substring(afterStart),
                        format: { ...span.format }
                    });
                }
            }

            currentPos = spanEnd;
        }

        return this.mergeAdjacentSpans(result);
    }

    private saveState(): void {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(this.lines.map(line => ({
            ...line,
            spans: line.spans.map(span => ({ text: span.text, format: { ...span.format } }))
        })));
        this.historyIndex++;

        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const startLine = Math.max(0, this.scrollY);
        const endLine = Math.min(this.lines.length - 1, this.scrollY + this.size.height - 1);

        for (let i = startLine; i <= endLine; i++) {
            let lineText = '';

            if (this.config.lineNumbers) {
                const lineNumber = String(i + 1).padStart(3, ' ');
                lineText += this.theme.applyColor(lineNumber + ' │ ', 'textDisabled');
            }

            const line = this.lines[i];
            if (line.text.length === 0 && i === 0 && this.config.placeholder) {
                lineText += this.theme.applyColor(this.config.placeholder, 'muted');
            } else {
                const renderedLine = this.renderLineWithSelection(line, i);
                lineText += renderedLine;
            }

            if (this.config.showCursor && i === this.cursorLine && this.state.focused) {
                const cursorPos = this.cursorColumn - this.scrollX;
                if (cursorPos >= 0 && cursorPos < this.size.width - (this.config.lineNumbers ? 4 : 0)) {
                    lineText = lineText.slice(0, cursorPos + (this.config.lineNumbers ? 4 : 0)) +
                              this.theme.applyColor('█', 'primary') +
                              lineText.slice(cursorPos + (this.config.lineNumbers ? 4 : 0) + 1);
                }
            }

            lines.push(lineText);
        }

        while (lines.length < this.size.height) {
            if (this.config.lineNumbers) {
                lines.push('   │ ');
            } else {
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    private renderLineWithSelection(line: Line, lineIndex: number): string {
        const theme = this.theme.getCurrentTheme();
        let result = '';

        if (!this.hasSelection()) {
            for (const span of line.spans) {
                let text = span.text;
                if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                result += text;
            }
        } else {
            const start = this.getSelectionStart();
            const end = this.getSelectionEnd();

            if (lineIndex < start.line || lineIndex > end.line) {
                for (const span of line.spans) {
                    let text = span.text;
                    if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                    if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                    if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                    if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                    result += text;
                }
            } else {
                let selStart = lineIndex === start.line ? start.column : 0;
                let selEnd = lineIndex === end.line ? end.column : line.text.length;

                let currentPos = 0;
                for (const span of line.spans) {
                    const spanEnd = currentPos + span.text.length;

                    if (spanEnd <= selStart || currentPos >= selEnd) {
                        let text = span.text;
                        if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                        if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                        if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                        if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                        result += text;
                    } else {
                        const beforeText = span.text.substring(0, Math.max(0, selStart - currentPos));
                        const selectedText = span.text.substring(
                            Math.max(0, selStart - currentPos),
                            Math.min(span.text.length, selEnd - currentPos)
                        );
                        const afterText = span.text.substring(Math.min(span.text.length, selEnd - currentPos));

                        if (beforeText) {
                            let text = beforeText;
                            if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                            if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                            if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                            if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                            result += text;
                        }

                        if (selectedText) {
                            let text = selectedText;
                            if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                            if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                            if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                            if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                            result += this.theme.applyColor(text, 'selection');
                        }

                        if (afterText) {
                            let text = afterText;
                            if (span.format.bold) text = this.theme.applyTypography(text, 'button');
                            if (span.format.italic) text = this.theme.applyTypography(text, 'heading');
                            if (span.format.underline) text = this.theme.applyTypography(text, 'label');
                            if (span.format.strikethrough) text = this.theme.applyTypography(text, 'error');
                            result += text;
                        }
                    }

                    currentPos = spanEnd;
                }
            }
        }

        return result;
    }
}