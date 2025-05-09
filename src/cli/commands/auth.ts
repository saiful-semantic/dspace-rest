import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { authStore } from '../utils/store'
import { configService } from '../services/config.service'

export const authCommands = {
  async login(): Promise<void> {
    const config = configService.loadConfig()
    if (!config.baseURL) {
      throw new Error(`Set the URL first with 'config:set <REST_API_URL>'`)
    }

    const username = await promptService.prompt('Username:')
    const password = await promptService.prompt('Password:', true)

    try {
      dspaceClient.init(config.baseURL as string)
      await dspaceClient.login(username, password)
      authStore.set('credentials', { username, password })
      console.log('✅ Login successful! Credentials stored securely.')
    } catch (e: unknown) {
      throw new Error(`Login failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
