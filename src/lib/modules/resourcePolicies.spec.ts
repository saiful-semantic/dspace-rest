import { equal, deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'
import { ResourcePolicy } from '../dspace.types'

describe('DSpace API Core Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance
  const mockResourcePolicy: ResourcePolicy = {
    id: 'rp-id-1', // ResourcePolicy ID is often numeric
    uuid: 'rp-uuid-1',
    name: 'Policy Name',
    action: 'READ',
    type: 'resourcepolicy',
    _links: { self: { href: `${baseUrl}${ENDPOINTS.RESOURCE_POLICIES}/rp-id-1` } }
  }
  const mockResourcePoliciesList = { _embedded: { resourcepolicies: [mockResourcePolicy] } }

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should get all policies for an object', async () => {
    const objectUuid = 'item-uuid-for-policies'
    const getStub = sinon.stub(client, 'get').resolves({ data: mockResourcePoliciesList })
    const result = await dspaceApiMain.resourcePolicies.allByObject(objectUuid, 10, 0)
    deepEqual(result, mockResourcePoliciesList)
    sinon.assert.calledWith(
      getStub,
      `${ENDPOINTS.RESOURCE_POLICIES}/search/object?uuid=${objectUuid}&size=10&page=0`
    )
  })

  it('should get resource policy by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockResourcePolicy })
    const result = await dspaceApiMain.resourcePolicies.byId('rp-id-1')
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
    const result = await dspaceApiMain.resourcePolicies.create(objectUuid, payload)
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
    const result = await dspaceApiMain.resourcePolicies.update(policyId, payload)
    equal(result.action, 'ADMIN')
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`, payload)
  })

  it('should delete a resource policy by ID', async () => {
    const policyId = 'rp-id-1'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    await dspaceApiMain.resourcePolicies.deleteById(policyId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`)
  })
})
