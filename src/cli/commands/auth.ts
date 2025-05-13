import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

export const authCommands = {
  async login(): Promise<void> {
    const config = await storageService.config.load()
    if (!config.api_url) {
      throw new Error(`Set the URL first with 'config:set <REST_API_URL>'`)
    }

    const username = await promptService.prompt('Username:')
    const password = await promptService.prompt('Password:', true)

    try {
      dspaceClient.init(config.api_url)
      await dspaceClient.login(username, password)
      await storageService.auth.set('credentials', { username, password })
      console.log('✅ Login successful! Credentials stored securely.')
    } catch (e: unknown) {
      throw new Error(`Login failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
