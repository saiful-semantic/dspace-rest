import { strict as assert } from 'assert'
import sinon from 'sinon'
import { authCommands } from './auth'
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { storageService } from '../services/storage.service'

describe('CLI: Auth Commands Tests', () => {
  describe('login', () => {
    let promptStub: sinon.SinonStub
    let dspaceEnsureAuthStub: sinon.SinonStub
    let authGetStub: sinon.SinonStub
    let authSetStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub
    let verifyLoginStub: sinon.SinonStub
    let handleStatusStub: sinon.SinonStub

    beforeEach(() => {
      promptStub = sinon.stub(promptService, 'prompt')
      dspaceEnsureAuthStub = sinon.stub(dspaceClient, 'ensureAuth')
      authGetStub = sinon.stub(storageService.auth, 'get')
      authSetStub = sinon.stub(storageService.auth, 'set')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
      verifyLoginStub = sinon.stub(authCommands, 'verifyLogin')
      handleStatusStub = sinon.stub(authCommands, 'handleStatus')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should prompt for username and password and login successfully when not logged in', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup no saved credentials
      authGetStub.withArgs('credentials').resolves(null)

      // Setup prompt responses
      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('testpass')

      // Setup successful ensureAuth
      dspaceEnsureAuthStub.resolves()

      await authCommands.handleLogin()

      // Verify verifyLogin was called with reLogin=true
      assert.ok(verifyLoginStub.calledWith(true))

      // Verify credentials check
      assert.ok(authGetStub.calledWith('credentials'))

      // Verify prompts
      assert.ok(promptStub.calledTwice)
      assert.ok(promptStub.firstCall.calledWith('Username:'))
      assert.ok(promptStub.secondCall.calledWith('Password:', true))

      // Verify credentials storage
      assert.ok(
        authSetStub.calledWith('credentials', {
          username: 'testuser',
          password: 'testpass'
        })
      )

      // Verify ensureAuth was called
      assert.ok(dspaceEnsureAuthStub.called)

      // Verify handleStatus was called
      assert.ok(handleStatusStub.called)

      // Verify success message
      assert.ok(consoleLogStub.calledWith('✅ Credentials stored securely.'))
    })

    it('should use existing credentials if available', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup existing credentials
      authGetStub.withArgs('credentials').resolves({ username: 'testuser', password: 'testpass' })

      // Setup successful ensureAuth
      dspaceEnsureAuthStub.resolves()

      await authCommands.handleLogin()

      // Verify verifyLogin was called with reLogin=true
      assert.ok(verifyLoginStub.calledWith(true))

      // Verify credentials check
      assert.ok(authGetStub.calledWith('credentials'))

      // Verify prompts were not called
      assert.ok(promptStub.notCalled)

      // Verify ensureAuth was called
      assert.ok(dspaceEnsureAuthStub.called)

      // Verify handleStatus was called
      assert.ok(handleStatusStub.called)
    })

    it('should do nothing if already logged in', async () => {
      // Setup verifyLogin to return true (already logged in)
      verifyLoginStub.resolves(true)

      await authCommands.handleLogin()

      // Verify verifyLogin was called with reLogin=true
      assert.ok(verifyLoginStub.calledWith(true))

      // Verify credentials check was not performed
      assert.ok(authGetStub.notCalled)

      // Verify prompts were not called
      assert.ok(promptStub.notCalled)

      // Verify ensureAuth was not called
      assert.ok(dspaceEnsureAuthStub.notCalled)

      // Verify handleStatus was not called
      assert.ok(handleStatusStub.notCalled)
    })

    it('should throw error if ensureAuth fails', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup existing credentials
      authGetStub.withArgs('credentials').resolves({ username: 'testuser', password: 'testpass' })

      // Setup failed ensureAuth
      dspaceEnsureAuthStub.rejects(new Error('Invalid credentials'))

      await assert.rejects(() => authCommands.handleLogin(), /Login failed: Invalid credentials/)
    })

    it('should handle empty username', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup no saved credentials
      authGetStub.withArgs('credentials').resolves(null)

      promptStub.onFirstCall().resolves('') // Empty username

      await assert.rejects(() => authCommands.handleLogin(), {
        message: 'Login failed: Username cannot be empty.'
      })
    })

    it('should handle empty password', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup no saved credentials
      authGetStub.withArgs('credentials').resolves(null)

      promptStub.onFirstCall().resolves('testuser')
      promptStub.onSecondCall().resolves('') // Empty password

      await assert.rejects(() => authCommands.handleLogin(), {
        message: 'Login failed: Password cannot be empty.'
      })
    })

    it('should handle secure store decryption errors', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup credentials check to throw decryption error
      authGetStub.withArgs('credentials').rejects(new Error('Could not decrypt secure store'))

      await authCommands.handleLogin()

      // Verify error messages
      assert.ok(consoleErrorStub.calledWith('❌ Login failed: Could not decrypt secure store'))
    })

    it('should handle master password cancellation', async () => {
      // Setup verifyLogin to return false (not logged in)
      verifyLoginStub.resolves(false)

      // Setup credentials check to throw master password cancellation
      authGetStub.withArgs('credentials').rejects(new Error('Master password entry cancelled'))

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
      dspaceInitClientStub = sinon.stub(dspaceClient, 'ensureInit')
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
    let verifyLoginStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub
    let consoleErrorStub: sinon.SinonStub

    beforeEach(() => {
      verifyLoginStub = sinon.stub(authCommands, 'verifyLogin')
      consoleLogStub = sinon.stub(console, 'log')
      consoleErrorStub = sinon.stub(console, 'error')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should show authenticated status when verifyLogin returns true', async () => {
      // Setup verifyLogin to return true (authenticated)
      verifyLoginStub.resolves(true)

      await authCommands.handleStatus()

      // Verify verifyLogin was called
      assert.strictEqual(verifyLoginStub.called, true)

      // Verify no error message was shown
      assert.strictEqual(consoleLogStub.calledWith('❌ You are not logged in to DSpace.'), false)
    })

    it('should show not authenticated when verifyLogin returns false', async () => {
      // Setup verifyLogin to return false (not authenticated)
      verifyLoginStub.resolves(false)

      await authCommands.handleStatus()

      // Verify verifyLogin was called
      assert.strictEqual(verifyLoginStub.called, true)

      // Verify error message was shown
      assert.strictEqual(consoleLogStub.calledWith('❌ You are not logged in to DSpace.'), true)
    })

    it('should handle status check errors', async () => {
      // Setup verifyLogin to throw an error
      verifyLoginStub.rejects(new Error('Status check failed'))

      await authCommands.handleStatus()

      // Verify error handling
      assert.ok(consoleErrorStub.calledWith('❌ Failed to check login status: Status check failed'))
    })
  })

  describe('verifyLogin', () => {
    let dspaceInitClientStub: sinon.SinonStub
    let dspaceSetAuthorizationStub: sinon.SinonStub
    let dspaceStatusStub: sinon.SinonStub
    let dspaceEnsureAuthStub: sinon.SinonStub
    let dspaceClearAuthorizationStub: sinon.SinonStub
    let authGetStub: sinon.SinonStub
    let authDeleteStub: sinon.SinonStub
    let consoleLogStub: sinon.SinonStub

    beforeEach(() => {
      dspaceInitClientStub = sinon.stub(dspaceClient, 'ensureInit')
      dspaceSetAuthorizationStub = sinon.stub(dspaceClient, 'setAuthorization')
      dspaceStatusStub = sinon.stub(dspaceClient, 'status')
      dspaceEnsureAuthStub = sinon.stub(dspaceClient, 'ensureAuth')
      dspaceClearAuthorizationStub = sinon.stub(dspaceClient, 'clearAuthorization')
      authGetStub = sinon.stub(storageService.auth, 'get')
      authDeleteStub = sinon.stub(storageService.auth, 'delete')
      consoleLogStub = sinon.stub(console, 'log')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should return true when auth token exists and is valid', async () => {
      // Setup auth token
      authGetStub.withArgs('authToken').resolves('test-auth-token')

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

      const result = await authCommands.verifyLogin()

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.calledWith('test-auth-token'))
      assert.ok(dspaceStatusStub.called)

      // Verify success messages
      assert.ok(consoleLogStub.calledWith('✅ You are logged in as: test@example.com'))
      assert.ok(consoleLogStub.calledWith('  Link: http://test/eperson/123'))

      // Verify result
      assert.strictEqual(result, true)
    })

    it('should attempt relogin when auth token exists but is invalid and reLogin=true', async () => {
      // Setup auth token
      authGetStub.withArgs('authToken').resolves('test-auth-token')

      // Setup not authenticated status
      dspaceStatusStub.resolves({
        authenticated: false
      })

      // Setup successful ensureAuth
      dspaceEnsureAuthStub.resolves()

      const result = await authCommands.verifyLogin(true)

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.calledWith('test-auth-token'))
      assert.ok(dspaceStatusStub.called)

      // Verify ensureAuth was called
      assert.ok(dspaceEnsureAuthStub.called)

      // Verify result
      assert.strictEqual(result, true)
    })

    it('should clear auth token when auth token exists but is invalid and reLogin=false', async () => {
      // Setup auth token
      authGetStub.withArgs('authToken').resolves('test-auth-token')

      // Setup not authenticated status
      dspaceStatusStub.resolves({
        authenticated: false
      })

      const result = await authCommands.verifyLogin(false)

      // Verify client initialization
      assert.ok(dspaceInitClientStub.called)
      assert.ok(dspaceSetAuthorizationStub.calledWith('test-auth-token'))
      assert.ok(dspaceStatusStub.called)

      // Verify auth token was deleted
      assert.ok(authDeleteStub.calledWith('authToken'))
      assert.ok(dspaceClearAuthorizationStub.called)

      // Verify result
      assert.strictEqual(result, false)
    })

    it('should attempt relogin when no auth token exists and reLogin=true', async () => {
      // Setup no auth token
      authGetStub.withArgs('authToken').resolves(null)

      // Setup successful ensureAuth
      dspaceEnsureAuthStub.resolves()

      const result = await authCommands.verifyLogin(true)

      // Verify ensureAuth was called
      assert.ok(dspaceEnsureAuthStub.called)

      // Verify result
      assert.strictEqual(result, true)
    })

    it('should return false when no auth token exists and reLogin=false', async () => {
      // Setup no auth token
      authGetStub.withArgs('authToken').resolves(null)

      const result = await authCommands.verifyLogin(false)

      // Verify auth token was deleted
      assert.ok(authDeleteStub.calledWith('authToken'))
      assert.ok(dspaceClearAuthorizationStub.called)

      // Verify result
      assert.strictEqual(result, false)
    })

    it('should return false when an error occurs', async () => {
      // Setup auth token
      authGetStub.withArgs('authToken').resolves('test-auth-token')

      // Setup status check error
      dspaceStatusStub.rejects(new Error('Status check failed'))

      const result = await authCommands.verifyLogin()

      // Verify result
      assert.strictEqual(result, false)
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
