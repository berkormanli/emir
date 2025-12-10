import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutUtils, Spacing } from '../layout-utils';
import { Box } from '../box';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { BaseComponent } from '../base-component';
import { Position, Size } from '../types';

// Mock component for testing
class MockComponent extends BaseComponent {
    private content: string;
    
    constructor(id: string, content: string = '', position?: Position, size?: Size) {
        super(id, position, size);
        this.content = content;
    }
    
    render(): string {
        const lines: string[] = [];
        for (let y = 0; y < this.size.height; y++) {
            lines.push(this.content.repeat(this.size.width));
        }
        return lines.join('\n');
    }
    
    handleInput(): boolean {
        return false;
    }
}

describe('LayoutUtils', () => {
    describe('parseSpacing', () => {
        it('should parse single number', () => {
            const spacing = LayoutUtils.parseSpacing(5);
            expect(spacing).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
        });

        it('should parse two numbers array', () => {
            const spacing = LayoutUtils.parseSpacing([2, 4]);
            expect(spacing).toEqual({ top: 2, right: 4, bottom: 2, left: 4 });
        });

        it('should parse three numbers array', () => {
            const spacing = LayoutUtils.parseSpacing([1, 2, 3]);
            expect(spacing).toEqual({ top: 1, right: 2, bottom: 3, left: 2 });
        });

        it('should parse four numbers array', () => {
            const spacing = LayoutUtils.parseSpacing([1, 2, 3, 4]);
            expect(spacing).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
        });

        it('should parse spacing object', () => {
            const spacing = LayoutUtils.parseSpacing({ top: 1, left: 2 });
            expect(spacing).toEqual({ top: 1, right: 0, bottom: 0, left: 2 });
        });
    });

    describe('getContentArea', () => {
        it('should calculate content area with padding', () => {
            const size = { width: 100, height: 50 };
            const padding = { top: 5, right: 10, bottom: 5, left: 10 };
            const content = LayoutUtils.getContentArea(size, padding);
            expect(content).toEqual({ width: 80, height: 40 });
        });

        it('should handle zero size', () => {
            const size = { width: 10, height: 10 };
            const padding = { top: 5, right: 5, bottom: 5, left: 5 };
            const content = LayoutUtils.getContentArea(size, padding);
            expect(content).toEqual({ width: 0, height: 0 });
        });
    });

    describe('applyConstraints', () => {
        it('should apply min/max width constraints', () => {
            const size = { width: 50, height: 30 };
            const constraints = { minWidth: 60, maxWidth: 100 };
            const result = LayoutUtils.applyConstraints(size, constraints);
            expect(result.width).toBe(60);
        });

        it('should apply percentage width', () => {
            const size = { width: 50, height: 30 };
            const parentSize = { width: 200, height: 100 };
            const constraints = { width: '50%' };
            const result = LayoutUtils.applyConstraints(size, constraints, parentSize);
            expect(result.width).toBe(100);
        });

        it('should apply fixed dimensions', () => {
            const size = { width: 50, height: 30 };
            const constraints = { width: 80, height: 40 };
            const result = LayoutUtils.applyConstraints(size, constraints);
            expect(result).toEqual({ width: 80, height: 40 });
        });
    });

    describe('alignInParent', () => {
        it('should align center', () => {
            const childSize = { width: 20, height: 10 };
            const parentSize = { width: 100, height: 50 };
            const pos = LayoutUtils.alignInParent(childSize, parentSize, 'center', 'center');
            expect(pos).toEqual({ x: 40, y: 20 });
        });

        it('should align end', () => {
            const childSize = { width: 20, height: 10 };
            const parentSize = { width: 100, height: 50 };
            const pos = LayoutUtils.alignInParent(childSize, parentSize, 'end', 'end');
            expect(pos).toEqual({ x: 80, y: 40 });
        });

        it('should align start (default)', () => {
            const childSize = { width: 20, height: 10 };
            const parentSize = { width: 100, height: 50 };
            const pos = LayoutUtils.alignInParent(childSize, parentSize, 'start', 'start');
            expect(pos).toEqual({ x: 0, y: 0 });
        });
    });

    describe('distributeFlexSpace', () => {
        it('should distribute with justify start', () => {
            const result = LayoutUtils.distributeFlexSpace(100, 3, 10, 'start');
            expect(result.positions).toEqual([0, 10, 20]);
            expect(result.spacing).toBe(10);
        });

        it('should distribute with justify center', () => {
            const result = LayoutUtils.distributeFlexSpace(100, 3, 10, 'center');
            // 3 items with 10px gap = 20px total gap, 100-20=80 remaining, 80/2=40 offset
            expect(result.positions[0]).toBe(40);
        });

        it('should distribute with justify space-between', () => {
            const result = LayoutUtils.distributeFlexSpace(100, 3, 0, 'space-between');
            expect(result.positions).toEqual([0, 50, 100]);
        });

        it('should distribute with justify space-around', () => {
            const result = LayoutUtils.distributeFlexSpace(100, 2, 0, 'space-around');
            expect(result.positions).toEqual([25, 75]);
        });

        it('should distribute with justify space-evenly', () => {
            const result = LayoutUtils.distributeFlexSpace(99, 2, 0, 'space-evenly');
            expect(result.positions).toEqual([33, 66]);
        });
    });

    describe('calculateFlexItemSizes', () => {
        it('should calculate sizes with flex-grow', () => {
            const items = [
                { flexGrow: 1, minSize: 10 },
                { flexGrow: 2, minSize: 10 },
                { flexGrow: 1, minSize: 10 }
            ];
            const sizes = LayoutUtils.calculateFlexItemSizes(items, 100, 0);
            // 100 - 30 (min sizes) = 70 remaining
            // flexGrow total = 4, so: 17.5, 35, 17.5 (floored)
            expect(sizes[0]).toBe(27); // 10 + 17
            expect(sizes[1]).toBe(45); // 10 + 35
            expect(sizes[2]).toBe(27); // 10 + 17
        });

        it('should respect max size constraints', () => {
            const items = [
                { flexGrow: 1, minSize: 10, maxSize: 20 }
            ];
            const sizes = LayoutUtils.calculateFlexItemSizes(items, 100, 0);
            expect(sizes[0]).toBe(20); // Limited by maxSize
        });
    });

    describe('calculateGridLayout', () => {
        it('should calculate grid with equal cells', () => {
            const containerSize = { width: 100, height: 100 };
            const result = LayoutUtils.calculateGridLayout(containerSize, 2, 2, 10);
            
            // (100 - 10) / 2 = 45 per cell
            expect(result.cellSize).toEqual({ width: 45, height: 45 });
            expect(result.positions).toHaveLength(4);
            expect(result.positions[0]).toEqual({ x: 0, y: 0 });
            expect(result.positions[1]).toEqual({ x: 55, y: 0 });
            expect(result.positions[2]).toEqual({ x: 0, y: 55 });
            expect(result.positions[3]).toEqual({ x: 55, y: 55 });
        });

        it('should handle padding', () => {
            const containerSize = { width: 100, height: 100 };
            const padding = { top: 10, right: 10, bottom: 10, left: 10 };
            const result = LayoutUtils.calculateGridLayout(containerSize, 2, 2, 0, padding);
            
            // Content area: 80x80, each cell: 40x40
            expect(result.cellSize).toEqual({ width: 40, height: 40 });
            expect(result.positions[0]).toEqual({ x: 10, y: 10 });
        });
    });
});

