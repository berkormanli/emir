import { BaseComponent } from './base-component';
import { InputEvent, Position, Size } from './types';
import { AnsiUtils } from './ansi-utils';
import { ThemeManager, Theme } from './theme';

/**
 * Menu item structure
 */
export interface MenuItem {
    id: string;
    label: string;
    value?: any;
    disabled?: boolean;
    separator?: boolean;
    shortcut?: string;
    icon?: string;
    subItems?: MenuItem[];
}

/**
 * Menu configuration options
 */
export interface MenuOptions {
    title?: string;
    showBorder?: boolean;
    showShortcuts?: boolean;
    showIcons?: boolean;
    cycleSelection?: boolean; // Wrap around when reaching top/bottom
    autoFocus?: boolean;
    borderStyle?: 'single' | 'double' | 'rounded' | 'thick';
}

/**
 * Border characters for different styles
 */
const BORDER_CHARS = {
    single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴'
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║',
        cross: '╬',
        leftT: '╠',
        rightT: '╣',
        topT: '╦',
        bottomT: '╩'
    },
    rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴'
    },
    thick: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃',
        cross: '╋',
        leftT: '┣',
        rightT: '┫',
        topT: '┳',
        bottomT: '┻'
    }
};

/**
 * Interactive menu component with keyboard navigation
 */
export class Menu extends BaseComponent {
    private items: MenuItem[];
    private selectedIndex: number;
    private options: MenuOptions;
    private onSelect?: (item: MenuItem) => void;
    private onCancel?: () => void;
    private maxItemWidth: number;
    private themeManager: ThemeManager;

    constructor(
        id: string,
        items: MenuItem[] = [],
        options: MenuOptions = {},
        position?: Position,
        size?: Size
    ) {
        // Calculate size based on items if not provided
        const calculatedSize = size || Menu.calculateSize(items, options);
        super(id, position, calculatedSize);
        
        this.items = items;
        this.selectedIndex = this.findFirstSelectableIndex();
        this.options = {
            showBorder: true,
            showShortcuts: true,
            showIcons: false,
            cycleSelection: true,
            autoFocus: true,
            borderStyle: 'single',
            ...options
        };
        this.maxItemWidth = this.calculateMaxItemWidth();
        this.themeManager = ThemeManager.getInstance();
    }

    /**
     * Calculate menu size based on items
     */
    private static calculateSize(items: MenuItem[], options: MenuOptions): Size {
        const hasTitle = !!options.title;
        const hasBorder = options.showBorder !== false;
        
        // Calculate width
        let maxWidth = 0;
        for (const item of items) {
            let itemWidth = item.label.length;
            if (item.shortcut && options.showShortcuts !== false) {
                itemWidth += item.shortcut.length + 3; // Space + shortcut + padding
            }
            if (item.icon && options.showIcons) {
                itemWidth += 3; // Icon + space
            }
            maxWidth = Math.max(maxWidth, itemWidth);
        }
        
        if (hasTitle) {
            maxWidth = Math.max(maxWidth, options.title!.length);
        }
        
        // Add padding and border
        const width = maxWidth + (hasBorder ? 6 : 4); // Padding + border/selection indicator
        
        // Calculate height
        let height = items.length;
        if (hasTitle) height += 2; // Title + separator
        if (hasBorder) height += 2; // Top and bottom border
        
        return { width, height };
    }

    /**
     * Calculate maximum item width for rendering
     */
    private calculateMaxItemWidth(): number {
        let maxWidth = 0;
        for (const item of this.items) {
            if (!item.separator) {
                let width = item.label.length;
                if (item.shortcut && this.options.showShortcuts) {
                    width += item.shortcut.length + 4; // [X] + space
                }
                if (item.icon && this.options.showIcons) {
                    width += 2; // Icon + space
                }
                maxWidth = Math.max(maxWidth, width);
            }
        }
        return maxWidth;
    }

