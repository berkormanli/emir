import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size, Component } from '../../types';
import { ThemeManager } from '../../theme';

export interface DashboardWidget {
    id: string;
    component: Component;
    x: number;
    y: number;
    width: number;
    height: number;
    title?: string;
    resizable?: boolean;
    movable?: boolean;
    collapsible?: boolean;
    minimized?: boolean;
}

export interface GridConfig {
    columns: number;
    rows: number;
    cellWidth?: number;
    cellHeight?: number;
    showGrid?: boolean;
    snapToGrid?: boolean;
    allowOverlap?: boolean;
    showBorders?: boolean;
    backgroundColor?: string;
}

export class DashboardGrid extends BaseComponent {
    private widgets: Map<string, DashboardWidget> = new Map();
    private config: Required<GridConfig>;
    private theme: ThemeManager;
    private selectedWidget: string | null = null;
    private draggedWidget: string | null = null;
    private dragOffset = { x: 0, y: 0 };
    private resizingWidget: string | null = null;
    private resizeHandle = '';

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: GridConfig
    ) {
        super(id, position, size);
        this.config = {
            columns: config.columns,
            rows: config.rows,
            cellWidth: config.cellWidth ?? Math.floor(size.width / config.columns),
            cellHeight: config.cellHeight ?? Math.floor(size.height / config.rows),
            showGrid: config.showGrid ?? true,
            snapToGrid: config.snapToGrid ?? true,
            allowOverlap: config.allowOverlap ?? false,
            showBorders: config.showBorders ?? true,
            backgroundColor: config.backgroundColor ?? 'background'
        };
        this.theme = ThemeManager.getInstance();
    }

    addWidget(widget: DashboardWidget): boolean {
        if (this.widgets.has(widget.id)) return false;

        if (!this.config.allowOverlap && this.hasOverlap(widget)) {
            return false;
        }

        this.widgets.set(widget.id, widget);
        this.updateWidgetPosition(widget);
        this.markDirty();
        return true;
    }

    removeWidget(widgetId: string): boolean {
        const widget = this.widgets.get(widgetId);
        if (!widget) return false;

        widget.component.destroy();
        this.widgets.delete(widgetId);
        if (this.selectedWidget === widgetId) {
            this.selectedWidget = null;
        }
        this.markDirty();
        return true;
    }

    moveWidget(widgetId: string, x: number, y: number): boolean {
        const widget = this.widgets.get(widgetId);
        if (!widget || !widget.movable) return false;

        const newX = Math.max(0, Math.min(this.config.columns - widget.width, x));
        const newY = Math.max(0, Math.min(this.config.rows - widget.height, y));

        widget.x = newX;
        widget.y = newY;

        if (!this.config.allowOverlap && this.hasOverlap(widget)) {
            return false;
        }

        this.updateWidgetPosition(widget);
        this.markDirty();
        return true;
    }

    resizeWidget(widgetId: string, width: number, height: number): boolean {
        const widget = this.widgets.get(widgetId);
        if (!widget || !widget.resizable) return false;

        const newWidth = Math.max(1, Math.min(this.config.columns - widget.x, width));
        const newHeight = Math.max(1, Math.min(this.config.rows - widget.y, height));

        widget.width = newWidth;
        widget.height = newHeight;

        if (!this.config.allowOverlap && this.hasOverlap(widget)) {
            return false;
        }

        this.updateWidgetSize(widget);
        this.markDirty();
        return true;
    }

    toggleWidgetCollapse(widgetId: string): boolean {
        const widget = this.widgets.get(widgetId);
        if (!widget || !widget.collapsible) return false;

        widget.minimized = !widget.minimized;
        this.updateWidgetSize(widget);
        this.markDirty();
        return true;
    }

    selectWidget(widgetId: string): void {
        this.selectedWidget = widgetId;
        this.markDirty();
    }

    getWidget(widgetId: string): DashboardWidget | undefined {
        return this.widgets.get(widgetId);
    }

    getAllWidgets(): readonly DashboardWidget[] {
        return Array.from(this.widgets.values());
    }

    arrangeWidgets(): void {
        const widgetArray = Array.from(this.widgets.values());
        widgetArray.sort((a, b) => (a.y * this.config.columns + a.x) - (b.y * this.config.columns + b.x));

        let x = 0;
        let y = 0;
        let rowHeight = 0;

        for (const widget of widgetArray) {
            if (x + widget.width > this.config.columns) {
                x = 0;
                y += rowHeight;
                rowHeight = 0;
            }

            widget.x = x;
            widget.y = y;
            this.updateWidgetPosition(widget);

            x += widget.width;
            rowHeight = Math.max(rowHeight, widget.height);
        }

        this.markDirty();
    }

    private hasOverlap(widget: DashboardWidget): boolean {
        for (const [id, other] of this.widgets) {
            if (id === widget.id) continue;

            if (widget.x < other.x + other.width &&
                widget.x + widget.width > other.x &&
                widget.y < other.y + other.height &&
                widget.y + widget.height > other.y) {
                return true;
            }
        }
        return false;
    }

    private updateWidgetPosition(widget: DashboardWidget): void {
        const x = this.position.x + widget.x * this.config.cellWidth;
        const y = this.position.y + widget.y * this.config.cellHeight;
        widget.component.setPosition({ x, y });
    }

    private updateWidgetSize(widget: DashboardWidget): void {
        const width = widget.width * this.config.cellWidth;
        const height = widget.minimized ? 1 : widget.height * this.config.cellHeight;
        widget.component.setSize({ width, height });
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        if (input.type === 'key') {
            return this.handleKeyInput(input);
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const clickedWidget = this.getWidgetAtPosition(x, y);
        const handle = this.getResizeHandle(clickedWidget, x, y);

        if (input.mouse.action === 'press') {
            if (handle) {
                this.resizingWidget = clickedWidget?.id ?? null;
                this.resizeHandle = handle;
                this.dragOffset = { x, y };
                return true;
            } else if (clickedWidget) {
                if (clickedWidget.movable) {
                    this.draggedWidget = clickedWidget.id;
                    this.dragOffset = {
                        x: x - clickedWidget.x * this.config.cellWidth,
                        y: y - clickedWidget.y * this.config.cellHeight
                    };
                }
                this.selectWidget(clickedWidget.id);
                return true;
            } else {
                this.selectedWidget = null;
                this.markDirty();
            }
        } else if (input.mouse.action === 'release') {
            if (this.draggedWidget) {
                this.draggedWidget = null;
                return true;
            }
            if (this.resizingWidget) {
                this.resizingWidget = null;
                this.resizeHandle = '';
                return true;
            }
        } else if (input.mouse.action === 'move') {
            if (this.draggedWidget) {
                const widget = this.widgets.get(this.draggedWidget);
                if (widget) {
                    const newX = Math.round((x - this.dragOffset.x) / this.config.cellWidth);
                    const newY = Math.round((y - this.dragOffset.y) / this.config.cellHeight);
                    this.moveWidget(this.draggedWidget, newX, newY);
                }
                return true;
            }
            if (this.resizingWidget) {
                const widget = this.widgets.get(this.resizingWidget);
                if (widget) {
                    this.handleResize(widget, x, y);
                }
                return true;
            }
        }

        return false;
    }

    private handleKeyInput(input: InputEvent): boolean {
        if (!this.selectedWidget) return false;

        const widget = this.widgets.get(this.selectedWidget);
        if (!widget) return false;

        switch (input.key) {
            case 'arrowleft':
                if (input.ctrl) {
                    this.moveWidget(this.selectedWidget, widget.x - 1, widget.y);
                    return true;
                }
                break;
            case 'arrowright':
                if (input.ctrl) {
                    this.moveWidget(this.selectedWidget, widget.x + 1, widget.y);
                    return true;
                }
                break;
            case 'arrowup':
                if (input.ctrl) {
                    this.moveWidget(this.selectedWidget, widget.x, widget.y - 1);
                    return true;
                }
                break;
            case 'arrowdown':
                if (input.ctrl) {
                    this.moveWidget(this.selectedWidget, widget.x, widget.y + 1);
                    return true;
                }
                break;
            case '+':
            case '=':
                if (input.ctrl) {
                    this.resizeWidget(this.selectedWidget, widget.width + 1, widget.height);
                    return true;
                }
                break;
            case '-':
                if (input.ctrl) {
                    this.resizeWidget(this.selectedWidget, widget.width - 1, widget.height);
                    return true;
                }
                break;
            case 'delete':
                this.removeWidget(this.selectedWidget);
                return true;
            case 'm':
                if (input.ctrl) {
                    this.toggleWidgetCollapse(this.selectedWidget);
                    return true;
                }
                break;
        }

        return widget.component.handleInput(input);
    }

    private getWidgetAtPosition(x: number, y: number): DashboardWidget | undefined {
        const gridX = Math.floor(x / this.config.cellWidth);
        const gridY = Math.floor(y / this.config.cellHeight);

        for (const widget of this.widgets.values()) {
            if (gridX >= widget.x && gridX < widget.x + widget.width &&
                gridY >= widget.y && gridY < widget.y + widget.height) {
                return widget;
            }
        }

        return undefined;
    }

    private getResizeHandle(widget: DashboardWidget | undefined, x: number, y: number): string {
        if (!widget || !widget.resizable) return '';

        const widgetX = widget.x * this.config.cellWidth;
        const widgetY = widget.y * this.config.cellHeight;
        const widgetWidth = widget.width * this.config.cellWidth;
        const widgetHeight = widget.minimized ? this.config.cellHeight : widget.height * this.config.cellHeight;

        const threshold = 2;

        if (y >= widgetY + widgetHeight - threshold && y < widgetY + widgetHeight) {
            if (x >= widgetX + widgetWidth - threshold && x < widgetX + widgetWidth) {
                return 'se';
            } else if (x >= widgetX && x < widgetX + threshold) {
                return 'sw';
            }
        }

        if (x >= widgetX + widgetWidth - threshold && x < widgetX + widgetWidth) {
            if (y >= widgetY && y < widgetY + threshold) {
                return 'ne';
            }
        }

        return '';
    }

    private handleResize(widget: DashboardWidget, x: number, y: number): void {
        const startX = widget.x * this.config.cellWidth;
        const startY = widget.y * this.config.cellHeight;
        const deltaX = x - this.dragOffset.x;
        const deltaY = y - this.dragOffset.y;

        let newWidth = widget.width;
        let newHeight = widget.height;
        let newX = widget.x;
        let newY = widget.y;

        switch (this.resizeHandle) {
            case 'se':
                newWidth = Math.ceil(deltaX / this.config.cellWidth);
                newHeight = Math.ceil(deltaY / this.config.cellHeight);
                break;
            case 'sw':
                newWidth = Math.ceil((startX + widget.width * this.config.cellWidth - x) / this.config.cellWidth);
                newX = widget.x + widget.width - newWidth;
                break;
            case 'ne':
                newHeight = Math.ceil((startY + widget.height * this.config.cellHeight - y) / this.config.cellHeight);
                newY = widget.y + widget.height - newHeight;
                break;
        }

        this.resizeWidget(widget.id, newWidth, newHeight);
        if (newX !== widget.x || newY !== widget.y) {
            this.moveWidget(widget.id, newX, newY);
        }
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const renderArray: Array<{ widget: DashboardWidget; y: number; line: string }> = [];

        for (const widget of this.widgets.values()) {
            const widgetRender = widget.component.render().split('\n');
            const startY = widget.y * this.config.cellHeight;
            const startX = widget.x * this.config.cellWidth;
            const endX = startX + widget.width * this.config.cellWidth;

            for (let i = 0; i < widgetRender.length && i < widget.height * this.config.cellHeight; i++) {
                const line = widgetRender[i] ?? '';
                const paddedLine = line.padEnd(widget.width * this.config.cellWidth);
                renderArray.push({
                    widget,
                    y: startY + i,
                    line: paddedLine
                });
            }
        }

        for (let y = 0; y < this.size.height; y++) {
            let line = '';

            if (this.config.showGrid && y % this.config.cellHeight === 0) {
                line += this.theme.applyColor('├', 'border');
            } else {
                line += this.theme.applyColor('│', 'border');
            }

            const lineWidgets = renderArray.filter(item => item.y === y);
            lineWidgets.sort((a, b) => a.widget.x - b.widget.x);

            let lastX = 0;
            for (const item of lineWidgets) {
                const widgetStart = item.widget.x * this.config.cellWidth;
                const emptySpace = widgetStart - lastX;

                if (emptySpace > 0) {
                    line += ' '.repeat(emptySpace);
                }

                line += item.line;
                lastX = widgetStart + item.widget.width * this.config.cellWidth;
            }

            if (lastX < this.size.width - 1) {
                line += ' '.repeat(this.size.width - lastX - 1);
            }

            lines.push(line);
        }

        return lines.join('\n');
    }

    destroy(): void {
        for (const widget of this.widgets.values()) {
            widget.component.destroy();
        }
        super.destroy();
    }
}