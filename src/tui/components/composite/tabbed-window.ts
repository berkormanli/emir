import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size, Component } from '../../types';
import { ThemeManager } from '../../theme';

export interface Tab {
    id: string;
    title: string;
    content: Component;
    icon?: string;
    closable?: boolean;
    dirty?: boolean;
    tooltip?: string;
}

export interface TabbedWindowConfig {
    showTabBar?: boolean;
    tabBarPosition?: 'top' | 'bottom';
    draggableTabs?: boolean;
    showIcons?: boolean;
    showCloseButtons?: boolean;
    maxTabWidth?: number;
    minTabWidth?: number;
    scrollableTabs?: boolean;
    shortcuts?: boolean;
}

export class TabbedWindow extends BaseComponent {
    private tabs: Tab[] = [];
    private activeTabId: string | null = null;
    private selectedIndex = 0;
    private config: Required<TabbedWindowConfig>;
    private theme: ThemeManager;
    private draggedTab: string | null = null;
    private dragOverTab: string | null = null;
    private scrollOffset = 0;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: TabbedWindowConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            showTabBar: config.showTabBar ?? true,
            tabBarPosition: config.tabBarPosition ?? 'top',
            draggableTabs: config.draggableTabs ?? false,
            showIcons: config.showIcons ?? true,
            showCloseButtons: config.showCloseButtons ?? true,
            maxTabWidth: config.maxTabWidth ?? 25,
            minTabWidth: config.minTabWidth ?? 10,
            scrollableTabs: config.scrollableTabs ?? true,
            shortcuts: config.shortcuts ?? true
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
            const tab = this.tabs[index];

            if (tab.content) {
                tab.content.destroy();
            }

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

