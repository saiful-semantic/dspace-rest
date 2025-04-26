import { equal, deepEqual } from 'assert'
import sinon from 'sinon'
import axios from 'axios'
import dspaceApi from './dspace.api'

describe('DSpace API Tests', () => {
  const baseUrl = 'https://demo.dspace.org/server'
  const userAgent = 'TestAgent'

  beforeEach(() => {
    // Reset axios defaults before each test
    axios.defaults.headers.common = {}
    axios.defaults.headers.get = {}
    axios.defaults.headers.post = {}
    axios.defaults.headers.put = {}
    axios.defaults.headers.patch = {}
    axios.defaults.headers.delete = {}
    dspaceApi.init(baseUrl, userAgent)
  })

  afterEach(() => {
    // Clean up sinon stubs
    sinon.restore()
  })

  describe('Init', () => {
    it('should set baseUrl and user agent correctly', () => {
      equal(axios.defaults.baseURL, baseUrl)
      equal(axios.defaults.headers['User-Agent'], userAgent)
    })
  })

  describe('Auth', () => {
    it('should handle successful login', async () => {
      const mockLoginRes = { headers: { 'dspace-xsrf-token': 'test-token' } }
      const mockAuthRes = { headers: { authorization: 'Bearer test' } }
      
      sinon.stub(axios, 'get').resolves(mockLoginRes)
      sinon.stub(axios, 'post').resolves(mockAuthRes)

      const result = await dspaceApi.auth.login('testuser', 'password')
      equal(result, 'login success')
    })

    it('should handle failed login', async () => {
      sinon.stub(axios, 'get').rejects(new Error('Auth failed'))
      const result = await dspaceApi.auth.login('wronguser', 'wrongpass')
      equal(result, 'login failure')
    })
  })

  describe('Communities', () => {
    it('should get all communities', async () => {
      const mockCommunities = { communities: [] }
      sinon.stub(axios, 'get').resolves({ data: mockCommunities })
      
      const result = await dspaceApi.communities.all()
      deepEqual(result, mockCommunities)
    })

    it('should get community by ID', async () => {
      const mockCommunity = { id: 'test-id' }
      sinon.stub(axios, 'get').resolves({ data: mockCommunity })
      
      const result = await dspaceApi.communities.byId('test-id')
      deepEqual(result, mockCommunity)
    })

    it('should get top communities', async () => {
      const mockTopCommunities = { communities: [{ id: 'top-1' }] }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockTopCommunities })
      
      const result = await dspaceApi.communities.top()
      deepEqual(result, mockTopCommunities)
      sinon.assert.calledWith(getStub, '/api/core/communities/search/top?size=20')
    })

    it('should get subcommunities by ID', async () => {
      const mockSubCommunities = { subcommunities: [{ id: 'sub-1' }] }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockSubCommunities })
      
      const result = await dspaceApi.communities.subById('parent-com')
      deepEqual(result, mockSubCommunities)
      sinon.assert.calledWith(getStub, '/api/core/communities/parent-com/subcommunities?size=100')
    })
  })

  describe('Collections', () => {
    it('should get collections by community ID', async () => {
      const mockCollections = { collections: [] }
      sinon.stub(axios, 'get').resolves({ data: mockCollections })
      
      const result = await dspaceApi.collections.byComId('test-com-id')
      deepEqual(result, mockCollections)
    })

    it('should create collection', async () => {
      const mockCollection = { id: 'new-collection' }
      sinon.stub(axios, 'post').resolves({ data: mockCollection })
      
      const result = await dspaceApi.collections.create('test-com-id', {})
      deepEqual(result, mockCollection)
    })
  })

  describe('Items', () => {
    it('should get item by ID', async () => {
      const mockItem = { id: 'test-item' }
      sinon.stub(axios, 'get').resolves({ data: mockItem })
      
      const result = await dspaceApi.items.byId('test-item')
      deepEqual(result, mockItem)
    })

    it('should update item', async () => {
      const mockUpdatedItem = { id: 'test-item', updated: true }
      sinon.stub(axios, 'patch').resolves({ data: mockUpdatedItem })
      
      const result = await dspaceApi.items.update('test-item', { updated: true })
      deepEqual(result, mockUpdatedItem)
    })

    it('should get all items with pagination', async () => {
      const mockItems = { items: [{ id: 'item-1' }] }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockItems })
      
      const result = await dspaceApi.items.all(50)
      deepEqual(result, mockItems)
      sinon.assert.calledWith(getStub, '/api/core/items?size=50')
    })

    it('should move item to new collection', async () => {
      const putStub = sinon.stub(axios, 'put').resolves({ data: {} })
      
      await dspaceApi.items.move('test-item', 'target-collection')
      sinon.assert.calledWith(
        putStub, 
        '/api/core/items/test-item/owningCollection',
        `${baseUrl}/api/core/collections/target-collection`,
        { headers: { 'Content-Type': 'text/uri-list' } }
      )
    })
  })

  describe('Bundles', () => {
    it('should get bundle by ID', async () => {
      const mockBundle = { id: 'test-bundle', name: 'ORIGINAL' }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockBundle })
      
      const result = await dspaceApi.bundles.byId('test-bundle')
      deepEqual(result, mockBundle)
      sinon.assert.calledWith(getStub, '/api/core/bundles/test-bundle')
    })

    it('should get bundles by item ID', async () => {
      const mockBundles = { _embedded: { bundles: [{ id: 'bundle-1' }] } }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockBundles })
      
      const result = await dspaceApi.bundles.byItemId('test-item')
      deepEqual(result, mockBundles)
      sinon.assert.calledWith(getStub, '/api/core/items/test-item/bundles')
    })
  })

  describe('Bitstreams', () => {
    it('should get bitstreams by bundle ID', async () => {
      const mockBitstreams = { _embedded: { bitstreams: [{ id: 'bit-1' }] } }
      const getStub = sinon.stub(axios, 'get').resolves({ data: mockBitstreams })
      
      const result = await dspaceApi.bitstreams.byBundleId('test-bundle')
      deepEqual(result, mockBitstreams)
      sinon.assert.calledWith(getStub, '/api/core/bundles/test-bundle/bitstreams')
    })

    it('should create new bitstream', async () => {
      const mockBitstream = { id: 'new-bitstream' }
      const postStub = sinon.stub(axios, 'post').resolves({ data: mockBitstream })
      
      const formData = new FormData()
      const result = await dspaceApi.bitstreams.create('test-bundle', formData)
      deepEqual(result, mockBitstream)
      sinon.assert.calledWith(
        postStub,
        '/api/core/bundles/test-bundle/bitstreams',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
    })

    it('should delete bitstream', async () => {
      const deleteStub = sinon.stub(axios, 'delete').resolves({ data: undefined })
      
      await dspaceApi.bitstreams.delete('test-bitstream')
      sinon.assert.calledWith(deleteStub, '/api/core/bitstreams/test-bitstream')
    })

    it('should delete multiple bitstreams', async () => {
      const payload = { bitstreams: ['id1', 'id2'] }
      const patchStub = sinon.stub(axios, 'patch').resolves({ data: undefined })
      
      await dspaceApi.bitstreams.multiDelete(payload)
      sinon.assert.calledWith(patchStub, '/api/core/bitstreams', payload)
    })
  })
})