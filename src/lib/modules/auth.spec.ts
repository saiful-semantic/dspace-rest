import { deepEqual, equal, ok } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { DSpaceApiError } from '../client'
import { LOGIN_RESULT, ENDPOINTS } from '../../constants'

describe('DSpace API Auth Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance // This will be the Axios instance from dspaceApiMain.getClient()

  beforeEach(() => {
    // Initialize the DSpace API. This creates the apiClient instance internally.
    dspaceApiMain.init(baseUrl, userAgent)
    // Get the client instance for stubbing.
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should handle successful DSpace 8+ login and set auth headers', async () => {
    const getStub = sinon
      .stub(client, 'get') // Stub the shared client instance
      .withArgs(ENDPOINTS.CSRF_DSPACE8)
      .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-8' }, data: {} })

    const postStub = sinon
      .stub(client, 'post')
      .withArgs(ENDPOINTS.LOGIN)
      .resolves({ headers: { authorization: 'Bearer test-token' }, data: {} })

    const result = await dspaceApiMain.auth.login('testuser', 'password')
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
      .rejects(new DSpaceApiError('CSRF not found for DSpace 8+', 404)) // Use DSpaceApiError from client.ts
    getStub
      .withArgs(ENDPOINTS.CSRF_DSPACE7)
      .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-7' }, data: {} })

    const postStub = sinon
      .stub(client, 'post')
      .withArgs(ENDPOINTS.LOGIN)
      .resolves({ headers: { authorization: 'Bearer test-token-7' }, data: {} })

    const result = await dspaceApiMain.auth.login('testuser', 'password')
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

    const result = await dspaceApiMain.auth.login('wronguser', 'wrongpass')
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

    await dspaceApiMain.auth.logout()

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
    await dspaceApiMain.auth.logout()

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

    const status = await dspaceApiMain.auth.status()
    deepEqual(status, mockStatusResponse)
    equal(
      client.defaults.headers.common['X-XSRF-Token'],
      newCsrfToken,
      'CSRF token should be updated from status response'
    )
  })
})
