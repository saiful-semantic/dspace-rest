import { strict as assert } from 'assert'
import sinon from 'sinon'
import { authCommands } from './auth'
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

describe('CLI: Auth Commands Tests', () => {
  describe('login', () => {
    let promptStub: sinon.SinonStub
    let dspaceInitClientStub: sinon.SinonStub
    let dspaceLoginStub: sinon.SinonStub
    let dspaceGetAuthorizationStub: sinon.SinonStub
    let authSetStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      promptStub = sinon.stub(promptService, 'prompt')
      dspaceInitClientStub = sinon.stub(dspaceClient, 'initClient')
      dspaceLoginStub = sinon.stub(dspaceClient, 'login')
      dspaceGetAuthorizationStub = sinon.stub(dspaceClient, 'getAuthorization')
      authSetStub = sinon.stub(storageService.auth, 'set')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
      dspaceGetAuthorizationStub.returns('test-auth-token')
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
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceLoginStub.calledWith('testuser', 'testpass'))
      assert.ok(dspaceGetAuthorizationStub.called)

      // Verify auth storage
      assert.ok(authSetStub.calledWith('authToken', 'test-auth-token'))
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

    it('should throw error if initClient fails', async () => {
      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup failed initClient
      dspaceInitClientStub.rejects(new Error('Set the URL first with config:set <REST_API_URL>'))

      await assert.rejects(
        () => authCommands.handleLogin(),
        /Login failed: Set the URL first with config:set <REST_API_URL>/
      )

      // Verify auth storage wasn't called
      assert.ok(authSetStub.notCalled)
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

  describe('logout', () => {
    let dspaceInitClientStub: sinon.SinonStub
    let dspaceLogoutStub: sinon.SinonStub
    let authGetStub: sinon.SinonStub
    let authDeleteStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      dspaceInitClientStub = sinon.stub(dspaceClient, 'initClient')
      dspaceLogoutStub = sinon.stub(dspaceClient, 'logout')
      authGetStub = sinon.stub(storageService.auth, 'get')
      authDeleteStub = sinon.stub(storageService.auth, 'delete')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should logout successfully when auth token exists', async () => {
      // Setup auth token
      authGetStub.resolves('test-auth-token')

      // Setup successful logout
      dspaceLogoutStub.resolves()

      await authCommands.handleLogout()

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceLogoutStub.called)
      assert.ok(authDeleteStub.calledWith('authToken'))
      assert.ok(consoleLogStub.calledWith('✅ Logout successful! Credentials cleared from memory.'))
    })

    it('should do nothing if no auth token exists', async () => {
      // Setup no auth token
      authGetStub.resolves(null)

      await authCommands.handleLogout()

      // Verify client initialization not called
      assert.ok(dspaceInitClientStub.notCalled)
      assert.ok(dspaceLogoutStub.notCalled)
      assert.ok(authDeleteStub.notCalled)
      assert.ok(consoleLogStub.calledWith('❌ You are not logged in to DSpace.'))
    })

    it('should handle logout errors', async () => {
      // Setup auth token
      authGetStub.resolves('test-auth-token')

      // Setup failed logout
      dspaceLogoutStub.rejects(new Error('Logout failed'))

      await authCommands.handleLogout()

      // Verify error handling
      assert.ok(consoleErrorStub.calledWith('❌ Logout failed: Logout failed'))
    })
  })

  describe('login:status', () => {
    let dspaceInitClientStub: sinon.SinonStub
    let dspaceSetAuthorizationStub: sinon.SinonStub
    let dspaceStatusStub: sinon.SinonStub
    let authGetStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      dspaceInitClientStub = sinon.stub(dspaceClient, 'initClient')
      dspaceSetAuthorizationStub = sinon.stub(dspaceClient, 'setAuthorization')
      dspaceStatusStub = sinon.stub(dspaceClient, 'status')
      authGetStub = sinon.stub(storageService.auth, 'get')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should show authenticated status when auth token exists and is valid', async () => {
      // Setup auth token
      authGetStub.resolves('test-auth-token')

      // Setup authenticated status
      dspaceStatusStub.resolves({
        authenticated: true,
        _embedded: {
          eperson: {
            email: 'test@example.com'
          }
        },
        _links: {
          eperson: {
            href: 'http://test/eperson/123'
          }
        }
      })

      await authCommands.handleStatus()

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.calledWith('test-auth-token'))
      assert.ok(dspaceStatusStub.called)
      assert.ok(consoleLogStub.calledWith('Found cached auth token. Checking login status...'))
      assert.ok(consoleLogStub.calledWith('✅ You are logged in as: test@example.com'))
      assert.ok(consoleLogStub.calledWith('  Link: http://test/eperson/123'))
    })

    it('should show not authenticated when auth token exists but is invalid', async () => {
      // Setup auth token
      authGetStub.resolves('test-auth-token')

      // Setup not authenticated status
      dspaceStatusStub.resolves({
        authenticated: false
      })

      await authCommands.handleStatus()

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.calledWith('test-auth-token'))
      assert.ok(dspaceStatusStub.called)
      assert.ok(consoleLogStub.calledWith('Found cached auth token. Checking login status...'))
      assert.ok(consoleLogStub.calledWith('❌ You are not logged in to DSpace.'))
    })

    it('should show not authenticated when no auth token exists', async () => {
      // Setup no auth token
      authGetStub.resolves(null)

      await authCommands.handleStatus()

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.notCalled)
      assert.ok(dspaceStatusStub.notCalled)
      assert.ok(consoleLogStub.calledWith('❌ You are not logged in to DSpace.'))
    })

    it('should handle status check errors', async () => {
      // Setup auth token
      authGetStub.resolves('test-auth-token')

      // Setup status check error
      dspaceStatusStub.rejects(new Error('Status check failed'))

      await authCommands.handleStatus()

      // Verify error handling
      assert.ok(consoleErrorStub.calledWith('❌ Failed to check login status: Status check failed'))
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
