import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Communities Module Tests', () => {
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

  it('should get all communities with default pagination', async () => {
    const mockCommunities = { _embedded: { communities: [] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities })

    const result = await dspaceApiMain.communities.all()
    deepEqual(result, mockCommunities)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}?size=20&page=0`)
  })

  it('should get all communities with specified pagination', async () => {
    const mockCommunities = { _embedded: { communities: [] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunities })

    await dspaceApiMain.communities.all(50, 2)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}?size=50&page=2`)
  })

  it('should get community by ID', async () => {
    const mockCommunity = { id: 'test-id', type: 'community' }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockCommunity })

    const result = await dspaceApiMain.communities.byId('test-id')
    deepEqual(result, mockCommunity)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}/test-id`)
  })

  it('should get top communities with default pagination', async () => {
    const mockTopCommunities = { _embedded: { communities: [{ id: 'top-1' }] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockTopCommunities })

    const result = await dspaceApiMain.communities.top()
    deepEqual(result, mockTopCommunities)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.COMMUNITIES}/search/top?size=20&page=0`)
  })

  it('should get subcommunities by ID with default pagination', async () => {
    const mockSubCommunities = { _embedded: { subcommunities: [{ id: 'sub-1' }] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockSubCommunities })

    const result = await dspaceApiMain.communities.subById('parent-com')
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

    const result = await dspaceApiMain.communities.create(payload)
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

    const result = await dspaceApiMain.communities.create(payload, parentId)
    deepEqual(result, mockCommunity)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.COMMUNITIES}?parent=${parentId}`, payload)
  })

  it('should delete community by ID', async () => {
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    const comId = 'com-to-delete'
    await dspaceApiMain.communities.deleteById(comId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.COMMUNITIES}/${comId}`)
  })

  it('should update community', async () => {
    const mockCommunity = { id: 'com-to-update', name: 'Updated Name', type: 'community' } as any
    const payload = [{ op: 'replace', path: '/name', value: 'Updated Name' }]
    const patchStub = sinon.stub(client, 'patch').resolves({ data: mockCommunity })
    const comId = 'com-to-update'

    const result = await dspaceApiMain.communities.update(comId, payload)
    deepEqual(result, mockCommunity)
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.COMMUNITIES}/${comId}`, payload)
  })
})