describe('Box Component', () => {
    let box: Box;
    let child: MockComponent;

    beforeEach(() => {
        box = new Box('test-box', {}, { x: 0, y: 0 }, { width: 20, height: 10 });
        child = new MockComponent('child', 'X', { x: 0, y: 0 }, { width: 5, height: 3 });
    });

    it('should create box with default options', () => {
        expect(box.getId()).toBe('test-box');
        expect(box.getSize()).toEqual({ width: 20, height: 10 });
    });

    it('should add and remove children', () => {
        box.addChild(child);
        expect(box.getChildren()).toHaveLength(1);
        
        box.removeChild('child');
        expect(box.getChildren()).toHaveLength(0);
    });

    it('should apply padding', () => {
        box.setOptions({ padding: 2 });
        box.addChild(child);
        
        // Child should be positioned with padding offset
        const childPos = child.getPosition();
        expect(childPos.x).toBeGreaterThanOrEqual(2);
        expect(childPos.y).toBeGreaterThanOrEqual(2);
    });

    it('should apply alignment', () => {
        box.setOptions({ 
            horizontalAlign: 'center',
            verticalAlign: 'center'
        });
        box.addChild(child);
        
        // Child should be centered
        const childPos = child.getPosition();
        expect(childPos.x).toBeGreaterThan(0);
        expect(childPos.y).toBeGreaterThan(0);
    });

    it('should render with border', () => {
        box.setOptions({ border: true, borderStyle: 'single' });
        const rendered = box.render();
        
        // Should contain border characters
        expect(rendered).toContain('┌');
        expect(rendered).toContain('┐');
        expect(rendered).toContain('└');
        expect(rendered).toContain('┘');
    });

    it('should render with title', () => {
        box.setOptions({ 
            border: true,
            title: 'Test Box',
            titleAlign: 'center'
        });
        const rendered = box.render();
        
        expect(rendered).toContain('Test Box');
    });

    it('should handle overflow hidden', () => {
        box.setOptions({ overflow: 'hidden' });
        const largeChild = new MockComponent('large', 'X', { x: 0, y: 0 }, { width: 100, height: 100 });
        box.addChild(largeChild);
        
        const rendered = box.render();
        const lines = rendered.split('\n');
        
        // Content should be clipped to box size
        expect(lines.length).toBeLessThanOrEqual(10);
        lines.forEach(line => {
            expect(line.length).toBeLessThanOrEqual(20);
        });
    });
});

