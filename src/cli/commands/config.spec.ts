import { strict as assert } from 'assert'
import sinon from 'sinon'
import { configCommands } from './config'
import { configService } from '../services/config.service'
import { dspaceClient } from '../services/dspace-client.service'

describe('CLI: Config Commands', () => {
  let loadConfigStub: sinon.SinonStub
  let saveConfigStub: sinon.SinonStub
  let consoleLogStub: sinon.SinonStub
  let consoleDirStub: sinon.SinonStub
  let consoleErrorStub: sinon.SinonStub
  let dspaceInitStub: sinon.SinonStub
  let dspaceInfoStub: sinon.SinonStub

  beforeEach(() => {
    loadConfigStub = sinon.stub(configService, 'loadConfig').returns({})
    saveConfigStub = sinon.stub(configService, 'saveConfig')
    consoleLogStub = sinon.stub(console, 'log')
    consoleDirStub = sinon.stub(console, 'dir')
    consoleErrorStub = sinon.stub(console, 'error')
    dspaceInitStub = sinon.stub(dspaceClient, 'init')
    dspaceInfoStub = sinon.stub(dspaceClient, 'info')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('config:set', () => {
    it('should set a config key and value', async () => {
      const config: any = {}
      loadConfigStub.returns(config)

      await configCommands.set('https://example.edu/server')

      assert.equal(config['baseURL'], 'https://example.edu/server')
      assert.ok(saveConfigStub.calledWith(config))
      assert.ok(consoleLogStub.calledWith('✅ Set baseURL=https://example.edu/server'))
    })
  })

  describe('config:verify', () => {
    it('should successfully verify a reachable server', async () => {
      const config: any = { baseURL: 'https://example.edu/server' }
      const mockInfo = {
        dspaceServer: 'https://example.edu/server',
        dspaceUI: 'https://ui.example.edu',
        dspaceName: 'My DSpace',
        dspaceVersion: 'DSpace 7.6'
      }
      loadConfigStub.returns(config)
      dspaceInfoStub.resolves(mockInfo)

      await configCommands.verify()

      // Wait for the promise to resolve
      await new Promise(process.nextTick)

      assert.ok(dspaceInitStub.calledWith('https://example.edu/server'))
      assert.ok(dspaceInfoStub.calledOnce)
      assert.equal(config['baseURL'], mockInfo.dspaceServer)
      assert.equal(config['dspaceUI'], mockInfo.dspaceUI)
      assert.equal(config['dspaceName'], mockInfo.dspaceName)
      assert.equal(config['dspaceVersion'], mockInfo.dspaceVersion)
      assert.equal(config['dspaceServer'], mockInfo.dspaceServer)
      assert.ok(saveConfigStub.calledWith(config))
      assert.ok(consoleLogStub.calledWith(`✅ Server is reachable. Configuration updated.`))
    })

    it('should handle unreachable server', async () => {
      const config = { baseURL: 'https://example.edu/server' }
      const error = new Error('Connection failed')
      loadConfigStub.returns(config)
      dspaceInfoStub.rejects(error)

      await configCommands.verify()

      // Wait for the promise to resolve
      await new Promise(process.nextTick)

      assert.ok(dspaceInitStub.calledWith('https://example.edu/server'))
      assert.ok(dspaceInfoStub.calledOnce)
      assert.ok(consoleErrorStub.calledWith(`❌ Server not reachable: ${error.message}`))
      assert.ok(saveConfigStub.notCalled) // Config shouldn't be saved on error
    })
  })

  describe('config:show', () => {
    it('should show the current config', async () => {
      const config = { baseURL: 'https://example.edu/server' }
      loadConfigStub.returns(config)

      await configCommands.show()

      assert.ok(consoleLogStub.calledWith('Current configuration:'))
      assert.ok(consoleDirStub.calledWith(config))
    })

    it('should show empty config', async () => {
      loadConfigStub.returns({})

      await configCommands.show()

      assert.ok(consoleLogStub.calledWith('Current configuration:'))
      assert.ok(consoleDirStub.calledWith({}))
    })
  })
})
