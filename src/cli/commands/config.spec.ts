import { strict as assert } from 'assert'
import sinon from 'sinon'
import { configCommands } from './config'
import { configService } from '../services/config.service'

describe('CLI: Config Commands', () => {
  let loadConfigStub: sinon.SinonStub
  let saveConfigStub: sinon.SinonStub
  let consoleLogStub: sinon.SinonStub
  let consoleDirStub: sinon.SinonStub

  beforeEach(() => {
    loadConfigStub = sinon.stub(configService, 'loadConfig')
    saveConfigStub = sinon.stub(configService, 'saveConfig')
    consoleLogStub = sinon.stub(console, 'log')
    consoleDirStub = sinon.stub(console, 'dir')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should set a config key and value', async () => {
    const config = { foo: 'bar' }
    loadConfigStub.returns(config)
    await configCommands.set('foo', 'baz')
    assert.equal(config.foo, 'baz')
    assert.ok(saveConfigStub.calledWith(config))
    assert.ok(consoleLogStub.calledWith('✅ Set foo=baz'))
  })

  it('should show the current config', async () => {
    const config = { foo: 'bar' }
    loadConfigStub.returns(config)
    await configCommands.show()
    assert.ok(consoleLogStub.calledWith('Current configuration:'))
    assert.ok(consoleDirStub.calledWith(config))
  })
})
