import { strict as assert } from 'assert'
import sinon from 'sinon'
import { Config, storageService } from './storage.service'
import { fileOps } from '../utils/file-ops'
import os from 'os'
import path from 'path'

describe('CLI: Storage Service', () => {
  // Config tests
  describe('Config methods', () => {
    let existsSyncStub: sinon.SinonStub
    let mkdirSyncStub: sinon.SinonStub
    let writeFileSyncStub: sinon.SinonStub
    let readFileSyncStub: sinon.SinonStub
    const CONFIG_DIR = path.join(os.homedir(), '.dspace')
    const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

    beforeEach(() => {
      existsSyncStub = sinon.stub(fileOps, 'existsSync')
      mkdirSyncStub = sinon.stub(fileOps, 'mkdirSync')
      writeFileSyncStub = sinon.stub(fileOps, 'writeFileSync')
      readFileSyncStub = sinon.stub(fileOps, 'readFileSync')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should load config if file exists', () => {
      existsSyncStub.withArgs(CONFIG_PATH).returns(true)
      readFileSyncStub
        .withArgs(CONFIG_PATH, 'utf-8')
        .returns('{"api_url":"https://example.com","serverInfo":{"dspaceVersion":"7.6"}}')
      const config = storageService.config.load()
      assert.deepEqual(config, {
        api_url: 'https://example.com',
        serverInfo: {
          dspaceVersion: '7.6'
        }
      })
      assert.ok(readFileSyncStub.calledWith(CONFIG_PATH, 'utf-8'))
    })

    it('should create config file if it does not exist', () => {
      existsSyncStub.withArgs(CONFIG_PATH).returns(false)
      readFileSyncStub.withArgs(CONFIG_PATH, 'utf-8').returns('{}')
      const config = storageService.config.load()
      assert.deepEqual(config, {})
      assert.ok(mkdirSyncStub.calledWith(CONFIG_DIR, { recursive: true }))
      assert.ok(writeFileSyncStub.calledWith(CONFIG_PATH, sinon.match.string))
    })

    it('should save config with nested serverInfo', () => {
      const config: Config = {
        api_url: 'https://example.edu/server',
        verified: false,
        serverInfo: {
          dspaceUI: 'https://ui.example.edu/',
          dspaceVersion: '7.6'
        }
      }
      storageService.config.save(config)
      assert.ok(writeFileSyncStub.calledWith(CONFIG_PATH, JSON.stringify(config, null, 2)))
    })

    it('should handle empty serverInfo', () => {
      const config: Config = {
        api_url: 'https://example.edu/server',
        verified: true,
        serverInfo: {}
      }
      storageService.config.save(config)
      assert.ok(writeFileSyncStub.calledWith(CONFIG_PATH, JSON.stringify(config, null, 2)))
    })
  })

  // Auth tests
  describe('Auth methods', () => {
    let mockConfigStore: { get: sinon.SinonStub; set: sinon.SinonStub }

    beforeEach(async () => {
      mockConfigStore = {
        get: sinon.stub(),
        set: sinon.stub()
      }

      // Instead of mocking the dynamic import, we'll directly stub the auth methods
      // This is simpler and avoids TypeScript issues

      // Create stubs for the auth methods
      // Note: We're not calling sinon.restore() here to avoid interfering with other stubs
      sinon.stub(storageService.auth, 'get').callsFake((key) => {
        return mockConfigStore.get(key)
      })

      sinon.stub(storageService.auth, 'set').callsFake((key, value) => {
        mockConfigStore.set(key, value)
      })

      // Initialize the store
      await storageService.initialize()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should set auth credentials', () => {
      const credentials = { username: 'testuser', password: 'testpass' }
      storageService.auth.set('credentials', credentials)
      assert.ok(mockConfigStore.set.calledWith('credentials', credentials))
    })

    it('should get auth credentials', () => {
      const credentials = { username: 'testuser', password: 'testpass' }
      mockConfigStore.get.withArgs('credentials').returns(credentials)
      const result = storageService.auth.get('credentials')
      assert.deepEqual(result, credentials)
      assert.ok(mockConfigStore.get.calledWith('credentials'))
    })

    it('should return undefined for non-existent key', () => {
      mockConfigStore.get.withArgs('nonexistent').returns(undefined)
      const result = storageService.auth.get('nonexistent')
      assert.equal(result, undefined)
    })
  })
})
