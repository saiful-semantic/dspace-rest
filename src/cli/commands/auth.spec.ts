import { strict as assert } from 'assert'
import sinon from 'sinon'
import { authCommands } from './auth'
import { promptService } from '../services/prompt.service'
import { dspaceClient } from '../services/dspace-client.service'
import { authStore } from '../utils/store'
import { configService } from '../services/config.service'

describe('CLI: Auth Commands', () => {
  let promptStub: sinon.SinonStub
  let dspaceInitStub: sinon.SinonStub
  let dspaceLoginStub: sinon.SinonStub
  let authSetStub: sinon.SinonStub
  let configStub: sinon.SinonStub
  let consoleLogStub: sinon.SinonStub

  beforeEach(() => {
    promptStub = sinon.stub(promptService, 'prompt')
    dspaceInitStub = sinon.stub(dspaceClient, 'init')
    dspaceLoginStub = sinon.stub(dspaceClient, 'login')
    authSetStub = sinon.stub(authStore, 'set')
    configStub = sinon.stub(configService, 'loadConfig')
    consoleLogStub = sinon.stub(console, 'log')
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

    await authCommands.login()

    // Verify prompts
    assert.ok(promptStub.calledTwice)
    assert.ok(promptStub.firstCall.calledWith('Username:'))
    assert.ok(promptStub.secondCall.calledWith('Password:', true))

    // Verify DSpace client initialization
    assert.ok(dspaceInitStub.calledWith('http://test'))
    assert.ok(dspaceLoginStub.calledWith('testuser', 'testpass'))

    // Verify auth storage
    assert.ok(authSetStub.calledWith('credentials', {
      username: 'testuser',
      password: 'testpass'
    }))

    // Verify success message
    assert.ok(consoleLogStub.calledWith('✅ Login successful! Credentials stored securely.'))
  })

  it('should throw error if login fails', async () => {
    // Setup prompt responses
    promptStub.onFirstCall().resolves('testuser')
    promptStub.onSecondCall().resolves('testpass')

    // Setup failed login
    dspaceLoginStub.rejects(new Error('Invalid credentials'))

    await assert.rejects(
      () => authCommands.login(),
      /Login failed: Invalid credentials/
    )

    // Verify auth storage wasn't called
    assert.ok(authSetStub.notCalled)
  })

  it('should throw error if REST API URL is not configured', async () => {
    configStub.returns({}) // No api_url in config

    await assert.rejects(
      () => authCommands.login(),
      {
        name: 'Error',
        message: `Set the URL first with 'config:set <REST_API_URL>'`
      }
    )
  })
})
