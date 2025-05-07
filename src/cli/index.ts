#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as DSpaceClient from '../index'

// Configuration Setup
const CONFIG_DIR = path.join(os.homedir(), '.dspace')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')
let authStore: any // Will be initialized after dynamic import

interface Config {
  baseURL?: string
  defaultCommunity?: string
  [key: string]: unknown // Add index signature to allow dynamic keys
}

const loadConfig = (): Config => {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2))
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
}

const saveConfig = (config: Config) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

async function main() {
  // Dynamically import configstore (ESM)
  const ConfigStoreModule = await import('configstore')
  const ConfigStore = ConfigStoreModule.default
  authStore = new ConfigStore('dspace-cli-auth')

  // Initialize CLI
  const program = new Command()
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'))

  program
    .name('dspace-cli')
    .description('DSpace REST API CLI Client')
    .version(packageJson.version)

  // Configuration Commands
  program
    .command('config:set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const config = loadConfig()
      config[key] = value
      saveConfig(config)
      console.log(`✅ Set ${key}=${value}`)
    })

  program
    .command('config:show')
    .description('Show current configuration')
    .action(() => {
      const config = loadConfig()
      console.log('Current configuration:')
      console.dir(config)
    })

  // Authentication Commands
  program
    .command('login')
    .description('Store DSpace credentials securely')
    .option('-u, --username <username>', 'DSpace username')
    .option('-p, --password <password>', 'DSpace password')
    .action(async (options: { username?: string; password?: string }) => {
      const config = loadConfig()
      if (!config.baseURL) {
        console.error('Error: Set baseURL first with config:set baseURL <url>')
        process.exit(1)
      }

      const username = options.username || (await prompt('Username: '))
      const password = options.password || (await prompt('Password: ', true))

      try {
        DSpaceClient.init(config.baseURL as string)
        await DSpaceClient.login(username, password)
        authStore.set('credentials', { username, password })
        console.log('✅ Login successful! Credentials stored securely.')
      } catch (e: unknown) {
        console.error('❌ Login failed:', e instanceof Error ? e.message : String(e))
      }
    })

  // Item Commands
  program
    .command('items:list')
    .description('List all items')
    .action(async () => {
      await ensureAuth()
      await DSpaceClient.showAllItems()
    })

  program
    .command('items:show <id>')
    .description('Show item details')
    .action(async (id: string) => {
      await ensureAuth()
      await DSpaceClient.showItem(id)
    })

  program
    .command('items:update <id> <metadataJson>')
    .description('Update item metadata')
    .action(async (id: string, metadataJson: string) => {
      await ensureAuth()
      const payload = JSON.parse(metadataJson)
      await DSpaceClient.updateItem(id, payload)
    })

  // Bitstream Commands
  program
    .command('bitstreams:list <itemId> [type]')
    .description('List bitstreams for an item')
    .action(async (itemId: string, type?: string) => {
      await ensureAuth()
      await DSpaceClient.showItemBundles(itemId, type)
    })

  program
    .command('bitstreams:add <itemId> <name> <filePath>')
    .description('Add a new bitstream to an item')
    .action(async (itemId: string, name: string, filePath: string) => {
      await ensureAuth()
      await DSpaceClient.newBitstream(itemId, name, filePath)
    })

  program
    .command('bitstreams:delete <id>')
    .description('Delete a bitstream')
    .action(async (id: string) => {
      await ensureAuth()
      await DSpaceClient.deleteBitstreams(id)
    })

  // Collection Commands
  program
    .command('collections:list')
    .description('List all collections')
    .action(async () => {
      await ensureAuth()
      await DSpaceClient.showCollections()
    })

  program
    .command('items:move <itemId> <collectionId>')
    .description('Move item to another collection')
    .action(async (itemId: string, collectionId: string) => {
      await ensureAuth()
      await DSpaceClient.moveItem(itemId, collectionId)
    })

  // Helper Functions
  async function ensureAuth() {
    const config = loadConfig()
    if (!config.baseURL) {
      console.error('Error: Set baseURL first with config:set baseURL <url>')
      process.exit(1)
    }

    DSpaceClient.init(config.baseURL as string)

    try {
      const credentials = authStore.get('credentials')
      if (!credentials) {
        console.error('Error: No saved credentials. Run "dspace-cli login" first.')
        process.exit(1)
      }
      await DSpaceClient.login(credentials.username, credentials.password)
    } catch (e: unknown) {
      console.error('Authentication error:', e instanceof Error ? e.message : String(e))
      process.exit(1)
    }
  }

  async function prompt(message: string, isPassword = false): Promise<string> {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      readline.question(message, (answer: string) => {
        readline.close()
        resolve(answer)
      })
      if (isPassword) {
        process.stdin.setRawMode(true)
      }
    })
  }

  program.parse(process.argv)
  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
}

main()