describe('Flex Component', () => {
    let flex: Flex;
    let item1: MockComponent;
    let item2: MockComponent;
    let item3: MockComponent;

    beforeEach(() => {
        flex = new Flex('test-flex', {}, { x: 0, y: 0 }, { width: 100, height: 50 });
        item1 = new MockComponent('item1', '1', { x: 0, y: 0 }, { width: 10, height: 10 });
        item2 = new MockComponent('item2', '2', { x: 0, y: 0 }, { width: 10, height: 10 });
        item3 = new MockComponent('item3', '3', { x: 0, y: 0 }, { width: 10, height: 10 });
    });

    it('should create flex with default options', () => {
        const options = flex.getFlexOptions();
        expect(options.direction).toBe('row');
        expect(options.justifyContent).toBe('start');
        expect(options.alignItems).toBe('stretch');
    });

    it('should add flex items', () => {
        flex.addFlexItem({ component: item1 });
        flex.addFlexItem({ component: item2 });
        
        expect(flex.getFlexItems()).toHaveLength(2);
        expect(flex.getChildren()).toHaveLength(2);
    });

    it('should layout items in row', () => {
        flex.setFlexOptions({ direction: 'row', gap: 5 });
        flex.addFlexItem({ component: item1 });
        flex.addFlexItem({ component: item2 });
        
        // Items should be positioned horizontally
        const pos1 = item1.getPosition();
        const pos2 = item2.getPosition();
        
        expect(pos2.x).toBeGreaterThan(pos1.x);
        expect(pos2.y).toBe(pos1.y);
    });

    it('should layout items in column', () => {
        flex.setFlexOptions({ direction: 'column', gap: 5 });
        flex.addFlexItem({ component: item1 });
        flex.addFlexItem({ component: item2 });
        
        // Items should be positioned vertically
        const pos1 = item1.getPosition();
        const pos2 = item2.getPosition();
        
        expect(pos2.y).toBeGreaterThan(pos1.y);
        expect(pos2.x).toBe(pos1.x);
    });

    it('should apply flex-grow', () => {
        flex.setFlexOptions({ direction: 'row' });
        flex.addFlexItem({ component: item1, flexGrow: 1 });
        flex.addFlexItem({ component: item2, flexGrow: 2 });
        
        // item2 should be twice as wide as item1
        const size1 = item1.getSize();
        const size2 = item2.getSize();
        
        expect(size2.width).toBeGreaterThan(size1.width);
    });

    it('should justify content center', () => {
        flex.setFlexOptions({ 
            direction: 'row',
            justifyContent: 'center',
            gap: 0
        });
        flex.addFlexItem({ component: item1 });
        
        const pos = item1.getPosition();
        const flexSize = flex.getSize();
        const itemSize = item1.getSize();
        
        // Item should be centered horizontally
        const expectedX = Math.floor((flexSize.width - itemSize.width) / 2);
        expect(Math.abs(pos.x - expectedX)).toBeLessThanOrEqual(1);
    });

    it('should align items center', () => {
        flex.setFlexOptions({ 
            direction: 'row',
            alignItems: 'center'
        });
        flex.addFlexItem({ component: item1 });
        
        const pos = item1.getPosition();
        
        // Item should be centered vertically
        expect(pos.y).toBeGreaterThan(0);
    });

    it('should handle flex wrap', () => {
        flex.setFlexOptions({ 
            direction: 'row',
            flexWrap: 'wrap',
            gap: 5
        });
        
        // Add many items that don't fit in one row
        for (let i = 0; i < 10; i++) {
            const item = new MockComponent(`item${i}`, `${i}`, { x: 0, y: 0 }, { width: 20, height: 10 });
            flex.addFlexItem({ component: item });
        }
        
        // Some items should be on different rows
        const items = flex.getFlexItems();
        const positions = items.map(i => i.component.getPosition());
        const yPositions = [...new Set(positions.map(p => p.y))];
        
        expect(yPositions.length).toBeGreaterThan(1);
    });

    it('should reorder flex items', () => {
        flex.addFlexItem({ component: item1 });
        flex.addFlexItem({ component: item2 });
        flex.addFlexItem({ component: item3 });
        
        flex.reorderFlexItems(0, 2);
        
        const items = flex.getFlexItems();
        expect(items[0].component.getId()).toBe('item2');
        expect(items[2].component.getId()).toBe('item1');
    });
});

