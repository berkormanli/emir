#!/usr/bin/env bun
import {
    RuntimeCore,
    RuntimeDiagnostics,
    DiagnosticSeverity,
    DiagnosticCategory,
    Box,
    TextInput,
    Menu,
    Flex,
    type Component
} from '../src/tui';

// Example demonstrating Runtime & Input Core features
async function runtimeDemo() {
    console.log('🚀 Runtime & Input Core Demo');
    console.log('==========================\n');

    // Initialize runtime core with full diagnostics
    const runtime = new RuntimeCore({
        enableDiagnostics: true,
        enableMetrics: true,
        enableLogging: true,
        targetFPS: 60
    });

    // Configure diagnostics
    runtime.diagnostics.configureErrorOverlay({
        enabled: true,
        maxErrors: 5,
        showStackTrace: true
    });

    runtime.diagnostics.configurePerfCounter({
        enabled: true,
        showFPS: true,
        showMemory: true,
        position: 'top-right'
    });

    // Initialize runtime
    await runtime.initialize();
    console.log('✅ Runtime initialized');

    // Demo 1: Enhanced Input Manager with keymaps
    console.log('\n1. Testing Enhanced Input Manager...');

    // Create custom keymap
    const vimKeymap = {
        name: 'vim',
        bindings: new Map([
            ['h', { command: 'move-left' }],
            ['j', { command: 'move-down' }],
            ['k', { command: 'move-up' }],
            ['l', { command: 'move-right' }],
            [':', { command: 'command-mode' }],
            ['i', { command: 'insert-mode' }],
            ['escape', { command: 'normal-mode' }],
            ['dd', { command: 'delete-line' }],
            ['yy', { command: 'copy-line' }],
            ['p', { command: 'paste' }]
        ])
    };

    runtime.inputManager.registerKeymap('vim', vimKeymap);
    runtime.inputManager.setActiveKeymap('vim');

    // Register vim mode
    runtime.inputManager.registerMode({
        name: 'vim-normal',
        keymap: vimKeymap,
        hooks: {
            onEnter: () => console.log('Entered Vim normal mode'),
            onExit: () => console.log('Exited Vim normal mode')
        }
    });

    runtime.inputManager.setActiveMode('vim-normal');

    // Demo 2: Macro recording
    console.log('2. Testing Macro Recording...');

    // Start recording a macro
    runtime.inputManager.startRecordingMacro('demo-macro');
    console.log('📹 Recording macro...');

    // Simulate some input (in real app, this would be from user)
    console.log('(Simulating: h, j, k, l, i, test, escape)');

    // Stop recording
    runtime.inputManager.stopRecordingMacro();
    console.log('✅ Macro recorded');

    // Play back the macro
    console.log('▶️ Playing back macro...');
    // runtime.inputManager.playMacro('demo-macro');

    // Demo 3: Focus Manager
    console.log('\n3. Testing Focus Manager...');

    // Create some demo components
    const textBox = new TextInput('text-input', {
        label: 'Text Input',
        placeholder: 'Type something...',
        position: { x: 5, y: 10 }
    });

    const menu = new Menu('main-menu', [
        { key: '1', label: 'Option 1', action: () => console.log('Option 1 selected') },
        { key: '2', label: 'Option 2', action: () => console.log('Option 2 selected') },
        { key: '3', label: 'Option 3', action: () => console.log('Option 3 selected') }
    ], {
        position: { x: 5, y: 15 }
    });

    const box = new Box('info-box', {
        title: 'Information',
        content: 'Use Tab to navigate between components',
        border: 'single',
        position: { x: 5, y: 25 },
        size: { width: 50, height: 5 }
    });

    // Register components with runtime
    runtime.registerComponent(textBox);
    runtime.registerComponent(menu);
    runtime.registerComponent(box);

    // Demo 4: Event Bus communication
    console.log('\n4. Testing Event Bus...');

    // Subscribe to custom events
    runtime.eventBus.subscribe('user-action', (event) => {
        console.log(`📢 User action: ${event.data.action}`);
        runtime.diagnostics.info(
            DiagnosticCategory.Event,
            `User performed action: ${event.data.action}`,
            'event-bus-demo'
        );
    });

    // Emit test events
    await runtime.eventBus.emit('user-action', { action: 'login' });
    await runtime.eventBus.emit('user-action', { action: 'navigate' });

    // Demo 5: State Store with reactive updates
    console.log('\n5. Testing State Store...');

    // Subscribe to state changes
    runtime.stateStore.subscribe(['user'], (state) => {
        console.log(`📊 User state updated:`, state);
    });

    // Update state
    await runtime.stateStore.set(['user', 'name'], 'John Doe');
    await runtime.stateStore.set(['user', 'settings', 'theme'], 'dark');
    await runtime.stateStore.merge(['user', 'preferences'], {
        autoSave: true,
        notifications: false
    });

    // Demo 6: Scheduler and animations
    console.log('\n6. Testing Scheduler...');

    // Schedule a task
    runtime.scheduler.scheduleTask(() => {
        console.log('⏰ Scheduled task executed');
        runtime.diagnostics.info(
            DiagnosticCategory.System,
            'Scheduled task executed successfully',
            'scheduler-demo'
        );
    }, undefined, 1000);

    // Schedule animation
    const progressBox = new Box('progress-box', {
        title: 'Animation Demo',
        content: 'Loading...',
        border: 'rounded',
        position: { x: 60, y: 10 },
        size: { width: 30, height: 5 }
    });
    runtime.registerComponent(progressBox);

    // Animate progress
    runtime.scheduler.animate(
        progressBox,
        'progress',
        0,
        100,
        2000,
        'ease-out',
        (value) => {
            progressBox.state.data.content = `Loading: ${Math.round(value)}%`;
            progressBox.state.dirty = true;
        },
        () => {
            progressBox.state.data.content = 'Complete!';
            progressBox.state.dirty = true;
            console.log('✅ Animation complete');
        }
    );

    // Demo 7: Diagnostics
    console.log('\n7. Testing Diagnostics...');

    // Log various diagnostic messages
    runtime.diagnostics.info(
        DiagnosticCategory.Performance,
        'Performance monitoring active',
        'diagnostics-demo'
    );

    runtime.diagnostics.warning(
        DiagnosticCategory.Memory,
        'Memory usage approaching threshold',
        'diagnostics-demo',
        { usage: '85%', threshold: '90%' }
    );

    // Create memory snapshot
    runtime.diagnostics.createMemorySnapshot(
        runtime.getAllComponents().length,
        10 // Sample event count
    );

    // Demo 8: Error handling
    console.log('\n8. Testing Error Handling...');

    // Add event listener that throws
    runtime.eventBus.subscribe('error-test', () => {
        throw new Error('Test error for diagnostics');
    });

    // Emit error-causing event
    await runtime.eventBus.emit('error-test', { test: true });

    // Start the runtime
    console.log('\n🎯 Starting runtime...');
    await runtime.start();

    // Simulate running for a bit
    console.log('Runtime is active. Simulating 3 seconds of operation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate and display report
    console.log('\n📊 Runtime Report:');
    console.log('==================');
    console.log(runtime.generateReport());

    // Stop runtime
    console.log('\n⏹️ Stopping runtime...');
    await runtime.stop();

    console.log('\n✨ Demo completed successfully!');
}

// Run the demo
runtimeDemo().catch(console.error);