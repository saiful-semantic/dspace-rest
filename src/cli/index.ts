#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as DSpaceClient from '../index'
import prompts from 'prompts'

// Configuration Setup
const CONFIG_DIR = path.join(os.homedir(), '.dspace')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

interface Config {
  baseURL?: string
  defaultCommunity?: string
  [key: string]: unknown
}

// Wrap file operations for easier mocking
export const fileOps = {
  existsSync: fs.existsSync,
  mkdirSync: fs.mkdirSync,
  writeFileSync: fs.writeFileSync,
  readFileSync: fs.readFileSync,
}

// Wrap auth store operations
export const authStore = {
  get: (key: string) => configStore.get(key),
  set: (key: string, value: any) => configStore.set(key, value),
}

// ConfigStore will be initialized after dynamic import
let configStore: any

// Wrap DSpace client for easier mocking
export const dspaceClient = {
  init: DSpaceClient.init,
  login: DSpaceClient.login,
  showAllItems: DSpaceClient.showAllItems,
  showItem: DSpaceClient.showItem,
  updateItem: DSpaceClient.updateItem,
  showItemBundles: DSpaceClient.showItemBundles,
  newBitstream: DSpaceClient.newBitstream,
  deleteBitstreams: DSpaceClient.deleteBitstreams,
  showCollections: DSpaceClient.showCollections,
  moveItem: DSpaceClient.moveItem,
}

export const configService = {
  loadConfig: (): Config => {
    if (!fileOps.existsSync(CONFIG_PATH)) {
      fileOps.mkdirSync(CONFIG_DIR, { recursive: true })
      fileOps.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2))
    }
    return JSON.parse(fileOps.readFileSync(CONFIG_PATH, 'utf-8'))
  },

  saveConfig: (config: Config) => {
    fileOps.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  },
}

export const authService = {
  async ensureAuth(): Promise<void> {
    const config = configService.loadConfig()
    if (!config.baseURL) {
      throw new Error('Set baseURL first with config:set baseURL <url>')
    }

    dspaceClient.init(config.baseURL as string)

    const credentials = authStore.get('credentials')
    if (!credentials) {
      throw new Error('No saved credentials. Run "dspace-cli login" first.')
    }
    await dspaceClient.login(credentials.username, credentials.password)
  },
}

// Cache the prompts module to avoid repeated imports
let _prompts: typeof prompts | null = null

export const promptService = {
  async prompt(message: string, isPassword = false): Promise<string> {
    // Lazy-load the prompts module
    _prompts = _prompts || (await import('prompts')).default
    
    const response = await _prompts({
      type: isPassword ? 'password' : 'text',
      name: 'value',
      message,
      validate: (value: string) => value.length > 0 || 'This field is required',
      onState: (state) => {
        if (state.aborted) {
          // Handle CTRL+C gracefully
          process.nextTick(() => {
            process.exit(1)
          })
        }
      }
    })

    return response.value
  }
}

export const commandHandlers = {
  async handleConfigSet(key: string, value: string): Promise<void> {
    const config = configService.loadConfig()
    config[key] = value
    configService.saveConfig(config)
    console.log(`✅ Set ${key}=${value}`)
  },

  async handleConfigShow(): Promise<void> {
    const config = configService.loadConfig()
    console.log('Current configuration:')
    console.dir(config)
  },

  async handleLogin(options: { username?: string; password?: string }): Promise<void> {
    const config = configService.loadConfig()
    if (!config.baseURL) {
      throw new Error('Set baseURL first with config:set baseURL <url>')
    }

    const username = options.username || (await promptService.prompt('Username:'))
    const password = options.password || (await promptService.prompt('Password:', true))

    try {
      dspaceClient.init(config.baseURL as string)
      await dspaceClient.login(username, password)
      authStore.set('credentials', { username, password })
      console.log('✅ Login successful! Credentials stored securely.')
    } catch (e: unknown) {
      throw new Error(`Login failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async handleItemsList(): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.showAllItems()
  },

  async handleItemsShow(id: string): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.showItem(id)
  },

  async handleItemsUpdate(id: string, metadataJson: string): Promise<void> {
    await authService.ensureAuth()
    const payload = JSON.parse(metadataJson)
    await dspaceClient.updateItem(id, payload)
  },

  async handleBitstreamsList(itemId: string, type?: string): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.showItemBundles(itemId, type)
  },

  async handleBitstreamsAdd(itemId: string, name: string, filePath: string): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.newBitstream(itemId, name, filePath)
  },

  async handleBitstreamsDelete(id: string): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.deleteBitstreams(id)
  },

  async handleCollectionsList(): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.showCollections()
  },

  async handleItemsMove(itemId: string, collectionId: string): Promise<void> {
    await authService.ensureAuth()
    await dspaceClient.moveItem(itemId, collectionId)
  },
}

async function setupCommands(program: Command) {
  // Configuration Commands
  program
    .command('config:set <key> <value>')
    .description('Set a configuration value')
    .action(commandHandlers.handleConfigSet)

  program
    .command('config:show')
    .description('Show current configuration')
    .action(commandHandlers.handleConfigShow)

  // Authentication Commands
  program
    .command('login')
    .description('Store DSpace credentials securely')
    .option('-u, --username <username>', 'DSpace username')
    .option('-p, --password <password>', 'DSpace password')
    .action(commandHandlers.handleLogin)

  // Item Commands
  program
    .command('items:list')
    .description('List all items')
    .action(commandHandlers.handleItemsList)

  program
    .command('items:show <id>')
    .description('Show item details')
    .action(commandHandlers.handleItemsShow)

  program
    .command('items:update <id> <metadataJson>')
    .description('Update item metadata')
    .action(commandHandlers.handleItemsUpdate)

  // Bitstream Commands
  program
    .command('bitstreams:list <itemId> [type]')
    .description('List bitstreams for an item')
    .action(commandHandlers.handleBitstreamsList)

  program
    .command('bitstreams:add <itemId> <name> <filePath>')
    .description('Add a new bitstream to an item')
    .action(commandHandlers.handleBitstreamsAdd)

  program
    .command('bitstreams:delete <id>')
    .description('Delete a bitstream')
    .action(commandHandlers.handleBitstreamsDelete)

  // Collection Commands
  program
    .command('collections:list')
    .description('List all collections')
    .action(commandHandlers.handleCollectionsList)

  program
    .command('items:move <itemId> <collectionId>')
    .description('Move item to another collection')
    .action(commandHandlers.handleItemsMove)
}

async function main() {
  // Dynamically import configstore (ESM)
  const ConfigStoreModule = await import('configstore')
  const ConfigStore = ConfigStoreModule.default
  configStore = new ConfigStore('dspace-cli-auth')

  // Initialize CLI
  const program = new Command()
  const packageJson = JSON.parse(fileOps.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'))

  program
    .name('dspace-cli')
    .description('DSpace REST API CLI Client')
    .version(packageJson.version)

  await setupCommands(program)

  program.parse(process.argv)
  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
}

// Export for testing
export { main, setupCommands }

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
}
