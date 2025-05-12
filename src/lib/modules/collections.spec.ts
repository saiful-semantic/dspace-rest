import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Collections Module Tests', () => {
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

  it('should get collections by community ID with specified pagination', async () => {
    const mockCollections = { _embedded: { collections: [] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockCollections })

    const result = await dspaceApiMain.collections.byComId('test-com-id', 50, 1)
    deepEqual(result, mockCollections)
    sinon.assert.calledWith(
      getStub,
      `${ENDPOINTS.COMMUNITIES}/test-com-id/collections?size=50&page=1`
    )
  })

  it('should create collection under a community', async () => {
    const mockCollection = { id: 'new-collection', name: 'Test Collection' } as unknown
    const payload = {
      name: 'Test Collection',
      metadata: { 'dc.title': [{ value: 'Test Collection' }] }
    }
    const postStub = sinon.stub(client, 'post').resolves({ data: mockCollection })

    const result = await dspaceApiMain.collections.create('test-com-id', payload)
    deepEqual(result, mockCollection)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.COMMUNITIES}/test-com-id/collections`, payload)
  })

  it('should delete collection by ID', async () => {
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    const colId = 'col-to-delete'
    await dspaceApiMain.collections.deleteById(colId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.COLLECTIONS}/${colId}`)
  })

  it('should update collection', async () => {
    const mockCollection = {
      id: 'col-to-update',
      name: 'Updated Collection Name',
      type: 'collection'
    } as unknown
    const payload = [{ op: 'replace', path: '/name', value: 'Updated Collection Name' }]
    const patchStub = sinon.stub(client, 'patch').resolves({ data: mockCollection })
    const colId = 'col-to-update'

    const result = await dspaceApiMain.collections.update(colId, payload)
    deepEqual(result, mockCollection)
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.COLLECTIONS}/${colId}`, payload)
  })
})
