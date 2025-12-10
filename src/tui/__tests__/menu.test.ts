import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Menu, MenuItem, MenuOptions } from '../menu';
import { InputEvent } from '../types';

describe('Menu', () => {
    let menu: Menu;
    let items: MenuItem[];
    
    beforeEach(() => {
        items = [
            { id: 'file', label: 'File', shortcut: 'F' },
            { id: 'edit', label: 'Edit', shortcut: 'E' },
            { id: 'view', label: 'View', shortcut: 'V' },
            { id: 'help', label: 'Help', shortcut: 'H' }
        ];
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            menu = new Menu('test-menu', items);
            
            expect(menu.id).toBe('test-menu');
            expect(menu.getItems()).toEqual(items);
            expect(menu.getSelectedIndex()).toBe(0);
            expect(menu.visible).toBe(true);
        });

        it('should calculate size automatically', () => {
            menu = new Menu('test-menu', items);
            
            // Width should accommodate longest item + shortcuts + borders
            expect(menu.size.width).toBeGreaterThan(10);
            // Height should be items + borders
            expect(menu.size.height).toBe(items.length + 2); // +2 for borders
        });

        it('should handle empty items array', () => {
            menu = new Menu('test-menu', []);
            
            expect(menu.getItems()).toEqual([]);
            expect(menu.getSelectedIndex()).toBe(-1);
            expect(menu.getSelectedItem()).toBeNull();
        });

        it('should skip disabled items for initial selection', () => {
            items[0].disabled = true;
            menu = new Menu('test-menu', items);
            
            expect(menu.getSelectedIndex()).toBe(1); // Should select 'Edit'
        });

        it('should handle all disabled items', () => {
            items.forEach(item => item.disabled = true);
            menu = new Menu('test-menu', items);
            
            expect(menu.getSelectedIndex()).toBe(-1);
        });

        it('should apply custom options', () => {
            const options: MenuOptions = {
                title: 'Main Menu',
                showBorder: false,
                cycleSelection: false,
                borderStyle: 'double'
            };
            menu = new Menu('test-menu', items, options);
            
            const rendered = menu.render();
            expect(rendered).toContain('Main Menu');
            expect(rendered).not.toContain('┌'); // No single border chars
        });
    });

    describe('item management', () => {
        beforeEach(() => {
            menu = new Menu('test-menu', items);
        });

        it('should get items', () => {
            expect(menu.getItems()).toEqual(items);
        });

        it('should set new items', () => {
            const newItems: MenuItem[] = [
                { id: 'new1', label: 'New Item 1' },
                { id: 'new2', label: 'New Item 2' }
            ];
            
            menu.setItems(newItems);
            
            expect(menu.getItems()).toEqual(newItems);
            expect(menu.getSelectedIndex()).toBe(0);
        });

        it('should get selected item', () => {
            const selectedItem = menu.getSelectedItem();
            
            expect(selectedItem).toEqual(items[0]);
        });

        it('should set selected index', () => {
            menu.setSelectedIndex(2);
            
            expect(menu.getSelectedIndex()).toBe(2);
            expect(menu.getSelectedItem()).toEqual(items[2]);
        });

        it('should not select disabled item', () => {
            items[2].disabled = true;
            menu = new Menu('test-menu', items);
            
            menu.setSelectedIndex(2);
            
            expect(menu.getSelectedIndex()).toBe(0); // Should remain at 0
        });

        it('should not select separator', () => {
            items[1].separator = true;
            menu = new Menu('test-menu', items);
            
            menu.setSelectedIndex(1);
            
            expect(menu.getSelectedIndex()).toBe(0); // Should remain at 0
        });
    });

    describe('keyboard navigation', () => {
        beforeEach(() => {
            menu = new Menu('test-menu', items);
            menu.focus();
        });

        it('should move selection down on down arrow', () => {
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(1);
        });

        it('should move selection up on up arrow', () => {
            menu.setSelectedIndex(2);
            
            const event: InputEvent = {
                type: 'key',
                key: 'up',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(1);
        });

        it('should wrap around when cycleSelection is true', () => {
            menu.setSelectedIndex(3); // Last item
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(0); // Wrapped to first
        });

        it('should not wrap when cycleSelection is false', () => {
            menu = new Menu('test-menu', items, { cycleSelection: false });
            menu.focus();
            menu.setSelectedIndex(3); // Last item
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(3); // Should stay at last
        });

        it('should skip disabled items during navigation', () => {
            items[1].disabled = true;
            menu = new Menu('test-menu', items);
            menu.focus();
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(2); // Should skip to View
        });

        it('should skip separators during navigation', () => {
            items[1].separator = true;
            menu = new Menu('test-menu', items);
            menu.focus();
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(2); // Should skip to View
        });

        it('should go to first item on home key', () => {
            menu.setSelectedIndex(3);
            
            const event: InputEvent = {
                type: 'key',
                key: 'home',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(0);
        });

        it('should go to last item on end key', () => {
            const event: InputEvent = {
                type: 'key',
                key: 'end',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(3);
        });
    });

    describe('selection and callbacks', () => {
        let onSelectSpy: ReturnType<typeof vi.fn>;
        let onCancelSpy: ReturnType<typeof vi.fn>;
        
        beforeEach(() => {
            menu = new Menu('test-menu', items);
            menu.focus();
            onSelectSpy = vi.fn();
            onCancelSpy = vi.fn();
            menu.setOnSelect(onSelectSpy);
            menu.setOnCancel(onCancelSpy);
        });

        it('should trigger onSelect on enter key', () => {
            const event: InputEvent = {
                type: 'key',
                key: 'enter',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(onSelectSpy).toHaveBeenCalledWith(items[0]);
            expect(onCancelSpy).not.toHaveBeenCalled();
        });

        it('should trigger onSelect on space key', () => {
            menu.setSelectedIndex(1);
            
            const event: InputEvent = {
                type: 'key',
                key: 'space',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(onSelectSpy).toHaveBeenCalledWith(items[1]);
        });

        it('should trigger onCancel on escape key', () => {
            const event: InputEvent = {
                type: 'key',
                key: 'escape',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(onCancelSpy).toHaveBeenCalled();
            expect(onSelectSpy).not.toHaveBeenCalled();
        });

        it('should not trigger onSelect for disabled items', () => {
            items[0].disabled = true;
            menu = new Menu('test-menu', items);
            menu.focus();
            menu.setOnSelect(onSelectSpy);
            
            // Try to select the disabled item (it shouldn't be selected)
            const event: InputEvent = {
                type: 'key',
                key: 'enter',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            menu.handleInput(event);
            
            // Since item 0 is disabled, selection should have moved to item 1
            expect(onSelectSpy).toHaveBeenCalledWith(items[1]);
        });
    });

    describe('shortcut keys', () => {
        beforeEach(() => {
            menu = new Menu('test-menu', items);
            menu.focus();
        });

        it('should select and execute item by shortcut key', () => {
            const onSelectSpy = vi.fn();
            menu.setOnSelect(onSelectSpy);
            
            const event: InputEvent = {
                type: 'key',
                key: 'e', // Shortcut for Edit
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(1); // Edit item
            expect(onSelectSpy).toHaveBeenCalledWith(items[1]);
        });

        it('should handle uppercase shortcut keys', () => {
            const onSelectSpy = vi.fn();
            menu.setOnSelect(onSelectSpy);
            
            const event: InputEvent = {
                type: 'key',
                key: 'E', // Uppercase shortcut
                ctrl: false,
                alt: false,
                shift: true
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(onSelectSpy).toHaveBeenCalledWith(items[1]);
        });

        it('should not trigger on disabled item shortcut', () => {
            items[1].disabled = true;
            menu = new Menu('test-menu', items);
            menu.focus();
            
            const onSelectSpy = vi.fn();
            menu.setOnSelect(onSelectSpy);
            
            const event: InputEvent = {
                type: 'key',
                key: 'e',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(false);
            expect(onSelectSpy).not.toHaveBeenCalled();
        });
    });

    describe('rendering', () => {
        beforeEach(() => {
            menu = new Menu('test-menu', items);
        });

        it('should render menu with borders', () => {
            const rendered = menu.render();
            
            expect(rendered).toContain('┌'); // Top left corner
            expect(rendered).toContain('┐'); // Top right corner
            expect(rendered).toContain('└'); // Bottom left corner
            expect(rendered).toContain('┘'); // Bottom right corner
            expect(rendered).toContain('File');
            expect(rendered).toContain('Edit');
            expect(rendered).toContain('View');
            expect(rendered).toContain('Help');
        });

        it('should render without borders', () => {
            menu = new Menu('test-menu', items, { showBorder: false });
            const rendered = menu.render();
            
            expect(rendered).not.toContain('┌');
            expect(rendered).toContain('File');
        });

        it('should render with title', () => {
            menu = new Menu('test-menu', items, { title: 'Main Menu' });
            const rendered = menu.render();
            
            expect(rendered).toContain('Main Menu');
        });

        it('should render shortcuts', () => {
            const rendered = menu.render();
            
            expect(rendered).toContain('[F]');
            expect(rendered).toContain('[E]');
            expect(rendered).toContain('[V]');
            expect(rendered).toContain('[H]');
        });

        it('should not render shortcuts when disabled', () => {
            menu = new Menu('test-menu', items, { showShortcuts: false });
            const rendered = menu.render();
            
            expect(rendered).not.toContain('[F]');
            expect(rendered).toContain('File');
        });

        it('should render icons when enabled', () => {
            items[0].icon = '📁';
            items[1].icon = '✏️';
            menu = new Menu('test-menu', items, { showIcons: true });
            
            const rendered = menu.render();
            
            expect(rendered).toContain('📁');
            expect(rendered).toContain('✏️');
        });

        it('should render separators', () => {
            items.splice(2, 0, { id: 'sep', label: '', separator: true });
            menu = new Menu('test-menu', items);
            
            const rendered = menu.render();
            const lines = rendered.split('\n');
            
            // Should have a separator line
            expect(lines.some(line => line.includes('├') && line.includes('┤'))).toBe(true);
        });

        it('should render with different border styles', () => {
            menu = new Menu('test-menu', items, { borderStyle: 'double' });
            const rendered = menu.render();
            
            expect(rendered).toContain('╔'); // Double border top left
            expect(rendered).toContain('╗'); // Double border top right
            expect(rendered).toContain('═'); // Double horizontal
        });

        it('should highlight selected item when focused', () => {
            menu.focus();
            const rendered = menu.render();
            
            // Should contain selection indicator
            expect(rendered).toContain('▶');
        });

        it('should not highlight when not focused', () => {
            const rendered = menu.render();
            
            // Should not contain selection indicator
            expect(rendered).not.toContain('▶');
        });
    });

    describe('focus behavior', () => {
        it('should auto-select first item on focus with autoFocus', () => {
            menu = new Menu('test-menu', items, { autoFocus: true });
            expect(menu.getSelectedIndex()).toBe(0);
            
            menu.blur();
            menu.focus();
            
            expect(menu.getSelectedIndex()).toBe(0);
        });

        it('should not handle input when not focused', () => {
            menu = new Menu('test-menu', items);
            // Don't focus the menu
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(false);
            expect(menu.getSelectedIndex()).toBe(0); // Should not change
        });
    });

    describe('edge cases', () => {
        it('should handle empty menu navigation', () => {
            menu = new Menu('test-menu', []);
            menu.focus();
            
            const event: InputEvent = {
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = menu.handleInput(event);
            
            expect(handled).toBe(true);
            expect(menu.getSelectedIndex()).toBe(-1);
        });

        it('should handle all separators', () => {
            const separatorItems: MenuItem[] = [
                { id: 'sep1', label: '', separator: true },
                { id: 'sep2', label: '', separator: true }
            ];
            
            menu = new Menu('test-menu', separatorItems);
            
            expect(menu.getSelectedIndex()).toBe(-1);
        });

        it('should handle mixed disabled and separator items', () => {
            const mixedItems: MenuItem[] = [
                { id: 'item1', label: 'Item 1', disabled: true },
                { id: 'sep', label: '', separator: true },
                { id: 'item2', label: 'Item 2' },
                { id: 'item3', label: 'Item 3', disabled: true }
            ];
            
            menu = new Menu('test-menu', mixedItems);
            menu.focus();
            
            expect(menu.getSelectedIndex()).toBe(2); // Should select Item 2
        });

        it('should handle long labels', () => {
            const longItems: MenuItem[] = [
                { id: 'long', label: 'This is a very long menu item label that should be handled properly' }
            ];
            
            menu = new Menu('test-menu', longItems);
            const rendered = menu.render();
            
            expect(rendered).toBeDefined();
            expect(rendered.length).toBeGreaterThan(0);
        });
    });
});
