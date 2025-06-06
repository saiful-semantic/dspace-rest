import { storageService, Config } from '../services/storage.service'
import { dspaceClient } from '../services/dspace-client.service'

export const configCommands = {
  async set(value: string): Promise<void> {
    const config = await storageService.config.load()
    config['api_url'] = value
    config['verified'] = false
    await storageService.config.save(config)
    console.log(`✅ Set api_url=${value}`)
  },

  async reset(): Promise<void> {
    const config: Config = {}
    await storageService.config.save(config)
    console.log(`✅ Reset api_url`)
  },

  async verify(): Promise<void> {
    const config = await storageService.config.load()
    dspaceClient.init(config.api_url as string)
    dspaceClient
      .info()
      .then(async (info) => {
        config['api_url'] = info['dspaceServer']
        config['verified'] = true
        config['serverInfo'] = {
          dspaceUI: info['dspaceUI'],
          dspaceName: info['dspaceName'],
          dspaceVersion: info['dspaceVersion'],
          dspaceServer: info['dspaceServer']
        }
        await storageService.config.save(config)
        console.log(`✅ Server is reachable. Configuration updated.`)
      })
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`❌ Server not reachable: ${errorMessage}`)
      })
  },

  async show(): Promise<void> {
    const config = await storageService.config.load()
    console.log('Current configuration:')
    console.dir(config)
  }
}
