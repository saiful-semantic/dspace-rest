import { strict as assert } from 'assert'
import sinon from 'sinon'
import os from 'os'
import { Config, storageService } from './storage.service'
import { fileOps } from '../utils/file-ops'
import { promptService } from './prompt.service'

// Import noble crypto modules to stub
import * as aesCiphers from '@noble/ciphers/aes'
import * as webcrypto from '@noble/ciphers/webcrypto'
import * as pbkdf2Module from '@noble/hashes/pbkdf2'
import * as utils from '@noble/hashes/utils'

describe('CLI: Storage Service Tests', () => {
  // Config tests
  describe('Base Config', () => {
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

    it('should handle errors when loading config', async () => {
      existsSyncStub.withArgs(CONFIG_PATH).returns(true)
      readFileAsyncStub.withArgs(CONFIG_PATH, 'utf-8').rejects(new Error('Read error'))

      await assert.rejects(() => storageService.config.load(), {
        message: 'Failed to load config: Read error'
      })
    })

    it('should handle errors when saving config', async () => {
      writeFileAsyncStub.rejects(new Error('Write error'))

      await assert.rejects(() => storageService.config.save({}), {
        message: 'Failed to save config: Write error'
      })
    })
  })

  // Auth tests
  describe('Auth Store Config', () => {
    let existsSyncStub: sinon.SinonStub
    let mkdirAsyncStub: sinon.SinonStub
    let writeFileAsyncStub: sinon.SinonStub
    let readFileAsyncStub: sinon.SinonStub
    let unlinkAsyncStub: sinon.SinonStub
    let promptStub: sinon.SinonStub

    // Noble crypto stubs
    let gcmEncryptStub: sinon.SinonStub
    let gcmDecryptStub: sinon.SinonStub
    let gcmStub: sinon.SinonStub
    let randomBytesStub: sinon.SinonStub
    let pbkdf2Stub: sinon.SinonStub
    let bytesToHexStub: sinon.SinonStub
    let hexToBytesStub: sinon.SinonStub
    let utf8ToBytesStub: sinon.SinonStub
    let bytesToUtf8Stub: sinon.SinonStub

    const CONFIG_DIR = fileOps.joinPath(os.homedir(), '.dspace')
    const AUTH_STORE_PATH = fileOps.joinPath(CONFIG_DIR, 'auth-store.json')
    const SESSION_KEY_PATH = fileOps.joinPath(CONFIG_DIR, '.session_key')

    beforeEach(() => {
      // File operations stubs
      existsSyncStub = sinon.stub(fileOps, 'existsSync')
      mkdirAsyncStub = sinon.stub(fileOps, 'mkdirAsync')
      writeFileAsyncStub = sinon.stub(fileOps, 'writeFileAsync')
      readFileAsyncStub = sinon.stub(fileOps, 'readFileAsync')
      unlinkAsyncStub = sinon.stub(fileOps, 'unlinkAsync')
      promptStub = sinon.stub(promptService, 'prompt')

      // Default behavior for common calls
      mkdirAsyncStub.resolves()
      writeFileAsyncStub.resolves()
      unlinkAsyncStub.resolves()

      // Default prompt responses
      promptStub.resolves('1') // Default to "Do not cache" for key caching prompt

      // Noble crypto stubs
      gcmEncryptStub = sinon.stub().returns(new Uint8Array([1, 2, 3, 4]))
      gcmDecryptStub = sinon.stub().returns(new TextEncoder().encode('{"test":"value"}'))
      gcmStub = sinon.stub(aesCiphers, 'gcm').returns({
        encrypt: gcmEncryptStub,
        decrypt: gcmDecryptStub
      })

      randomBytesStub = sinon.stub(webcrypto, 'randomBytes').returns(new Uint8Array([5, 6, 7, 8]))
      pbkdf2Stub = sinon.stub(pbkdf2Module, 'pbkdf2').returns(new Uint8Array([9, 10, 11, 12]))

      bytesToHexStub = sinon.stub(utils, 'bytesToHex').returns('abcdef1234567890')
      hexToBytesStub = sinon.stub(utils, 'hexToBytes').returns(new Uint8Array([13, 14, 15, 16]))
      utf8ToBytesStub = sinon.stub(utils, 'utf8ToBytes').returns(new Uint8Array([17, 18, 19, 20]))
      bytesToUtf8Stub = sinon.stub(utils, 'bytesToUtf8').returns('{"credentials":{"test":"value"}}')
    })

    afterEach(() => {
      sinon.restore()
    })

    describe('get method', () => {
      it('should return undefined if auth store does not exist', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(false)

        const result = await storageService.auth.get('credentials')
        assert.equal(result, undefined)
      })

      it('should decrypt and return stored value', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(true)
        readFileAsyncStub.withArgs(AUTH_STORE_PATH, 'utf-8').resolves(
          JSON.stringify({
            salt: 'abcdef',
            iv: '123456',
            ciphertext: '789012'
          })
        )

        // Mock session key path to not exist (force password prompt)
        existsSyncStub.withArgs(SESSION_KEY_PATH).returns(false)

        // Mock password prompt
        promptStub.onFirstCall().resolves('masterpass')

        const result = await storageService.auth.get('credentials')
        assert.deepEqual(result, { test: 'value' })
      })
    })

    describe('set method', () => {
      it('should create new secure store if it does not exist', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(false)

        // Mock password setup prompts
        promptStub.onCall(0).resolves('newmasterpass') // New password
        promptStub.onCall(1).resolves('newmasterpass') // Confirm password
        promptStub.onCall(2).resolves('1') // Do not cache

        await storageService.auth.set('credentials', { username: 'user', password: 'pass' })

        assert.ok(writeFileAsyncStub.called)
        assert.ok(mkdirAsyncStub.calledWith(CONFIG_DIR, { recursive: true }))
      })

      it('should update existing secure store', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(true)
        readFileAsyncStub.withArgs(AUTH_STORE_PATH, 'utf-8').resolves(
          JSON.stringify({
            salt: 'abcdef',
            iv: '123456',
            ciphertext: '789012'
          })
        )

        // Mock session key path to not exist (force password prompt)
        existsSyncStub.withArgs(SESSION_KEY_PATH).returns(false)

        // Mock password prompt
        promptStub.onFirstCall().resolves('masterpass')
        promptStub.onSecondCall().resolves('1') // Do not cache

        await storageService.auth.set('credentials', { username: 'user', password: 'pass' })

        assert.ok(writeFileAsyncStub.called)
      })
    })

    describe('delete method', () => {
      it('should return false if auth store does not exist', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(false)

        const result = await storageService.auth.delete('credentials')
        assert.equal(result, false)
      })

      it('should delete key and return true if it exists', async () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(true)
        readFileAsyncStub.withArgs(AUTH_STORE_PATH, 'utf-8').resolves(
          JSON.stringify({
            salt: 'abcdef',
            iv: '123456',
            ciphertext: '789012'
          })
        )

        // Mock session key path to not exist (force password prompt)
        existsSyncStub.withArgs(SESSION_KEY_PATH).returns(false)

        // Mock password prompt
        promptStub.onFirstCall().resolves('masterpass')
        promptStub.onSecondCall().resolves('1') // Do not cache

        const result = await storageService.auth.delete('credentials')
        assert.equal(result, true)
        assert.ok(writeFileAsyncStub.called)
      })
    })

    describe('clearCachedKey method', () => {
      it('should delete session key file if it exists', async () => {
        existsSyncStub.withArgs(SESSION_KEY_PATH).returns(true)

        await storageService.auth.clearCachedKey()

        assert.ok(unlinkAsyncStub.calledWith(SESSION_KEY_PATH))
      })

      it('should not attempt to delete session key file if it does not exist', async () => {
        existsSyncStub.withArgs(SESSION_KEY_PATH).returns(false)

        await storageService.auth.clearCachedKey()

        assert.ok(unlinkAsyncStub.notCalled)
      })
    })

    describe('isMasterPasswordSetup method', () => {
      it('should return true if auth store exists', () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(true)

        const result = storageService.auth.isMasterPasswordSetup()
        assert.equal(result, true)
      })

      it('should return false if auth store does not exist', () => {
        existsSyncStub.withArgs(AUTH_STORE_PATH).returns(false)

        const result = storageService.auth.isMasterPasswordSetup()
        assert.equal(result, false)
      })
    })
  })
})
