import { strict as assert } from 'assert'
import sinon from 'sinon'
import { dspaceClient } from './dspace-client.service'
import { storageService } from './storage.service'
import { authCommands } from '../commands/auth'

describe('CLI: DSpace Client Service', () => {
  let configStub: sinon.SinonStub
  let authGetStub: sinon.SinonStub
  let initStub: sinon.SinonStub
  let loginStub: sinon.SinonStub

  beforeEach(() => {
    configStub = sinon.stub(storageService.config, 'load')
    authGetStub = sinon.stub(storageService.auth, 'get')
    initStub = sinon.stub(dspaceClient, 'init')
    loginStub = sinon.stub(dspaceClient, 'login')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should throw if api_url is not set', async () => {
    configStub.returns({})
    await assert.rejects(() => dspaceClient.ensureAuth(), /Set the URL first/)
  })

  it('should throw error if api_url is not verified', async () => {
    configStub.returns({ api_url: 'http://test', verified: false }) // URL not verified

    await assert.rejects(() => authCommands.handleLogin(), {
      name: 'Error',
      message: `Verify the DSpace REST API URL first with 'config:verify'`
    })
  })

  it('should throw if credentials are missing', async () => {
    configStub.returns({ api_url: 'http://test', verified: true })
    authGetStub.withArgs('credentials').returns(undefined)
    await assert.rejects(() => dspaceClient.ensureAuth(), /No saved credentials/)
  })

  // TODO: fix tests for authToken
  // it('should call init and login with credentials', async () => {
  //   configStub.returns({ api_url: 'http://test', verified: true })
  //   authGetStub.withArgs('credentials').returns({ username: 'user', password: 'pass' })
  //   loginStub.resolves()
  //   await dspaceClient.ensureAuth()
  //   assert.ok(initStub.calledWith('http://test'))
  //   assert.ok(loginStub.calledWith('user', 'pass'))
  // })
})
