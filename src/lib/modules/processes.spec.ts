import { equal, deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'
import { Process } from '../dspace.types'

describe('DSpace API Processes Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance
  const mockProcess: Process = {
    id: '123', // DSpace process ID is often numeric, but API client uses string|number
    uuid: 'process-uuid-123',
    name: 'Test Process', // name might not exist on Process, scriptName is key
    scriptName: 'test-script',
    startTime: new Date(),
    processStatus: 'COMPLETED',
    creationTime: new Date(),
    processId: 123,
    parameters: [{ name: '-p', value: 'paramValue' }],
    type: 'process',
    _links: { self: { href: `${baseUrl}${ENDPOINTS.PROCESSES}/123` } }
  }
  const mockProcessesList = { _embedded: { processes: [mockProcess] } }

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should get all processes with default pagination', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockProcessesList })
    const result = await dspaceApiMain.processes.all()
    deepEqual(result, mockProcessesList)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}?size=20&page=0`)
  })

  it('should get process by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockProcess })
    const result = await dspaceApiMain.processes.byId(123)
    deepEqual(result, mockProcess)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}/123`)
  })

  it('should create (start) a process', async () => {
    const scriptName = 'export-metadata'
    const parameters = [{ key: '-c', value: 'collection-uuid' }]
    // The API client's create method for processes POSTs to /processes?scriptName=...&paramKey=paramValue
    const postStub = sinon.stub(client, 'post').resolves({ data: mockProcess })
    const result = await dspaceApiMain.processes.create(scriptName, parameters)

    const expectedUrl = `${ENDPOINTS.PROCESSES}?scriptName=${scriptName}&-c=collection-uuid`
    deepEqual(result, mockProcess)
    sinon.assert.calledWith(postStub, expectedUrl, {}) // Empty body as params are in URL
  })

  it('should delete a process by ID', async () => {
    const processId = 123
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    await dspaceApiMain.processes.deleteById(processId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.PROCESSES}/${processId}`)
  })

  it('should get process log', async () => {
    const processId = 123
    const mockLog = 'Process log output...'
    // getLog calls apiClient.get directly
    const getStub = sinon.stub(client, 'get').resolves({ data: mockLog })
    const result = await dspaceApiMain.processes.getLog(processId)
    equal(result, mockLog)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}/${processId}/output`, {
      responseType: 'text'
    })
  })
})
