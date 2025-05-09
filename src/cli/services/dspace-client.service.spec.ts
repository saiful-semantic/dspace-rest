import { strict as assert } from 'assert'
import sinon from 'sinon'
import { dspaceClient } from './dspace-client.service'
import { configService } from './config.service'
import { authStore } from '../utils/store'

describe('CLI: DSpace Client Service', () => {
  let configStub: sinon.SinonStub
  let authGetStub: sinon.SinonStub
  let initStub: sinon.SinonStub
  let loginStub: sinon.SinonStub

  beforeEach(() => {
    configStub = sinon.stub(configService, 'loadConfig')
    authGetStub = sinon.stub(authStore, 'get')
    initStub = sinon.stub(dspaceClient, 'init')
    loginStub = sinon.stub(dspaceClient, 'login')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should throw if baseURL is not set', async () => {
    configStub.returns({})
    await assert.rejects(
      () => dspaceClient.ensureAuth(),
      /Set the URL first/
    )
  })

  it('should throw if credentials are missing', async () => {
    configStub.returns({ baseURL: 'http://test' })
    authGetStub.withArgs('credentials').returns(undefined)
    await assert.rejects(
      () => dspaceClient.ensureAuth(),
      /No saved credentials/
    )
  })

  it('should call init and login with credentials', async () => {
    configStub.returns({ baseURL: 'http://test' })
    authGetStub.withArgs('credentials').returns({ username: 'user', password: 'pass' })
    loginStub.resolves()
    await dspaceClient.ensureAuth()
    assert.ok(initStub.calledWith('http://test'))
    assert.ok(loginStub.calledWith('user', 'pass'))
  })
})
