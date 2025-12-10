import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedInputManager } from '../enhanced-input-manager';
import { TaskPriority, EasingFunction } from '../scheduler';

describe('EnhancedInputManager', () => {
    let inputManager: EnhancedInputManager;

    beforeEach(() => {
        inputManager = new EnhancedInputManager({
            enableLogging: true,
            enableMetrics: true
        });
    });

    describe('Keymaps', () => {
        it('should register and use keymaps', () => {
            const keymap = {
                name: 'test',
                bindings: new Map([
                    ['x', { command: 'test-command' }]
                ])
            };

            inputManager.registerKeymap('test', keymap);
            inputManager.setActiveKeymap('test');

            expect(inputManager['activeKeymap'].name).toBe('test');
        });

        it('should handle keymap inheritance', () => {
            const parentKeymap = {
                name: 'parent',
                bindings: new Map([
                    ['a', { command: 'parent-cmd' }]
                ])
            };

            const childKeymap = {
                name: 'child',
                bindings: new Map([
                    ['b', { command: 'child-cmd' }]
                ]),
                parent: parentKeymap
            };

            inputManager.registerKeymap('parent', parentKeymap);
            inputManager.registerKeymap('child', childKeymap);
            inputManager.setActiveKeymap('child');

            // Should inherit from parent
            expect(inputManager['activeKeymap'].bindings.size).toBe(2);
        });

        it('should pop keymap stack', () => {
            inputManager.setActiveKeymap('default');
            inputManager.setActiveKeymap('default');
            inputManager.popKeymap();

            // Should still have one on stack
            expect(inputManager['keymapStack'].length).toBe(1);
        });
    });

    describe('Input Modes', () => {
        it('should register and switch modes', () => {
            const mode = {
                name: 'test-mode',
                keymap: inputManager['activeKeymap'],
                hooks: {
                    onEnter: () => {},
                    onExit: () => {}
                }
            };

            inputManager.registerMode(mode);
            inputManager.setActiveMode('test-mode');

            expect(inputManager['activeMode'].name).toBe('test-mode');
            expect(inputManager['context'].mode).toBe('test-mode');
        });

        it('should call mode hooks', () => {
            let enterCalled = false;
            let exitCalled = false;

            const mode1 = {
                name: 'mode1',
                keymap: inputManager['activeKeymap'],
                hooks: {
                    onEnter: () => { enterCalled = true; }
                }
            };

            const mode2 = {
                name: 'mode2',
                keymap: inputManager['activeKeymap'],
                hooks: {
                    onEnter: () => {},
                    onExit: () => { exitCalled = true; }
                }
            };

            inputManager.registerMode(mode1);
            inputManager.registerMode(mode2);

            inputManager.setActiveMode('mode1');
            expect(enterCalled).toBe(true);

            inputManager.setActiveMode('mode2');
            expect(exitCalled).toBe(true);
        });
    });

    describe('Macros', () => {
        it('should record and play macros', async () => {
            inputManager.startRecordingMacro('test-macro');

            // Simulate input events
            const event1 = {
                type: 'key' as const,
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            };

            const event2 = {
                type: 'key' as const,
                key: 'b',
                ctrl: false,
                alt: false,
                shift: false
            };

            // Simulate recording
            inputManager['recordingMacro']!.sequence.push(event1);
            inputManager['recordingMacro']!.sequence.push(event2);

            inputManager.stopRecordingMacro();

            const macros = inputManager.getMacros();
            expect(macros).toHaveLength(1);
            expect(macros[0].name).toBe('test-macro');
            expect(macros[0].sequence).toHaveLength(2);
        });

        it('should stop macro playback', async () => {
            const macro = {
                name: 'test',
                sequence: [
                    { type: 'key', key: 'a' },
                    { type: 'key', key: 'b' },
                    { type: 'key', key: 'c' }
                ],
                recording: false,
                timestamp: Date.now()
            };

            inputManager['macros'].set('test', macro);
            inputManager['macroPlayback'] = true;

            // Stop after first event
            const originalProcessEvent = inputManager['processEvent'];
            let callCount = 0;
            inputManager['processEvent'] = async () => {
                callCount++;
                if (callCount === 1) {
                    inputManager.stopMacroPlayback();
                }
            };

            await inputManager.playMacro('test');

            expect(callCount).toBe(1);
            expect(inputManager['macroPlayback']).toBe(false);
        });

        it('should delete macros', () => {
            const macro = {
                name: 'test',
                sequence: [],
                recording: false,
                timestamp: Date.now()
            };

            inputManager['macros'].set('test', macro);
            inputManager.deleteMacro('test');

            expect(inputManager.getMacros()).toHaveLength(0);
        });
    });

    describe('Context', () => {
        it('should set and get context', () => {
            inputManager.setContext({ component: 'test-comp', mode: 'edit' });

            const context = inputManager.getContext();
            expect(context.component).toBe('test-comp');
            expect(context.mode).toBe('edit');
        });

        it('should merge context', () => {
            inputManager.setContext({ component: 'test-comp' });
            inputManager.setContext({ mode: 'edit' });

            const context = inputManager.getContext();
            expect(context.component).toBe('test-comp');
            expect(context.mode).toBe('edit');
        });
    });

    describe('Command Listeners', () => {
        it('should add and remove command listeners', () => {
            const listener = () => {};
            inputManager.addCommandListener('test-cmd', 'comp1', listener);
            inputManager.addCommandListener('test-cmd', 'comp2', listener);

            expect(inputManager['listeners'].has('test-cmd')).toBe(true);
            expect(inputManager['listeners'].get('test-cmd')!.size).toBe(2);

            inputManager.removeListener('test-cmd', 'comp1', listener);
            expect(inputManager['listeners'].get('test-cmd')!.size).toBe(1);

            inputManager.removeListener('test-cmd', 'comp2', listener);
            expect(inputManager['listeners'].has('test-cmd')).toBe(false);
        });

        it('should route commands to specific components', async () => {
            let handler1Called = false;
            let handler2Called = false;

            const handler1 = () => { handler1Called = true; };
            const handler2 = () => { handler2Called = true; };

            inputManager.addCommandListener('test-cmd', 'comp1', handler1);
            inputManager.addCommandListener('test-cmd', 'comp2', handler2);

            inputManager.setContext({ component: 'comp1' });

            const binding = {
                command: 'test-cmd'
            };

            const event = {
                id: 'test',
                timestamp: Date.now(),
                type: 'key',
                key: 'x'
            };

            await inputManager['executeBinding'](binding, event);

            expect(handler1Called).toBe(true);
            expect(handler2Called).toBe(false);
        });
    });

    describe('Input Parsing', () => {
        it('should parse special key sequences', () => {
            const events = inputManager['parseInput']('\x1b[A');
            expect(events).toHaveLength(1);
            expect(events[0].key).toBe('up');
        });

        it('should parse Ctrl combinations', () => {
            const events = inputManager['parseInput']('\x01');
            expect(events).toHaveLength(1);
            expect(events[0].key).toBe('a');
            expect(events[0].ctrl).toBe(true);
        });

        it('should parse Alt combinations', () => {
            const events = inputManager['parseInput']('\x1ba');
            expect(events).toHaveLength(1);
            expect(events[0].key).toBe('a');
            expect(events[0].alt).toBe(true);
        });

        it('should parse mouse events', () => {
            // Mouse event: \x1b[M<button><x><y>
            const mouseInput = '\x1b[M\x00\x21\x21';
            const events = inputManager['parseInput'](mouseInput);

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe('mouse');
            expect(events[0].mouse?.x).toBe(0);
            expect(events[0].mouse?.y).toBe(0);
            expect(events[0].mouse?.button).toBe('left');
            expect(events[0].mouse?.action).toBe('press');
        });
    });

    describe('Metrics and Logging', () => {
        it('should track metrics', () => {
            inputManager['config'].enableMetrics = true;

            const event = {
                type: 'key',
                key: 'a'
            };

            inputManager['updateMetrics'](event, 10);

            const metrics = inputManager.getMetrics();
            expect(metrics.totalEvents).toBe(1);
            expect(metrics.keyEvents).toBe(1);
            expect(metrics.averageLatency).toBe(10);
        });

        it('should log events when enabled', () => {
            inputManager.setLogging(true);

            const event = {
                id: 'test',
                timestamp: Date.now(),
                type: 'key',
                key: 'a'
            };

            inputManager['logEvent'](event, true, 'test-handler');

            const log = inputManager.getInputLog();
            expect(log).toHaveLength(1);
            expect(log[0].handled).toBe(true);
            expect(log[0].handler).toBe('test-handler');
        });

        it('should clear input log', () => {
            inputManager.setLogging(true);
            inputManager['logEvent']({
                id: 'test',
                timestamp: Date.now(),
                type: 'key',
                key: 'a'
            }, false);

            inputManager.clearInputLog();
            expect(inputManager.getInputLog()).toHaveLength(0);
        });
    });

    describe('Sequence Handling', () => {
        it('should detect key sequences', () => {
            // Set up a binding with sequence
            inputManager['activeKeymap'].bindings.set('g g', {
                command: 'goto-line',
                sequence: ['g', 'g']
            });

            inputManager['currentSequence'] = ['g'];

            const binding = inputManager['findKeyBinding'](['g']);
            expect(binding).toBeNull();

            inputManager['currentSequence'] = ['g', 'g'];
            const binding2 = inputManager['findKeyBinding'](['g', 'g']);
            expect(binding2?.command).toBe('goto-line');
        });

        it('should handle sequence timeout', async () => {
            inputManager['currentSequence'] = ['g'];
            inputManager.setSequenceTimeout();

            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be cleared by timeout
            expect(inputManager['currentSequence']).toHaveLength(0);
        });
    });
});