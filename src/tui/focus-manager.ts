import type { Component, InputEvent, Position } from './types';
import type { NormalizedInputEvent } from './input-types';

/**
 * Focus container interface for managing groups of focusable components
 */
export interface FocusContainer {
    id: string;
    components: Component[];
    focusCycle: boolean;
    wrapAround: boolean;
    focusIndex?: number;
    parent?: FocusContainer;
    children: FocusContainer[];
}

/**
 * Focus traversal direction
 */
export enum FocusDirection {
    Forward = 'forward',
    Backward = 'backward',
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right',
    Next = 'next',
    Previous = 'previous'
}

/**
 * Focus event types
 */
export enum FocusEventType {
    Focus = 'focus',
    Blur = 'blur',
    FocusEnter = 'focus-enter',
    FocusLeave = 'focus-leave',
    FocusChange = 'focus-change'
}

/**
 * Focus event interface
 */
export interface FocusEvent {
    type: FocusEventType;
    target: Component;
    relatedTarget?: Component;
    container?: FocusContainer;
    preventDefault?: () => void;
}

/**
 * Focus policy for determining focus behavior
 */
export enum FocusPolicy {
    Click = 'click',
    Tab = 'tab',
    Programmatic = 'programmatic',
    Automatic = 'automatic'
}

/**
 * Focus manager for handling component focus and event routing
 */
export class FocusManager {
    private containers: Map<string, FocusContainer>;
    private activeContainer: FocusContainer | null;
    private focusedComponent: Component | null;
    private focusHistory: Component[];
    private focusableComponents: Set<Component>;
    private focusOrder: Map<string, number>;
    private focusGroups: Map<string, Component[]>;
    private eventListeners: Map<FocusEventType, Function[]>;
    private focusPolicy: Set<FocusPolicy>;
    private modalStack: FocusContainer[];
    private disabledComponents: Set<Component>;
    private hiddenComponents: Set<Component>;

    constructor() {
        this.containers = new Map();
        this.activeContainer = null;
        this.focusedComponent = null;
        this.focusHistory = [];
        this.focusableComponents = new Set();
        this.focusOrder = new Map();
        this.focusGroups = new Map();
        this.eventListeners = new Map();
        this.focusPolicy = new Set([FocusPolicy.Tab, FocusPolicy.Click, FocusPolicy.Programmatic]);
        this.modalStack = [];
        this.disabledComponents = new Set();
        this.hiddenComponents = new Set();

        // Initialize event listeners
        for (const eventType of Object.values(FocusEventType)) {
            this.eventListeners.set(eventType as FocusEventType, []);
        }
    }

    /**
     * Create a new focus container
     */
    createContainer(id: string, focusCycle = true, wrapAround = true): FocusContainer {
        const container: FocusContainer = {
            id,
            components: [],
            focusCycle,
            wrapAround,
            children: []
        };

        this.containers.set(id, container);
        return container;
    }

    /**
     * Add a component to a focus container
     */
    addComponent(component: Component, containerId: string, focusOrder?: number): void {
        const container = this.containers.get(containerId);
        if (!container) {
            throw new Error(`Container '${containerId}' not found`);
        }

        container.components.push(component);

        if (focusOrder !== undefined) {
            this.focusOrder.set(component.id, focusOrder);
            this.sortContainerComponents(container);
        }

        this.focusableComponents.add(component);

        // If no component is focused, focus the first one
        if (!this.focusedComponent && this.isFocusable(component)) {
            this.focusComponent(component);
        }
    }

    /**
     * Remove a component from focus management
     */
    removeComponent(component: Component): void {
        this.focusableComponents.delete(component);
        this.focusOrder.delete(component.id);
        this.disabledComponents.delete(component);
        this.hiddenComponents.delete(component);

        // Remove from containers
        for (const container of this.containers.values()) {
            const index = container.components.indexOf(component);
            if (index !== -1) {
                container.components.splice(index, 1);
                if (container.focusIndex !== undefined && container.focusIndex >= index) {
                    container.focusIndex--;
                }
            }
        }

        // Update focused component if necessary
        if (this.focusedComponent === component) {
            this.focusedComponent = null;
            this.focusNext();
        }
    }

    /**
     * Set the active focus container
     */
    setActiveContainer(containerId: string): void {
        const container = this.containers.get(containerId);
        if (!container) {
            throw new Error(`Container '${containerId}' not found`);
        }

        this.activeContainer = container;
    }

