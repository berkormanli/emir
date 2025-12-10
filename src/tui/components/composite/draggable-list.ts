import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface ListItem {
    id: string;
    text: string;
    icon?: string;
    disabled?: boolean;
    selected?: boolean;
    data?: any;
}

export interface DraggableListConfig {
    multiSelect?: boolean;
    showHandles?: boolean;
    showIcons?: boolean;
    sortable?: boolean;
    allowDropBetween?: boolean;
    showPlaceholders?: boolean;
    virtualScrolling?: boolean;
    itemHeight?: number;
    maxItems?: number;
    placeholderText?: string;
}

export class DraggableList extends BaseComponent {
    private items: ListItem[] = [];
    private selectedIndex = 0;
    private selectedIds: Set<string> = new Set();
    private config: Required<DraggableListConfig>;
    private theme: ThemeManager;
    private draggedItem: ListItem | null = null;
    private dropIndex = -1;
    private scrollOffset = 0;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: DraggableListConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            multiSelect: config.multiSelect ?? false,
            showHandles: config.showHandles ?? true,
            showIcons: config.showIcons ?? true,
            sortable: config.sortable ?? true,
            allowDropBetween: config.allowDropBetween ?? true,
            showPlaceholders: config.showPlaceholders ?? true,
            virtualScrolling: config.virtualScrolling ?? false,
            itemHeight: config.itemHeight ?? 1,
            maxItems: config.maxItems ?? Infinity,
            placeholderText: config.placeholderText ?? 'Drag items here'
        };
        this.theme = ThemeManager.getInstance();
    }

    addItem(item: ListItem, index?: number): void {
        if (this.items.length >= this.config.maxItems) return;

        if (index !== undefined && index >= 0 && index <= this.items.length) {
            this.items.splice(index, 0, item);
        } else {
            this.items.push(item);
        }
        this.markDirty();
    }

    removeItem(itemId: string): boolean {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.selectedIds.delete(itemId);

            if (this.selectedIndex >= this.items.length) {
                this.selectedIndex = Math.max(0, this.items.length - 1);
            }

            this.markDirty();
            return true;
        }
        return false;
    }

    moveItem(fromIndex: number, toIndex: number): boolean {
        if (fromIndex < 0 || fromIndex >= this.items.length ||
            toIndex < 0 || toIndex >= this.items.length ||
            fromIndex === toIndex) {
            return false;
        }

        const [movedItem] = this.items.splice(fromIndex, 1);
        this.items.splice(toIndex, 0, movedItem);

        if (this.selectedIndex === fromIndex) {
            this.selectedIndex = toIndex;
        }

        this.markDirty();
        return true;
    }

    selectItem(itemId: string, addToSelection: boolean = false): void {
        const item = this.items.find(i => i.id === itemId);
        if (!item || item.disabled) return;

        if (this.config.multiSelect && addToSelection) {
            if (this.selectedIds.has(itemId)) {
                this.selectedIds.delete(itemId);
                item.selected = false;
            } else {
                this.selectedIds.add(itemId);
                item.selected = true;
            }
        } else {
            this.selectedIds.clear();
            this.items.forEach(i => i.selected = false);
            this.selectedIds.add(itemId);
            item.selected = true;
            this.selectedIndex = this.items.findIndex(i => i.id === itemId);
        }

        this.markDirty();
    }

    clearSelection(): void {
        this.selectedIds.clear();
        this.items.forEach(item => item.selected = false);
        this.markDirty();
    }

    getSelectedItems(): ListItem[] {
        return this.items.filter(item => this.selectedIds.has(item.id));
    }

    getItems(): readonly ListItem[] {
        return this.items;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            return this.handleKeyInput(input);
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleKeyInput(input: InputEvent): boolean {
        switch (input.key) {
            case 'up':
            case 'ArrowUp':
                this.navigateUp();
                return true;

            case 'down':
            case 'ArrowDown':
                this.navigateDown();
                return true;

            case 'home':
                this.selectFirst();
                return true;

            case 'end':
                this.selectLast();
                return true;

            case 'enter':
            case 'Return':
                this.activateSelected();
                return true;

            case ' ':
                if (this.config.multiSelect && input.ctrl) {
                    this.toggleSelectedSelection();
                    return true;
                }
                break;

            case 'a':
                if (input.ctrl && this.config.multiSelect) {
                    this.selectAll();
                    return true;
                }
                break;

            case 'delete':
            case 'Backspace':
                this.deleteSelected();
                return true;

            case 'd':
                if (input.ctrl && this.config.sortable && this.selectedIndex >= 0) {
                    this.startDrag();
                    return true;
                }
                break;
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const itemIndex = y + this.scrollOffset;

        if (itemIndex >= 0 && itemIndex < this.items.length) {
            const item = this.items[itemIndex];
            const handleX = 0;

            if (this.config.showHandles && x === handleX) {
                if (input.mouse.action === 'press' && this.config.sortable) {
                    this.startDragItem(item);
                    return true;
                }
            } else {
                if (input.mouse.action === 'press') {
                    this.selectItem(item.id, input.ctrl || input.shift);
                    return true;
                }
            }
        } else if (this.config.allowDropBetween && input.mouse.action === 'release' && this.draggedItem) {
            const dropIndex = Math.min(itemIndex, this.items.length);
            this.dropItem(dropIndex);
            return true;
        }

        return false;
    }

    private navigateUp(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.selectItem(this.items[this.selectedIndex].id, false);
            this.ensureVisible(this.selectedIndex);
        }
    }

    private navigateDown(): void {
        if (this.selectedIndex < this.items.length - 1) {
            this.selectedIndex++;
            this.selectItem(this.items[this.selectedIndex].id, false);
            this.ensureVisible(this.selectedIndex);
        }
    }

    private selectFirst(): void {
        if (this.items.length > 0) {
            this.selectedIndex = 0;
            this.selectItem(this.items[0].id, false);
            this.scrollOffset = 0;
        }
    }

    private selectLast(): void {
        if (this.items.length > 0) {
            this.selectedIndex = this.items.length - 1;
            this.selectItem(this.items[this.selectedIndex].id, false);
            this.ensureVisible(this.selectedIndex);
        }
    }

    private activateSelected(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const item = this.items[this.selectedIndex];
            this.onItemActivate(item);
        }
    }

    private toggleSelectedSelection(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const item = this.items[this.selectedIndex];
            this.selectItem(item.id, true);
        }
    }

    private selectAll(): void {
        if (this.config.multiSelect) {
            this.items.forEach(item => {
                if (!item.disabled) {
                    this.selectedIds.add(item.id);
                    item.selected = true;
                }
            });
            this.markDirty();
        }
    }

    private deleteSelected(): void {
        const itemsToRemove = this.getSelectedItems();
        for (const item of itemsToRemove) {
            this.removeItem(item.id);
        }
    }

    private startDrag(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            this.startDragItem(this.items[this.selectedIndex]);
        }
    }

    private startDragItem(item: ListItem): void {
        this.draggedItem = item;
        this.dropIndex = -1;
        this.markDirty();
    }

    private dropItem(index: number): void {
        if (!this.draggedItem) return;

        const fromIndex = this.items.findIndex(item => item.id === this.draggedItem!.id);
        if (fromIndex !== -1 && fromIndex !== index) {
            this.moveItem(fromIndex, index);
            this.onItemMove(this.draggedItem, fromIndex, index);
        }

        this.draggedItem = null;
        this.dropIndex = -1;
        this.markDirty();
    }

    private ensureVisible(index: number): void {
        if (!this.config.virtualScrolling) return;

        const viewportHeight = this.size.height;
        const maxOffset = Math.max(0, this.items.length - viewportHeight);

        if (index < this.scrollOffset) {
            this.scrollOffset = index;
        } else if (index >= this.scrollOffset + viewportHeight) {
            this.scrollOffset = index - viewportHeight + 1;
        }

        this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
    }

    protected onItemActivate(item: ListItem): void {
        // Override in subclasses
    }

    protected onItemMove(item: ListItem, fromIndex: number, toIndex: number): void {
        // Override in subclasses
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.items.length === 0) {
            const placeholder = this.config.placeholderText;
            lines.push(theme.applyColor(placeholder, 'muted'));
            return lines.join('\n');
        }

        const startIndex = this.scrollOffset;
        const endIndex = Math.min(
            this.items.length,
            this.scrollOffset + this.size.height
        );

        for (let i = startIndex; i < endIndex; i++) {
            const item = this.items[i];
            const isSelected = this.selectedIds.has(item.id);
            const isHovered = i === this.selectedIndex;
            const isDragged = this.draggedItem?.id === item.id;
            const isDropTarget = this.config.allowDropBetween && i === this.dropIndex;

            let line = '';

            if (this.config.showHandles && this.config.sortable) {
                const handle = isDragged ? '↕' : '⋮⋮';
                line += this.theme.applyColor(handle, 'textSecondary') + ' ';
            }

            if (this.config.showIcons && item.icon) {
                line += item.icon + ' ';
            }

            line += item.text;

            if (isDragged) {
                line = this.theme.applyColor(line, 'textDisabled');
            } else if (isSelected) {
                line = this.theme.applyColor(line, 'selection');
            } else if (isHovered) {
                line = this.theme.applyColor(line, 'hover');
            } else if (item.disabled) {
                line = this.theme.applyColor(line, 'textDisabled');
            } else {
                line = this.theme.applyColor(line, 'textPrimary');
            }

            if (this.config.multiSelect && isSelected) {
                line = this.theme.applyColor('✓ ', 'primary') + line;
            }

            line = line.padEnd(this.size.width);

            if (isDropTarget) {
                line = line.substring(0, this.size.width - 1) + this.theme.applyColor('▼', 'primary');
            }

            lines.push(line);
        }

        while (lines.length < this.size.height) {
            lines.push(''.padEnd(this.size.width));
        }

        return lines.join('\n');
    }
}