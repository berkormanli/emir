import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';
import { AnsiUtils } from '../../utils/ansi-utils';

export interface BreadcrumbItem {
    id: string;
    label: string;
    icon?: string;
    href?: string;
    disabled?: boolean;
    active?: boolean;
    dropdown?: BreadcrumbItem[];
    tooltip?: string;
}

export interface BreadcrumbConfig {
    separator?: string;
    maxItems?: number;
    showIcons?: boolean;
    collapseFrom?: 'start' | 'end' | 'middle';
    showDropdownArrow?: boolean;
    wrapOnOverflow?: boolean;
}

export class Breadcrumb extends BaseComponent {
    private items: BreadcrumbItem[] = [];
    private selectedIndex = 0;
    private config: Required<BreadcrumbConfig>;
    private theme: ThemeManager;
    private isDropdownOpen = false;
    private dropdownSelectedIndex = 0;
    private dropdownParentId: string | null = null;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: BreadcrumbConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            separator: config.separator ?? '›',
            maxItems: config.maxItems ?? 5,
            showIcons: config.showIcons ?? true,
            collapseFrom: config.collapseFrom ?? 'middle',
            showDropdownArrow: config.showDropdownArrow ?? true,
            wrapOnOverflow: config.wrapOnOverflow ?? false
        };
        this.theme = ThemeManager.getInstance();
    }

    addItem(item: BreadcrumbItem, index?: number): void {
        if (index !== undefined && index >= 0 && index <= this.items.length) {
            this.items.splice(index, 0, item);
        } else {
            this.items.push(item);
        }
        this.markDirty();
    }

    removeItem(itemId: string): void {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items.splice(index, 1);
            if (this.selectedIndex >= this.items.length) {
                this.selectedIndex = Math.max(0, this.items.length - 1);
            }
            this.markDirty();
        }
    }

    setItems(items: BreadcrumbItem[]): void {
        this.items = items;
        this.selectedIndex = Math.max(0, this.selectedIndex);
        this.markDirty();
    }

    getItems(): readonly BreadcrumbItem[] {
        return this.items;
    }

    selectItem(itemId: string): void {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.selectedIndex = index;
            this.markDirty();
        }
    }

    handleInput(input: InputEvent): boolean {
        if (this.isDropdownOpen) {
            return this.handleDropdownInput(input);
        }

        if (input.type === 'key') {
            switch (input.key) {
                case 'left':
                case 'ArrowLeft':
                    this.navigateLeft();
                    return true;
                case 'right':
                case 'ArrowRight':
                    this.navigateRight();
                    return true;
                case 'enter':
                case 'Return':
                    this.activateSelectedItem();
                    return true;
                case 'down':
                case 'ArrowDown':
                    this.openDropdown();
                    return true;
                case 'escape':
                    this.blur();
                    return true;
            }
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private navigateLeft(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.markDirty();
        }
    }

    private navigateRight(): void {
        if (this.selectedIndex < this.items.length - 1) {
            this.selectedIndex++;
            this.markDirty();
        }
    }

    private activateSelectedItem(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const item = this.items[this.selectedIndex];
            if (!item.disabled) {
                this.onItemClick(item);
            }
        }
    }

    private openDropdown(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && selectedItem.dropdown && selectedItem.dropdown.length > 0) {
            this.isDropdownOpen = true;
            this.dropdownParentId = selectedItem.id;
            this.dropdownSelectedIndex = 0;
            this.markDirty();
        }
    }

    private handleDropdownInput(input: InputEvent): boolean {
        switch (input.key) {
            case 'up':
            case 'ArrowUp':
                this.dropdownSelectedIndex = Math.max(0, this.dropdownSelectedIndex - 1);
                this.markDirty();
                return true;
            case 'down':
            case 'ArrowDown':
                const parentItem = this.items.find(item => item.id === this.dropdownParentId);
                if (parentItem && parentItem.dropdown) {
                    this.dropdownSelectedIndex = Math.min(
                        parentItem.dropdown.length - 1,
                        this.dropdownSelectedIndex + 1
                    );
                    this.markDirty();
                }
                return true;
            case 'enter':
            case 'Return':
                if (this.dropdownParentId) {
                    const parentItem = this.items.find(item => item.id === this.dropdownParentId);
                    if (parentItem && parentItem.dropdown &&
                        this.dropdownSelectedIndex >= 0 &&
                        this.dropdownSelectedIndex < parentItem.dropdown.length) {
                        const dropdownItem = parentItem.dropdown[this.dropdownSelectedIndex];
                        this.onDropdownItemClick(parentItem, dropdownItem);
                    }
                }
                this.isDropdownOpen = false;
                this.dropdownParentId = null;
                this.markDirty();
                return true;
            case 'escape':
                this.isDropdownOpen = false;
                this.dropdownParentId = null;
                this.markDirty();
                return true;
        }
        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (y === 0) {
            return this.handleBreadcrumbClick(x, input.mouse.button);
        }

        if (this.isDropdownOpen && y === 1) {
            return this.handleDropdownClick(x, input.mouse.button);
        }

        return false;
    }

    private handleBreadcrumbClick(x: number, button: string): boolean {
        if (button !== 'left') return false;

        let currentX = 0;
        const collapsedItems = this.getCollapsedItems();

        for (let i = 0; i < collapsedItems.length; i++) {
            const item = collapsedItems[i];
            const width = this.calculateItemWidth(item);

            if (x >= currentX && x < currentX + width) {
                if (item.id === 'collapsed-placeholder') {
                    this.showCollapsedDropdown();
                } else {
                    this.selectedIndex = this.items.findIndex(original => original.id === item.id);
                    this.onItemClick(item);
                }
                return true;
            }

            currentX += width + this.config.separator.length + 1;
        }

        return false;
    }

    private handleDropdownClick(x: number, button: string): boolean {
        if (button !== 'left' || !this.dropdownParentId) return false;

        const parentItem = this.items.find(item => item.id === this.dropdownParentId);
        if (!parentItem || !parentItem.dropdown) return false;

        let currentX = 2;
        for (let i = 0; i < parentItem.dropdown.length; i++) {
            const item = parentItem.dropdown[i];
            const width = this.calculateItemWidth(item);

            if (x >= currentX && x < currentX + width) {
                this.onDropdownItemClick(parentItem, item);
                this.isDropdownOpen = false;
                this.dropdownParentId = null;
                this.markDirty();
                return true;
            }

            currentX += width;
        }

        return false;
    }

    private getCollapsedItems(): BreadcrumbItem[] {
        if (this.items.length <= this.config.maxItems) {
            return this.items;
        }

        const result: BreadcrumbItem[] = [];
        const collapseCount = this.items.length - this.config.maxItems + 1;

        switch (this.config.collapseFrom) {
            case 'start':
                result.push({
                    id: 'collapsed-placeholder',
                    label: `...${collapseCount}`,
                    icon: '⋯',
                    disabled: false
                });
                result.push(...this.items.slice(-this.config.maxItems + 1));
                break;

            case 'end':
                result.push(...this.items.slice(0, this.config.maxItems - 1));
                result.push({
                    id: 'collapsed-placeholder',
                    label: `${collapseCount}...`,
                    icon: '⋯',
                    disabled: false
                });
                break;

            case 'middle':
                const keepStart = Math.floor(this.config.maxItems / 2);
                const keepEnd = this.config.maxItems - keepStart - 1;

                result.push(...this.items.slice(0, keepStart));
                result.push({
                    id: 'collapsed-placeholder',
                    label: `${collapseCount}`,
                    icon: '⋯',
                    disabled: false
                });
                result.push(...this.items.slice(-keepEnd));
                break;
        }

        return result;
    }

    private showCollapsedDropdown(): void {
        this.isDropdownOpen = true;
        this.dropdownParentId = 'collapsed-placeholder';
        this.dropdownSelectedIndex = 0;
        this.markDirty();
    }

    private getSelectedItem(): BreadcrumbItem | null {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            return this.items[this.selectedIndex];
        }
        return null;
    }

    private calculateItemWidth(item: BreadcrumbItem): number {
        let width = item.label.length;
        if (this.config.showIcons && item.icon) {
            width += 2;
        }
        if (this.config.showDropdownArrow && item.dropdown && item.dropdown.length > 0) {
            width += 1;
        }
        return width;
    }

    protected onItemClick(item: BreadcrumbItem): void {
        // Override in subclasses for custom behavior
    }

    protected onDropdownItemClick(parent: BreadcrumbItem, item: BreadcrumbItem): void {
        // Override in subclasses for custom behavior
    }

    render(): string {
        const lines: string[] = [];
        lines.push(this.renderBreadcrumb());

        if (this.isDropdownOpen) {
            lines.push(this.renderDropdown());
        }

        return lines.join('\n');
    }

    private renderBreadcrumb(): string {
        const theme = this.theme.getCurrentTheme();
        const collapsedItems = this.getCollapsedItems();
        let line = '';

        for (let i = 0; i < collapsedItems.length; i++) {
            const item = collapsedItems[i];
            const isFocused = this.state.focused && this.selectedIndex === this.items.findIndex(original => original.id === item.id);
            const isActive = item.active;

            let itemText = '';

            if (this.config.showIcons && item.icon) {
                itemText += item.icon + ' ';
            }

            itemText += item.label;

            if (this.config.showDropdownArrow && item.dropdown && item.dropdown.length > 0) {
                itemText += ' ▾';
            }

            if (isActive || isFocused) {
                itemText = this.theme.applyColor(itemText, 'primary');
                itemText = this.theme.applyTypography(itemText, 'button');
            } else if (item.disabled) {
                itemText = this.theme.applyColor(itemText, 'textDisabled');
            } else {
                itemText = this.theme.applyColor(itemText, 'textSecondary');
            }

            line += itemText;

            if (i < collapsedItems.length - 1) {
                const separator = this.theme.applyColor(` ${this.config.separator} `, 'muted');
                line += separator;
            }
        }

        return line;
    }

    private renderDropdown(): string {
        if (!this.dropdownParentId) return '';

        const theme = this.theme.getCurrentTheme();
        let line = '';

        if (this.dropdownParentId === 'collapsed-placeholder') {
            const start = this.config.collapseFrom === 'start' ?
                this.items.length - (this.config.maxItems - 1) : 0;
            const end = this.config.collapseFrom === 'start' ?
                this.items.length : Math.floor(this.config.maxItems / 2);

            for (let i = start; i < end; i++) {
                const item = this.items[i];
                const isFocused = this.dropdownSelectedIndex === (i - start);

                if (isFocused) {
                    line += this.theme.applyColor('▸ ', 'primary');
                    line += this.theme.applyColor(item.label, 'primary');
                } else {
                    line += this.theme.applyColor('  ', 'textSecondary');
                    line += this.theme.applyColor(item.label, 'textSecondary');
                }

                if (i < end - 1) {
                    line += '  ';
                }
            }
        } else {
            const parentItem = this.items.find(item => item.id === this.dropdownParentId);
            if (parentItem && parentItem.dropdown) {
                for (let i = 0; i < parentItem.dropdown.length; i++) {
                    const item = parentItem.dropdown[i];
                    const isFocused = this.dropdownSelectedIndex === i;

                    if (isFocused) {
                        line += this.theme.applyColor('▸ ', 'primary');
                        line += this.theme.applyColor(item.label, 'primary');
                    } else {
                        line += this.theme.applyColor('  ', 'textSecondary');
                        line += this.theme.applyColor(item.label, 'textSecondary');
                    }

                    if (i < parentItem.dropdown.length - 1) {
                        line += '  ';
                    }
                }
            }
        }

        return '  ' + line;
    }
}