import { strict as assert } from 'assert'
import sinon from 'sinon'
import { dspaceClient } from './dspace-client.service'
import { storageService } from './storage.service'

describe('CLI: DSpace Client Service', () => {
  let configStub: sinon.SinonStub
  let authGetStub: sinon.SinonStub
  let authSetStub: sinon.SinonStub
  let initStub: sinon.SinonStub
  let loginStub: sinon.SinonStub
  let getAuthorizationStub: sinon.SinonStub

  beforeEach(() => {
    configStub = sinon.stub(storageService.config, 'load')
    authGetStub = sinon.stub(storageService.auth, 'get')
    authSetStub = sinon.stub(storageService.auth, 'set')
    initStub = sinon.stub(dspaceClient, 'init')
    loginStub = sinon.stub(dspaceClient, 'login')
    getAuthorizationStub = sinon.stub(dspaceClient, 'getAuthorization')
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

    await assert.rejects(() => dspaceClient.ensureInit(), {
      name: 'Error',
      message: `Verify the DSpace REST API URL first with 'config:verify'`
    })
  })

  it('should throw if credentials are missing', async () => {
    configStub.returns({ api_url: 'http://test', verified: true })
    authGetStub.withArgs('credentials').returns(undefined)
    await assert.rejects(() => dspaceClient.ensureAuth(), /No saved credentials/)
  })

  it('should call init and login with credentials', async () => {
    configStub.returns({ api_url: 'http://test', verified: true })
    authGetStub.withArgs('credentials').returns({ username: 'user', password: 'pass' })
    authGetStub.withArgs('authToken').returns(undefined)
    loginStub.resolves()
    getAuthorizationStub.returns('Bearer mock-token')
    authSetStub.resolves()

    await dspaceClient.ensureAuth()

    assert.ok(initStub.calledWith('http://test'))
    assert.ok(loginStub.calledWith('user', 'pass'))
    assert.ok(getAuthorizationStub.called)
    assert.ok(authGetStub.calledWith('authToken'))
    assert.ok(authSetStub.calledWith('authToken', 'Bearer mock-token'))
  })
})
