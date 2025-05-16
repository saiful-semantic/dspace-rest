// auth.ts
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

export const authCommands = {
  async handleLogin(): Promise<void> {
    const username = await promptService.prompt('Username:')
    if (!username) throw new Error('Username cannot be empty.')
    const password = await promptService.prompt('Password:', true)
    if (!password) throw new Error('Password cannot be empty.')

    try {
      await dspaceClient.ensureInit()
      await dspaceClient.login(username, password)

      const authToken = dspaceClient.getAuthorization()
      await storageService.auth.set('authToken', authToken)
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
    try {
      let authToken = await storageService.auth.get<string>('authToken')
      if (!authToken) {
        console.log('❌ You are not logged in to DSpace.')
        return
      }
      console.log('Logging out from DSpace...')
      await dspaceClient.ensureInit()
      await dspaceClient.logout()
      await storageService.auth.delete('authToken')
      console.log('✅ Logout successful! Credentials cleared from memory.')
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`❌ Logout failed: ${errorMessage}`)
    }
  },

  async handleStatus(): Promise<void> {
    await dspaceClient.ensureInit()

    try {
      let authToken = await storageService.auth.get<string>('authToken')
      if (authToken) {
        console.log('Found cached auth token. Checking login status...')
        dspaceClient.setAuthorization(authToken)
        const authStatus = await dspaceClient.status()
        if (authStatus.authenticated) {
          console.log(`✅ You are logged in as: ${authStatus._embedded?.eperson?.email}`)
          console.log(`  Link: ${authStatus._links?.eperson?.href}`)
          return
        }
      }
      console.log('❌ You are not logged in to DSpace.')
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`❌ Failed to check login status: ${errorMessage}`)
    }
  }
}
