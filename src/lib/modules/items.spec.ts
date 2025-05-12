import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Items Module Tests', () => {
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

  it('should get item by ID', async () => {
    const mockItem = { id: 'test-item', type: 'item' } as unknown
    const getStub = sinon.stub(client, 'get').resolves({ data: mockItem })

    const result = await dspaceApiMain.items.byId('test-item')
    deepEqual(result, mockItem)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}/test-item`)
  })

  it('should update item', async () => {
    const mockUpdatedItem = { id: 'test-item', name: 'Updated Title' }
    const payload = [{ op: 'replace', path: '/metadata/dc.title/0/value', value: 'Updated Title' }]
    const patchStub = sinon.stub(client, 'patch').resolves({ data: mockUpdatedItem })

    const result = await dspaceApiMain.items.update('test-item', payload)
    deepEqual(result, mockUpdatedItem)
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.ITEMS}/test-item`, payload)
  })

  it('should get all items with specified size and default page', async () => {
    const mockItems = { _embedded: { items: [{ id: 'item-1' }] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockItems })

    const result = await dspaceApiMain.items.all(50)
    deepEqual(result, mockItems)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}?size=50&page=0`)
  })

  it('should move item to new collection', async () => {
    const putStub = sinon.stub(client, 'put').resolves({ data: {} })

    await dspaceApiMain.items.move('test-item', 'target-collection-id')
    const expectedUri = `${baseUrl}${ENDPOINTS.COLLECTIONS}/target-collection-id`
    sinon.assert.calledWith(
      putStub,
      `${ENDPOINTS.ITEMS}/test-item/owningCollection`,
      expectedUri,
      sinon.match({ headers: { 'Content-Type': 'text/uri-list' } })
    )
  })

  it('should create an item within a collection', async () => {
    const mockItem = { id: 'new-item-id', type: 'item', name: 'New Test Item' } as unknown
    const payload = { metadata: { 'dc.title': [{ value: 'New Test Item' }] } }
    const colId = 'parent-col-id'
    const postStub = sinon.stub(client, 'post').resolves({ data: mockItem })

    const result = await dspaceApiMain.items.create(colId, payload)
    deepEqual(result, mockItem)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.COLLECTIONS}/${colId}/items`, payload)
  })

  it('should delete an item by its ID', async () => {
    const itemId = 'item-to-delete'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

    await dspaceApiMain.items.deleteById(itemId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.ITEMS}/${itemId}`)
  })
})
