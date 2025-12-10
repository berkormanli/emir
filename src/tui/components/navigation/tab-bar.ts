import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';
import { AnsiUtils } from '../ansi-utils';

export interface Tab {
    id: string;
    label: string;
    content?: string;
    closable?: boolean;
    icon?: string;
    disabled?: boolean;
    badge?: string | number;
    tooltip?: string;
}

export interface TabBarConfig {
    orientation?: 'horizontal' | 'vertical';
    draggable?: boolean;
    showAddButton?: boolean;
    showCloseButtons?: boolean;
    maxTabWidth?: number;
    minTabWidth?: number;
    scrollable?: boolean;
    overflowBehavior?: 'scroll' | 'wrap' | 'dropdown';
}

export class TabBar extends BaseComponent {
    private tabs: Tab[] = [];
    private activeTabId: string | null = null;
    private selectedIndex = 0;
    private config: Required<TabBarConfig>;
    private theme: ThemeManager;
    private dragStartIndex = -1;
    private dragOverIndex = -1;
    private scrollOffset = 0;
    private isDropdownOpen = false;
    private dropdownSelectedIndex = 0;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: TabBarConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            orientation: config.orientation ?? 'horizontal',
            draggable: config.draggable ?? false,
            showAddButton: config.showAddButton ?? false,
            showCloseButtons: config.showCloseButtons ?? true,
            maxTabWidth: config.maxTabWidth ?? 30,
            minTabWidth: config.minTabWidth ?? 10,
            scrollable: config.scrollable ?? true,
            overflowBehavior: config.overflowBehavior ?? 'scroll'
        };
        this.theme = ThemeManager.getInstance();
    }

    addTab(tab: Tab): void {
        if (!this.tabs.find(t => t.id === tab.id)) {
            this.tabs.push(tab);
            if (!this.activeTabId) {
                this.activeTabId = tab.id;
            }
            this.markDirty();
        }
    }

    removeTab(tabId: string): void {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index !== -1) {
            this.tabs.splice(index, 1);

            if (this.activeTabId === tabId) {
                if (this.tabs.length > 0) {
                    this.activeTabId = this.tabs[Math.max(0, index - 1)].id;
                    this.selectedIndex = Math.max(0, index - 1);
                } else {
                    this.activeTabId = null;
                    this.selectedIndex = 0;
                }
            }

            if (this.selectedIndex >= this.tabs.length) {
                this.selectedIndex = Math.max(0, this.tabs.length - 1);
            }

            this.markDirty();
        }
    }

    selectTab(tabId: string): void {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index !== -1) {
            this.activeTabId = tabId;
            this.selectedIndex = index;
            this.markDirty();
        }
    }

    getActiveTab(): Tab | null {
        return this.tabs.find(t => t.id === this.activeTabId) ?? null;
    }

    getTabs(): readonly Tab[] {
        return this.tabs;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            if (this.isDropdownOpen) {
                return this.handleDropdownInput(input);
            }

            switch (input.key) {
                case 'left':
                case 'ArrowLeft':
                    if (this.config.orientation === 'horizontal') {
                        this.navigateLeft();
                        return true;
                    }
                    break;
                case 'right':
                case 'ArrowRight':
                    if (this.config.orientation === 'horizontal') {
                        this.navigateRight();
                        return true;
                    }
                    break;
                case 'up':
                case 'ArrowUp':
                    if (this.config.orientation === 'vertical') {
                        this.navigateUp();
                        return true;
                    }
                    break;
                case 'down':
                case 'ArrowDown':
                    if (this.config.orientation === 'vertical') {
                        this.navigateDown();
                        return true;
                    }
                    break;
                case 'enter':
                case 'Return':
                    this.activateTab();
                    return true;
                case 'Delete':
                case 'Backspace':
                    this.closeCurrentTab();
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
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.scrollToTab(this.selectedIndex);
            this.markDirty();
        }
    }

    private navigateRight(): void {
        if (this.selectedIndex < this.tabs.length - 1) {
            this.selectedIndex++;
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.scrollToTab(this.selectedIndex);
            this.markDirty();
        }
    }

    private navigateUp(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.scrollToTab(this.selectedIndex);
            this.markDirty();
        }
    }

    private navigateDown(): void {
        if (this.selectedIndex < this.tabs.length - 1) {
            this.selectedIndex++;
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.scrollToTab(this.selectedIndex);
            this.markDirty();
        }
    }

    private activateTab(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.tabs.length) {
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.markDirty();
        }
    }

    private closeCurrentTab(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.tabs.length) {
            const tab = this.tabs[this.selectedIndex];
            if (tab.closable !== false) {
                this.removeTab(tab.id);
            }
        }
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (this.config.orientation === 'horizontal') {
            if (y !== 0) return false;
            return this.handleHorizontalClick(x, input.mouse.button);
        } else {
            if (x !== 0) return false;
            return this.handleVerticalClick(y, input.mouse.button);
        }
    }

    private handleHorizontalClick(x: number, button: string): boolean {
        if (button !== 'left') return false;

        let currentX = this.scrollOffset;

        for (let i = 0; i < this.tabs.length; i++) {
            const tabWidth = this.calculateTabWidth(this.tabs[i]);
            if (x >= currentX && x < currentX + tabWidth) {
                const tab = this.tabs[i];
                const closeX = currentX + tabWidth - 2;

                if (this.config.showCloseButtons && x >= closeX && x < closeX + 2) {
                    if (tab.closable !== false) {
                        this.removeTab(tab.id);
                    }
                } else {
                    this.selectedIndex = i;
                    this.activeTabId = tab.id;
                }
                return true;
            }
            currentX += tabWidth + 1;
        }

        if (this.config.showAddButton && x >= currentX && x < currentX + 3) {
            this.onAddTab();
            return true;
        }

        return false;
    }

    private handleVerticalClick(y: number, button: string): boolean {
        if (button !== 'left') return false;

        let currentY = this.scrollOffset;

        for (let i = 0; i < this.tabs.length; i++) {
            if (y >= currentY && y < currentY + 1) {
                const tab = this.tabs[i];
                this.selectedIndex = i;
                this.activeTabId = tab.id;
                return true;
            }
            currentY += 1;
        }

        if (this.config.showAddButton && y >= currentY && y < currentY + 1) {
            this.onAddTab();
            return true;
        }

        return false;
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
                this.dropdownSelectedIndex = Math.min(this.tabs.length - 1, this.dropdownSelectedIndex + 1);
                this.markDirty();
                return true;
            case 'enter':
            case 'Return':
                if (this.dropdownSelectedIndex >= 0 && this.dropdownSelectedIndex < this.tabs.length) {
                    this.selectedIndex = this.dropdownSelectedIndex;
                    this.activeTabId = this.tabs[this.selectedIndex].id;
                    this.isDropdownOpen = false;
                    this.markDirty();
                }
                return true;
            case 'escape':
                this.isDropdownOpen = false;
                this.markDirty();
                return true;
        }
        return false;
    }

    private calculateTabWidth(tab: Tab): number {
        let width = tab.label.length;
        if (tab.icon) width += 2;
        if (tab.badge !== undefined) width += String(tab.badge).length + 2;
        if (this.config.showCloseButtons && tab.closable !== false) width += 2;

        return Math.min(this.config.maxTabWidth, Math.max(this.config.minTabWidth, width + 2));
    }

    private scrollToTab(index: number): void {
        if (!this.config.scrollable) return;

        const isHorizontal = this.config.orientation === 'horizontal';
        const maxSize = isHorizontal ? this.size.width : this.size.height;

        let position = 0;
        for (let i = 0; i < index; i++) {
            const tabSize = isHorizontal ? this.calculateTabWidth(this.tabs[i]) : 1;
            position += tabSize + 1;
        }

        const tabSize = isHorizontal ? this.calculateTabWidth(this.tabs[index]) : 1;

        if (position < this.scrollOffset) {
            this.scrollOffset = position;
        } else if (position + tabSize > this.scrollOffset + maxSize) {
            this.scrollOffset = position + tabSize - maxSize;
        }
    }

    private onAddTab(): void {
        const newTab: Tab = {
            id: `tab-${Date.now()}`,
            label: 'New Tab',
            closable: true
        };
        this.addTab(newTab);
        this.selectTab(newTab.id);
    }

    render(): string {
        const lines: string[] = [];
        const theme = this.theme.getCurrentTheme();
        const borderChars = this.theme.getBorderChars();

        if (this.config.orientation === 'horizontal') {
            lines.push(this.renderHorizontalTabs());
        } else {
            lines.push(this.renderVerticalTabs());
        }

        return lines.join('\n');
    }

    private renderHorizontalTabs(): string {
        let line = '';
        const theme = this.theme.getCurrentTheme();

        for (let i = 0; i < this.tabs.length; i++) {
            const tab = this.tabs[i];
            const isActive = tab.id === this.activeTabId;
            const isFocused = this.state.focused && i === this.selectedIndex;

            let tabContent = '';

            if (tab.icon) {
                tabContent += tab.icon + ' ';
            }

            tabContent += this.truncateText(tab.label, this.config.maxTabWidth - 4);

            if (tab.badge !== undefined) {
                const badgeText = String(tab.badge);
                const badgeColor = parseInt(badgeText) > 0 ? 'error' : 'muted';
                tabContent += ' ' + this.theme.applyColor(`[${badgeText}]`, badgeColor);
            }

            if (this.config.showCloseButtons && tab.closable !== false) {
                const closeChar = isActive && isFocused ? '×' : '×';
                tabContent += ' ' + this.theme.applyColor(closeChar, 'textSecondary');
            }

            tabContent = this.padText(tabContent, this.calculateTabWidth(tab));

            if (isActive) {
                tabContent = this.theme.applyColor(tabContent, 'primary');
                tabContent = this.theme.applyTypography(tabContent, 'button');
            } else if (isFocused) {
                tabContent = this.theme.applyColor(tabContent, 'focus');
            } else if (tab.disabled) {
                tabContent = this.theme.applyColor(tabContent, 'textDisabled');
            } else {
                tabContent = this.theme.applyColor(tabContent, 'textSecondary');
            }

            line += tabContent + ' ';
        }

        if (this.config.showAddButton) {
            const addButton = this.theme.applyColor('+ New', 'info');
            line += addButton;
        }

        return line;
    }

    private renderVerticalTabs(): string {
        const lines: string[] = [];
        const theme = this.theme.getCurrentTheme();
        const width = this.size.width;

        for (let i = 0; i < Math.min(this.tabs.length, this.size.height); i++) {
            const tab = this.tabs[i];
            const isActive = tab.id === this.activeTabId;
            const isFocused = this.state.focused && i === this.selectedIndex;

            let tabContent = '';

            if (tab.icon) {
                tabContent += tab.icon + ' ';
            }

            tabContent += this.truncateText(tab.label, width - 4);

            if (this.config.showCloseButtons && tab.closable !== false) {
                const closeChar = isActive && isFocused ? '×' : '·';
                tabContent += ' ' + this.theme.applyColor(closeChar, 'textSecondary');
            }

            tabContent = this.padText(tabContent, width);

            if (isActive) {
                tabContent = this.theme.applyColor(tabContent, 'primary');
                tabContent = this.theme.applyTypography(tabContent, 'button');
            } else if (isFocused) {
                tabContent = this.theme.applyColor(tabContent, 'focus');
            } else if (tab.disabled) {
                tabContent = this.theme.applyColor(tabContent, 'textDisabled');
            } else {
                tabContent = this.theme.applyColor(tabContent, 'textSecondary');
            }

            lines.push(tabContent);
        }

        if (this.config.showAddButton && lines.length < this.size.height) {
            const addButton = this.padText('+ New', width);
            lines.push(this.theme.applyColor(addButton, 'info'));
        }

        return lines.join('\n');
    }

    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    private padText(text: string, width: number): string {
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        const plainText = text.replace(ansiRegex, '');
        const padding = width - plainText.length;

        if (padding > 0) {
            return text + ' '.repeat(padding);
        }

        return text;
    }
}