    /**
     * Focus a specific component
     */
    focusComponent(component: Component, source?: FocusPolicy): boolean {
        if (!this.isFocusable(component)) {
            return false;
        }

        // Check focus policy
        if (source && !this.focusPolicy.has(source)) {
            return false;
        }

        const previousFocus = this.focusedComponent;
        const previousContainer = this.activeContainer;

        // Blur previous component
        if (previousFocus && previousFocus !== component) {
            this.blurComponent(previousFocus);
        }

        // Find and set active container
        for (const container of this.containers.values()) {
            if (container.components.includes(component)) {
                this.activeContainer = container;
                container.focusIndex = container.components.indexOf(component);
                break;
            }
        }

        // Focus new component
        this.focusedComponent = component;
        this.focusHistory.push(component);

        // Keep focus history manageable
        if (this.focusHistory.length > 50) {
            this.focusHistory.shift();
        }

        // Update component state
        component.state.focused = true;

        // Emit focus events
        this.emitFocusEvent(FocusEventType.Focus, component, previousFocus);
        if (previousFocus !== component) {
            this.emitFocusEvent(FocusEventType.FocusChange, component, previousFocus);
            if (previousContainer !== this.activeContainer) {
                this.emitFocusEvent(FocusEventType.FocusEnter, component);
            }
        }

        return true;
    }

    /**
     * Blur a component
     */
    blurComponent(component: Component): void {
        if (this.focusedComponent === component) {
            this.focusedComponent = null;

            // Update component state
            component.state.focused = false;

            // Emit blur event
            this.emitFocusEvent(FocusEventType.Blur, component);

            // Check if leaving container
            if (this.activeContainer?.components.includes(component)) {
                const stillInContainer = this.focusHistory
                    .slice(-2)
                    .some(c => this.activeContainer?.components.includes(c));
                if (!stillInContainer) {
                    this.emitFocusEvent(FocusEventType.FocusLeave, component);
                }
            }
        }
    }

    /**
     * Focus the next component in the active container
     */
    focusNext(direction = FocusDirection.Forward): boolean {
        if (!this.activeContainer || this.activeContainer.components.length === 0) {
            return false;
        }

        const currentIndex = this.activeContainer.focusIndex ?? -1;
        let nextIndex = this.calculateNextIndex(currentIndex, direction);

        // Find next focusable component
        let attempts = 0;
        while (attempts < this.activeContainer.components.length) {
            const component = this.activeContainer.components[nextIndex];
            if (this.isFocusable(component)) {
                return this.focusComponent(component, FocusPolicy.Tab);
            }
            nextIndex = this.calculateNextIndex(nextIndex, direction);
            attempts++;
        }

        return false;
    }

    /**
     * Focus the previous component
     */
    focusPrevious(): boolean {
        return this.focusNext(FocusDirection.Backward);
    }

    /**
     * Move focus in a specific direction (grid navigation)
     */
    moveFocus(direction: FocusDirection): boolean {
        if (!this.focusedComponent || !this.activeContainer) {
            return this.focusNext();
        }

        const currentIndex = this.activeContainer.components.indexOf(this.focusedComponent);
        const component = this.findComponentInDirection(this.focusedComponent, direction);

        if (component && this.isFocusable(component)) {
            return this.focusComponent(component, FocusPolicy.Programmatic);
        }

        return false;
    }

    /**
     * Set focus policy
     */
    setFocusPolicy(...policies: FocusPolicy[]): void {
        this.focusPolicy = new Set(policies);
    }

    /**
     * Add focus group for components that should be focused together
     */
    addFocusGroup(groupId: string, components: Component[]): void {
        this.focusGroups.set(groupId, components);
    }

    /**
     * Enable/disable a component for focus
     */
    setComponentEnabled(component: Component, enabled: boolean): void {
        if (enabled) {
            this.disabledComponents.delete(component);
        } else {
            this.disabledComponents.add(component);

            // If component is focused, move focus
            if (this.focusedComponent === component) {
                this.focusNext();
            }
        }
    }

    /**
     * Show/hide a component
     */
    setComponentVisible(component: Component, visible: boolean): void {
        if (visible) {
            this.hiddenComponents.delete(component);
        } else {
            this.hiddenComponents.add(component);

            // If component is focused, move focus
            if (this.focusedComponent === component) {
                this.focusNext();
            }
        }
    }

    /**
     * Push modal container to stack
     */
    pushModal(containerId: string): void {
        const container = this.containers.get(containerId);
        if (!container) {
            throw new Error(`Container '${containerId}' not found`);
        }

        this.modalStack.push(container);
        this.setActiveContainer(containerId);
    }

    /**
     * Pop modal container from stack
     */
    popModal(): void {
        if (this.modalStack.length > 0) {
            this.modalStack.pop();

            if (this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                this.setActiveContainer(topModal.id);
            } else if (this.focusHistory.length > 0) {
                // Restore focus to previously focused component
                const previous = this.focusHistory[this.focusHistory.length - 2];
                if (previous) {
                    this.focusComponent(previous);
                }
            }
        }
    }

