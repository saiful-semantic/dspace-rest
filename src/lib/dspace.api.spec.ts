import { equal, deepEqual, ok } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApi, { DSpaceApiError } from './dspace.api'
import { LOGIN_RESULT } from '../constants'

describe('DSpace API Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance

  beforeEach(() => {
    // Initialize the DSpace API. This creates the apiClient instance internally.
    dspaceApi.init(baseUrl, userAgent)
    // Get the client instance for stubbing.
    // Make sure getClient() is available and working as expected in dspaceApi module.
    // If getClient() throws if not initialized, this is the correct place.
    client = dspaceApi.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Init', () => {
    it('should set api_url and User-Agent correctly on the internal Axios instance', () => {
      // Access the defaults of the internal client
      const clientDefaults = dspaceApi.getClient().defaults
      equal(clientDefaults.baseURL, baseUrl)
      const foundUserAgent = clientDefaults.headers['User-Agent'] as string
      ok(
        clientDefaults.headers['User-Agent'] === userAgent,
        `Expected User-Agent '${userAgent}', but got '${foundUserAgent}'`
      )
    })
  })

  describe('Core API', () => {
    it('should retrieve API info correctly', async () => {
      const mockApiInfo = {
        dspaceUI: 'https://ui.example.edu',
        dspaceName: 'Test DSpace',
        dspaceServer: 'https://example.edu/server',
        dspaceVersion: 'DSpace 7.6',
        type: 'root'
      }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockApiInfo } as unknown)

      const result = await dspaceApi.core.info()
      equal(result.dspaceVersion, mockApiInfo.dspaceVersion)
      equal(result.dspaceName, mockApiInfo.dspaceName)
      sinon.assert.calledWith(getStub, '/api')
    })

    it('should handle API info errors', async () => {
      sinon.stub(client, 'get').rejects(new DSpaceApiError('Network error', 500))

      try {
        await dspaceApi.core.info()
        ok(false, 'Expected error to be thrown')
      } catch (error) {
        ok(error instanceof DSpaceApiError, 'Error should be an instance of DSpaceApiError')
        equal(error.message, 'Network error')
      }
    })
  })

  describe('Auth', () => {
    it('should handle successful DSpace 8+ login and set auth headers', async () => {
      const getStub = sinon
        .stub(client, 'get')
        .withArgs('/api/security/csrf')
        .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-8' }, data: {} } as unknown)

      const postStub = sinon
        .stub(client, 'post')
        .withArgs('/api/authn/login')
        .resolves({ headers: { authorization: 'Bearer test-token' }, data: {} } as unknown)

      const result = await dspaceApi.auth.login('testuser', 'password')
      equal(result, LOGIN_RESULT.SUCCESS)
      equal(client.defaults.headers.common['Authorization'], 'Bearer test-token')
      equal(client.defaults.headers.common['X-XSRF-Token'], 'csrf-token-8')

      sinon.assert.calledOnce(getStub)
      sinon.assert.calledOnce(postStub)
    })

    it('should fallback to DSpace 7 login on DSpace 8+ CSRF failure and set auth headers', async () => {
      const getStub = sinon.stub(client, 'get')
      getStub
        .withArgs('/api/security/csrf')
        .rejects(new DSpaceApiError('CSRF not found for DSpace 8+', 404))
      getStub
        .withArgs('/api/authn/status')
        .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-7' }, data: {} } as unknown)

      const postStub = sinon
        .stub(client, 'post')
        .withArgs('/api/authn/login')
        .resolves({ headers: { authorization: 'Bearer test-token-7' }, data: {} } as unknown)

      const result = await dspaceApi.auth.login('testuser', 'password')
      equal(result, LOGIN_RESULT.SUCCESS)
      equal(client.defaults.headers.common['Authorization'], 'Bearer test-token-7')
      equal(client.defaults.headers.common['X-XSRF-Token'], 'csrf-token-7')

      sinon.assert.calledWith(getStub, '/api/security/csrf')
      sinon.assert.calledWith(getStub, '/api/authn/status')
      sinon.assert.calledOnce(postStub)
    })

    it('should handle total login failure if both strategies fail', async () => {
      const getStub = sinon.stub(client, 'get')
      getStub
        .withArgs('/api/security/csrf')
        .rejects(new DSpaceApiError('CSRF not found for DSpace 8+', 404))
      getStub
        .withArgs('/api/authn/status')
        .rejects(new DSpaceApiError('CSRF not found for DSpace 7', 404))
      // Post stub should not be called if CSRF fails for both
      const postStub = sinon.stub(client, 'post')

      const result = await dspaceApi.auth.login('wronguser', 'wrongpass')
      equal(result, LOGIN_RESULT.FAILURE)
      ok(
        !client.defaults.headers.common['Authorization'],
        'Authorization header should not be set on failure'
      )
      ok(
        !client.defaults.headers.common['X-XSRF-Token'],
        'X-XSRF-Token header should not be set on failure'
      )
      sinon.assert.notCalled(postStub)
    })

    it('should clear auth headers on logout', async () => {
      // Simulate a logged-in state
      client.defaults.headers.common['Authorization'] = 'Bearer old-token'
      client.defaults.headers.common['X-XSRF-Token'] = 'old-csrf-token'

      const postStub = sinon
        .stub(client, 'post')
        .withArgs('/api/authn/logout')
        .resolves({} as unknown)

      await dspaceApi.auth.logout()

      ok(
        !client.defaults.headers.common['Authorization'],
        'Authorization header should be cleared after logout'
      )
      ok(
        !client.defaults.headers.common['X-XSRF-Token'],
        'X-XSRF-Token header should be cleared after logout'
      )
      sinon.assert.calledOnce(postStub)
    })

    it('should handle logout failure but still clear local tokens', async () => {
      // Simulate a logged-in state
      client.defaults.headers.common['Authorization'] = 'Bearer old-token'
      client.defaults.headers.common['X-XSRF-Token'] = 'old-csrf-token'

      sinon
        .stub(client, 'post')
        .withArgs('/api/authn/logout')
        .rejects(new DSpaceApiError('Logout API failed', 500))

      try {
        await dspaceApi.auth.logout()
      } catch (e: unknown) {
        ok(e instanceof DSpaceApiError, 'Should throw DSpaceApiError on logout failure')
        equal(e.message, 'Logout failed') // As per the updated API client
      }

      ok(
        !client.defaults.headers.common['Authorization'],
        'Authorization header should be cleared even if API logout fails'
      )
      ok(
        !client.defaults.headers.common['X-XSRF-Token'],
        'X-XSRF-Token header should be cleared even if API logout fails'
      )
    })

    it('should get authentication status and update CSRF token', async () => {
      const mockStatusResponse = { authenticated: true, epeopleId: 'user123' }
      const newCsrfToken = 'new-csrf-from-status'
      sinon
        .stub(client, 'get')
        .withArgs('/api/authn/status')
        .resolves({
          data: mockStatusResponse,
          headers: { 'dspace-xsrf-token': newCsrfToken }
        } as unknown)

      const status = await dspaceApi.auth.status()
      deepEqual(status, mockStatusResponse)
      equal(
        client.defaults.headers.common['X-XSRF-Token'],
        newCsrfToken,
        'CSRF token should be updated from status response'
      )
    })
  })

  describe('Communities', () => {
    it('should get all communities with default pagination', async () => {
      const mockCommunities = { _embedded: { communities: [] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities } as unknown)

      const result = await dspaceApi.communities.all() // Uses size=20, page=0 by default
      deepEqual(result, mockCommunities)
      sinon.assert.calledWith(getStub, '/api/core/communities?size=20&page=0')
    })

    it('should get all communities with specified pagination', async () => {
      const mockCommunities = { _embedded: { communities: [] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities } as unknown)

      await dspaceApi.communities.all(50, 2)
      sinon.assert.calledWith(getStub, '/api/core/communities?size=50&page=2')
    })

    it('should get community by ID', async () => {
      const mockCommunity = { id: 'test-id', type: 'community' }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunity } as unknown)

      const result = await dspaceApi.communities.byId('test-id')
      deepEqual(result, mockCommunity)
      sinon.assert.calledWith(getStub, '/api/core/communities/test-id')
    })

    it('should get top communities with default pagination', async () => {
      const mockTopCommunities = { _embedded: { communities: [{ id: 'top-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockTopCommunities } as unknown)

      const result = await dspaceApi.communities.top()
      deepEqual(result, mockTopCommunities)
      sinon.assert.calledWith(getStub, '/api/core/communities/search/top?size=20&page=0')
    })

    it('should get subcommunities by ID with default pagination', async () => {
      const mockSubCommunities = { _embedded: { subcommunities: [{ id: 'sub-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockSubCommunities } as unknown)

      const result = await dspaceApi.communities.subById('parent-com')
      deepEqual(result, mockSubCommunities)
      sinon.assert.calledWith(
        getStub,
        '/api/core/communities/parent-com/subcommunities?size=100&page=0'
      )
    })
  })

  describe('Collections', () => {
    it('should get collections by community ID with specified pagination', async () => {
      const mockCollections = { _embedded: { collections: [] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCollections } as unknown)

      const result = await dspaceApi.collections.byComId('test-com-id', 50, 1)
      deepEqual(result, mockCollections)
      sinon.assert.calledWith(
        getStub,
        '/api/core/communities/test-com-id/collections?size=50&page=1'
      )
    })

    it('should create collection under a community', async () => {
      const mockCollection = { id: 'new-collection', name: 'Test Collection' }
      const payload = {
        name: 'Test Collection',
        metadata: {
          /* ... */
        }
      }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockCollection } as unknown)

      const result = await dspaceApi.collections.create('test-com-id', payload)
      deepEqual(result, mockCollection)
      // Note: The API client constructs this URL: `${ENDPOINTS.COMMUNITIES}/${comId}/collections`
      sinon.assert.calledWith(postStub, '/api/core/communities/test-com-id/collections', payload)
    })
  })

  describe('Items', () => {
    it('should get item by ID', async () => {
      const mockItem = { id: 'test-item', type: 'item' }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockItem } as unknown)

      const result = await dspaceApi.items.byId('test-item')
      deepEqual(result, mockItem)
      sinon.assert.calledWith(getStub, '/api/core/items/test-item')
    })

    // TODO: Fix the payload
    // it('should update item', async () => {
    //   const mockUpdatedItem = { id: 'test-item', name: 'Updated Name' }
    //   const payload = [{ op: 'replace', path: '/name', value: 'Updated Name' }] // Example JSON patch payload
    //   const patchStub = sinon.stub(client, 'patch').resolves({ data: mockUpdatedItem } as unknown)
    //
    //   const result = await dspaceApi.items.update('test-item', payload as any)
    //   deepEqual(result, mockUpdatedItem)
    //   sinon.assert.calledWith(patchStub, '/api/core/items/test-item', payload)
    // })

    it('should get all items with specified size and default page', async () => {
      const mockItems = { _embedded: { items: [{ id: 'item-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockItems } as unknown)

      const result = await dspaceApi.items.all(50) // page defaults to 0
      deepEqual(result, mockItems)
      sinon.assert.calledWith(getStub, '/api/core/items?size=50&page=0')
    })

    it('should move item to new collection', async () => {
      const putStub = sinon.stub(client, 'put').resolves({ data: {} } as unknown) // putUri uses client.put

      await dspaceApi.items.move('test-item', 'target-collection-id')
      const expectedUri = `${baseUrl}/api/core/collections/target-collection-id`
      sinon.assert.calledWith(
        putStub,
        '/api/core/items/test-item/owningCollection',
        expectedUri, // The body of the PUT request for text/uri-list
        sinon.match({ headers: { 'Content-Type': 'text/uri-list' } })
      )
    })
  })

  describe('Bundles', () => {
    it('should get bundle by ID', async () => {
      const mockBundle = { id: 'test-bundle', name: 'ORIGINAL' }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBundle } as unknown)

      const result = await dspaceApi.bundles.byId('test-bundle')
      deepEqual(result, mockBundle)
      sinon.assert.calledWith(getStub, '/api/core/bundles/test-bundle')
    })

    it('should get bundles by item ID with default pagination', async () => {
      const mockBundles = { _embedded: { bundles: [{ id: 'bundle-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBundles } as unknown)

      const result = await dspaceApi.bundles.byItemId('test-item-id') // size=20, page=0
      deepEqual(result, mockBundles)
      sinon.assert.calledWith(getStub, '/api/core/items/test-item-id/bundles?size=20&page=0')
    })
  })

  describe('Bitstreams', () => {
    it('should get bitstreams by bundle ID with custom pagination', async () => {
      const mockBitstreams = { _embedded: { bitstreams: [{ id: 'bit-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBitstreams } as unknown)

      const result = await dspaceApi.bitstreams.byBundleId('test-bundle-id', 10, 1)
      deepEqual(result, mockBitstreams)
      sinon.assert.calledWith(getStub, '/api/core/bundles/test-bundle-id/bitstreams?size=10&page=1')
    })

    it('should create new bitstream without explicit name', async () => {
      const mockBitstream = { id: 'new-bitstream', name: 'file.txt' }
      // postForm uses client.post
      const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream } as unknown)

      const formData = new FormData() // Assuming FormData is available in test env (e.g. jsdom)
      formData.append('file', new Blob(['content']), 'file.txt')

      const result = await dspaceApi.bitstreams.create('test-bundle-id', formData)
      deepEqual(result, mockBitstream)
      sinon.assert.calledWith(
        postStub,
        '/api/core/bundles/test-bundle-id/bitstreams', // URL without name query param
        formData,
        sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
    })

    it('should create new bitstream with explicit name', async () => {
      const mockBitstream = { id: 'new-bitstream', name: 'customName.pdf' }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream } as unknown)

      const formData = new FormData()
      formData.append('file', new Blob(['pdf content']), 'original.pdf')
      const bitstreamName = 'customName.pdf'

      const result = await dspaceApi.bitstreams.create('test-bundle-id', formData, bitstreamName)
      deepEqual(result, mockBitstream)
      const expectedUrl = `/api/core/bundles/test-bundle-id/bitstreams?name=${encodeURIComponent(bitstreamName)}`
      sinon.assert.calledWith(
        postStub,
        expectedUrl,
        formData,
        sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
    })

    it('should delete bitstream by ID', async () => {
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined } as unknown) // delete uses client.delete

      await dspaceApi.bitstreams.deleteById('test-bitstream-id')
      sinon.assert.calledWith(deleteStub, '/api/core/bitstreams/test-bitstream-id')
    })

    // TODO: Fix the payload
    // it('should perform batch update on bitstreams (e.g. multiple delete)', async () => {
    //   // Example payload for deleting multiple bitstreams (structure depends on DSpace version)
    //   const payload = [
    //     { op: 'remove', path: '/bitstreams/id1' },
    //     { op: 'remove', path: '/bitstreams/id2' }
    //   ]
    //   const patchStub = sinon
    //     .stub(client, 'patch')
    //     .resolves({ data: { status: 'success' } } as unknown) // batchUpdate uses client.patch
    //
    //   await dspaceApi.bitstreams.batchUpdate(payload)
    //   sinon.assert.calledWith(patchStub, '/api/core/bitstreams', payload)
    // })

    it('should retrieve bitstream content', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      // retrieve directly calls apiClient.get
      const getStub = sinon.stub(client, 'get').resolves({ data: mockArrayBuffer } as unknown)

      const result = await dspaceApi.bitstreams.retrieve('test-bitstream-id')
      deepEqual(result, mockArrayBuffer)
      sinon.assert.calledWith(getStub, '/api/core/bitstreams/test-bitstream-id/retrieve', {
        responseType: 'arraybuffer'
      })
    })
  })
})
