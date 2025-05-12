import { equal, deepEqual, ok } from 'assert'
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
})
