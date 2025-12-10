import { describe, it, expect, beforeEach } from 'vitest';
import { FocusManager, FocusDirection, FocusEventType } from '../focus-manager';
import { Box } from '../index';

describe('FocusManager', () => {
    let focusManager: FocusManager;
    let component1: any;
    let component2: any;
    let component3: any;

    beforeEach(() => {
        focusManager = new FocusManager();

        // Create mock components
        component1 = new Box('comp1', {
            position: { x: 0, y: 0 },
            size: { width: 10, height: 3 },
            border: 'single'
        });
        component1.state.focused = false;

        component2 = new Box('comp2', {
            position: { x: 0, y: 5 },
            size: { width: 10, height: 3 },
            border: 'single'
        });
        component2.state.focused = false;

        component3 = new Box('comp3', {
            position: { x: 0, y: 10 },
            size: { width: 10, height: 3 },
            border: 'single'
        });
        component3.state.focused = false;
    });

    describe('Container Management', () => {
        it('should create and manage containers', () => {
            const container = focusManager.createContainer('test', true, false);

            expect(container.id).toBe('test');
            expect(container.focusCycle).toBe(true);
            expect(container.wrapAround).toBe(false);
            expect(focusManager.containers.has('test')).toBe(true);
        });

        it('should add components to containers', () => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test', 1);
            focusManager.addComponent(component2, 'test', 2);

            const container = focusManager.containers.get('test')!;
            expect(container.components).toHaveLength(2);
            expect(container.components[0]).toBe(component1);
            expect(container.components[1]).toBe(component2);
        });

        it('should sort components by focus order', () => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test', 3);
            focusManager.addComponent(component2, 'test', 1);
            focusManager.addComponent(component3, 'test', 2);

            const container = focusManager.containers.get('test')!;
            expect(container.components[0]).toBe(component2);
            expect(container.components[1]).toBe(component3);
            expect(container.components[2]).toBe(component1);
        });
    });

    describe('Focus Navigation', () => {
        beforeEach(() => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test');
            focusManager.addComponent(component2, 'test');
            focusManager.addComponent(component3, 'test');
            focusManager.setActiveContainer('test');
        });

        it('should focus components', () => {
            const result = focusManager.focusComponent(component1);

            expect(result).toBe(true);
            expect(component1.state.focused).toBe(true);
            expect(focusManager.getFocusedComponent()).toBe(component1);
        });

        it('should not focus unfocusable components', () => {
            component1.visible = false;
            const result = focusManager.focusComponent(component1);

            expect(result).toBe(false);
            expect(component1.state.focused).toBe(false);
        });

        it('should blur components', () => {
            focusManager.focusComponent(component1);
            focusManager.blurComponent(component1);

            expect(component1.state.focused).toBe(false);
            expect(focusManager.getFocusedComponent()).toBeNull();
        });

        it('should navigate forward', () => {
            focusManager.focusComponent(component1);
            focusManager.focusNext();

            expect(focusManager.getFocusedComponent()).toBe(component2);
        });

        it('should navigate backward', () => {
            focusManager.focusComponent(component2);
            focusManager.focusPrevious();

            expect(focusManager.getFocusedComponent()).toBe(component1);
        });

        it('should wrap around when enabled', () => {
            focusManager.createContainer('wrap', true, true);
            focusManager.addComponent(component1, 'wrap');
            focusManager.addComponent(component2, 'wrap');
            focusManager.setActiveContainer('wrap');

            focusManager.focusComponent(component2);
            focusManager.focusNext();

            expect(focusManager.getFocusedComponent()).toBe(component1);
        });

        it('should not wrap around when disabled', () => {
            focusManager.focusComponent(component3);
            focusManager.focusNext();

            expect(focusManager.getFocusedComponent()).toBe(component3);
        });
    });

    describe('Grid Navigation', () => {
        beforeEach(() => {
            // Create grid layout
            component1.position = { x: 0, y: 0 };
            component2.position = { x: 10, y: 0 };
            component3.position = { x: 0, y: 5 };
            component4.position = { x: 10, y: 5 };

            focusManager.createContainer('grid');
            focusManager.addComponent(component1, 'grid');
            focusManager.addComponent(component2, 'grid');
            focusManager.addComponent(component3, 'grid');
            focusManager.addComponent(component4, 'grid');
            focusManager.setActiveContainer('grid');
        });

        it('should navigate up', () => {
            focusManager.focusComponent(component3);
            focusManager.moveFocus(FocusDirection.Up);

            expect(focusManager.getFocusedComponent()).toBe(component1);
        });

        it('should navigate down', () => {
            focusManager.focusComponent(component1);
            focusManager.moveFocus(FocusDirection.Down);

            expect(focusManager.getFocusedComponent()).toBe(component3);
        });

        it('should navigate left', () => {
            focusManager.focusComponent(component2);
            focusManager.moveFocus(FocusDirection.Left);

            expect(focusManager.getFocusedComponent()).toBe(component1);
        });

        it('should navigate right', () => {
            focusManager.focusComponent(component1);
            focusManager.moveFocus(FocusDirection.Right);

            expect(focusManager.getFocusedComponent()).toBe(component2);
        });
    });

    describe('Component State', () => {
        beforeEach(() => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test');
            focusManager.addComponent(component2, 'test');
        });

        it('should handle enabled state', () => {
            focusManager.focusComponent(component1);
            focusManager.setComponentEnabled(component1, false);

            expect(focusManager.getFocusedComponent()).toBe(component2);
            expect(focusManager['disabledComponents'].has(component1)).toBe(true);
        });

        it('should handle visible state', () => {
            focusManager.focusComponent(component1);
            focusManager.setComponentVisible(component1, false);

            expect(focusManager.getFocusedComponent()).toBe(component2);
            expect(focusManager['hiddenComponents'].has(component1)).toBe(true);
        });

        it('should remove components', () => {
            focusManager.focusComponent(component1);
            focusManager.removeComponent(component1);

            expect(focusManager.getFocusedComponent()).toBeNull();
            expect(focusManager['focusableComponents'].has(component1)).toBe(false);
        });
    });

    describe('Modal Support', () => {
        beforeEach(() => {
            focusManager.createContainer('main');
            focusManager.createContainer('modal');
            focusManager.addComponent(component1, 'main');
            focusManager.addComponent(component2, 'modal');
            focusManager.focusComponent(component1);
        });

        it('should push modal to stack', () => {
            focusManager.pushModal('modal');

            expect(focusManager['modalStack']).toHaveLength(1);
            expect(focusManager.getActiveContainer()?.id).toBe('modal');
            expect(focusManager.getFocusedComponent()).toBe(component2);
        });

        it('should pop modal from stack', () => {
            focusManager.pushModal('modal');
            focusManager.popModal();

            expect(focusManager['modalStack']).toHaveLength(0);
            expect(focusManager.getActiveContainer()?.id).toBe('main');
            expect(focusManager.getFocusedComponent()).toBe(component1);
        });
    });

    describe('Focus Events', () => {
        beforeEach(() => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test');
            focusManager.addComponent(component2, 'test');
        });

        it('should emit focus events', () => {
            const events: string[] = [];

            focusManager.addFocusEventListener(FocusEventType.Focus, (e) => {
                events.push('focus');
            });
            focusManager.addFocusEventListener(FocusEventType.Blur, (e) => {
                events.push('blur');
            });

            focusManager.focusComponent(component1);
            focusManager.focusComponent(component2);

            expect(events).toEqual(['focus', 'blur', 'focus']);
        });

        it('should emit focus change events', () => {
            let changed = false;

            focusManager.addFocusEventListener(FocusEventType.FocusChange, (e) => {
                changed = true;
            });

            focusManager.focusComponent(component1);
            focusManager.focusComponent(component2);

            expect(changed).toBe(true);
        });

        it('should emit container enter/leave events', () => {
            focusManager.createContainer('container2');
            focusManager.addComponent(component3, 'container2');

            const events: string[] = [];

            focusManager.addFocusEventListener(FocusEventType.FocusEnter, (e) => {
                events.push('enter');
            });
            focusManager.addFocusEventListener(FocusEventType.FocusLeave, (e) => {
                events.push('leave');
            });

            focusManager.focusComponent(component1);
            focusManager.focusComponent(component3);

            expect(events).toEqual(['enter', 'leave', 'enter']);
        });
    });

    describe('Input Routing', () => {
        beforeEach(() => {
            focusManager.createContainer('test');
            focusManager.addComponent(component1, 'test');
            focusManager.addComponent(component2, 'test');
            focusManager.focusComponent(component1);
        });

        it('should route input to focused component', () => {
            let inputReceived = false;
            component1.handleInput = () => {
                inputReceived = true;
                return true;
            };

            const event = {
                type: 'key' as const,
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            };

            const handled = focusManager.routeInputEvent(event);
            expect(handled).toBe(true);
            expect(inputReceived).toBe(true);
        });

        it('should handle Tab navigation', () => {
            const event = {
                type: 'key' as const,
                key: 'tab',
                ctrl: false,
                alt: false,
                shift: false
            };

            focusManager.routeInputEvent(event);
            expect(focusManager.getFocusedComponent()).toBe(component2);
        });

        it('should handle Shift+Tab navigation', () => {
            focusManager.focusComponent(component2);

            const event = {
                type: 'key' as const,
                key: 'tab',
                ctrl: false,
                alt: false,
                shift: true
            };

            focusManager.routeInputEvent(event);
            expect(focusManager.getFocusedComponent()).toBe(component1);
        });
    });

    describe('Focus Groups', () => {
        it('should manage focus groups', () => {
            const group = [component1, component2];
            focusManager.addFocusGroup('radio-group', group);

            expect(focusManager['focusGroups'].get('radio-group')).toEqual(group);
        });
    });

    describe('Focus Policy', () => {
        it('should respect focus policy', () => {
            focusManager.setFocusPolicy();
            const result = focusManager.focusComponent(component1, 'click' as any);
            expect(result).toBe(false);

            focusManager.setFocusPolicy('click' as any);
            const result2 = focusManager.focusComponent(component1, 'click' as any);
            expect(result2).toBe(true);
        });
    });
});