    /**
     * Route input event to focused component
     */
    routeInputEvent(event: NormalizedInputEvent): boolean {
        if (!this.focusedComponent) {
            return false;
        }

        // Check for focus navigation keys
        if (event.type === 'key') {
            switch (event.key) {
                case 'tab':
                    if (!event.shift) {
                        return this.focusNext(FocusDirection.Forward);
                    } else {
                        return this.focusNext(FocusDirection.Backward);
                    }
                case 'up':
                case 'down':
                case 'left':
                case 'right':
                    return this.moveFocus(
                        event.key === 'up' ? FocusDirection.Up :
                        event.key === 'down' ? FocusDirection.Down :
                        event.key === 'left' ? FocusDirection.Left :
                        FocusDirection.Right
                    );
            }
        }

        // Route to focused component
        return this.focusedComponent.handleInput(event);
    }

    /**
     * Add focus event listener
     */
    addFocusEventListener(eventType: FocusEventType, listener: (event: FocusEvent) => void): void {
        const listeners = this.eventListeners.get(eventType) || [];
        listeners.push(listener);
        this.eventListeners.set(eventType, listeners);
    }

    /**
     * Remove focus event listener
     */
    removeFocusEventListener(eventType: FocusEventType, listener: (event: FocusEvent) => void): void {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Get current focused component
     */
    getFocusedComponent(): Component | null {
        return this.focusedComponent;
    }

    /**
     * Get active focus container
     */
    getActiveContainer(): FocusContainer | null {
        return this.activeContainer;
    }

    /**
     * Get focus history
     */
    getFocusHistory(): Component[] {
        return [...this.focusHistory];
    }

    /**
     * Check if component is focusable
     */
    private isFocusable(component: Component): boolean {
        return component.visible &&
               !this.disabledComponents.has(component) &&
               !this.hiddenComponents.has(component);
    }

    /**
     * Calculate next focus index based on direction
     */
    private calculateNextIndex(currentIndex: number, direction: FocusDirection): number {
        if (!this.activeContainer) return currentIndex;

        const count = this.activeContainer.components.length;

        switch (direction) {
            case FocusDirection.Forward:
            case FocusDirection.Next:
            case FocusDirection.Down:
            case FocusDirection.Right:
                currentIndex++;
                if (currentIndex >= count) {
                    currentIndex = this.activeContainer.wrapAround ? 0 : count - 1;
                }
                break;

            case FocusDirection.Backward:
            case FocusDirection.Previous:
            case FocusDirection.Up:
            case FocusDirection.Left:
                currentIndex--;
                if (currentIndex < 0) {
                    currentIndex = this.activeContainer.wrapAround ? count - 1 : 0;
                }
                break;
        }

        return currentIndex;
    }

    /**
     * Find component in specific direction (for grid navigation)
     */
    private findComponentInDirection(from: Component, direction: FocusDirection): Component | null {
        if (!this.activeContainer) return null;

        const fromPos = from.position;
        const components = this.activeContainer.components;
        let candidates: Component[] = [];

        for (const component of components) {
            if (component === from || !this.isFocusable(component)) continue;

            const pos = component.position;

            switch (direction) {
                case FocusDirection.Up:
                    if (pos.y < fromPos.y && Math.abs(pos.x - fromPos.x) < 5) {
                        candidates.push(component);
                    }
                    break;
                case FocusDirection.Down:
                    if (pos.y > fromPos.y && Math.abs(pos.x - fromPos.x) < 5) {
                        candidates.push(component);
                    }
                    break;
                case FocusDirection.Left:
                    if (pos.x < fromPos.x && Math.abs(pos.y - fromPos.y) < 2) {
                        candidates.push(component);
                    }
                    break;
                case FocusDirection.Right:
                    if (pos.x > fromPos.x && Math.abs(pos.y - fromPos.y) < 2) {
                        candidates.push(component);
                    }
                    break;
            }
        }

        if (candidates.length === 0) return null;

        // Sort by distance and return closest
        candidates.sort((a, b) => {
            const distA = Math.abs(a.position.x - fromPos.x) + Math.abs(a.position.y - fromPos.y);
            const distB = Math.abs(b.position.x - fromPos.x) + Math.abs(b.position.y - fromPos.y);
            return distA - distB;
        });

        return candidates[0];
    }

    /**
     * Sort container components by focus order
     */
    private sortContainerComponents(container: FocusContainer): void {
        container.components.sort((a, b) => {
            const orderA = this.focusOrder.get(a.id) ?? 0;
            const orderB = this.focusOrder.get(b.id) ?? 0;
            return orderA - orderB;
        });
    }

    /**
     * Emit focus event
     */
    private emitFocusEvent(type: FocusEventType, target: Component, relatedTarget?: Component): void {
        const listeners = this.eventListeners.get(type) || [];
        if (listeners.length === 0) return;

        const event: FocusEvent = {
            type,
            target,
            relatedTarget,
            container: this.activeContainer || undefined,
            preventDefault: () => {} // Could be implemented for event cancellation
        };

        for (const listener of listeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('Focus event listener error:', error);
            }
        }
    }
}