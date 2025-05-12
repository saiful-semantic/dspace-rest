import { equal, deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'
import { EPerson, Group } from '../dspace.types'

describe('DSpace API EPersons Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance
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

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should get all epersons with default pagination', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockEPersonsList })
    const result = await dspaceApiMain.epersons.all()
    deepEqual(result, mockEPersonsList)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.EPERSONS}?size=20&page=0`)
  })

  it('should get eperson by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockEPerson })
    const result = await dspaceApiMain.epersons.byId('eperson-uuid-1')
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
    const result = await dspaceApiMain.epersons.create(payload)
    deepEqual(result, mockEPerson)
    sinon.assert.calledWith(postStub, ENDPOINTS.EPERSONS, payload)
  })

  it('should update an eperson', async () => {
    const epersonId = 'eperson-uuid-1'
    const payload = [{ op: 'replace', path: '/email', value: 'updated@example.com' }]
    const patchStub = sinon
      .stub(client, 'patch')
      .resolves({ data: { ...mockEPerson, email: 'updated@example.com' } })
    const result = await dspaceApiMain.epersons.update(epersonId, payload)
    equal(result.email, 'updated@example.com')
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.EPERSONS}/${epersonId}`, payload)
  })

  it('should delete an eperson by ID', async () => {
    const epersonId = 'eperson-uuid-1'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    await dspaceApiMain.epersons.deleteById(epersonId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.EPERSONS}/${epersonId}`)
  })

  it('should get eperson by email', async () => {
    const email = 'test@example.com'
    const getStub = sinon.stub(client, 'get').resolves({ data: mockEPerson })
    const result = await dspaceApiMain.epersons.byEmail(email)
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
    const result = await dspaceApiMain.epersons.current()
    deepEqual(result, mockEPerson)
  })

  it('should return null if current eperson not in auth status', async () => {
    const statusResponse = { authenticated: false }
    sinon
      .stub(client, 'get')
      .withArgs(ENDPOINTS.STATUS)
      .resolves({ data: statusResponse, headers: { 'dspace-xsrf-token': 'any-token' } })
    const result = await dspaceApiMain.epersons.current()
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

    const result = await dspaceApiMain.epersons.getGroups(epersonId, 10, 0)
    deepEqual(result, mockGroupsResponse)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.EPERSONS}/${epersonId}/groups?size=10&page=0`)
  })
})
