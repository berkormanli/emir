#!/usr/bin/env bun

import { TUI } from '../src/tui/tui';
import { TerminalController } from '../src/tui/terminal-controller';
import { ThemeManager, DARK_THEME } from '../src/tui/theme';

// Navigation components
import { TabBar, Tab, TabBarConfig } from '../src/tui/components/navigation';
import { Accordion, AccordionItem, AccordionConfig } from '../src/tui/components/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbConfig } from '../src/tui/components/navigation';
import { StatusBar, StatusItem, ProgressBarConfig, StatusBarConfig } from '../src/tui/components/navigation';
import { Sidebar, SidebarItem, SidebarConfig } from '../src/tui/components/navigation';

// Form components
import { EnhancedForm, FormSchema, FieldSchema, ValidationRule } from '../src/tui/components/forms';
import { DatePicker } from '../src/tui/components/forms';
import { ColorPicker } from '../src/tui/components/forms';
import { RichTextEditor } from '../src/tui/components/forms';

// Productivity components
import { Tree, TreeNode, TreeConfig } from '../src/tui/components/productivity';
import { CommandPalette, Command, CommandPaletteConfig } from '../src/tui/components/productivity';
import { LogViewer, LogLevel, LogViewerConfig } from '../src/tui/components/productivity';
import { Toast, ToastManager, ToastType } from '../src/tui/components/productivity';

// Chart components
import { StackedAreaChart, Series, StackedAreaChartConfig } from '../src/tui/components/charts';
import { ScatterChart, ScatterPoint, ScatterSeries, ScatterChartConfig } from '../src/tui/components/charts';
import { Heatmap, HeatmapDataPoint, ColorScale, HeatmapConfig } from '../src/tui/components/charts';
import { GaugeChart, GaugeZone, GaugeChartConfig } from '../src/tui/components/charts';
import { StreamingChart, StreamDataPoint, StreamConfig } from '../src/tui/components/charts';

// Composite components
import { SplitPane, SplitPaneConfig } from '../src/tui/components/composite';
import { TabbedWindow, TabbedWindowConfig } from '../src/tui/components/composite';
import { DraggableList, ListItem, DraggableListConfig } from '../src/tui/components/composite';
import { DashboardGrid, DashboardWidget, GridConfig } from '../src/tui/components/composite';

class ComponentLibraryDemo {
    private tui: TUI;
    private terminal: TerminalController;
    private theme: ThemeManager;
    private toastManager: ToastManager;

    constructor() {
        this.tui = new TUI();
        this.terminal = new TerminalController();
        this.theme = ThemeManager.getInstance();
        this.theme.setTheme(DARK_THEME);
        this.toastManager = ToastManager.getInstance();
    }

    async run(): Promise<void> {
        await this.terminal.initialize();

        // Create main layout
        const mainSplit = new SplitPane('main-split', { x: 0, y: 0 }, { width: 80, height: 24 }, {
            orientation: 'horizontal',
            splitRatio: 0.3,
            resizable: true
        });

        // Left sidebar
        const sidebar = new Sidebar('sidebar', { x: 0, y: 0 }, { width: 20, height: 24 }, {
            position: 'left',
            showIcons: true,
            resizable: true,
            collapsible: true
        });

        // Add sidebar items
        sidebar.addItem({ id: 'nav', label: 'Navigation', icon: '🧭' });
        sidebar.addItem({ id: 'forms', label: 'Forms', icon: '📝' });
        sidebar.addItem({ id: 'charts', label: 'Charts', icon: '📊' });
        sidebar.addItem({ id: 'productivity', label: 'Productivity', icon: '⚡' });
        sidebar.addItem({ id: 'composite', label: 'Composite', icon: '🔗' });

        mainSplit.setFirstPane(sidebar);

        // Right content area with tabbed window
        const tabbedWindow = new TabbedWindow('content', { x: 0, y: 0 }, { width: 55, height: 24 }, {
            showTabBar: true,
            showCloseButtons: true,
            draggableTabs: true
        });

        // Add demo tabs
        this.createNavigationDemo(tabbedWindow);
        this.createFormsDemo(tabbedWindow);
        this.createChartsDemo(tabbedWindow);
        this.createProductivityDemo(tabbedWindow);
        this.createCompositeDemo(tabbedWindow);

        mainSplit.setSecondPane(tabbedWindow);

        // Add components to TUI
        this.tui.addComponent(mainSplit);
        this.tui.addComponent(tabbedWindow);

        // Status bar at bottom
        const statusBar = new StatusBar('status', { x: 0, y: 23 }, { width: 80, height: 1 }, {
            showProgressBar: true,
            clickable: true
        });

        statusBar.addItem({
            id: 'status',
            text: 'Ready',
            position: 'left',
            icon: '●'
        });

        statusBar.addItem({
            id: 'actions',
            text: '[F1] Help | [Ctrl+Q] Quit',
            position: 'right'
        });

        this.tui.addComponent(statusBar);

        // Start TUI
        await this.tui.start();

        // Simulate some real-time data
        this.simulateRealTimeData();

        console.log('Component Library Demo Started!');
        console.log('Navigate through tabs using arrow keys');
        console.log('Press Ctrl+Q to quit');
    }

