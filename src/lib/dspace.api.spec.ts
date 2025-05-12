// dspace.api.spec.ts
import { equal, deepEqual, ok } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApi, { DSpaceApiError } from './dspace.api'
import { LOGIN_RESULT, ENDPOINTS } from '../constants'
import { EPerson, Process, WorkflowItem, WorkflowTask, ResourcePolicy, Group } from './dspace.types'

describe('DSpace API Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance

  beforeEach(() => {
    dspaceApi.init(baseUrl, userAgent)
    client = dspaceApi.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Init', () => {
    it('should set api_url and User-Agent correctly on the internal Axios instance', () => {
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
      const getStub = sinon.stub(client, 'get').resolves({ data: mockApiInfo })

      const result = await dspaceApi.core.info()
      equal(result.dspaceVersion, mockApiInfo.dspaceVersion)
      equal(result.dspaceName, mockApiInfo.dspaceName)
      sinon.assert.calledWith(getStub, ENDPOINTS.BASE)
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
        .withArgs(ENDPOINTS.CSRF_DSPACE8)
        .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-8' }, data: {} })

      const postStub = sinon
        .stub(client, 'post')
        .withArgs(ENDPOINTS.LOGIN)
        .resolves({ headers: { authorization: 'Bearer test-token' }, data: {} })

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
        .withArgs(ENDPOINTS.CSRF_DSPACE8)
        .rejects(new DSpaceApiError('CSRF not found for DSpace 8+', 404))
      getStub
        .withArgs(ENDPOINTS.CSRF_DSPACE7)
        .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-7' }, data: {} })

      const postStub = sinon
        .stub(client, 'post')
        .withArgs(ENDPOINTS.LOGIN)
        .resolves({ headers: { authorization: 'Bearer test-token-7' }, data: {} })

      const result = await dspaceApi.auth.login('testuser', 'password')
      equal(result, LOGIN_RESULT.SUCCESS)
      equal(client.defaults.headers.common['Authorization'], 'Bearer test-token-7')
      equal(client.defaults.headers.common['X-XSRF-Token'], 'csrf-token-7')

      sinon.assert.calledWith(getStub, ENDPOINTS.CSRF_DSPACE8)
      sinon.assert.calledWith(getStub, ENDPOINTS.CSRF_DSPACE7)
      sinon.assert.calledOnce(postStub)
    })

    it('should handle total login failure if both strategies fail', async () => {
      const getStub = sinon.stub(client, 'get')
      getStub
        .withArgs(ENDPOINTS.CSRF_DSPACE8)
        .rejects(new DSpaceApiError('CSRF not found for DSpace 8+', 404))
      getStub
        .withArgs(ENDPOINTS.CSRF_DSPACE7)
        .rejects(new DSpaceApiError('CSRF not found for DSpace 7', 404))
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
      client.defaults.headers.common['Authorization'] = 'Bearer old-token'
      client.defaults.headers.common['X-XSRF-Token'] = 'old-csrf-token'

      const postStub = sinon.stub(client, 'post').withArgs(ENDPOINTS.LOGOUT).resolves({})

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
      client.defaults.headers.common['Authorization'] = 'Bearer old-token'
      client.defaults.headers.common['X-XSRF-Token'] = 'old-csrf-token'

      sinon
        .stub(client, 'post')
        .withArgs(ENDPOINTS.LOGOUT)
        .rejects(new DSpaceApiError('Logout API failed', 500))

      // The API client's logout method is designed to not throw an error for a failed HTTP request,
      // but rather log it and proceed to clear headers.
      // If it were to re-throw, the try-catch here would be necessary.
      // Given the current implementation, we just await and then check headers.
      await dspaceApi.auth.logout()

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
        .withArgs(ENDPOINTS.STATUS)
        .resolves({
          data: mockStatusResponse,
          headers: { 'dspace-xsrf-token': newCsrfToken }
        })

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
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities })

      const result = await dspaceApi.communities.all()
      deepEqual(result, mockCommunities)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}?size=20&page=0`)
    })

    it('should get all communities with specified pagination', async () => {
      const mockCommunities = { _embedded: { communities: [] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities })

      await dspaceApi.communities.all(50, 2)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}?size=50&page=2`)
    })

    it('should get community by ID', async () => {
      const mockCommunity = { id: 'test-id', type: 'community' }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunity })

      const result = await dspaceApi.communities.byId('test-id')
      deepEqual(result, mockCommunity)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}/test-id`)
    })

    it('should get top communities with default pagination', async () => {
      const mockTopCommunities = { _embedded: { communities: [{ id: 'top-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockTopCommunities })

      const result = await dspaceApi.communities.top()
      deepEqual(result, mockTopCommunities)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}/search/top?size=20&page=0`)
    })

    it('should get subcommunities by ID with default pagination', async () => {
      const mockSubCommunities = { _embedded: { subcommunities: [{ id: 'sub-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockSubCommunities })

      const result = await dspaceApi.communities.subById('parent-com')
      deepEqual(result, mockSubCommunities)
      sinon.assert.calledWith(
        getStub,
        `${ENDPOINTS.COMMUNITIES}/parent-com/subcommunities?size=100&page=0`
      )
    })

    it('should create community without parent', async () => {
      const mockCommunity = { id: 'new-com', name: 'New Community', type: 'community' } as unknown
      const payload = {
        name: 'New Community',
        metadata: { 'dc.title': [{ value: 'New Community' }] }
      }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockCommunity })

      const result = await dspaceApi.communities.create(payload)
      deepEqual(result, mockCommunity)
      sinon.assert.calledWith(postStub, ENDPOINTS.COMMUNITIES, payload)
    })

    it('should create community with parent ID', async () => {
      const mockCommunity = {
        id: 'new-sub-com',
        name: 'New Sub Community',
        type: 'community'
      } as unknown
      const payload = {
        name: 'New Sub Community',
        metadata: { 'dc.title': [{ value: 'New Sub Community' }] }
      }
      const parentId = 'parent-123'
      const postStub = sinon.stub(client, 'post').resolves({ data: mockCommunity })

      const result = await dspaceApi.communities.create(payload, parentId)
      deepEqual(result, mockCommunity)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.COMMUNITIES}?parent=${parentId}`, payload)
    })

    it('should delete community by ID', async () => {
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      const comId = 'com-to-delete'
      await dspaceApi.communities.deleteById(comId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.COMMUNITIES}/${comId}`)
    })

    it('should update community', async () => {
      const mockCommunity = { id: 'com-to-update', name: 'Updated Name', type: 'community' } as any
      const payload = [{ op: 'replace', path: '/name', value: 'Updated Name' }]
      const patchStub = sinon.stub(client, 'patch').resolves({ data: mockCommunity })
      const comId = 'com-to-update'

      const result = await dspaceApi.communities.update(comId, payload)
      deepEqual(result, mockCommunity)
      sinon.assert.calledWith(patchStub, `${ENDPOINTS.COMMUNITIES}/${comId}`, payload)
    })
  })

  describe('Collections', () => {
    it('should get collections by community ID with specified pagination', async () => {
      const mockCollections = { _embedded: { collections: [] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockCollections })

      const result = await dspaceApi.collections.byComId('test-com-id', 50, 1)
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

      const result = await dspaceApi.collections.create('test-com-id', payload)
      deepEqual(result, mockCollection)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.COMMUNITIES}/test-com-id/collections`, payload)
    })

    it('should delete collection by ID', async () => {
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      const colId = 'col-to-delete'
      await dspaceApi.collections.deleteById(colId)
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

      const result = await dspaceApi.collections.update(colId, payload)
      deepEqual(result, mockCollection)
      sinon.assert.calledWith(patchStub, `${ENDPOINTS.COLLECTIONS}/${colId}`, payload)
    })
  })

  describe('Items', () => {
    it('should get item by ID', async () => {
      const mockItem = { id: 'test-item', type: 'item' } as unknown
      const getStub = sinon.stub(client, 'get').resolves({ data: mockItem })

      const result = await dspaceApi.items.byId('test-item')
      deepEqual(result, mockItem)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}/test-item`)
    })

    // TODO: Fix the payload, depends on actual metadata structure and JSON patch ops
    // it('should update item', async () => {
    //   const mockUpdatedItem = { id: 'test-item', name: 'Updated Name' }
    //   const payload = [{ op: 'replace', path: '/metadata/dc.title/0/value', value: 'Updated Name' }]
    //   const patchStub = sinon.stub(client, 'patch').resolves({ data: mockUpdatedItem })
    //
    //   const result = await dspaceApi.items.update('test-item', payload)
    //   deepEqual(result, mockUpdatedItem)
    //   sinon.assert.calledWith(patchStub, `${ENDPOINTS.ITEMS}/test-item`, payload)
    // })

    it('should get all items with specified size and default page', async () => {
      const mockItems = { _embedded: { items: [{ id: 'item-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockItems })

      const result = await dspaceApi.items.all(50)
      deepEqual(result, mockItems)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}?size=50&page=0`)
    })

    it('should move item to new collection', async () => {
      const putStub = sinon.stub(client, 'put').resolves({ data: {} })

      await dspaceApi.items.move('test-item', 'target-collection-id')
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

      const result = await dspaceApi.items.create(colId, payload)
      deepEqual(result, mockItem)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.COLLECTIONS}/${colId}/items`, payload)
    })

    it('should delete an item by its ID', async () => {
      const itemId = 'item-to-delete'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

      await dspaceApi.items.deleteById(itemId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.ITEMS}/${itemId}`)
    })
  })

  describe('Bundles', () => {
    it('should get bundle by ID', async () => {
      const mockBundle = { id: 'test-bundle', name: 'ORIGINAL' } as unknown
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBundle })

      const result = await dspaceApi.bundles.byId('test-bundle')
      deepEqual(result, mockBundle)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.BUNDLES}/test-bundle`)
    })

    it('should get bundles by item ID with default pagination', async () => {
      const mockBundles = { _embedded: { bundles: [{ id: 'bundle-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBundles })

      const result = await dspaceApi.bundles.byItemId('test-item-id')
      deepEqual(result, mockBundles)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.ITEMS}/test-item-id/bundles?size=20&page=0`)
    })

    it('should create a bundle within an item', async () => {
      const mockBundle = { id: 'new-bundle-id', type: 'bundle', name: 'ORIGINAL' } as unknown
      const payload = { name: 'ORIGINAL' } // Example payload
      const itemId = 'parent-item-id'
      const postStub = sinon.stub(client, 'post').resolves({ data: mockBundle })

      const result = await dspaceApi.bundles.create(itemId, payload)
      deepEqual(result, mockBundle)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload)
    })

    it('should delete a bundle by its ID', async () => {
      const bundleId = 'bundle-to-delete'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

      await dspaceApi.bundles.deleteById(bundleId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.BUNDLES}/${bundleId}`)
    })
  })

  describe('Bitstreams', () => {
    it('should get bitstreams by bundle ID with custom pagination', async () => {
      const mockBitstreams = { _embedded: { bitstreams: [{ id: 'bit-1' }] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockBitstreams })

      const result = await dspaceApi.bitstreams.byBundleId('test-bundle-id', 10, 1)
      deepEqual(result, mockBitstreams)
      sinon.assert.calledWith(
        getStub,
        `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams?size=10&page=1`
      )
    })

    it('should create new bitstream without explicit name', async () => {
      const mockBitstream = { id: 'new-bitstream', name: 'file.txt' } as unknown
      const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream })

      const formData = new FormData()
      formData.append('file', new Blob(['content']), 'file.txt')

      const result = await dspaceApi.bitstreams.create('test-bundle-id', formData)
      deepEqual(result, mockBitstream)
      sinon.assert.calledWith(
        postStub,
        `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams`,
        formData,
        sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
    })

    it('should create new bitstream with explicit name', async () => {
      const mockBitstream = { id: 'new-bitstream', name: 'customName.pdf' } as unknown
      const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream })

      const formData = new FormData()
      formData.append('file', new Blob(['pdf content']), 'original.pdf')
      const bitstreamName = 'customName.pdf'

      const result = await dspaceApi.bitstreams.create('test-bundle-id', formData, bitstreamName)
      deepEqual(result, mockBitstream)
      const expectedUrl = `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams?name=${encodeURIComponent(bitstreamName)}`
      sinon.assert.calledWith(
        postStub,
        expectedUrl,
        formData,
        sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
    })

    it('should delete bitstream by ID', async () => {
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

      await dspaceApi.bitstreams.deleteById('test-bitstream-id')
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.BITSTREAMS}/test-bitstream-id`)
    })

    // TODO: Fix the payload, structure depends on DSpace version for batch ops
    // it('should perform batch update on bitstreams (e.g. multiple delete)', async () => {
    //   const payload = [
    //     { op: 'remove', path: '/bitstreams/id1' },
    //     { op: 'remove', path: '/bitstreams/id2' }
    //   ]
    //   const patchStub = sinon
    //     .stub(client, 'patch')
    //     .resolves({ data: { status: 'success' } })
    //
    //   await dspaceApi.bitstreams.batchUpdate(payload)
    //   sinon.assert.calledWith(patchStub, ENDPOINTS.BITSTREAMS, payload)
    // })

    it('should retrieve bitstream content', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      const getStub = sinon.stub(client, 'get').resolves({ data: mockArrayBuffer })

      const result = await dspaceApi.bitstreams.retrieve('test-bitstream-id')
      deepEqual(result, mockArrayBuffer)
      // Corrected endpoint to /content based on dspace.api.ts
      sinon.assert.calledWith(getStub, `${ENDPOINTS.BITSTREAMS}/test-bitstream-id/content`, {
        responseType: 'arraybuffer'
      })
    })

    it('should update bitstream metadata', async () => {
      const mockBitstream = {
        id: 'bs-to-update',
        name: 'Updated Bitstream Name',
        type: 'bitstream'
      } as unknown
      const payload = [
        { op: 'replace', path: '/metadata/dc.title/0/value', value: 'Updated Bitstream Name' }
      ]
      const patchStub = sinon.stub(client, 'patch').resolves({ data: mockBitstream })
      const bitstreamId = 'bs-to-update'

      const result = await dspaceApi.bitstreams.updateMetadata(bitstreamId, payload)
      deepEqual(result, mockBitstream)
      sinon.assert.calledWith(patchStub, `${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload)
    })
  })

  // --- New Test Suites ---
  describe('EPersons', () => {
    const mockEPerson: EPerson = {
      id: 'eperson-uuid-1',
      uuid: 'eperson-uuid-1',
      name: 'Test User',
      email: 'test@example.com',
      canLogIn: true,
      requireCertificate: false,
      selfRegistered: false,
      lastActive: new Date(),
      type: 'eperson',
      _links: { self: { href: `${baseUrl}${ENDPOINTS.EPERSONS}/eperson-uuid-1` } }
    }
    const mockEPersonsList = { _embedded: { epersons: [mockEPerson] }, page: { totalElements: 1 } }

    it('should get all epersons with default pagination', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockEPersonsList })
      const result = await dspaceApi.epersons.all()
      deepEqual(result, mockEPersonsList)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.EPERSONS}?size=20&page=0`)
    })

    it('should get eperson by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockEPerson })
      const result = await dspaceApi.epersons.byId('eperson-uuid-1')
      deepEqual(result, mockEPerson)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.EPERSONS}/eperson-uuid-1`)
    })

    it('should create an eperson', async () => {
      const payload = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123'
      }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockEPerson }) // Assuming creation returns the eperson
      const result = await dspaceApi.epersons.create(payload)
      deepEqual(result, mockEPerson)
      sinon.assert.calledWith(postStub, ENDPOINTS.EPERSONS, payload)
    })

    it('should update an eperson', async () => {
      const epersonId = 'eperson-uuid-1'
      const payload = [{ op: 'replace', path: '/email', value: 'updated@example.com' }]
      const patchStub = sinon
        .stub(client, 'patch')
        .resolves({ data: { ...mockEPerson, email: 'updated@example.com' } })
      const result = await dspaceApi.epersons.update(epersonId, payload)
      equal(result.email, 'updated@example.com')
      sinon.assert.calledWith(patchStub, `${ENDPOINTS.EPERSONS}/${epersonId}`, payload)
    })

    it('should delete an eperson by ID', async () => {
      const epersonId = 'eperson-uuid-1'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      await dspaceApi.epersons.deleteById(epersonId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.EPERSONS}/${epersonId}`)
    })

    it('should get eperson by email', async () => {
      const email = 'test@example.com'
      const getStub = sinon.stub(client, 'get').resolves({ data: mockEPerson })
      const result = await dspaceApi.epersons.byEmail(email)
      deepEqual(result, mockEPerson)
      sinon.assert.calledWith(
        getStub,
        `${ENDPOINTS.EPERSONS}/search/byEmail?email=${encodeURIComponent(email)}`
      )
    })

    it('should get current eperson from auth status', async () => {
      const statusResponse = {
        authenticated: true,
        _embedded: { eperson: mockEPerson }
      }
      sinon
        .stub(client, 'get')
        .withArgs(ENDPOINTS.STATUS)
        .resolves({ data: statusResponse, headers: { 'dspace-xsrf-token': 'any-token' } })
      const result = await dspaceApi.epersons.current()
      deepEqual(result, mockEPerson)
    })

    it('should return null if current eperson not in auth status', async () => {
      const statusResponse = { authenticated: false }
      sinon
        .stub(client, 'get')
        .withArgs(ENDPOINTS.STATUS)
        .resolves({ data: statusResponse, headers: { 'dspace-xsrf-token': 'any-token' } })
      const result = await dspaceApi.epersons.current()
      equal(result, null)
    })

    it('should get groups for an EPerson', async () => {
      const epersonId = 'eperson-uuid-1'
      const mockGroup: Group = {
        id: 'group-1',
        uuid: 'group-1',
        name: 'Test Group',
        permanent: false,
        type: 'group',
        _links: {}
      }
      const mockGroupsResponse = { _embedded: { groups: [mockGroup] } }
      const getStub = sinon.stub(client, 'get').resolves({ data: mockGroupsResponse })

      const result = await dspaceApi.epersons.getGroups(epersonId, 10, 0)
      deepEqual(result, mockGroupsResponse)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.EPERSONS}/${epersonId}/groups?size=10&page=0`)
    })
  })

  describe('Processes', () => {
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

    it('should get all processes with default pagination', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockProcessesList })
      const result = await dspaceApi.processes.all()
      deepEqual(result, mockProcessesList)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}?size=20&page=0`)
    })

    it('should get process by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockProcess })
      const result = await dspaceApi.processes.byId(123)
      deepEqual(result, mockProcess)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}/123`)
    })

    it('should create (start) a process', async () => {
      const scriptName = 'export-metadata'
      const parameters = [{ key: '-c', value: 'collection-uuid' }]
      // The API client's create method for processes POSTs to /processes?scriptName=...&paramKey=paramValue
      const postStub = sinon.stub(client, 'post').resolves({ data: mockProcess })
      const result = await dspaceApi.processes.create(scriptName, parameters)

      const expectedUrl = `${ENDPOINTS.PROCESSES}?scriptName=${scriptName}&-c=collection-uuid`
      deepEqual(result, mockProcess)
      sinon.assert.calledWith(postStub, expectedUrl, {}) // Empty body as params are in URL
    })

    it('should delete a process by ID', async () => {
      const processId = 123
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      await dspaceApi.processes.deleteById(processId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.PROCESSES}/${processId}`)
    })

    it('should get process log', async () => {
      const processId = 123
      const mockLog = 'Process log output...'
      // getLog calls apiClient.get directly
      const getStub = sinon.stub(client, 'get').resolves({ data: mockLog })
      const result = await dspaceApi.processes.getLog(processId)
      equal(result, mockLog)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.PROCESSES}/${processId}/output`, {
        responseType: 'text'
      })
    })
  })

  describe('Workflow', () => {
    const mockWorkflowItem: WorkflowItem = {
      id: 'wf-item-uuid-1',
      uuid: 'wf-item-uuid-1',
      name: 'Workflow Item 1', // Name might be from embedded item
      lastModified: new Date(),
      type: 'workflowitem',
      _links: { self: { href: `${baseUrl}${ENDPOINTS.WORKFLOW_ITEMS}/wf-item-uuid-1` } },
      _embedded: {
        item: {
          id: 'item-123',
          uuid: 'item-123',
          name: 'Test Item in Workflow',
          type: 'item'
        } as any
      }
    }
    const mockWorkflowItemsList = { _embedded: { workflowitems: [mockWorkflowItem] } }

    const mockWorkflowTask: WorkflowTask = {
      id: 'task-uuid-1',
      uuid: 'task-uuid-1',
      name: 'Review Task', // Name might not be directly on task
      type: 'workflowtask', // Or more specific like 'pooltask', 'claimedtask'
      _links: { self: { href: `${baseUrl}${ENDPOINTS.WORKFLOW_TASKS}/task-uuid-1` } }, // General tasks endpoint
      _embedded: { workflowitem: mockWorkflowItem }
    }
    const mockPoolTasksList = { _embedded: { pooltasks: [mockWorkflowTask] } }
    const mockClaimedTasksList = { _embedded: { claimedtasks: [mockWorkflowTask] } }

    it('should get all workflow items', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowItemsList })
      const result = await dspaceApi.workflow.allItems(10, 1)
      deepEqual(result, mockWorkflowItemsList)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.WORKFLOW_ITEMS}?size=10&page=1`)
    })

    it('should get workflow item by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowItem })
      const result = await dspaceApi.workflow.itemById('wf-item-uuid-1')
      deepEqual(result, mockWorkflowItem)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.WORKFLOW_ITEMS}/wf-item-uuid-1`)
    })

    it('should delete a workflow item', async () => {
      const wfItemId = 'wf-item-to-delete'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      await dspaceApi.workflow.deleteItem(wfItemId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.WORKFLOW_ITEMS}/${wfItemId}`)
    })

    it('should perform an action on a workflow item/task', async () => {
      const itemId = 'wf-item-uuid-1'
      const payload = { action: 'approve' }
      const mockResponse = { status: 'action_performed' }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockResponse })
      const result = await dspaceApi.workflow.performActionOnItem(itemId, payload)
      deepEqual(result, mockResponse)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.WORKFLOW_ITEMS}/${itemId}`, payload)
    })

    it('should get pool tasks', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockPoolTasksList })
      const result = await dspaceApi.workflow.poolTasks(5, 0)
      deepEqual(result, mockPoolTasksList)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.POOL_TASKS}?size=5&page=0`)
    })

    it('should get pool task by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowTask })
      const result = await dspaceApi.workflow.poolTaskById('task-uuid-1')
      deepEqual(result, mockWorkflowTask)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.POOL_TASKS}/task-uuid-1`)
    })

    it('should get claimed tasks', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockClaimedTasksList })
      const result = await dspaceApi.workflow.claimedTasks(15, 0)
      deepEqual(result, mockClaimedTasksList)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.CLAIMED_TASKS}?size=15&page=0`)
    })

    it('should get claimed task by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowTask })
      const result = await dspaceApi.workflow.claimedTaskById('task-uuid-1')
      deepEqual(result, mockWorkflowTask)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.CLAIMED_TASKS}/task-uuid-1`)
    })

    it('should claim a task', async () => {
      const poolTaskId = 'pool-task-to-claim'
      const postStub = sinon.stub(client, 'post').resolves({ data: mockWorkflowTask }) // Assuming claim returns the task
      const result = await dspaceApi.workflow.claimTask(poolTaskId)
      deepEqual(result, mockWorkflowTask)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.CLAIMED_TASKS}?poolTask=${poolTaskId}`, {})
    })

    it('should unclaim a task', async () => {
      const claimedTaskId = 'task-to-unclaim'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      await dspaceApi.workflow.unclaimTask(claimedTaskId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`)
    })

    it('should submit a task', async () => {
      const claimedTaskId = 'task-to-submit'
      const payload = { decision: 'approved', comment: 'Looks good' }
      const mockResponse = { status: 'submitted' }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockResponse })
      const result = await dspaceApi.workflow.submitTask(claimedTaskId, payload)
      deepEqual(result, mockResponse)
      sinon.assert.calledWith(postStub, `${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`, payload)
    })
  })

  describe('ResourcePolicies', () => {
    const mockResourcePolicy: ResourcePolicy = {
      id: 'rp-id-1', // ResourcePolicy ID is often numeric
      uuid: 'rp-uuid-1',
      name: 'Policy Name',
      action: 'READ',
      type: 'resourcepolicy',
      _links: { self: { href: `${baseUrl}${ENDPOINTS.RESOURCE_POLICIES}/rp-id-1` } }
    }
    const mockResourcePoliciesList = { _embedded: { resourcepolicies: [mockResourcePolicy] } }

    it('should get all policies for an object', async () => {
      const objectUuid = 'item-uuid-for-policies'
      const getStub = sinon.stub(client, 'get').resolves({ data: mockResourcePoliciesList })
      const result = await dspaceApi.resourcePolicies.allByObject(objectUuid, 10, 0)
      deepEqual(result, mockResourcePoliciesList)
      sinon.assert.calledWith(
        getStub,
        `${ENDPOINTS.RESOURCE_POLICIES}/search/object?uuid=${objectUuid}&size=10&page=0`
      )
    })

    it('should get resource policy by ID', async () => {
      const getStub = sinon.stub(client, 'get').resolves({ data: mockResourcePolicy })
      const result = await dspaceApi.resourcePolicies.byId('rp-id-1')
      deepEqual(result, mockResourcePolicy)
      sinon.assert.calledWith(getStub, `${ENDPOINTS.RESOURCE_POLICIES}/rp-id-1`)
    })

    it('should create a resource policy', async () => {
      const objectUuid = 'item-uuid-for-new-policy'
      // Payload structure depends heavily on DSpace version and specific needs
      const payload = {
        action: 'WRITE',
        // Typically, you'd link to an EPerson or Group URI
        // eperson: `${baseUrl}${ENDPOINTS.EPERSONS}/eperson-uuid-1`,
        group: `${baseUrl}${ENDPOINTS.GROUPS}/group-uuid-anon`, // Example for anonymous group
        resourceType: 'item' // This might be part of the payload or inferred
      }
      const postStub = sinon.stub(client, 'post').resolves({ data: mockResourcePolicy })
      const result = await dspaceApi.resourcePolicies.create(objectUuid, payload)
      deepEqual(result, mockResourcePolicy)
      // The client POSTs to /resourcepolicies?resource={objectUuid}
      sinon.assert.calledWith(
        postStub,
        `${ENDPOINTS.RESOURCE_POLICIES}?resource=${objectUuid}`,
        payload
      )
    })

    it('should update a resource policy', async () => {
      const policyId = 'rp-id-1'
      const payload = [{ op: 'replace', path: '/action', value: 'ADMIN' }] // JSON Patch
      const patchStub = sinon
        .stub(client, 'patch')
        .resolves({ data: { ...mockResourcePolicy, action: 'ADMIN' } })
      const result = await dspaceApi.resourcePolicies.update(policyId, payload)
      equal(result.action, 'ADMIN')
      sinon.assert.calledWith(patchStub, `${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`, payload)
    })

    it('should delete a resource policy by ID', async () => {
      const policyId = 'rp-id-1'
      const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
      await dspaceApi.resourcePolicies.deleteById(policyId)
      sinon.assert.calledWith(deleteStub, `${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`)
    })
  })
})
