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

  beforeEach(() => {
    promptStub = sinon.stub(promptService, 'prompt')
    dspaceInitStub = sinon.stub(dspaceClient, 'init')
    dspaceLoginStub = sinon.stub(dspaceClient, 'login')
    authSetStub = sinon.stub(authStore, 'set')
    configStub = sinon.stub(configService, 'loadConfig')
    configStub.returns({ baseURL: 'http://test' })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should login with provided username and password', async () => {
    dspaceLoginStub.resolves()
    await authCommands.login({ username: 'user', password: 'pass' })
    assert.ok(dspaceInitStub.calledWith('http://test'))
    assert.ok(dspaceLoginStub.calledWith('user', 'pass'))
    assert.ok(authSetStub.calledWith('credentials', { username: 'user', password: 'pass' }))
  })

  it('should prompt for username and password if not provided', async () => {
    promptStub.onFirstCall().resolves('user')
    promptStub.onSecondCall().resolves('pass')
    dspaceLoginStub.resolves()
    await authCommands.login({})
    assert.ok(promptStub.calledTwice)
    assert.ok(dspaceLoginStub.calledWith('user', 'pass'))
    assert.ok(authSetStub.calledWith('credentials', { username: 'user', password: 'pass' }))
  })

  it('should throw error if login fails', async () => {
    dspaceLoginStub.rejects(new Error('fail'))
    await assert.rejects(
      () => authCommands.login({ username: 'user', password: 'pass' }),
      /Login failed: fail/
    )
  })
})
