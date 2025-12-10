import { TerminalController } from './terminal-controller.js';
import type { Component } from './types.js';

/**
 * Dirty region for tracking areas that need re-rendering
 */
export interface DirtyRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Render buffer containing the current screen state
 */
export class RenderBuffer {
    private buffer: string[][];
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.buffer = Array(height).fill(null).map(() => Array(width).fill(' '));
    }

    /**
     * Write text to the buffer at a specific position
     */
    write(x: number, y: number, text: string): void {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) return;

        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const lineY = y + i;
            if (lineY >= this.height) break;

            const line = lines[i];
            const lineLength = Math.min(line.length, this.width - x);

            for (let j = 0; j < lineLength; j++) {
                this.buffer[lineY][x + j] = line[j];
            }
        }
    }

    /**
     * Fill a rectangle with a character
     */
    fillRect(x: number, y: number, width: number, height: number, char: string = ' '): void {
        for (let i = 0; i < height; i++) {
            const lineY = y + i;
            if (lineY < 0 || lineY >= this.height) continue;

            for (let j = 0; j < width; j++) {
                const lineX = x + j;
                if (lineX < 0 || lineX >= this.width) continue;

                this.buffer[lineY][lineX] = char;
            }
        }
    }

    /**
     * Clear a rectangle (fill with spaces)
     */
    clearRect(x: number, y: number, width: number, height: number): void {
        this.fillRect(x, y, width, height, ' ');
    }

    /**
     * Compare with another buffer and return dirty regions
     */
    diff(other: RenderBuffer): DirtyRegion[] {
        const regions: DirtyRegion[] = [];
        let currentRegion: DirtyRegion | null = null;

        for (let y = 0; y < Math.max(this.height, other.height); y++) {
            let hasChanges = false;
            const lineHasChanges = new Array(Math.max(this.width, other.width)).fill(false);

            for (let x = 0; x < Math.max(this.width, other.width); x++) {
                const current = this.getCell(x, y);
                const otherCell = other.getCell(x, y);

                if (current !== otherCell) {
                    lineHasChanges[x] = true;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                // Find contiguous changed segments
                let startX = -1;
                let endX = -1;

                for (let x = 0; x < lineHasChanges.length; x++) {
                    if (lineHasChanges[x]) {
                        if (startX === -1) {
                            startX = x;
                        }
                        endX = x;
                    } else if (startX !== -1) {
                        // Add or merge region
                        const region: DirtyRegion = {
                            x: startX,
                            y: y,
                            width: endX - startX + 1,
                            height: 1
                        };

                        if (currentRegion && currentRegion.x === startX &&
                            currentRegion.width === region.width &&
                            currentRegion.y + currentRegion.height === y) {
                            // Extend current region
                            currentRegion.height++;
                        } else {
                            // Start new region
                            if (currentRegion) {
                                regions.push(currentRegion);
                            }
                            currentRegion = region;
                        }

                        startX = -1;
                    }
                }

                // Handle segment at end of line
                if (startX !== -1) {
                    const region: DirtyRegion = {
                        x: startX,
                        y: y,
                        width: endX - startX + 1,
                        height: 1
                    };

                    if (currentRegion && currentRegion.x === startX &&
                        currentRegion.width === region.width &&
                        currentRegion.y + currentRegion.height === y) {
                        currentRegion.height++;
                    } else {
                        if (currentRegion) {
                            regions.push(currentRegion);
                        }
                        currentRegion = region;
                    }
                }
            } else if (currentRegion) {
                // No changes on this line, finish current region
                regions.push(currentRegion);
                currentRegion = null;
            }
        }

        if (currentRegion) {
            regions.push(currentRegion);
        }

        return regions;
    }

    /**
     * Get the character at a specific position
     */
    private getCell(x: number, y: number): string {
        if (y >= this.height || y < 0 || x >= this.width || x < 0) {
            return ' ';
        }
        return this.buffer[y][x];
    }

    /**
     * Resize the buffer
     */
    resize(width: number, height: number): void {
        const newBuffer = Array(height).fill(null).map(() => Array(width).fill(' '));

        // Copy old content
        const copyHeight = Math.min(height, this.height);
        const copyWidth = Math.min(width, this.width);

        for (let y = 0; y < copyHeight; y++) {
            for (let x = 0; x < copyWidth; x++) {
                newBuffer[y][x] = this.buffer[y][x];
            }
        }

        this.buffer = newBuffer;
        this.width = width;
        this.height = height;
    }

    /**
     * Get the full buffer as a string
     */
    toString(): string {
        return this.buffer.map(row => row.join('')).join('\n');
    }

    /**
     * Get buffer dimensions
     */
    getDimensions(): { width: number; height: number } {
        return { width: this.width, height: this.height };
    }
}

/**
 * Frame throttler for controlling render rate
 */
export class FrameThrottler {
    private targetFPS: number;
    private frameInterval: number;
    private lastFrameTime: number = 0;
    private pendingFrame: boolean = false;

    constructor(targetFPS: number = 60) {
        this.targetFPS = targetFPS;
        this.frameInterval = 1000 / targetFPS;
    }

    /**
     * Check if a frame should be rendered
     */
    shouldRender(): boolean {
        const now = Date.now();
        const elapsed = now - this.lastFrameTime;

        if (elapsed >= this.frameInterval) {
            this.lastFrameTime = now;
            return true;
        }

        return false;
    }

