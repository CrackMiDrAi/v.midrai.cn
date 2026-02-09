import { Terminal } from './terminal/Terminal'
import { FakeShell, colorize } from './terminal'
import type { CommandDefinition } from './terminal'
import './app.css'
import { useRef } from 'preact/hooks'
import { ExamSystem } from './exam'
import { dockerExam } from './exam/examples'

/**
 * 示例：自定义命令
 */
const customCommands: CommandDefinition[] = [
  {
    name: 'hello',
    description: 'Say hello to someone',
    usage: 'hello [name]',
    execute({ args, output }) {
      const name = args[0] || 'World'
      output.println(colorize(`Hello, ${name}! 👋`, 'green'))
      return 0
    },
  },
  {
    name: 'neofetch',
    description: 'Display system information',
    usage: 'neofetch',
    execute({ env, output }) {
      const art = `
        ${colorize('___', 'green')}
       ${colorize('(___)', 'green')}    ${colorize('OS:', 'cyan')} Midrai Terminal v1.0
      ${colorize('/', 'green')}     ${colorize('\\', 'green')}   ${colorize('Shell:', 'cyan')} fake-shell
     ${colorize('/', 'green')}       ${colorize('\\', 'green')}  ${colorize('User:', 'cyan')} ${env.USER}
    ${colorize('|', 'green')}  ${colorize('◠', 'yellow')}   ${colorize('◠', 'yellow')}  ${colorize('|', 'green')} ${colorize('Host:', 'cyan')} ${env.HOSTNAME}
     ${colorize('\\', 'green')}  ${colorize('\\___/', 'green')}  ${colorize('/', 'green')}  ${colorize('Home:', 'cyan')} ${env.HOME}
      ${colorize('\\', 'green')}       ${colorize('/', 'green')}   ${colorize('Path:', 'cyan')} ${env.PATH}
       ${colorize('`-----\'', 'green')}
      `
      output.println(art)
      return 0
    },
  },
  {
    name: 'cowsay',
    description: 'A cow says something',
    usage: 'cowsay [message]',
    execute({ args, output }) {
      const message = args.join(' ') || 'Moo!'
      const len = message.length
      const border = '-'.repeat(len + 2)
      
      const cow = `
 ${border}
< ${message} >
 ${border}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
      `
      output.println(cow)
      return 0
    },
  },
]

export function App() {
  const examRef = useRef<ExamSystem>(null);

  const handleReady = (shell: FakeShell) => {
    console.log('Terminal is ready!', shell);

    if (!examRef.current) {
      examRef.current = new ExamSystem({
        exams: [ dockerExam ],
        onGraded(result) {
          console.log(result);
        },
      });
    }

    examRef.current.attach(shell);
    for (const cmd of examRef.current.getExamCommands()) {
      shell.registerCommand(cmd);
    }
  };

  const handleCommand = (command: string) => {
    if (!examRef.current) return;

    examRef.current.onCommand(command);
  };

  return (
    <>
      <Terminal
        initialPath="/home/guest"
        env={{
          USER: 'guest',
          HOSTNAME: 'midrai',
          HOME: '/home/guest',
        }}
        welcomeMessage={`
${colorize('╔══════════════════════════════════════════════════════════╗', 'blue')}
${colorize('║', 'blue')}  ${colorize('Welcome to Midrai Terminal v1.0', 'green')}                         ${colorize('║', 'blue')}
${colorize('║', 'blue')}  ${colorize('A fake Linux terminal emulator', 'cyan')}                          ${colorize('║', 'blue')}
${colorize('╚══════════════════════════════════════════════════════════╝', 'blue')}

This is a simulated Linux environment with a virtual file system.
Type ${colorize('"help"', 'yellow')} to see available commands.
`}
        customCommands={customCommands}
        onCommand={handleCommand}
        onReady={handleReady}
      />
    </>
  )
}
