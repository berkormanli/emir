import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size, Component } from '../../types';
import { ThemeManager } from '../../theme';

export interface SplitPaneConfig {
    orientation?: 'horizontal' | 'vertical';
    splitRatio?: number;
    minSize?: number;
    maxSize?: number;
    resizable?: boolean;
    collapsible?: boolean;
    showHandles?: boolean;
    animationDuration?: number;
}

export class SplitPane extends BaseComponent {
    private firstPane: Component | null = null;
    private secondPane: Component | null = null;
    private config: Required<SplitPaneConfig>;
    private theme: ThemeManager;
    private splitRatio = 0.5;
    private isResizing = false;
    private resizeStartPos = 0;
    private resizeStartRatio = 0.5;
    private firstPaneCollapsed = false;
    private secondPaneCollapsed = false;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: SplitPaneConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            orientation: config.orientation ?? 'vertical',
            splitRatio: config.splitRatio ?? 0.5,
            minSize: config.minSize ?? 0.1,
            maxSize: config.maxSize ?? 0.9,
            resizable: config.resizable ?? true,
            collapsible: config.collapsible ?? true,
            showHandles: config.showHandles ?? true,
            animationDuration: config.animationDuration ?? 200
        };
        this.theme = ThemeManager.getInstance();
        this.splitRatio = Math.max(this.config.minSize, Math.min(this.config.maxSize, this.config.splitRatio));
    }

    setFirstPane(pane: Component): void {
        this.firstPane = pane;
        this.updatePaneSizes();
        this.markDirty();
    }

    setSecondPane(pane: Component): void {
        this.secondPane = pane;
        this.updatePaneSizes();
        this.markDirty();
    }

    setSplitRatio(ratio: number): void {
        this.splitRatio = Math.max(this.config.minSize, Math.min(this.config.maxSize, ratio));
        this.updatePaneSizes();
        this.markDirty();
    }

    getSplitRatio(): number {
        return this.splitRatio;
    }

    toggleFirstPane(): void {
        if (!this.config.collapsible) return;

        this.firstPaneCollapsed = !this.firstPaneCollapsed;
        if (this.firstPaneCollapsed) {
            this.secondPaneCollapsed = false;
        }
        this.updatePaneSizes();
        this.markDirty();
    }

    toggleSecondPane(): void {
        if (!this.config.collapsible) return;

        this.secondPaneCollapsed = !this.secondPaneCollapsed;
        if (this.secondPaneCollapsed) {
            this.firstPaneCollapsed = false;
        }
        this.updatePaneSizes();
        this.markDirty();
    }

    swapPanes(): void {
        const temp = this.firstPane;
        this.firstPane = this.secondPane;
        this.secondPane = temp;
        this.splitRatio = 1 - this.splitRatio;
        this.updatePaneSizes();
        this.markDirty();
    }

    private updatePaneSizes(): void {
        if (!this.firstPane || !this.secondPane) return;

        if (this.config.orientation === 'vertical') {
            const firstWidth = this.firstPaneCollapsed ? 0 :
                             this.secondPaneCollapsed ? this.size.width :
                             Math.floor(this.size.width * this.splitRatio);
            const secondWidth = this.size.width - firstWidth;

            this.firstPane.setSize({
                width: Math.max(1, firstWidth),
                height: this.size.height
            });

            this.secondPane.setSize({
                width: Math.max(1, secondWidth),
                height: this.size.height
            });

            this.secondPane.setPosition({
                x: this.position.x + firstWidth,
                y: this.position.y
            });
        } else {
            const firstHeight = this.firstPaneCollapsed ? 0 :
                              this.secondPaneCollapsed ? this.size.height :
                              Math.floor(this.size.height * this.splitRatio);
            const secondHeight = this.size.height - firstHeight;

            this.firstPane.setSize({
                width: this.size.width,
                height: Math.max(1, firstHeight)
            });

            this.secondPane.setSize({
                width: this.size.width,
                height: Math.max(1, secondHeight)
            });

            this.secondPane.setPosition({
                x: this.position.x,
                y: this.position.y + firstHeight
            });
        }
    }

    handleInput(input: InputEvent): boolean {
        if (this.isResizing) {
            return this.handleResize(input);
        }

        const firstHandled = this.firstPane?.handleInput(input) ?? false;
        const secondHandled = this.secondPane?.handleInput(input) ?? false;

        if (!firstHandled && !secondHandled) {
            return this.handleSplitPaneInput(input);
        }

        return firstHandled || secondHandled;
    }

    private handleSplitPaneInput(input: InputEvent): boolean {
        if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        if (input.type === 'key' && input.ctrl) {
            switch (input.key) {
                case '1':
                    this.toggleFirstPane();
                    return true;

                case '2':
                    this.toggleSecondPane();
                    return true;

                case 's':
                    this.swapPanes();
                    return true;

                case 'left':
                    if (this.config.orientation === 'vertical') {
                        this.adjustSplitRatio(-0.05);
                        return true;
                    }
                    break;

                case 'right':
                    if (this.config.orientation === 'vertical') {
                        this.adjustSplitRatio(0.05);
                        return true;
                    }
                    break;

                case 'up':
                    if (this.config.orientation === 'horizontal') {
                        this.adjustSplitRatio(-0.05);
                        return true;
                    }
                    break;

                case 'down':
                    if (this.config.orientation === 'horizontal') {
                        this.adjustSplitRatio(0.05);
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse || !this.config.resizable) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const isOnHandle = this.isMouseOnHandle(x, y);

        if (isOnHandle) {
            if (input.mouse.action === 'press') {
                this.isResizing = true;
                this.resizeStartPos = this.config.orientation === 'vertical' ? x : y;
                this.resizeStartRatio = this.splitRatio;
                return true;
            }
        }

        if (this.isResizing && input.mouse.action === 'release') {
            this.isResizing = false;
            return true;
        }

        return false;
    }

    private handleResize(input: InputEvent): boolean {
        if (!input.mouse) return false;

        if (input.mouse.action === 'move') {
            const currentPos = this.config.orientation === 'vertical' ? input.mouse.x : input.mouse.y;
            const delta = currentPos - this.resizeStartPos;
            const totalSize = this.config.orientation === 'vertical' ? this.size.width : this.size.height;
            const ratioDelta = delta / totalSize;
            this.setSplitRatio(this.resizeStartRatio + ratioDelta);
            return true;
        }

        return false;
    }

    private isMouseOnHandle(x: number, y: number): boolean {
        if (!this.config.showHandles) return false;

        if (this.config.orientation === 'vertical') {
            const handleX = Math.floor(this.size.width * this.splitRatio);
            return x >= handleX - 1 && x <= handleX + 1;
        } else {
            const handleY = Math.floor(this.size.height * this.splitRatio);
            return y >= handleY - 1 && y <= handleY + 1;
        }
    }

    private adjustSplitRatio(delta: number): void {
        this.setSplitRatio(this.splitRatio + delta);
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.config.orientation === 'vertical') {
            return this.renderVerticalSplit();
        } else {
            return this.renderHorizontalSplit();
        }
    }

    private renderVerticalSplit(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const firstWidth = this.firstPaneCollapsed ? 0 :
                         this.secondPaneCollapsed ? this.size.width :
                         Math.floor(this.size.width * this.splitRatio);
        const handleX = firstWidth;

        const firstRender = this.firstPane ? this.firstPane.render().split('\n') : [];
        const secondRender = this.secondPane ? this.secondPane.render().split('\n') : [];

        const maxLines = Math.max(
            firstRender.length,
            secondRender.length,
            this.size.height
        );

        for (let y = 0; y < maxLines; y++) {
            let line = '';

            if (this.firstPane && !this.firstPaneCollapsed) {
                const firstLine = firstRender[y] ?? '';
                line += firstLine.padEnd(firstWidth);
            }

            if (this.config.showHandles && !this.firstPaneCollapsed && !this.secondPaneCollapsed) {
                const handleChar = this.isResizing ? '║' : '│';
                line += theme.applyColor(handleChar, 'border');
            }

            if (this.secondPane && !this.secondPaneCollapsed) {
                const secondLine = secondRender[y] ?? '';
                const secondStart = this.firstPaneCollapsed ? 0 : firstWidth + (this.config.showHandles ? 1 : 0);
                const secondWidth = this.size.width - secondStart;

                if (secondLine.length < secondWidth) {
                    line += secondLine.padEnd(secondWidth);
                } else {
                    line += secondLine.substring(0, secondWidth);
                }
            }

            lines.push(line);
        }

        while (lines.length < this.size.height) {
            lines.push(''.padEnd(this.size.width));
        }

        return lines.join('\n');
    }

    private renderHorizontalSplit(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const firstHeight = this.firstPaneCollapsed ? 0 :
                          this.secondPaneCollapsed ? this.size.height :
                          Math.floor(this.size.height * this.splitRatio);

        const firstRender = this.firstPane ? this.firstPane.render().split('\n') : [];
        const secondRender = this.secondPane ? this.secondPane.render().split('\n') : [];

        for (let y = 0; y < this.size.height; y++) {
            if (y < firstHeight && this.firstPane && !this.firstPaneCollapsed) {
                const line = firstRender[y] ?? '';
                lines.push(line.padEnd(this.size.width));
            } else if (y === firstHeight && this.config.showHandles && !this.firstPaneCollapsed && !this.secondPaneCollapsed) {
                const handleChar = this.isResizing ? '═' : '─';
                const handleLine = theme.applyColor(handleChar.repeat(this.size.width), 'border');
                lines.push(handleLine);
            } else if (y > firstHeight && this.secondPane && !this.secondPaneCollapsed) {
                const secondY = y - firstHeight - (this.config.showHandles ? 1 : 0);
                const line = secondRender[secondY] ?? '';
                lines.push(line.padEnd(this.size.width));
            } else {
                lines.push(''.padEnd(this.size.width));
            }
        }

        return lines.join('\n');
    }
}