            this.updateContentSize();
            this.markDirty();
        }
    }

    selectTab(tabId: string): void {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index !== -1) {
            this.activeTabId = tabId;
            this.selectedIndex = index;
            this.updateContentSize();
            this.markDirty();
        }
    }

    getActiveTab(): Tab | null {
        return this.tabs.find(t => t.id === this.activeTabId) ?? null;
    }

    getTabs(): readonly Tab[] {
        return this.tabs;
    }

    nextTab(): void {
        if (this.tabs.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.tabs.length;
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.updateContentSize();
            this.markDirty();
        }
    }

    previousTab(): void {
        if (this.tabs.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + this.tabs.length) % this.tabs.length;
            this.activeTabId = this.tabs[this.selectedIndex].id;
            this.updateContentSize();
            this.markDirty();
        }
    }

    private updateContentSize(): void {
        const activeTab = this.getActiveTab();
        if (!activeTab || !activeTab.content) return;

        const tabBarHeight = this.config.showTabBar ? 1 : 0;
        const contentHeight = this.size.height - tabBarHeight;

        activeTab.content.setPosition({
            x: this.position.x,
            y: this.position.y + (this.config.tabBarPosition === 'top' ? tabBarHeight : 0)
        });

        activeTab.content.setSize({
            width: this.size.width,
            height: Math.max(1, contentHeight)
        });
    }

    handleInput(input: InputEvent): boolean {
        const activeTab = this.getActiveTab();

        if (input.type === 'key') {
            if (this.config.shortcuts) {
                switch (input.key) {
                    case 'ctrl+tab':
                        if (input.shift) {
                            this.previousTab();
                        } else {
                            this.nextTab();
                        }
                        return true;

                    case 'F1':
                    case 'F2':
                    case 'F3':
                    case 'F4':
                    case 'F5':
                    case 'F6':
                    case 'F7':
                    case 'F8':
                    case 'F9':
                    case 'F10':
                    case 'F11':
                    case 'F12':
                        const tabIndex = parseInt(input.key.substring(1)) - 1;
                        if (tabIndex < this.tabs.length) {
                            this.selectTab(this.tabs[tabIndex].id);
                            return true;
                        }
                        break;

                    case 'w':
                        if (input.ctrl) {
                            const currentTab = this.getActiveTab();
                            if (currentTab && currentTab.closable !== false) {
                                this.removeTab(currentTab.id);
                                return true;
                            }
                        }
                        break;
                }
            }

            return activeTab?.content?.handleInput(input) ?? false;
        }

        if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (this.config.tabBarPosition === 'top') {
            if (y === 0 && this.config.showTabBar) {
                return this.handleTabBarClick(x, input.mouse.button);
            }
        } else {
            if (y === this.size.height - 1 && this.config.showTabBar) {
                return this.handleTabBarClick(x, input.mouse.button);
            }
        }

        const activeTab = this.getActiveTab();
        return activeTab?.content?.handleInput(input) ?? false;
    }

    private handleTabBarClick(x: number, button: string): boolean {
        if (button !== 'left') return false;

        let currentX = this.scrollOffset;

        for (let i = 0; i < this.tabs.length; i++) {
            const tab = this.tabs[i];
            const tabWidth = this.calculateTabWidth(tab);

            if (x >= currentX && x < currentX + tabWidth) {
                const closeX = currentX + tabWidth - 2;

                if (this.config.showCloseButtons && x >= closeX && x < closeX + 2) {
                    if (tab.closable !== false) {
                        this.removeTab(tab.id);
                    }
                } else {
                    this.selectTab(tab.id);
                }
                return true;
            }

            currentX += tabWidth + 1;
        }

        return false;
    }

    private calculateTabWidth(tab: Tab): number {
        let width = tab.title.length;
        if (this.config.showIcons && tab.icon) width += 2;
        if (this.config.showCloseButtons && tab.closable !== false) width += 2;
        if (tab.dirty) width += 1;

        return Math.min(this.config.maxTabWidth, Math.max(this.config.minTabWidth, width + 2));
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.config.showTabBar) {
            const tabBarLine = this.renderTabBar();
            if (this.config.tabBarPosition === 'top') {
                lines.push(tabBarLine);
            }
        }

        const activeTab = this.getActiveTab();
        if (activeTab && activeTab.content) {
            const contentRender = activeTab.content.render().split('\n');
            const contentHeight = this.size.height - (this.config.showTabBar ? 1 : 0);

            for (let i = 0; i < contentHeight; i++) {
                if (i < contentRender.length) {
                    lines.push(contentRender[i]);
                } else {
                    lines.push(''.padEnd(this.size.width));
                }
            }
        } else {
            const emptyLine = theme.applyColor('No tabs open', 'muted').padEnd(this.size.width);
            for (let i = 0; i < this.size.height - (this.config.showTabBar ? 1 : 0); i++) {
                lines.push(emptyLine);
            }
        }

        if (this.config.showTabBar && this.config.tabBarPosition === 'bottom') {
            lines.push(this.renderTabBar());
        }

        return lines.join('\n');
    }

    private renderTabBar(): string {
        const theme = this.theme.getCurrentTheme();
        let line = '';

        const visibleWidth = this.size.width;
        let currentX = 0;

        for (let i = 0; i < this.tabs.length; i++) {
            const tab = this.tabs[i];
            const isActive = tab.id === this.activeTabId;
            const isDraggedOver = this.dragOverTab === tab.id;
            const isDragged = this.draggedTab === tab.id;

            let tabContent = '';

            if (this.config.showIcons && tab.icon) {
                tabContent += tab.icon + ' ';
            }

            tabContent += tab.title;

            if (tab.dirty) {
                tabContent += '●';
            }

            if (this.config.showCloseButtons && tab.closable !== false) {
                const closeChar = isActive ? '×' : '○';
                tabContent += ' ' + closeChar;
            }

            tabContent = this.padText(tabContent, this.calculateTabWidth(tab));

            if (isActive) {
                tabContent = this.theme.applyColor(tabContent, 'primary');
                tabContent = this.theme.applyTypography(tabContent, 'button');
            } else if (isDraggedOver) {
                tabContent = this.theme.applyColor(tabContent, 'hover');
            } else if (isDragged) {
                tabContent = this.theme.applyColor(tabContent, 'textDisabled');
            } else {
                tabContent = this.theme.applyColor(tabContent, 'textSecondary');
            }

            if (currentX + tabContent.length <= visibleWidth) {
                line += tabContent;
                currentX += tabContent.length;

                if (i < this.tabs.length - 1 && currentX + 1 <= visibleWidth) {
                    line += ' ';
                    currentX++;
                }
            } else {
                break;
            }
        }

        if (this.config.scrollableTabs && currentX < visibleWidth) {
            const scrollIndicator = this.scrollOffset > 0 ? '◀' : '';
            line += ' '.repeat(visibleWidth - currentX - scrollIndicator.length);
            line += this.theme.applyColor(scrollIndicator, 'muted');
        }

        return line.padEnd(this.size.width);
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

    destroy(): void {
        for (const tab of this.tabs) {
            if (tab.content) {
                tab.content.destroy();
            }
        }
        super.destroy();
    }
}