    /**
     * Set target FPS
     */
    setTargetFPS(fps: number): void {
        this.targetFPS = fps;
        this.frameInterval = 1000 / fps;
    }

    /**
     * Get target FPS
     */
    getTargetFPS(): number {
        return this.targetFPS;
    }
}

/**
 * Advanced rendering engine with dirty-region optimization
 */
export class RenderEngine {
    private terminal: TerminalController;
    private frontBuffer: RenderBuffer;
    private backBuffer: RenderBuffer;
    private frameThrottler: FrameThrottler;
    private renderQueue: Set<Component> = new Set();
    private forceFullRender: boolean = false;

    constructor(terminal: TerminalController, targetFPS: number = 60) {
        this.terminal = terminal;
        const size = terminal.getTerminalSize();
        this.frontBuffer = new RenderBuffer(size.columns, size.rows);
        this.backBuffer = new RenderBuffer(size.columns, size.rows);
        this.frameThrottler = new FrameThrottler(targetFPS);
    }

    /**
     * Queue a component for re-rendering
     */
    queueComponent(component: Component): void {
        this.renderQueue.add(component);
    }

    /**
     * Force a full screen re-render on next frame
     */
    forceFullRender(): void {
        this.forceFullRender = true;
    }

    /**
     * Perform a render cycle
     */
    render(components: Component[]): void {
        if (!this.frameThrottler.shouldRender() && !this.forceFullRender) {
            return;
        }

        const size = this.terminal.getTerminalSize();

        // Resize buffers if terminal size changed
        if (size.columns !== this.backBuffer.getDimensions().width ||
            size.rows !== this.backBuffer.getDimensions().height) {
            this.resizeBuffers(size.columns, size.rows);
            this.forceFullRender = true;
        }

        // Clear back buffer
        this.backBuffer.resize(size.columns, size.rows);
        this.backBuffer.clearRect(0, 0, size.columns, size.rows);

        // Render components to back buffer
        const dirtyRegions = this.renderToBuffer(components);

        // Calculate dirty regions if not forcing full render
        const regionsToRender = this.forceFullRender ?
            [{ x: 0, y: 0, width: size.columns, height: size.rows }] :
            dirtyRegions.length > 0 ? dirtyRegions :
            this.frontBuffer.diff(this.backBuffer);

        // Apply changes to terminal
        this.applyRenderRegions(regionsToRender);

        // Swap buffers
        const temp = this.frontBuffer;
        this.frontBuffer = this.backBuffer;
        this.backBuffer = temp;

        // Reset state
        this.renderQueue.clear();
        this.forceFullRender = false;
    }

    /**
     * Render components to the back buffer and collect dirty regions
     */
    private renderToBuffer(components: Component[]): DirtyRegion[] {
        const dirtyRegions: DirtyRegion[] = [];

        for (const component of components) {
            if (!component.visible) continue;

            // Check if component needs rendering
            const needsRender = component.state?.dirty ||
                               this.renderQueue.has(component) ||
                               this.forceFullRender;

            if (needsRender) {
                // Render component
                const content = component.render();
                if (content) {
                    this.backBuffer.write(
                        component.position.x,
                        component.position.y,
                        content
                    );
                }

                // Mark component as clean
                if (component.state) {
                    component.state.dirty = false;
                }

                // Add dirty region
                dirtyRegions.push({
                    x: component.position.x,
                    y: component.position.y,
                    width: component.size.width,
                    height: component.size.height
                });
            } else {
                // Copy from front buffer
                this.copyComponentFromFront(component);
            }
        }

        return dirtyRegions;
    }

    /**
     * Copy a component from the front buffer to the back buffer
     */
    private copyComponentFromFront(component: Component): void {
        const { x, y } = component.position;
        const { width, height } = component.size;

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const sourceX = x + dx;
                const sourceY = y + dy;

                if (sourceX >= 0 && sourceX < this.frontBuffer.getDimensions().width &&
                    sourceY >= 0 && sourceY < this.frontBuffer.getDimensions().height) {

                    const cell = this.frontBuffer.toString().split('\n')[sourceY]?.[sourceX];
                    if (cell) {
                        this.backBuffer.write(sourceX, sourceY, cell);
                    }
                }
            }
        }
    }

    /**
     * Apply render regions to the terminal
     */
    private applyRenderRegions(regions: DirtyRegion[]): void {
        // Sort regions by position to minimize cursor movement
        regions.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        // Apply each region
        for (const region of regions) {
            this.terminal.setCursorPosition(region.x + 1, region.y + 1);

            // Extract region content from back buffer
            const lines = this.backBuffer.toString().split('\n');
            for (let y = region.y; y < region.y + region.height; y++) {
                if (y >= 0 && y < lines.length) {
                    const line = lines[y];
                    const content = line?.substring(region.x, region.x + region.width);

                    if (content && y === region.y) {
                        this.terminal.write(content);
                    } else if (content) {
                        // Move to next line
                        this.terminal.setCursorPosition(region.x + 1, y + 1);
                        this.terminal.write(content);
                    }
                }
            }
        }
    }

    /**
     * Resize render buffers
     */
    private resizeBuffers(width: number, height: number): void {
        this.frontBuffer.resize(width, height);
        this.backBuffer.resize(width, height);
    }

    /**
     * Set target FPS
     */
    setTargetFPS(fps: number): void {
        this.frameThrottler.setTargetFPS(fps);
    }

    /**
     * Get current FPS
     */
    getTargetFPS(): number {
        return this.frameThrottler.getTargetFPS();
    }
}