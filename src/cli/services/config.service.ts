import { fileOps } from '../utils/file-ops'
import os from 'os'
import path from 'path'

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

/**
 * @deprecated Use storageService.config instead. This service will be removed in a future version.
 */
export const configService = {
  loadConfig: (): Config => {
    console.warn(
      'DEPRECATED: configService.loadConfig() is deprecated. Use storageService.config.load() instead.'
    )
    if (!fileOps.existsSync(CONFIG_PATH)) {
      fileOps.mkdirSync(CONFIG_DIR, { recursive: true })
      fileOps.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2))
    }
    return JSON.parse(fileOps.readFileSync(CONFIG_PATH, 'utf-8')) as Config
  },

  saveConfig: (config: Config) => {
    console.warn(
      'DEPRECATED: configService.saveConfig() is deprecated. Use storageService.config.save() instead.'
    )
    fileOps.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  }
}
