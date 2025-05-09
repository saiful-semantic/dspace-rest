import { configService } from '../services/config.service'
import { dspaceClient } from '../services/dspace-client.service'

export const configCommands = {
  async set(value: string): Promise<void> {
    const config = configService.loadConfig()
    config['baseURL'] = value
    config['verified'] = false
    configService.saveConfig(config)
    console.log(`✅ Set baseURL=${value}`)
  },

  async verify(): Promise<void> {
    const config = configService.loadConfig()
    dspaceClient.init(config.baseURL as string)
    dspaceClient.info().then(info => {
      config['baseURL'] = info['dspaceServer']
      config['dspaceUI'] = info['dspaceUI']
      config['dspaceName'] = info['dspaceName']
      config['dspaceVersion'] = info['dspaceVersion']
      config['dspaceServer'] = info['dspaceServer']
      config['verified'] = true
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