    /**
     * Find the first selectable item index
     */
    private findFirstSelectableIndex(): number {
        for (let i = 0; i < this.items.length; i++) {
            if (!this.items[i].disabled && !this.items[i].separator) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Set menu items
     */
    setItems(items: MenuItem[]): void {
        this.items = items;
        this.selectedIndex = this.findFirstSelectableIndex();
        this.maxItemWidth = this.calculateMaxItemWidth();
        this.size = Menu.calculateSize(items, this.options);
        this.markDirty();
    }

    /**
     * Get menu items
     */
    getItems(): MenuItem[] {
        return this.items;
    }

    /**
     * Get selected item
     */
    getSelectedItem(): MenuItem | null {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            return this.items[this.selectedIndex];
        }
        return null;
    }

    /**
     * Get selected index
     */
    getSelectedIndex(): number {
        return this.selectedIndex;
    }

    /**
     * Set selected index
     */
    setSelectedIndex(index: number): void {
        if (index >= 0 && index < this.items.length) {
            const item = this.items[index];
            if (!item.disabled && !item.separator) {
                this.selectedIndex = index;
                this.markDirty();
            }
        }
    }

    /**
     * Set selection callback
     */
    setOnSelect(callback: (item: MenuItem) => void): void {
        this.onSelect = callback;
    }

    /**
     * Set cancel callback
     */
    setOnCancel(callback: () => void): void {
        this.onCancel = callback;
    }

    /**
     * Move selection up
     */
    private selectPrevious(): void {
        if (this.items.length === 0) return;
        
        let newIndex = this.selectedIndex - 1;
        
        // Find previous selectable item
        while (newIndex >= 0) {
            const item = this.items[newIndex];
            if (!item.disabled && !item.separator) {
                this.selectedIndex = newIndex;
                this.markDirty();
                return;
            }
            newIndex--;
        }
        
        // Wrap around if cycleSelection is enabled
        if (this.options.cycleSelection) {
            newIndex = this.items.length - 1;
            while (newIndex > this.selectedIndex) {
                const item = this.items[newIndex];
                if (!item.disabled && !item.separator) {
                    this.selectedIndex = newIndex;
                    this.markDirty();
                    return;
                }
                newIndex--;
            }
        }
    }

    /**
     * Move selection down
     */
    private selectNext(): void {
        if (this.items.length === 0) return;
        
        let newIndex = this.selectedIndex + 1;
        
        // Find next selectable item
        while (newIndex < this.items.length) {
            const item = this.items[newIndex];
            if (!item.disabled && !item.separator) {
                this.selectedIndex = newIndex;
                this.markDirty();
                return;
            }
            newIndex++;
        }
        
        // Wrap around if cycleSelection is enabled
        if (this.options.cycleSelection) {
            newIndex = 0;
            while (newIndex < this.selectedIndex) {
                const item = this.items[newIndex];
                if (!item.disabled && !item.separator) {
                    this.selectedIndex = newIndex;
                    this.markDirty();
                    return;
                }
                newIndex++;
            }
        }
    }

    /**
     * Execute selection
     */
    private executeSelection(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && this.onSelect) {
            this.onSelect(selectedItem);
        }
    }

    /**
     * Cancel menu
     */
    private cancelMenu(): void {
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        if (input.type !== 'key' || !this.state.focused) {
            return false;
        }

        switch (input.key) {
            case 'up':
                this.selectPrevious();
                return true;
                
            case 'down':
                this.selectNext();
                return true;
                
            case 'enter':
            case 'space':
                this.executeSelection();
                return true;
                
            case 'escape':
                this.cancelMenu();
                return true;
                
            case 'home':
                this.selectedIndex = this.findFirstSelectableIndex();
                this.markDirty();
                return true;
                
            case 'end':
                // Find last selectable item
                for (let i = this.items.length - 1; i >= 0; i--) {
                    if (!this.items[i].disabled && !this.items[i].separator) {
                        this.selectedIndex = i;
                        this.markDirty();
                        break;
                    }
                }
                return true;
                
            default:
                // Check for shortcut keys
                if (this.options.showShortcuts && input.key && input.key.length === 1) {
                    const key = input.key.toLowerCase();
                    for (let i = 0; i < this.items.length; i++) {
                        const item = this.items[i];
                        if (item.shortcut && 
                            item.shortcut.toLowerCase().includes(key) &&
                            !item.disabled && 
                            !item.separator) {
                            this.selectedIndex = i;
                            this.executeSelection();
                            return true;
                        }
                    }
                }
                return false;
        }
    }

