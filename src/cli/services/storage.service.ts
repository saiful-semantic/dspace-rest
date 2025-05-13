import { fileOps } from '../utils/file-ops'
import os from 'node:os'
import type ConfigStore from 'configstore'

export interface Config {
  api_url?: string
  verified?: boolean
  serverInfo?: {
    dspaceUI?: string
    dspaceName?: string
    dspaceVersion?: string
    dspaceServer?: string
  }
}

const CONFIG_DIR = fileOps.joinPath(os.homedir(), '.dspace')
const CONFIG_PATH = fileOps.joinPath(CONFIG_DIR, 'config.json')

// For secure storage of sensitive data
let secureStore: ConfigStore | undefined

async function ensureSecureStoreInitialized() {
  if (!secureStore) {
    const { default: ConfigStore } = await import('configstore')
    secureStore = new ConfigStore('dspace-cli-auth')
  }
}

export const storageService = {
  // Initialize the secure store for auth credentials
  initialize: ensureSecureStoreInitialized,

  // Config methods (general configuration)
  config: {
    load: async (): Promise<Config> => {
      try {
        if (!fileOps.existsSync(CONFIG_PATH)) {
          await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true })
          await fileOps.writeFileAsync(CONFIG_PATH, JSON.stringify({}, null, 2))
        }
        return JSON.parse(await fileOps.readFileAsync(CONFIG_PATH, 'utf-8')) as Config
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load config: ${errorMessage}`)
      }
    },

    save: async (config: Config): Promise<void> => {
      try {
        await fileOps.writeFileAsync(CONFIG_PATH, JSON.stringify(config, null, 2))
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to save config: ${errorMessage}`)
      }
    }
  },

  // Auth methods (secure storage)
  auth: {
    get: async <T = unknown>(key: string): Promise<T | undefined> => {
      await ensureSecureStoreInitialized()
      return secureStore?.get(key) as T | undefined
    },

    set: async (key: string, value: unknown): Promise<void> => {
      await ensureSecureStoreInitialized()
      secureStore?.set(key, value)
    }
  }
}
