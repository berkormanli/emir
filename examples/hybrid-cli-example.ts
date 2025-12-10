#!/usr/bin/env node

/**
 * Example: Hybrid CLI-TUI Application
 * 
 * This example demonstrates how to create a CLI application that can run
 * in both traditional CLI mode and interactive TUI mode.
 * 
 * Usage:
 *   - CLI mode: node hybrid-cli-example.js <command> [options]
 *   - TUI mode: node hybrid-cli-example.js -i
 *   - TUI mode for specific command: node hybrid-cli-example.js -i <command>
 */

// Import CLI components from main index
import { Command, TextInput, NumberInput, type MenuItem } from '../src/index';

// Import Hybrid CLI components from cli-tui module
import { 
    HybridCLI,
    MenuCommand,
    FormCommand,
    TableCommand,
    ProgressCommand,
    WizardCommand,
    ConfirmCommand,
    FileSelectorCommand
} from '../src/cli-tui/index';

// Create the hybrid CLI application
const cli = new HybridCLI('task-manager', '1.0.0', 'A task management CLI with TUI support', {
    defaultMode: 'auto',  // Auto-detect based on TTY
    allowModeSwitch: true,
    tuiEnabled: true,
    preserveCliOutput: false
});

// ============================================================================
// Task data store (in-memory for this example)
// ============================================================================
interface Task {
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
}

let tasks: Task[] = [
    {
        id: 1,
        title: 'Setup project',
        description: 'Initialize the project repository',
        status: 'completed',
        priority: 'high',
        createdAt: new Date('2024-01-01')
    },
    {
        id: 2,
        title: 'Write documentation',
        description: 'Create README and API docs',
        status: 'in-progress',
        priority: 'medium',
        createdAt: new Date('2024-01-02')
    },
    {
        id: 3,
        title: 'Add tests',
        description: 'Write unit and integration tests',
        status: 'pending',
        priority: 'high',
        createdAt: new Date('2024-01-03')
    }
];

let nextId = 4;

// ============================================================================
// List Tasks Command - Works in both CLI and TUI mode
// ============================================================================
const listCommand = new Command(
    'list',
    'List all tasks',
    (args, options) => {
        // CLI mode implementation
        if (tasks.length === 0) {
            console.log('No tasks found.');
            return;
        }

        const statusFilter = options.status;
        const priorityFilter = options.priority;

        let filteredTasks = tasks;
        if (statusFilter) {
            filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
        }
        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
        }

        console.log('\\nTasks:');
        console.log('─'.repeat(80));
        filteredTasks.forEach(task => {
            console.log(`[${task.id}] ${task.title} (${task.priority}) - ${task.status}`);
            console.log(`    ${task.description}`);
            console.log('─'.repeat(80));
        });
        console.log(`\\nTotal: ${filteredTasks.length} task(s)`);
    }
);

listCommand.addOption({
    short: 's',
    long: 'status',
    description: 'Filter by status (pending, in-progress, completed)',
    hasValue: true
});

listCommand.addOption({
    short: 'p',
    long: 'priority',
    description: 'Filter by priority (low, medium, high)',
    hasValue: true
});

// TUI version of list command
const listTUICommand = new TableCommand(
    'list',
    'List all tasks',
    [
        { key: 'id', header: 'ID', width: 5, align: 'center' },
        { key: 'title', header: 'Title', width: 30 },
        { key: 'status', header: 'Status', width: 15, 
          color: (value: string) => {
              switch(value) {
                  case 'completed': return 2; // Green
                  case 'in-progress': return 3; // Yellow
                  case 'pending': return 1; // Red
                  default: return 7;
              }
          }
        },
        { key: 'priority', header: 'Priority', width: 10,
          color: (value: string) => {
              switch(value) {
                  case 'high': return 1; // Red
                  case 'medium': return 3; // Yellow
                  case 'low': return 2; // Green
                  default: return 7;
              }
          }
        }
    ],
    tasks,
    {
        title: 'Task List',
        onSelect: async (task) => {
            // Could open task details or edit dialog
            console.log(`Selected task: ${task.title}`);
        }
    }
);

