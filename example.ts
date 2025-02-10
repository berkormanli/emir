// example.ts
import { CLI, Command } from './src/index';

const cli = new CLI("MyCoolTool", "1.2.3", "A helpful tool for doing things.");

const greetCommand = new Command(
  'greet',
  'Greet a person',
  (name: string) => {
    console.log(`Hello, ${name}!`);
  }
);

const addCommand = new Command(
  'add',
  'Add two numbers',
  (a: number, b: number) => {
    console.log(`Result: ${a + b}`);
  }
);

cli.addCommand(greetCommand);
cli.addCommand(addCommand);

// Simulate command-line input
cli.parse(['greet', 'Alice']);
cli.parse(['add', '3', '5']);
