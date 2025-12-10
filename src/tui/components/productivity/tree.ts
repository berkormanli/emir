import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface TreeNode {
    id: string;
    label: string;
    icon?: string;
    children?: TreeNode[];
    expanded?: boolean;
    selected?: boolean;
    disabled?: boolean;
    data?: any;
    tooltip?: string;
    loadChildren?: () => Promise<TreeNode[]>;
    hasChildren?: boolean;
}

export interface TreeConfig {
    multiSelect?: boolean;
    showIcons?: boolean;
    showLines?: boolean;
    indentSize?: number;
    virtualScrolling?: boolean;
    itemHeight?: number;
    searchPlaceholder?: string;
    searchable?: boolean;
    expandOnSelect?: boolean;
    lazyLoad?: boolean;
    showCounts?: boolean;
    keyboardNavigation?: boolean;
}

export class Tree extends BaseComponent {
    private nodes: TreeNode[] = [];
    private expandedIds: Set<string> = new Set();
    private selectedIds: Set<string> = new Set();
    private config: Required<TreeConfig>;
    private theme: ThemeManager;
    private selectedIndex = 0;
    private searchTerm = '';
    private isSearching = false;
    private searchResults: TreeNode[] = [];
    private loadingNodes: Set<string> = new Set();
    private virtualOffset = 0;
    private visibleNodes: TreeNode[] = [];
    private nodePaths: Map<string, TreeNode[]> = new Map();

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: TreeConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            multiSelect: config.multiSelect ?? false,
            showIcons: config.showIcons ?? true,
            showLines: config.showLines ?? true,
            indentSize: config.indentSize ?? 2,
            virtualScrolling: config.virtualScrolling ?? true,
            itemHeight: config.itemHeight ?? 1,
            searchPlaceholder: config.searchPlaceholder ?? 'Search...',
            searchable: config.searchable ?? false,
            expandOnSelect: config.expandOnSelect ?? false,
            lazyLoad: config.lazyLoad ?? false,
            showCounts: config.showCounts ?? true,
            keyboardNavigation: config.keyboardNavigation ?? true
        };
        this.theme = ThemeManager.getInstance();
    }

    setNodes(nodes: TreeNode[]): void {
        this.nodes = nodes;
        this.updateNodePaths();
        this.updateVisibleNodes();
        this.markDirty();
    }

    getNodes(): readonly TreeNode[] {
        return this.nodes;
    }

    expandNode(nodeId: string): void {
        const node = this.findNode(nodeId);
        if (node && node.children && node.children.length > 0) {
            this.expandedIds.add(nodeId);
            if (this.config.lazyLoad && node.loadChildren && node.children.length === 0) {
                this.loadChildren(node);
            }
            this.updateVisibleNodes();
            this.markDirty();
        }
    }

    collapseNode(nodeId: string): void {
        this.expandedIds.delete(nodeId);
        this.updateVisibleNodes();
        this.markDirty();
    }

    toggleNode(nodeId: string): void {
        if (this.expandedIds.has(nodeId)) {
            this.collapseNode(nodeId);
        } else {
            this.expandNode(nodeId);
        }
    }

    selectNode(nodeId: string, addToSelection: boolean = false): void {
        const node = this.findNode(nodeId);
        if (!node || node.disabled) return;

        if (this.config.multiSelect && addToSelection) {
            if (this.selectedIds.has(nodeId)) {
                this.selectedIds.delete(nodeId);
            } else {
                this.selectedIds.add(nodeId);
            }
        } else {
            this.selectedIds.clear();
            this.selectedIds.add(nodeId);
        }

        if (this.config.expandOnSelect) {
            this.expandNode(nodeId);
        }

        this.markDirty();
    }

    clearSelection(): void {
        this.selectedIds.clear();
        this.markDirty();
    }

    getSelectedNodes(): TreeNode[] {
        return Array.from(this.selectedIds)
            .map(id => this.findNode(id))
            .filter(Boolean) as TreeNode[];
    }

    search(term: string): void {
        this.searchTerm = term.toLowerCase();
        this.isSearching = this.searchTerm.length > 0;

        if (this.isSearching) {
            this.searchResults = this.performSearch(this.searchTerm);
        } else {
            this.searchResults = [];
        }

        this.updateVisibleNodes();
        this.markDirty();
    }

    private performSearch(term: string): TreeNode[] {
        const results: TreeNode[] = [];

        const searchRecursive = (nodes: TreeNode[]): void => {
            for (const node of nodes) {
                if (node.label.toLowerCase().includes(term)) {
                    results.push(node);
                    this.expandPath(node.id);
                }

                if (node.children) {
                    searchRecursive(node.children);
                }
            }
        };

        searchRecursive(this.nodes);
        return results;
    }

    private expandPath(nodeId: string): void {
        const path = this.nodePaths.get(nodeId);
        if (path) {
            for (let i = 0; i < path.length - 1; i++) {
                this.expandedIds.add(path[i].id);
            }
        }
    }

    private async loadChildren(node: TreeNode): Promise<void> {
        if (!node.loadChildren || this.loadingNodes.has(node.id)) return;

        this.loadingNodes.add(node.id);
        this.markDirty();

        try {
            const children = await node.loadChildren();
            if (children && children.length > 0) {
                node.children = children;
                node.hasChildren = true;
                this.updateNodePaths();
                this.updateVisibleNodes();
            }
        } catch (error) {
            console.error('Failed to load children for node', node.id, error);
        } finally {
            this.loadingNodes.delete(node.id);
            this.markDirty();
        }
    }

    private findNode(nodeId: string, nodes: TreeNode[] = this.nodes): TreeNode | null {
        for (const node of nodes) {
            if (node.id === nodeId) return node;
            if (node.children) {
                const found = this.findNode(nodeId, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    private updateNodePaths(): void {
        this.nodePaths.clear();

        const buildPaths = (nodes: TreeNode[], path: TreeNode[] = []): void => {
            for (const node of nodes) {
                const nodePath = [...path, node];
                this.nodePaths.set(node.id, nodePath);
                if (node.children) {
                    buildPaths(node.children, nodePath);
                }
            }
        };

        buildPaths(this.nodes);
    }

    private updateVisibleNodes(): void {
        if (this.isSearching) {
            this.visibleNodes = this.searchResults;
        } else {
            this.visibleNodes = [];
            this.flattenNodes(this.nodes, 0);
        }

        if (this.config.virtualScrolling) {
            const viewportHeight = Math.floor(this.size.height / this.config.itemHeight);
            const maxOffset = Math.max(0, this.visibleNodes.length - viewportHeight);
            this.virtualOffset = Math.min(this.virtualOffset, maxOffset);
        }
    }

    private flattenNodes(nodes: TreeNode[], depth: number): void {
        for (const node of nodes) {
            this.visibleNodes.push({ ...node, _depth: depth } as any);

            if (this.expandedIds.has(node.id) && node.children) {
                this.flattenNodes(node.children, depth + 1);
            }
        }
    }

    handleInput(input: InputEvent): boolean {
        if (!this.config.keyboardNavigation) return false;

        if (input.type === 'key') {
            switch (input.key) {
                case 'up':
                case 'ArrowUp':
                    this.navigateUp();
                    return true;

                case 'down':
                case 'ArrowDown':
                    this.navigateDown();
                    return true;

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
                case ' ':
                    this.activateSelected();
                    return true;

                case 'a':
                    if (input.ctrl) {
                        this.selectAll();
                        return true;
                    }
                    break;

                case '/':
                    if (this.config.searchable && !this.isSearching) {
                        this.isSearching = true;
                        this.searchTerm = '';
                        this.markDirty();
                        return true;
                    }
                    break;

                case 'escape':
                    if (this.isSearching) {
                        this.isSearching = false;
                        this.searchTerm = '';
                        this.updateVisibleNodes();
                        this.markDirty();
                    } else {
                        this.blur();
                    }
                    return true;

                default:
                    if (this.isSearching && input.key && input.key.length === 1) {
                        this.searchTerm += input.key;
                        this.search(this.searchTerm);
                        return true;
                    } else if (this.isSearching && input.key === 'backspace') {
                        this.searchTerm = this.searchTerm.slice(0, -1);
                        this.search(this.searchTerm);
                        return true;
                    }
            }
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (this.isSearching && y === 0) {
            return true;
        }

        const itemIndex = y + this.virtualOffset;
        if (itemIndex >= 0 && itemIndex < this.visibleNodes.length) {
            const node = this.visibleNodes[itemIndex];
            const depth = (node as any)._depth || 0;
            const iconX = depth * this.config.indentSize;

            if (x >= iconX && x < iconX + 2) {
                if (input.mouse.action === 'press') {
                    this.toggleNode(node.id);
                    return true;
                }
            } else {
                if (input.mouse.action === 'press') {
                    this.selectNode(node.id, input.ctrl);
                    return true;
                }
            }
        }

        return false;
    }

    private navigateUp(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.ensureSelectedVisible();
            this.markDirty();
        }
    }

    private navigateDown(): void {
        if (this.selectedIndex < this.visibleNodes.length - 1) {
            this.selectedIndex++;
            this.ensureSelectedVisible();
            this.markDirty();
        }
    }

    private navigateLeft(): void {
        const selectedNode = this.getSelectedNode();
        if (selectedNode && this.expandedIds.has(selectedNode.id)) {
            this.collapseNode(selectedNode.id);
        }
    }

    private navigateRight(): void {
        const selectedNode = this.getSelectedNode();
        if (selectedNode && !this.expandedIds.has(selectedNode.id)) {
            this.expandNode(selectedNode.id);
        }
    }

    private activateSelected(): void {
        const selectedNode = this.getSelectedNode();
        if (selectedNode) {
            this.selectNode(selectedNode.id, this.config.multiSelect);
            if (selectedNode.children && selectedNode.children.length > 0) {
                this.toggleNode(selectedNode.id);
            }
        }
    }

    private selectAll(): void {
        if (this.config.multiSelect) {
            this.selectedIds.clear();
            const allIds = this.getAllNodeIds(this.nodes);
            for (const id of allIds) {
                this.selectedIds.add(id);
            }
            this.markDirty();
        }
    }

    private getAllNodeIds(nodes: TreeNode[]): string[] {
        const ids: string[] = [];
        for (const node of nodes) {
            ids.push(node.id);
            if (node.children) {
                ids.push(...this.getAllNodeIds(node.children));
            }
        }
        return ids;
    }

    private getSelectedNode(): TreeNode | null {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.visibleNodes.length) {
            return this.visibleNodes[this.selectedIndex];
        }
        return null;
    }

    private ensureSelectedVisible(): void {
        if (!this.config.virtualScrolling) return;

        const viewportHeight = Math.floor(this.size.height / this.config.itemHeight);

        if (this.selectedIndex < this.virtualOffset) {
            this.virtualOffset = this.selectedIndex;
        } else if (this.selectedIndex >= this.virtualOffset + viewportHeight) {
            this.virtualOffset = this.selectedIndex - viewportHeight + 1;
        }
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.config.searchable) {
            let searchLine = 'Search: ' + this.searchTerm;
            if (this.isSearching) {
                searchLine += '_';
            }
            lines.push(theme.applyColor(searchLine, 'textSecondary'));
        }

        const startIdx = this.virtualOffset;
        const endIdx = Math.min(
            this.visibleNodes.length,
            this.virtualOffset + Math.floor(this.size.height / this.config.itemHeight) - (this.config.searchable ? 1 : 0)
        );

        for (let i = startIdx; i < endIdx; i++) {
            const node = this.visibleNodes[i];
            const depth = (node as any)._depth || 0;
            const isSelected = this.selectedIds.has(node.id);
            const isFocused = this.state.focused && i === this.selectedIndex;
            const isLoading = this.loadingNodes.has(node.id);

            let line = ' '.repeat(depth * this.config.indentSize);

            if (node.children && node.children.length > 0) {
                const expanded = this.expandedIds.has(node.id);
                line += expanded ? '▼ ' : '▶ ';
            } else if (node.hasChildren) {
                line += isLoading ? '⏳ ' : '▶ ';
            } else {
                line += '  ';
            }

            if (this.config.showIcons && node.icon) {
                line += node.icon + ' ';
            }

            line += node.label;

            if (this.config.showCounts && node.children && node.children.length > 0) {
                line += ` (${node.children.length})`;
            }

            if (isSelected) {
                line = this.theme.applyColor(line, 'selection');
            } else if (isFocused) {
                line = this.theme.applyColor(line, 'focus');
            } else if (node.disabled) {
                line = this.theme.applyColor(line, 'textDisabled');
            } else {
                line = this.theme.applyColor(line, 'textPrimary');
            }

            lines.push(line);
        }

        return lines.join('\n');
    }
}