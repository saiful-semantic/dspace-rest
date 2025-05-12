import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Bundles Module Tests', () => {
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

  it('should get bundle by ID', async () => {
    const mockBundle = { id: 'test-bundle', name: 'ORIGINAL' } as unknown
    const getStub = sinon.stub(client, 'get').resolves({ data: mockBundle })

    const result = await dspaceApiMain.bundles.byId('test-bundle')
    deepEqual(result, mockBundle)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.BUNDLES}/test-bundle`)
  })

  it('should get bundles by item ID with default pagination', async () => {
    const mockBundles = { _embedded: { bundles: [{ id: 'bundle-1' }] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockBundles })

    const result = await dspaceApiMain.bundles.byItemId('test-item-id')
    deepEqual(result, mockBundles)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}/test-item-id/bundles?size=20&page=0`)
  })

  it('should create a bundle within an item', async () => {
    const mockBundle = { id: 'new-bundle-id', type: 'bundle', name: 'ORIGINAL' } as unknown
    const payload = { name: 'ORIGINAL' } // Example payload
    const itemId = 'parent-item-id'
    const postStub = sinon.stub(client, 'post').resolves({ data: mockBundle })

    const result = await dspaceApiMain.bundles.create(itemId, payload)
    deepEqual(result, mockBundle)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload)
  })

  it('should delete a bundle by its ID', async () => {
    const bundleId = 'bundle-to-delete'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

    await dspaceApiMain.bundles.deleteById(bundleId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.BUNDLES}/${bundleId}`)
  })
})