    private createNavigationDemo(tabbedWindow: TabbedWindow): void {
        const navContainer = new SplitPane('nav-container', { x: 0, y: 0 }, { width: 55, height: 23 }, {
            orientation: 'vertical',
            splitRatio: 0.4
        });

        // Tab bar demo
        const tabBar = new TabBar('demo-tabs', { x: 0, y: 0 }, { width: 55, height: 3 }, {
            draggable: true,
            showCloseButtons: true
        });

        tabBar.addTab({ id: 'home', label: 'Home', icon: '🏠' });
        tabBar.addTab({ id: 'docs', label: 'Documentation', icon: '📚' });
        tabBar.addTab({ id: 'settings', label: 'Settings', icon: '⚙️' });
        tabBar.addTab({ id: 'about', label: 'About', icon: 'ℹ️' });

        // Accordion demo
        const accordion = new Accordion('demo-accordion', { x: 0, y: 0 }, { width: 55, height: 10 }, {
            multiple: true,
            animated: true
        });

        accordion.addItem({
            id: 'section1',
            title: 'Getting Started',
            content: 'Welcome to the component library demo!',
            icon: '🚀'
        });

        accordion.addItem({
            id: 'section2',
            title: 'Components',
            content: 'Explore various UI components available.',
            icon: '📦'
        });

        navContainer.setFirstPane(tabBar);
        navContainer.setSecondPane(accordion);

        tabbedWindow.addTab({
            id: 'nav-demo',
            title: 'Navigation',
            content: navContainer
        });
    }

    private createFormsDemo(tabbedWindow: TabbedWindow): void {
        const formSchema: FormSchema = {
            fields: [
                {
                    type: 'text',
                    name: 'name',
                    label: 'Name',
                    placeholder: 'Enter your name',
                    validation: [
                        { type: 'required', message: 'Name is required' },
                        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
                    ]
                },
                {
                    type: 'email',
                    name: 'email',
                    label: 'Email',
                    placeholder: 'your@email.com',
                    validation: [
                        { type: 'required', message: 'Email is required' },
                        { type: 'email', message: 'Please enter a valid email' }
                    ]
                },
                {
                    type: 'date',
                    name: 'birthdate',
                    label: 'Birth Date',
                    validation: [
                        { type: 'required', message: 'Birth date is required' }
                    ]
                },
                {
                    type: 'color',
                    name: 'favoriteColor',
                    label: 'Favorite Color'
                },
                {
                    type: 'rich',
                    name: 'bio',
                    label: 'Biography',
                    placeholder: 'Tell us about yourself...'
                }
            ],
            submitText: 'Submit Form',
            showReset: true
        };

        const form = new EnhancedForm('demo-form', { x: 0, y: 0 }, { width: 55, height: 23 }, formSchema);

        tabbedWindow.addTab({
            id: 'forms-demo',
            title: 'Forms',
            content: form
        });
    }