// ============================================================================
// Add Task Command - Works in both CLI and TUI mode
// ============================================================================
const addCommand = new Command(
    'add',
    'Add a new task',
    (args, options) => {
        // CLI mode implementation
        const title = args[0] || options.title;
        const description = args[1] || options.description || '';
        const priority = options.priority || 'medium';

        if (!title) {
            console.error('Error: Task title is required');
            console.log('Usage: add <title> [description] [--priority=<low|medium|high>]');
            return;
        }

        const task: Task = {
            id: nextId++,
            title,
            description,
            status: 'pending',
            priority: priority as 'low' | 'medium' | 'high',
            createdAt: new Date()
        };

        tasks.push(task);
        console.log(`✓ Task added successfully (ID: ${task.id})`);
    }
);

addCommand.addOption({
    short: 't',
    long: 'title',
    description: 'Task title',
    hasValue: true
});

addCommand.addOption({
    short: 'd',
    long: 'description',
    description: 'Task description',
    hasValue: true
});

addCommand.addOption({
    short: 'p',
    long: 'priority',
    description: 'Task priority (low, medium, high)',
    hasValue: true,
    defaultValue: 'medium'
});

// TUI version of add command
const addTUICommand = new FormCommand(
    'add',
    'Add a new task',
    [
        new TextInput('title', 'Title', '', {
            required: true,
            placeholder: 'Enter task title...'
        }),
        new TextInput('description', 'Description', '', {
            placeholder: 'Enter task description...'
        }),
        // TODO: When SelectField is implemented, use it for priority
        new TextInput('priority', 'Priority (low/medium/high)', 'medium', {
            placeholder: 'low, medium, or high'
        })
    ],
    async (data) => {
        const task: Task = {
            id: nextId++,
            title: data.title as string,
            description: data.description as string || '',
            status: 'pending',
            priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
            createdAt: new Date()
        };

        tasks.push(task);
        console.log(`✓ Task added successfully (ID: ${task.id})`);
    },
    'Add New Task'
);

// ============================================================================
// Update Task Status Command
// ============================================================================
const updateCommand = new Command(
    'update',
    'Update task status',
    (args, options) => {
        const id = parseInt(args[0]);
        const status = args[1] || options.status;

        if (!id || !status) {
            console.error('Error: Task ID and status are required');
            console.log('Usage: update <id> <pending|in-progress|completed>');
            return;
        }

        const task = tasks.find(t => t.id === id);
        if (!task) {
            console.error(`Error: Task with ID ${id} not found`);
            return;
        }

        task.status = status as 'pending' | 'in-progress' | 'completed';
        console.log(`✓ Task ${id} status updated to "${status}"`);
    }
);

updateCommand.addOption({
    short: 's',
    long: 'status',
    description: 'New status',
    hasValue: true
});

// TUI version using menu selection
const updateTUICommand = new MenuCommand(
    'update',
    'Update task status',
    tasks.map(task => ({
        id: task.id.toString(),
        label: `[${task.id}] ${task.title}`,
        description: `Current: ${task.status}`,
        value: task
    })),
    async (item) => {
        const task = item.value as Task;
        
        // Show status selection menu
        const statusMenu = new MenuCommand(
            'status',
            `Select new status for: ${task.title}`,
            [
                { id: 'pending', label: 'Pending', value: 'pending' },
                { id: 'in-progress', label: 'In Progress', value: 'in-progress' },
                { id: 'completed', label: 'Completed', value: 'completed' }
            ],
            async (statusItem) => {
                task.status = statusItem.value as 'pending' | 'in-progress' | 'completed';
                console.log(`✓ Task ${task.id} status updated to "${task.status}"`);
            }
        );

        // Execute the nested menu
        await statusMenu.execute([], null as any);
    }
);

// ============================================================================
// Delete Task Command
// ============================================================================
const deleteCommand = new Command(
    'delete',
    'Delete a task',
    async (args, options) => {
        const id = parseInt(args[0]);

        if (!id) {
            console.error('Error: Task ID is required');
            console.log('Usage: delete <id>');
            return;
        }

        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            console.error(`Error: Task with ID ${id} not found`);
            return;
        }

        const task = tasks[taskIndex];

        // In CLI mode, we could use readline-sync for confirmation
        // For this example, we'll just delete
        if (options.force) {
            tasks.splice(taskIndex, 1);
            console.log(`✓ Task ${id} deleted`);
        } else {
            console.log(`Would delete: "${task.title}"`);
            console.log('Use --force to actually delete');
        }
    }
);

deleteCommand.addOption({
    short: 'f',
    long: 'force',
    description: 'Force deletion without confirmation'
});

