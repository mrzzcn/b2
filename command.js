#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');

const yargs = require('yargs');
const chalk = require('chalk');
const yaml = require('js-yaml');
const inquirer = require('inquirer');

const writeFile = promisify(fs.writeFile)

const upload = require('./index')

let commandName = 'b2';
let config = null;

const questions = [
  {
    type: 'input',
    name: 'bucketId',
    message: 'Bucket ID: ',
    default: 'NOT Bucket Name'
  },
  {
    type: 'input',
    name: 'keyId',
    message: 'keyID: ',
  },
  {
    type: 'input',
    name: 'applicationKey',
    message: 'applicationKey: ',
  },
  {
    type: 'input',
    name: 'cdn',
    message: 'CDN(optional, default to official link): ',
    default: 'https://f000.backblazeb2.com/file/bucket-name/'
  }
];

try {
  if (fs.existsSync(getConfigFile())) {
    config = yaml.safeLoad(fs.readFileSync(getConfigFile(), 'utf8'));
  }
} catch (e) {
  console.log(chalk.red(e));
}


function getConfigFile () {
  return path.join(os.homedir(), '.b2.conf.yaml');
}

function checkConfigFile () {
  if (!config) {
    console.log(chalk.red('Config has not been initialized. RUN: '));
    console.log(chalk.green(`${commandName} init`));
    process.exit(1);
  }
}

yargs
  .scriptName(commandName)
  .usage('$0 <cmd> [args]')
  .command(
    'init',
    'Initialize b2 config(application keys & bucket)',
    () => { },
    () => {
      inquirer.prompt(questions).then(answers => {
        return writeFile(getConfigFile(), yaml.safeDump(answers))
      }).then(() => {
        console.log(chalk.green('Init succeed!'))
      }).catch(e => {
        console.log(chalk.red(e));
        process.exit(1)
      })
    })
  .command('config [view]',
    'View config / Edit config',
    (yargs) => {
      yargs.option('v', {
        alias: 'view',
        type: 'boolean',
        default: false,
        describe: 'View Config.',
      })
    },
    (argv) => {
      if (argv.view) {
        console.log(chalk.cyan(JSON.stringify(config, null, 2)))
      } else {
        inquirer.prompt(questions.map(question => ({
          ...question,
          default: config[question.name] || question.default || ''
        }))).then(answers => {
          return writeFile(getConfigFile(), yaml.safeDump(answers))
        }).then(() => {
          console.log(chalk.green('Edit succeed!'))
        }).catch(e => {
          console.log(chalk.red(e));
          process.exit(1)
        })
      }
    })
  .command('upload [file]',
    'Upload to B2',
    (yargs) => {
      yargs.option('d', {
        alias: 'debug',
        type: 'boolean',
        default: false,
        describe: 'Debug',
      })
    },
    async (argv) => {
      checkConfigFile()
      try {
        const { url, fileName } = await upload({ ...argv, ...config }, argv.file)
        const p = config.cdn ? `${config.cdn}${fileName}` : url
        console.log(chalk.green(`Upload Succeed \n${chalk.bold(p)}`))
      } catch (e) {
        console.log(chalk.red(e))
      }
    })
  .help().argv
