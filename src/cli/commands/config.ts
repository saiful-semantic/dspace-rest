import { configService } from '../services/config.service'

export const configCommands = {
  async set(key: string, value: string): Promise<void> {
    const config = configService.loadConfig()
    config[key] = value
    configService.saveConfig(config)
    console.log(`✅ Set ${key}=${value}`)
  },

  async show(): Promise<void> {
    const config = configService.loadConfig()
    console.log('Current configuration:')
    console.dir(config)
  }
}