// TUI version with confirmation
const deleteTUICommand = new ConfirmCommand(
    'delete',
    'Delete a task',
    'Are you sure you want to delete this task?\\n\\nThis action cannot be undone.',
    async () => {
        // In a real app, we'd get the selected task from context
        console.log('Task deleted (in TUI mode)');
    },
    { title: 'Confirm Deletion' }
);

// ============================================================================
// Stats Command - Shows statistics
// ============================================================================
const statsCommand = new Command(
    'stats',
    'Show task statistics',
    () => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const pending = tasks.filter(t => t.status === 'pending').length;

        const high = tasks.filter(t => t.priority === 'high').length;
        const medium = tasks.filter(t => t.priority === 'medium').length;
        const low = tasks.filter(t => t.priority === 'low').length;

        console.log('\\n📊 Task Statistics');
        console.log('=' .repeat(30));
        console.log('\\nBy Status:');
        console.log(`  ✅ Completed:   ${completed}`);
        console.log(`  🔄 In Progress: ${inProgress}`);
        console.log(`  ⏳ Pending:     ${pending}`);
        console.log('\\nBy Priority:');
        console.log(`  🔴 High:   ${high}`);
        console.log(`  🟡 Medium: ${medium}`);
        console.log(`  🟢 Low:    ${low}`);
        console.log('\\n' + '=' .repeat(30));
        console.log(`Total Tasks: ${tasks.length}`);
    }
);

// TUI version could show a nice chart or progress bars
const statsTUICommand = new ProgressCommand(
    'stats',
    'Calculating statistics...',
    async (progress) => {
        progress(0, 'Analyzing tasks...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress(33, 'Counting by status...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress(66, 'Counting by priority...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress(100, 'Complete!');
    },
    'Task Statistics'
);

// ============================================================================
// Setup Wizard Command - Multi-step process example
// ============================================================================
const setupTUICommand = new WizardCommand(
    'setup',
    'Initial setup wizard',
    [
        {
            title: 'Welcome',
            type: 'menu',
            items: [
                { id: 'new', label: 'Create new workspace', value: 'new' },
                { id: 'import', label: 'Import existing tasks', value: 'import' },
                { id: 'demo', label: 'Use demo data', value: 'demo' }
            ],
            dataKey: 'setupType'
        },
        {
            title: 'Configure Workspace',
            type: 'form',
            fields: [
                new TextInput('name', 'Workspace Name', '', {
                    required: true,
                    placeholder: 'My Tasks'
                }),
                new TextInput('owner', 'Your Name', '', {
                    placeholder: 'John Doe'
                })
            ]
        },
        {
            title: 'Preferences',
            type: 'menu',
            items: [
                { id: 'light', label: 'Light Theme', value: 'light' },
                { id: 'dark', label: 'Dark Theme', value: 'dark' },
                { id: 'auto', label: 'Auto (System)', value: 'auto' }
            ],
            dataKey: 'theme'
        }
    ],
    {
        title: 'Setup Wizard',
        onComplete: async (data) => {
            console.log('Setup complete!', data);
        }
    }
);

// ============================================================================
// Register commands with the CLI
// ============================================================================
cli.addHybridCommand(listCommand, listTUICommand);
cli.addHybridCommand(addCommand, addTUICommand);
cli.addHybridCommand(updateCommand, updateTUICommand);
cli.addHybridCommand(deleteCommand, deleteTUICommand);
cli.addHybridCommand(statsCommand, statsTUICommand);

// TUI-only command
const setupCommand = new Command('setup', 'Run setup wizard', () => {
    console.log('Setup wizard is only available in interactive mode.');
    console.log('Run with -i flag: task-manager -i setup');
});
cli.addHybridCommand(setupCommand, setupTUICommand);

// ============================================================================
// Parse command line arguments
// ============================================================================
if (require.main === module) {
    // Show a nice header
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║           Task Manager CLI v1.0.0            ║');
    console.log('║                                              ║');
    console.log('║  Run with -i flag for interactive TUI mode  ║');
    console.log('╚══════════════════════════════════════════════╝\\n');

    // Remove 'node' and script name from args
    const args = process.argv.slice(2);
    
    // Parse and execute
    cli.parse(args);
    
    // Clean up on exit
    process.on('exit', () => {
        cli.dispose();
    });
}
