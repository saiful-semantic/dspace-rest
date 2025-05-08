import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { authStore } from '../utils/store'
import { configService } from '../services/config.service'

export const authCommands = {
  async login(options: { username?: string; password?: string }): Promise<void> {
    const config = configService.loadConfig()
    const username = options.username || await promptService.prompt('Username:')
    const password = options.password || await promptService.prompt('Password:', true)

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