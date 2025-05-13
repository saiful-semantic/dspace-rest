import { strict as assert } from 'assert'
import sinon from 'sinon'
import { configCommands } from './config'
import { storageService, Config } from '../services/storage.service'
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
    loadConfigStub = sinon.stub(storageService.config, 'load').returns({ serverInfo: {} })
    saveConfigStub = sinon.stub(storageService.config, 'save')
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
    it('should set api_url and mark as unverified', () => {
      const config: Config = { serverInfo: {} }
      loadConfigStub.returns(config)

      configCommands.set('https://example.edu/server')

      assert.equal(config.api_url, 'https://example.edu/server')
      assert.equal(config.verified, false)
      assert.ok(saveConfigStub.calledWith(config))
      assert.ok(consoleLogStub.calledWith('✅ Set api_url=https://example.edu/server'))
    })
  })

  describe('config:reset', () => {
    it('should reset the configuration to empty object', () => {
      const config = {
        api_url: 'https://example.edu/server',
        verified: true,
        serverInfo: {
          dspaceUI: 'https://ui.example.edu'
        }
      }
      loadConfigStub.returns(config)

      configCommands.reset()

      assert.ok(saveConfigStub.calledWith({}))
      assert.ok(consoleLogStub.calledWith('✅ Reset api_url'))
    })
  })

  describe('config:verify', () => {
    it('should successfully verify and update server info', async () => {
      const config: Config = {
        api_url: 'https://example.edu/server',
        verified: false,
        serverInfo: {}
      }
      const mockInfo = {
        dspaceServer: 'https://real-server.example.edu',
        dspaceUI: 'https://ui.example.edu',
        dspaceName: 'My DSpace',
        dspaceVersion: '7.6'
      }
      loadConfigStub.returns(config)
      dspaceInfoStub.resolves(mockInfo)

      configCommands.verify()
      await new Promise((resolve) => process.nextTick(resolve)) // Wait for promise

      assert.ok(dspaceInitStub.calledWith('https://example.edu/server'))
      assert.equal(config.api_url, mockInfo.dspaceServer)
      assert.equal(config.verified, true)
      assert.equal(config.serverInfo!.dspaceUI, mockInfo.dspaceUI)
      assert.equal(config.serverInfo!.dspaceName, mockInfo.dspaceName)
      assert.equal(config.serverInfo!.dspaceVersion, mockInfo.dspaceVersion)
      assert.equal(config.serverInfo!.dspaceServer, mockInfo.dspaceServer)
      assert.ok(consoleLogStub.calledWith('✅ Server is reachable. Configuration updated.'))
    })

    it('should handle server verification failure', async () => {
      const config = {
        api_url: 'https://example.edu/server',
        serverInfo: {}
      }
      const error = new Error('Connection failed')
      loadConfigStub.returns(config)
      dspaceInfoStub.rejects(error)

      configCommands.verify()

      // Wait for all promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 0))
      sinon.assert.calledWith(consoleErrorStub, `❌ Server not reachable: ${error.message}`)
      sinon.assert.notCalled(saveConfigStub)
    })
  })

  describe('config:show', () => {
    it('should display current configuration', () => {
      const config = {
        api_url: 'https://example.edu/server',
        verified: true,
        serverInfo: {
          dspaceUI: 'https://ui.example.edu'
        }
      }
      loadConfigStub.returns(config)

      configCommands.show()

      assert.ok(consoleLogStub.calledWith('Current configuration:'))
      assert.ok(consoleDirStub.calledWith(config))
    })
  })
})
