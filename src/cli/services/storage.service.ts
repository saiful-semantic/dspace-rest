import { fileOps } from '../utils/file-ops'
import os from 'node:os'
import path from 'node:path'
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

const CONFIG_DIR = path.join(os.homedir(), '.dspace')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

// For secure storage of sensitive data
let secureStore: ConfigStore | undefined

export const storageService = {
  // Initialize the secure store for auth credentials
  initialize: async (): Promise<void> => {
    if (!secureStore) {
      const { default: ConfigStore } = await import('configstore')
      secureStore = new ConfigStore('dspace-cli-auth')
    }
  },

  // Config methods (general configuration)
  config: {
    load: (): Config => {
      if (!fileOps.existsSync(CONFIG_PATH)) {
        fileOps.mkdirSync(CONFIG_DIR, { recursive: true })
        fileOps.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2))
      }
      return JSON.parse(fileOps.readFileSync(CONFIG_PATH, 'utf-8')) as Config
    },

    save: (config: Config): void => {
      fileOps.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    }
  },

  // Auth methods (secure storage)
  auth: {
    get: <T = unknown>(key: string): T | undefined => secureStore?.get(key) as T | undefined,
    set: (key: string, value: unknown): void => secureStore?.set(key, value)
  }
}