    /**
     * Render the menu
     */
    render(): string {
        const lines: string[] = [];
        // If a specific border style is requested, use it; otherwise use theme
        let borderChars;
        if (this.options.borderStyle && this.options.borderStyle !== 'single') {
            // User explicitly specified a border style
            borderChars = BORDER_CHARS[this.options.borderStyle];
        } else {
            // Use theme-based border chars
            borderChars = this.themeManager.getBorderChars();
        }
        const hasBorder = this.options.showBorder !== false;
        const hasTitle = !!this.options.title;
        
        // Top border
        if (hasBorder) {
            const topBorder = this.themeManager.applyBorderColor(borderChars.topLeft) + 
                             this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width - 2)) + 
                             this.themeManager.applyBorderColor(borderChars.topRight);
            lines.push(topBorder);
        }
        
        // Title
        if (hasTitle) {
            const title = this.options.title!;
            const paddedTitle = this.padString(title, this.size.width - (hasBorder ? 2 : 0));
            const themedTitle = this.themeManager.applyTypography(paddedTitle, 'heading');
            const titleLine = hasBorder ? 
                this.themeManager.applyBorderColor(borderChars.vertical) + themedTitle + this.themeManager.applyBorderColor(borderChars.vertical) :
                themedTitle;
            lines.push(titleLine);
            
            // Title separator
            if (hasBorder) {
                const separator = this.themeManager.applyBorderColor(borderChars.leftT || borderChars.vertical) + 
                                this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width - 2)) + 
                                this.themeManager.applyBorderColor(borderChars.rightT || borderChars.vertical);
                lines.push(separator);
            } else {
                lines.push(this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width)));
            }
        }
        
        // Menu items
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const isSelected = i === this.selectedIndex;
            
            if (item.separator) {
                // Render separator
                if (hasBorder) {
                    const separator = this.themeManager.applyBorderColor(borderChars.leftT || borderChars.vertical) + 
                                    this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width - 2)) + 
                                    this.themeManager.applyBorderColor(borderChars.rightT || borderChars.vertical);
                    lines.push(separator);
                } else {
                    lines.push(this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width)));
                }
            } else {
                // Render menu item
                let itemText = '';
                
                // Selection indicator
                if (isSelected && this.state.focused) {
                    itemText += '▶ ';
                } else {
                    itemText += '  ';
                }
                
                // Icon
                if (this.options.showIcons && item.icon) {
                    itemText += item.icon + ' ';
                }
                
                // Label
                itemText += item.label;
                
                // Shortcut
                if (this.options.showShortcuts && item.shortcut) {
                    const currentLength = item.label.length + (item.icon && this.options.showIcons ? 2 : 0);
                    const shortcutText = '[' + item.shortcut + ']';
                    const spacer = ' '.repeat(Math.max(1, this.maxItemWidth - currentLength - shortcutText.length));
                    itemText += spacer + shortcutText;
                }
                
                // Pad to full width
                const paddedItem = this.padString(itemText, this.size.width - (hasBorder ? 2 : 0));
                
                // Apply colors
                let coloredItem = paddedItem;
                if (item.disabled) {
                    coloredItem = this.themeManager.applyColor(paddedItem, 'textDisabled');
                } else if (isSelected && this.state.focused) {
                    // Highlight selected item
                    const theme = this.themeManager.getCurrentTheme();
                    coloredItem = AnsiUtils.setBackgroundColor(theme.colors.selection) + 
                                 this.themeManager.applyColor(paddedItem, 'selectionText') + 
                                 AnsiUtils.reset();
                } else {
                    coloredItem = this.themeManager.applyColor(paddedItem, 'textPrimary');
                }
                
                // Add border
                const line = hasBorder ? 
                    this.themeManager.applyBorderColor(borderChars.vertical) + coloredItem + this.themeManager.applyBorderColor(borderChars.vertical) :
                    coloredItem;
                    
                lines.push(line);
            }
        }
        
        // Bottom border
        if (hasBorder) {
            const bottomBorder = this.themeManager.applyBorderColor(borderChars.bottomLeft) + 
                               this.themeManager.applyBorderColor(borderChars.horizontal.repeat(this.size.width - 2)) + 
                               this.themeManager.applyBorderColor(borderChars.bottomRight);
            lines.push(bottomBorder);
        }
        
        // Mark as clean
        this.markClean();
        
        return lines.join('\n');
    }

    /**
     * Pad string to specified width
     */
    private padString(str: string, width: number): string {
        if (str.length >= width) {
            return str.substring(0, width);
        }
        return str + ' '.repeat(width - str.length);
    }

    /**
     * Focus the menu
     */
    focus(): void {
        super.focus();
        if (this.options.autoFocus && this.selectedIndex === -1) {
            this.selectedIndex = this.findFirstSelectableIndex();
        }
    }

    /**
     * Set theme for the menu
     */
    setTheme(theme: Theme | string): void {
        this.themeManager.setTheme(theme);
        this.markDirty();
    }

    /**
     * Protected method exposure for testing
     */
    protected markClean(): void {
        super.markClean();
    }
}