    private createChartsDemo(tabbedWindow: TabbedWindow): void {
        const chartContainer = new TabbedWindow('charts-container', { x: 0, y: 0 }, { width: 55, height: 23 }, {
            tabBarPosition: 'bottom'
        });

        // Area chart
        const areaChart = new StackedAreaChart('area-chart', { x: 0, y: 0 }, { width: 55, height: 10 }, {
            stacked: true,
            showGrid: true
        });

        areaChart.addSeries({
            name: 'Series A',
            data: [
                { x: 0, y: 10 },
                { x: 1, y: 20 },
                { x: 2, y: 15 },
                { x: 3, y: 25 },
                { x: 4, y: 30 }
            ]
        });

        areaChart.addSeries({
            name: 'Series B',
            data: [
                { x: 0, y: 5 },
                { x: 1, y: 15 },
                { x: 2, y: 25 },
                { x: 3, y: 20 },
                { x: 4, y: 35 }
            ]
        });

        // Gauge chart
        const gaugeChart = new GaugeChart('gauge-chart', { x: 0, y: 0 }, { width: 55, height: 10 }, {
            orientation: 'circular',
            showValue: true,
            animate: true
        });

        gaugeChart.setValue(75);

        chartContainer.addTab({
            id: 'area-chart-tab',
            title: 'Area Chart',
            content: areaChart
        });

        chartContainer.addTab({
            id: 'gauge-chart-tab',
            title: 'Gauge',
            content: gaugeChart
        });

        tabbedWindow.addTab({
            id: 'charts-demo',
            title: 'Charts',
            content: chartContainer
        });
    }

    private createProductivityDemo(tabbedWindow: TabbedWindow): void {
        const prodContainer = new SplitPane('prod-container', { x: 0, y: 0 }, { width: 55, height: 23 }, {
            orientation: 'vertical',
            splitRatio: 0.6
        });

        // Tree component
        const tree = new Tree('demo-tree', { x: 0, y: 0 }, { width: 55, height: 14 }, {
            multiSelect: true,
            showIcons: true
        });

        tree.addItem({
            id: 'root',
            label: 'Project Root',
            icon: '📁',
            children: [
                {
                    id: 'src',
                    label: 'src',
                    icon: '📁',
                    children: [
                        { id: 'components', label: 'components', icon: '📁' },
                        { id: 'utils', label: 'utils', icon: '📁' }
                    ]
                },
                {
                    id: 'tests',
                    label: 'tests',
                    icon: '📁'
                }
            ]
        });

        // Log viewer
        const logViewer = new LogViewer('demo-log', { x: 0, y: 0 }, { width: 55, height: 8 }, {
            showTimestamp: true,
            showLevel: true
        });

        logViewer.addLogMessage(LogLevel.INFO, 'Application started', 'System');
        logViewer.addLogMessage(LogLevel.WARN, 'Low memory warning', 'Monitor');
        logViewer.addLogMessage(LogLevel.ERROR, 'Failed to connect', 'Network');

        prodContainer.setFirstPane(tree);
        prodContainer.setSecondPane(logViewer);

        tabbedWindow.addTab({
            id: 'productivity-demo',
            title: 'Productivity',
            content: prodContainer
        });
    }

    private createCompositeDemo(tabbedWindow: TabbedWindow): void {
        // Dashboard grid
        const dashboard = new DashboardGrid('demo-dashboard', { x: 0, y: 0 }, { width: 55, height: 23 }, {
            columns: 4,
            rows: 6,
            cellWidth: 13,
            cellHeight: 3,
            showGrid: true
        });

        // Add some widgets
        const gaugeWidget = new GaugeChart('cpu-gauge', { x: 0, y: 0 }, { width: 13, height: 3 }, {
            value: 45,
            label: 'CPU Usage'
        });

        dashboard.addWidget({
            id: 'cpu-widget',
            component: gaugeWidget,
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            title: 'System Monitor',
            resizable: true
        });

        tabbedWindow.addTab({
            id: 'composite-demo',
            title: 'Composite',
            content: dashboard
        });
    }

    private simulateRealTimeData(): void {
        // Simulate streaming chart data
        setInterval(() => {
            const streamChart = new StreamingChart('realtime', { x: 60, y: 10 }, { width: 20, height: 10 }, {
                bufferSize: 50,
                updateInterval: 1000,
                showStats: true
            });

            const value = Math.random() * 100;
            streamChart.addDataPoint(value);

            // Update toast notifications periodically
            if (Math.random() > 0.9) {
                this.toastManager.info('Random event occurred!');
            }
        }, 2000);
    }

    async stop(): Promise<void> {
        await this.tui.stop();
        await this.terminal.cleanup();
    }
}

// Main execution
async function main() {
    const demo = new ComponentLibraryDemo();

    try {
        await demo.run();
    } catch (error) {
        console.error('Demo error:', error);
        await demo.stop();
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down demo...');
    process.exit(0);
});

main().catch(console.error);