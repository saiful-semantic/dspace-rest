// auth.ts
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

export const authCommands = {
  async handleLogin(): Promise<void> {
    const config = await storageService.config.load()
    if (!config.api_url) {
      throw new Error(`Set the DSpace REST API URL first with 'config:set <REST_API_URL>'`)
    }

    if (!config.verified) {
      throw new Error(`Verify the DSpace REST API URL first with 'config:verify'`)
    }

    const username = await promptService.prompt('Username:')
    if (!username) throw new Error('Username cannot be empty.')
    const password = await promptService.prompt('Password:', true)
    if (!password) throw new Error('Password cannot be empty.')

    try {
      dspaceClient.init(config.api_url)
      await dspaceClient.login(username, password)

      await storageService.auth.set('credentials', { username, password }) // This will handle master pass setup/prompting
      console.log('✅ Login successful! Credentials stored securely.')
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (
        errorMessage.includes('Could not load or decrypt') ||
        errorMessage.includes('Could not decrypt')
      ) {
        console.error(`❌ Login failed: ${errorMessage}`)
        console.error(
          '   This might be due to an incorrect master password or a corrupted secure store.'
        )
        console.error('   Any cached master key has been cleared. Please try again.')
      } else if (
        errorMessage.includes('Master password') &&
        (errorMessage.includes('cancelled') || errorMessage.includes('empty'))
      ) {
        console.error(`❌ Login failed: ${errorMessage}`)
      } else {
        // For other errors from dspaceClient.login or unexpected issues
        throw new Error(`Login failed: ${errorMessage}`)
      }
    }
  },

  async handleLoginReset(): Promise<void> {
    if (!storageService.auth.isMasterPasswordSetup()) {
      console.log('ℹ️ Secure store not yet initialized. Nothing to reset.')
      return
    }

    console.log('This will remove your saved DSpace credentials from the secure store.')
    const confirmation = await promptService.prompt('Are you sure you want to proceed? (yes/no):')
    if (confirmation?.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.')
      return
    }

    try {
      // storageService.auth.delete will prompt for master password if not cached (mem/disk)
      const deleted = await storageService.auth.delete('credentials')
      if (deleted) {
        console.log('✅ DSpace credentials cleared from secure store.')
      } else {
        console.log('ℹ️ No DSpace credentials found in secure store to clear.')
      }
      // Clear any cached master key (memory and disk)
      await storageService.auth.clearCachedKey()
      console.log('🔑 Any cached master key (in memory or on disk) has been cleared.')
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (
        errorMessage.includes('Could not load or decrypt') ||
        errorMessage.includes('Could not decrypt')
      ) {
        console.error(`❌ Failed to reset credentials: ${errorMessage}`)
        console.error(
          '   This might be due to an incorrect master password or a corrupted secure store.'
        )
        console.error(
          '   Any cached master key has been cleared. Please try again with the correct master password if you wish to delete specific items.'
        )
      } else if (
        errorMessage.includes('Master password') &&
        (errorMessage.includes('cancelled') || errorMessage.includes('empty'))
      ) {
        console.error(`❌ Failed to reset credentials: ${errorMessage}`)
      } else {
        throw new Error(`Failed to reset credentials: ${errorMessage}`)
      }
    }
  },

  async handleLogout(): Promise<void> {
    const config = await storageService.config.load()
    if (!config.api_url) {
      throw new Error(`Set the DSpace REST API URL first with 'config:set <REST_API_URL>'`)
    }

    if (!config.verified) {
      throw new Error(`Verify the DSpace REST API URL first with 'config:verify'`)
    }

    try {
      await dspaceClient.logout()
      console.log('✅ Logout successful! Credentials cleared from memory.')
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      // console.error(`❌ Logout failed: ${errorMessage}`)
      console.error(`❌ Not implemented yet: ${errorMessage}`)
    }
  },

  async handleStatus(): Promise<void> {
    const config = await storageService.config.load()
    if (!config.api_url) {
      throw new Error(`Set the DSpace REST API URL first with 'config:set <REST_API_URL>'`)
    }

    if (!config.verified) {
      throw new Error(`Verify the DSpace REST API URL first with 'config:verify'`)
    }

    try {
      await dspaceClient.ensureAuth()
      const authStatus = await dspaceClient.status()
      if (authStatus.authenticated) {
        console.log(`✅ You are logged in as: ${authStatus._embedded?.eperson?.email}`)
        console.log(`  Link: ${authStatus._links?.eperson?.href}`)
      } else {
        console.log('❌ You are not logged in to DSpace.')
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`❌ Failed to check login status: ${errorMessage}`)
    }
  }
}
