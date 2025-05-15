import { equal, deepEqual, ok, strictEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { DSpaceApiError } from '../client'
import { ENDPOINTS } from '../../constants'
import { ApiInfo } from '../dspace.types'

describe('DSpace API Core Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
    // Reset base version between tests
    dspaceApiMain.setBaseVersion(0)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should retrieve API info correctly', async () => {
    const mockApiInfo: ApiInfo = {
      dspaceUI: 'https://ui.example.edu',
      dspaceName: 'Test DSpace',
      dspaceServer: 'https://example.edu/server',
      dspaceVersion: 'DSpace 7.6',
      type: 'root'
    }
    // Stub the actual client.get method used by core.info
    const getStub = sinon.stub(client, 'get').resolves({ data: mockApiInfo })

    const result = await dspaceApiMain.core.info()
    deepEqual(result, mockApiInfo)
    sinon.assert.calledWith(getStub, ENDPOINTS.BASE)
  })

  it('should handle API info errors', async () => {
    sinon.stub(client, 'get').rejects(new DSpaceApiError('Network error', 500))

    try {
      await dspaceApiMain.core.info()
      ok(false, 'Expected error to be thrown')
    } catch (error) {
      ok(error instanceof DSpaceApiError, 'Error should be an instance of DSpaceApiError')
      equal(error.message, 'Network error')
    }
  })

  it('should extract base version correctly', async () => {
    const mockApiInfo: ApiInfo = {
      dspaceUI: 'https://ui.example.edu',
      dspaceName: 'Test DSpace',
      dspaceServer: 'https://example.edu/server',
      dspaceVersion: 'DSpace 7.6',
      type: 'root'
    }

    // Stub the info method to return mock data
    sinon.stub(client, 'get').resolves({ data: mockApiInfo })

    const version = await dspaceApiMain.core.extractBaseVersion()
    strictEqual(version, 7)

    // Verify the version was set in the client
    strictEqual(dspaceApiMain.getBaseVersion(), 7)
  })

  it('should handle different version formats', async () => {
    const mockApiInfo: ApiInfo = {
      dspaceUI: 'https://ui.example.edu',
      dspaceName: 'Test DSpace',
      dspaceServer: 'https://example.edu/server',
      dspaceVersion: 'DSpace 8.0-SNAPSHOT',
      type: 'root'
    }

    sinon.stub(client, 'get').resolves({ data: mockApiInfo })

    const version = await dspaceApiMain.core.extractBaseVersion()
    strictEqual(version, 8)
  })

  it('should throw error for invalid version format', async () => {
    const mockApiInfo: ApiInfo = {
      dspaceUI: 'https://ui.example.edu',
      dspaceName: 'Test DSpace',
      dspaceServer: 'https://example.edu/server',
      dspaceVersion: 'Invalid Version',
      type: 'root'
    }

    sinon.stub(client, 'get').resolves({ data: mockApiInfo })

    try {
      await dspaceApiMain.core.extractBaseVersion()
      ok(false, 'Expected error to be thrown')
    } catch (error) {
      ok(error instanceof Error)
      ok(error.message.includes('Invalid version'))
    }
  })
})