describe('Grid Component', () => {
    let grid: Grid;
    let item1: MockComponent;
    let item2: MockComponent;
    let item3: MockComponent;
    let item4: MockComponent;

    beforeEach(() => {
        grid = new Grid('test-grid', {}, { x: 0, y: 0 }, { width: 100, height: 100 });
        item1 = new MockComponent('item1', '1', { x: 0, y: 0 }, { width: 10, height: 10 });
        item2 = new MockComponent('item2', '2', { x: 0, y: 0 }, { width: 10, height: 10 });
        item3 = new MockComponent('item3', '3', { x: 0, y: 0 }, { width: 10, height: 10 });
        item4 = new MockComponent('item4', '4', { x: 0, y: 0 }, { width: 10, height: 10 });
    });

    it('should create grid with default options', () => {
        const options = grid.getGridOptions();
        expect(options.columns).toBe(1);
        expect(options.rows).toBe(1);
        expect(options.gap).toBe(0);
    });

    it('should add grid items', () => {
        grid.addGridItem({ component: item1 });
        grid.addGridItem({ component: item2 });
        
        expect(grid.getGridItems()).toHaveLength(2);
        expect(grid.getChildren()).toHaveLength(2);
    });

    it('should create 2x2 grid', () => {
        grid.setGridOptions({ columns: 2, rows: 2, gap: 10 });
        
        grid.addGridItem({ component: item1, column: 0, row: 0 });
        grid.addGridItem({ component: item2, column: 1, row: 0 });
        grid.addGridItem({ component: item3, column: 0, row: 1 });
        grid.addGridItem({ component: item4, column: 1, row: 1 });
        
        const dimensions = grid.getGridDimensions();
        expect(dimensions.columns).toBe(2);
        expect(dimensions.rows).toBe(2);
        
        // Check positions
        const pos1 = item1.getPosition();
        const pos2 = item2.getPosition();
        const pos3 = item3.getPosition();
        const pos4 = item4.getPosition();
        
        expect(pos2.x).toBeGreaterThan(pos1.x); // item2 is to the right of item1
        expect(pos3.y).toBeGreaterThan(pos1.y); // item3 is below item1
        expect(pos4.x).toBeGreaterThan(pos3.x); // item4 is to the right of item3
        expect(pos4.y).toBeGreaterThan(pos2.y); // item4 is below item2
    });

    it('should auto-place items', () => {
        grid.setGridOptions({ columns: 2, rows: 2, autoFlow: 'row' });
        
        grid.addGridItem({ component: item1 });
        grid.addGridItem({ component: item2 });
        grid.addGridItem({ component: item3 });
        
        // Items should be placed automatically in row order
        const pos1 = item1.getPosition();
        const pos2 = item2.getPosition();
        const pos3 = item3.getPosition();
        
        expect(pos2.x).toBeGreaterThan(pos1.x); // item2 next to item1
        expect(pos3.y).toBeGreaterThan(pos1.y); // item3 on next row
    });

    it('should handle column span', () => {
        grid.setGridOptions({ columns: 3, rows: 2 });
        
        grid.addGridItem({ 
            component: item1, 
            column: 0, 
            row: 0,
            columnSpan: 2 
        });
        
        const size = item1.getSize();
        const cellSize = grid.getCellSize(0, 0);
        
        // Item should span 2 columns
        expect(size.width).toBeGreaterThan(cellSize!.width);
    });

    it('should handle row span', () => {
        grid.setGridOptions({ columns: 2, rows: 3 });
        
        grid.addGridItem({ 
            component: item1, 
            column: 0, 
            row: 0,
            rowSpan: 2 
        });
        
        const size = item1.getSize();
        const cellSize = grid.getCellSize(0, 0);
        
        // Item should span 2 rows
        expect(size.height).toBeGreaterThan(cellSize!.height);
    });

    it('should parse grid template strings', () => {
        grid.setGridOptions({ 
            columns: '1fr 2fr 100px',
            rows: '50% 50%'
        });
        
        const dimensions = grid.getGridDimensions();
        expect(dimensions.columns).toBe(3);
        expect(dimensions.rows).toBe(2);
    });

    it('should align items in cells', () => {
        grid.setGridOptions({ 
            columns: 2,
            rows: 2,
            alignItems: 'center',
            justifyItems: 'center'
        });
        
        grid.addGridItem({ component: item1, column: 0, row: 0 });
        
        const pos = item1.getPosition();
        
        // Item should be centered in its cell
        expect(pos.x).toBeGreaterThan(0);
        expect(pos.y).toBeGreaterThan(0);
    });

    it('should get cell size', () => {
        grid.setGridOptions({ columns: 2, rows: 2, gap: 10 });
        
        const cellSize = grid.getCellSize(0, 0);
        expect(cellSize).toBeDefined();
        expect(cellSize!.width).toBeGreaterThan(0);
        expect(cellSize!.height).toBeGreaterThan(0);
        
        const invalidCell = grid.getCellSize(5, 5);
        expect(invalidCell).toBeNull();
    });
});
