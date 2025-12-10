import { CLI, Command } from './src/index';

// Create a CLI instance
const cli = new CLI('MyApp', '1.0.0', 'A sample CLI application');

// Add a custom global option
cli.addGlobalOption({
  short: 'c',
  long: 'config',
  description: 'Specify config file path',
  hasValue: true,
  defaultValue: './config.json'
});

// Create a command with options
const buildCommand = new Command('build', 'Build the project', (args, options) => {
  console.log('Building project...');
  console.log('Arguments:', args);
  console.log('Options:', options);

  if (options.watch) {
    console.log('Watch mode enabled');
  }

  if (options.output) {
    console.log(`Output directory: ${options.output}`);
  }

  if (options.verbose) {
    console.log('Verbose mode enabled');
  }
});

// Add options to the build command
buildCommand.addOption({
  short: 'w',
  long: 'watch',
  description: 'Enable watch mode'
});

buildCommand.addOption({
  short: 'o',
  long: 'output',
  description: 'Specify output directory',
  hasValue: true,
  defaultValue: './dist'
});

buildCommand.addOption({
  short: 'v',
  long: 'verbose',
  description: 'Enable verbose output'
});

// Create another command
const testCommand = new Command('test', 'Run tests', (args, options) => {
  console.log('Running tests...');
  console.log('Arguments:', args);
  console.log('Options:', options);

  if (options.coverage) {
    console.log('Coverage reporting enabled');
  }
});

testCommand.addOption({
  long: 'coverage',
  description: 'Generate coverage report'
});

testCommand.addOption({
  short: 'p',
  long: 'pattern',
  description: 'Test file pattern',
  hasValue: true,
  defaultValue: '**/*.test.js'
});

// Add commands to CLI
cli.addCommand(buildCommand);
cli.addCommand(testCommand);

// Example usage:
console.log('=== Help Output ===');
cli.parse(['--help']);

console.log('\n=== Command Help Output ===');
cli.showCommandHelp('build');

console.log('\n=== Running build command with options ===');
cli.parse(['build', '--watch', '--output', './custom-dist', 'src/main.js']);

console.log('\n=== Running test command with options ===');
cli.parse(['test', '--coverage', '-p', '**/*.spec.js', 'unit']);

console.log('\n=== Command-specific help ===');
cli.parse(['build', '--help']);