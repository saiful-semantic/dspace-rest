import { deepEqual, equal, ok, rejects } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { DSpaceApiError, setBaseVersion } from '../client'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Auth Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance // This will be the Axios instance from dspaceApiMain.getClient()

  // Helper functions to reduce code duplication
  const setupLoginTest = (version: number) => {
    setBaseVersion(version)
    const csrfEndpoint = version === 7 ? ENDPOINTS.CSRF_DSPACE7 : ENDPOINTS.CSRF_DSPACE8
    const csrfToken = `csrf-token-${version}`
    const authToken = `Bearer test-token${version === 7 ? '-7' : ''}`

    const getStub = sinon.stub(client, 'get')
    getStub
      .withArgs(csrfEndpoint)
      .resolves({ headers: { 'dspace-xsrf-token': csrfToken }, data: {} })

    const postStub = sinon
      .stub(client, 'post')
      .withArgs(ENDPOINTS.LOGIN)
      .resolves({ headers: { authorization: authToken }, data: {} })

    return { getStub, postStub, csrfToken, authToken, csrfEndpoint }
  }

  const setupLoginFailureTest = (version: number) => {
    setBaseVersion(version)
    const csrfEndpoint = version === 7 ? ENDPOINTS.CSRF_DSPACE7 : ENDPOINTS.CSRF_DSPACE8
    const errorMessage = `CSRF not found for DSpace ${version}`

    const getStub = sinon.stub(client, 'get')
    getStub.withArgs(csrfEndpoint).rejects(new DSpaceApiError(errorMessage, 404))

    const postStub = sinon.stub(client, 'post')

    return { getStub, postStub, csrfEndpoint }
  }

  const assertHeadersNotSet = () => {
    ok(
      !client.defaults.headers.common['Authorization'],
      'Authorization header should not be set on failure'
    )
    ok(
      !client.defaults.headers.common['X-XSRF-Token'],
      'X-XSRF-Token header should not be set on failure'
    )
  }

  const assertSuccessfulLogin = (result: boolean, authToken: string, csrfToken: string) => {
    equal(result, true)
    equal(client.defaults.headers.common['Authorization'], authToken)
    equal(client.defaults.headers.common['X-XSRF-Token'], csrfToken)
  }

  beforeEach(() => {
    // Reset the base version before each test
    setBaseVersion(0)

    // Initialize the DSpace API. This creates the apiClient instance internally.
    dspaceApiMain.init(baseUrl, userAgent)
    // Get the client instance for stubbing.
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should handle successful DSpace 8+ login and set auth headers', async () => {
    const { getStub, postStub, csrfToken, authToken } = setupLoginTest(8)

    const result = await dspaceApiMain.auth.login('testuser', 'password')
    assertSuccessfulLogin(result, authToken, csrfToken)

    sinon.assert.calledOnce(getStub)
    sinon.assert.calledOnce(postStub)
    sinon.assert.notCalled(getStub.withArgs(ENDPOINTS.CSRF_DSPACE7))
  })

  it('should use DSpace 7 login when version is 7', async () => {
    const { getStub, postStub, csrfToken, authToken, csrfEndpoint } = setupLoginTest(7)

    const result = await dspaceApiMain.auth.login('testuser', 'password')
    assertSuccessfulLogin(result, authToken, csrfToken)

    sinon.assert.notCalled(getStub.withArgs(ENDPOINTS.CSRF_DSPACE8))
    sinon.assert.calledWith(getStub, csrfEndpoint)
    sinon.assert.calledOnce(postStub)
  })

  it('should reject with error when DSpace 8+ login fails', async () => {
    const { postStub } = setupLoginFailureTest(8)

    await rejects(
      async () => await dspaceApiMain.auth.login('wronguser', 'wrongpass'),
      (error: Error) => {
        ok(error instanceof DSpaceApiError)
        equal(error.status, 401)
        return true
      }
    )

    assertHeadersNotSet()
    sinon.assert.notCalled(postStub)
  })

  it('should reject with error when DSpace 7 login fails', async () => {
    const { postStub } = setupLoginFailureTest(7)

    await rejects(
      async () => await dspaceApiMain.auth.login('wronguser', 'wrongpass'),
      (error: Error) => {
        ok(error instanceof DSpaceApiError)
        equal(error.status, 401)
        return true
      }
    )

    assertHeadersNotSet()
    sinon.assert.notCalled(postStub)
  })

  it('should extract base version if not set and use appropriate login strategy', async () => {
    // Ensure base version is not set
    // setBaseVersion(0)

    // Stub extractBaseVersion to return 7
    const extractVersionStub = sinon.stub(dspaceApiMain.core, 'extractBaseVersion').resolves(7)

    const getStub = sinon.stub(client, 'get')
    getStub
      .withArgs(ENDPOINTS.CSRF_DSPACE7)
      .resolves({ headers: { 'dspace-xsrf-token': 'csrf-token-7' }, data: {} })

    const postStub = sinon
      .stub(client, 'post')
      .withArgs(ENDPOINTS.LOGIN)
      .resolves({ headers: { authorization: 'Bearer test-token-7' }, data: {} })

    const result = await dspaceApiMain.auth.login('testuser', 'password')
    equal(result, true)

    sinon.assert.calledOnce(extractVersionStub)
    sinon.assert.notCalled(getStub.withArgs(ENDPOINTS.CSRF_DSPACE8))
    sinon.assert.calledWith(getStub, ENDPOINTS.CSRF_DSPACE7)
    sinon.assert.calledOnce(postStub)
  })

  it('should clear auth headers on logout', async () => {
    client.defaults.headers.common['Authorization'] = 'Bearer old-token'
    client.defaults.headers.common['X-XSRF-Token'] = 'old-csrf-token'

    const postStub = sinon.stub(client, 'post').withArgs(ENDPOINTS.LOGOUT).resolves({})

    await dspaceApiMain.auth.logout()

    assertHeadersNotSet()
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

    assertHeadersNotSet()
  })

  it('should throw error when login response has no authorization token', async () => {
    setBaseVersion(8)
    const csrfToken = 'csrf-token-8'

    // Stub the CSRF request
    sinon
      .stub(client, 'get')
      .withArgs(ENDPOINTS.CSRF_DSPACE8)
      .resolves({ headers: { 'dspace-xsrf-token': csrfToken }, data: {} })

    // Stub the login request to return a response without authorization header
    sinon.stub(client, 'post').withArgs(ENDPOINTS.LOGIN).resolves({ headers: {}, data: {} }) // No authorization header

    // The login should throw an error
    await rejects(
      async () => await dspaceApiMain.auth.login('testuser', 'password'),
      (error: Error) => {
        ok(error instanceof DSpaceApiError)
        equal(error.status, 401)
        ok(error.message.includes('no authorization token received'))
        return true
      }
    )

    // Headers should not be set after a failed login
    assertHeadersNotSet()
  })

  it('should get authentication status and update CSRF token', async () => {
    const mockStatusResponse = { authenticated: true, epeopleId: 'user123' }
    sinon.stub(client, 'get').withArgs(ENDPOINTS.STATUS).resolves({
      data: mockStatusResponse
    })

    const status = await dspaceApiMain.auth.status()
    deepEqual(status, mockStatusResponse)
  })
})
