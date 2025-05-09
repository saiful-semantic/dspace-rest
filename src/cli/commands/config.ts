import { configService } from '../services/config.service'
import { dspaceClient } from '../services/dspace-client.service'

export const configCommands = {
  async set(value: string): Promise<void> {
    const config = configService.loadConfig()
    config['api_url'] = value
    config['verified'] = false
    configService.saveConfig(config)
    console.log(`✅ Set api_url=${value}`)
  },

  async reset(): Promise<void> {
    const config: any = {}
    configService.saveConfig(config)
    console.log(`✅ Reset api_url`)
  },

  async verify(): Promise<void> {
    const config = configService.loadConfig()
    dspaceClient.init(config.api_url as string)
    dspaceClient.info().then(info => {
      config['api_url'] = info['dspaceServer']
      config['verified'] = true
      config['serverInfo'] = {
        dspaceUI: info['dspaceUI'],
        dspaceName: info['dspaceName'],
        dspaceVersion: info['dspaceVersion'],
        dspaceServer: info['dspaceServer']
      }
      configService.saveConfig(config)
      console.log(`✅ Server is reachable. Configuration updated.`)
    }).catch(error => {
      console.error(`❌ Server not reachable: ${error.message}`)
    })
  },

  async show(): Promise<void> {
    const config = configService.loadConfig()
    console.log('Current configuration:')
    console.dir(config)
  }
}
