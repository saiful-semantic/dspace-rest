import { strict as assert } from 'assert'
import sinon from 'sinon'
import { configService } from './config.service'
import { fileOps } from '../utils/file-ops'
import os from 'os'
import path from 'path'

describe('CLI: Config Service', () => {
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
    readFileSyncStub.withArgs(CONFIG_PATH, 'utf-8')
      .returns('{"baseURL":"https://example.com","serverInfo":{"dspaceVersion":"7.6"}}')
    const config = configService.loadConfig()
    assert.deepEqual(config, {
      baseURL: 'https://example.com',
      serverInfo: {
        dspaceVersion: '7.6'
      }
    })
    assert.ok(readFileSyncStub.calledWith(CONFIG_PATH, 'utf-8'))
  })

  it('should create config file if it does not exist', () => {
    existsSyncStub.withArgs(CONFIG_PATH).returns(false)
    readFileSyncStub.withArgs(CONFIG_PATH, 'utf-8').returns('{}')
    const config = configService.loadConfig()
    assert.deepEqual(config, {})
    assert.ok(mkdirSyncStub.calledWith(CONFIG_DIR, { recursive: true }))
    assert.ok(writeFileSyncStub.calledWith(CONFIG_PATH, sinon.match.string))
  })

  it('should save config with nested serverInfo', () => {
    const config: any = {
      baseURL: 'https://example.edu/server',
      verified: false,
      serverInfo: {
        dspaceUI: 'https://ui.example.edu/',
        dspaceVersion: '7.6'
      }
    }
    configService.saveConfig(config)
    assert.ok(writeFileSyncStub.calledWith(
      CONFIG_PATH,
      JSON.stringify(config, null, 2)
    ))
  })

  it('should handle empty serverInfo', () => {
    const config: any = {
      baseURL: 'https://example.edu/server',
      verified: true,
      serverInfo: {}
    }
    configService.saveConfig(config)
    assert.ok(writeFileSyncStub.calledWith(
      CONFIG_PATH,
      JSON.stringify(config, null, 2)
    ))
  })
})
