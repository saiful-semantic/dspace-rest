import { strict as assert } from 'assert'
import sinon from 'sinon'
import { authCommands } from './auth'
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

describe('CLI: Auth Commands Tests', () => {
  describe('login', () => {
    let promptStub: sinon.SinonStub
    let dspaceInitStub: sinon.SinonStub
    let dspaceLoginStub: sinon.SinonStub
    let authSetStub: sinon.SinonStub
    let configStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      promptStub = sinon.stub(promptService, 'prompt')
      dspaceInitStub = sinon.stub(dspaceClient, 'init')
      dspaceLoginStub = sinon.stub(dspaceClient, 'login')
      authSetStub = sinon.stub(storageService.auth, 'set')
      configStub = sinon.stub(storageService.config, 'load')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
      configStub.returns({ api_url: 'http://test' })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should prompt for username and password and login successfully', async () => {
      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup successful login
      dspaceLoginStub.resolves()

      await authCommands.handleLogin()

      // Verify prompts
      assert.ok(promptStub.calledTwice)
      assert.ok(promptStub.firstCall.calledWith('Username:'))
      assert.ok(promptStub.secondCall.calledWith('Password:', true))

      // Verify DSpace client initialization
      assert.ok(dspaceInitStub.calledWith('http://test'))
      assert.ok(dspaceLoginStub.calledWith('testuser', 'testpass'))

      // Verify auth storage
      assert.ok(
        authSetStub.calledWith('credentials', {
          username: 'testuser',
          password: 'testpass'
        })
      )

      // Verify success message
      assert.ok(consoleLogStub.calledWith('✅ Login successful! Credentials stored securely.'))
    })

    it('should throw error if login fails', async () => {
      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup failed login
      dspaceLoginStub.rejects(new Error('Invalid credentials'))

      await assert.rejects(() => authCommands.handleLogin(), /Login failed: Invalid credentials/)

      // Verify auth storage wasn't called
      assert.ok(authSetStub.notCalled)
    })

    it('should throw error if REST API URL is not configured', async () => {
      configStub.returns({}) // No api_url in config

      await assert.rejects(() => authCommands.handleLogin(), {
        name: 'Error',
        message: `Set the DSpace REST API URL first with 'config:set <REST_API_URL>'`
      })
    })

    it('should handle empty username', async () => {
      promptStub.onFirstCall().resolves('') // Empty username

      await assert.rejects(() => authCommands.handleLogin(), {
        message: 'Username cannot be empty.'
      })
    })

    it('should handle empty password', async () => {
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('') // Empty password

      await assert.rejects(() => authCommands.handleLogin(), {
        message: 'Password cannot be empty.'
      })
    })

    it('should handle secure store decryption errors', async () => {
      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup successful login but failed storage
      dspaceLoginStub.resolves()
      authSetStub.rejects(new Error('Could not decrypt secure store'))

      await authCommands.handleLogin()

      // Verify error messages
      assert.ok(consoleErrorStub.calledWith('❌ Login failed: Could not decrypt secure store'))
    })

    it('should handle master password cancellation', async () => {
      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup successful login but master password cancellation
      dspaceLoginStub.resolves()
      authSetStub.rejects(new Error('Master password entry cancelled'))

      await authCommands.handleLogin()

      // Verify error messages
      assert.ok(consoleErrorStub.calledWith('❌ Login failed: Master password entry cancelled'))
    })
  })

  describe('login:reset', () => {
    let promptStub: sinon.SinonStub
    let authDeleteStub: sinon.SinonStub
    let authClearCachedKeyStub: sinon.SinonStub
    let isMasterPasswordSetupStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      promptStub = sinon.stub(promptService, 'prompt')
      authDeleteStub = sinon.stub(storageService.auth, 'delete')
      authClearCachedKeyStub = sinon.stub(storageService.auth, 'clearCachedKey')
      isMasterPasswordSetupStub = sinon.stub(storageService.auth, 'isMasterPasswordSetup')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should do nothing if secure store is not initialized', async () => {
      isMasterPasswordSetupStub.returns(false)

      await authCommands.handleLoginReset()

      assert.ok(consoleLogStub.calledWith('ℹ️ Secure store not yet initialized. Nothing to reset.'))
      assert.ok(authDeleteStub.notCalled)
      assert.ok(authClearCachedKeyStub.notCalled)
    })

    it('should cancel if user does not confirm', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('no')

      await authCommands.handleLoginReset()

      assert.ok(consoleLogStub.calledWith('Operation cancelled.'))
      assert.ok(authDeleteStub.notCalled)
      assert.ok(authClearCachedKeyStub.notCalled)
    })

    it('should delete credentials and clear cached key if confirmed', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('yes')
      authDeleteStub.resolves(true)

      await authCommands.handleLoginReset()

      assert.ok(authDeleteStub.calledWith('credentials'))
      assert.ok(authClearCachedKeyStub.called)
      assert.ok(consoleLogStub.calledWith('✅ DSpace credentials cleared from secure store.'))
      assert.ok(
        consoleLogStub.calledWith(
          '🔑 Any cached master key (in memory or on disk) has been cleared.'
        )
      )
    })

    it('should handle case when no credentials exist', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('yes')
      authDeleteStub.resolves(false) // No credentials found

      await authCommands.handleLoginReset()

      assert.ok(authDeleteStub.calledWith('credentials'))
      assert.ok(authClearCachedKeyStub.called)
      assert.ok(
        consoleLogStub.calledWith('ℹ️ No DSpace credentials found in secure store to clear.')
      )
    })

    it('should handle decryption errors', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('yes')
      authDeleteStub.rejects(new Error('Could not decrypt secure store'))

      await authCommands.handleLoginReset()

      assert.ok(
        consoleErrorStub.calledWith(
          '❌ Failed to reset credentials: Could not decrypt secure store'
        )
      )
    })

    it('should handle master password cancellation', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('yes')
      authDeleteStub.rejects(new Error('Master password entry cancelled'))

      await authCommands.handleLoginReset()

      assert.ok(
        consoleErrorStub.calledWith(
          '❌ Failed to reset credentials: Master password entry cancelled'
        )
      )
    })

    it('should rethrow unexpected errors', async () => {
      isMasterPasswordSetupStub.returns(true)
      promptStub.resolves('yes')
      authDeleteStub.rejects(new Error('Unexpected error'))

      await assert.rejects(() => authCommands.handleLoginReset(), {
        message: 'Failed to reset credentials: Unexpected error'
      })
    })
  })
})
