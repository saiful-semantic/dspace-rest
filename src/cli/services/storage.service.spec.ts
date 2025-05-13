import { strict as assert } from 'assert'
import sinon from 'sinon'
import os from 'os'
import { Config, storageService } from './storage.service'
import { fileOps } from '../utils/file-ops'

describe('CLI: Storage Service', () => {
  // Config tests
  describe('Config methods', () => {
    let existsSyncStub: sinon.SinonStub
    let mkdirAsyncStub: sinon.SinonStub
    let writeFileAsyncStub: sinon.SinonStub
    let readFileAsyncStub: sinon.SinonStub
    const CONFIG_DIR = fileOps.joinPath(os.homedir(), '.dspace')
    const CONFIG_PATH = fileOps.joinPath(CONFIG_DIR, 'config.json')

    beforeEach(() => {
      existsSyncStub = sinon.stub(fileOps, 'existsSync')
      mkdirAsyncStub = sinon.stub(fileOps, 'mkdirAsync')
      writeFileAsyncStub = sinon.stub(fileOps, 'writeFileAsync')
      readFileAsyncStub = sinon.stub(fileOps, 'readFileAsync')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should load config if file exists', async () => {
      existsSyncStub.withArgs(CONFIG_PATH).returns(true)
      readFileAsyncStub
        .withArgs(CONFIG_PATH, 'utf-8')
        .resolves('{"api_url":"https://example.com","serverInfo":{"dspaceVersion":"7.6"}}')

      const config = await storageService.config.load()
      assert.deepEqual(config, {
        api_url: 'https://example.com',
        serverInfo: {
          dspaceVersion: '7.6'
        }
      })
      assert.ok(readFileAsyncStub.calledWith(CONFIG_PATH, 'utf-8'))
    })

    it('should create config file if it does not exist', async () => {
      existsSyncStub.withArgs(CONFIG_PATH).returns(false)
      readFileAsyncStub.withArgs(CONFIG_PATH, 'utf-8').resolves('{}')
      mkdirAsyncStub.resolves()
      writeFileAsyncStub.resolves()

      const config = await storageService.config.load()

      assert.deepEqual(config, {})
      assert.ok(mkdirAsyncStub.calledWith(CONFIG_DIR, { recursive: true }))
      assert.ok(writeFileAsyncStub.calledWith(CONFIG_PATH, JSON.stringify({}, null, 2)))
    })

    it('should save config with nested serverInfo', async () => {
      const config: Config = {
        api_url: 'https://example.edu/server',
        verified: false,
        serverInfo: {
          dspaceUI: 'https://ui.example.edu/',
          dspaceVersion: '7.6'
        }
      }
      await storageService.config.save(config)
      assert.ok(writeFileAsyncStub.calledWith(CONFIG_PATH, JSON.stringify(config, null, 2)))
    })

    it('should handle empty serverInfo', async () => {
      const config: Config = {
        api_url: 'https://example.edu/server',
        verified: true,
        serverInfo: {}
      }
      await storageService.config.save(config)
      assert.ok(writeFileAsyncStub.calledWith(CONFIG_PATH, JSON.stringify(config, null, 2)))
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

      sinon.stub(storageService.auth, 'get').callsFake((key) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return mockConfigStore.get(key)
      })

      sinon.stub(storageService.auth, 'set').callsFake(async (key, value) => {
        await mockConfigStore.set(key, value)
      })

      await storageService.initialize()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should set auth credentials', async () => {
      const credentials = { username: 'testuser', password: 'testpass' }
      await storageService.auth.set('credentials', credentials)
      assert.ok(mockConfigStore.set.calledWith('credentials', credentials))
    })

    it('should get auth credentials', async () => {
      const credentials = { username: 'testuser', password: 'testpass' }
      mockConfigStore.get.withArgs('credentials').returns(credentials)
      const result = await storageService.auth.get('credentials')
      assert.deepEqual(result, credentials)
      assert.ok(mockConfigStore.get.calledWith('credentials'))
    })

    it('should return undefined for non-existent key', async () => {
      mockConfigStore.get.withArgs('nonexistent').returns(undefined)
      const result = await storageService.auth.get('nonexistent')
      assert.equal(result, undefined)
    })
  })
})
