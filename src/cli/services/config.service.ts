import { fileOps } from '../utils/file-ops'
import os from 'os'
import path from 'path'

export interface Config {
  baseURL?: string
  verified?: boolean
  serverInfo: {
    dspaceUI?: string
    dspaceName?: string
    dspaceVersion?: string
    dspaceServer?: string
  }
}

const CONFIG_DIR = path.join(os.homedir(), '.dspace')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

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
  }
}
