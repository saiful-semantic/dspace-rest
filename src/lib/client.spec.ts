import { equal, ok, strictEqual } from 'assert'
import sinon from 'sinon'
import dspaceApiMain from '../index'

describe('DSpace API Client Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
  })

  afterEach(() => {
    sinon.restore()
    // Reset base version between tests
    dspaceApiMain.setBaseVersion(0)
  })

  it('should set api_url and User-Agent correctly on the internal Axios instance', () => {
    const clientDefaults = dspaceApiMain.getClient().defaults
    equal(clientDefaults.baseURL, baseUrl)
    const foundUserAgent = clientDefaults.headers['User-Agent'] as string
    ok(
      clientDefaults.headers['User-Agent'] === userAgent,
      `Expected User-Agent '${userAgent}', but got '${foundUserAgent}'`
    )
  })

  it('should provide access to the API client via getClient()', () => {
    const client = dspaceApiMain.getClient()
    ok(client, 'Client should be defined')
    ok(client.defaults, 'Client should have defaults')
    equal(client.defaults.baseURL, baseUrl)
  })

  it('should handle base version operations correctly', () => {
    // Initially undefined
    strictEqual(dspaceApiMain.getBaseVersion(), 0)

    // Set and get version
    const testVersion = 7.5
    dspaceApiMain.setBaseVersion(testVersion)
    strictEqual(dspaceApiMain.getBaseVersion(), testVersion)

    // Update version
    const newVersion = 8.0
    dspaceApiMain.setBaseVersion(newVersion)
    strictEqual(dspaceApiMain.getBaseVersion(), newVersion)
  })

  it('should set and get authorization headers', () => {
    const authToken = 'Bearer test-token'
    const csrfToken = 'csrf-test-token'

    dspaceApiMain.setAuthorization(authToken, csrfToken)

    const client = dspaceApiMain.getClient()
    equal(client.defaults.headers.common['Authorization'], authToken)
    equal(client.defaults.headers.common['X-XSRF-Token'], csrfToken)
    equal(dspaceApiMain.getAuthorization(), authToken)
  })

  it('should clear authorization headers', () => {
    // First set the headers
    const authToken = 'Bearer test-token'
    dspaceApiMain.setAuthorization(authToken)

    // Then clear them
    dspaceApiMain.clearAuthorization()

    const client = dspaceApiMain.getClient()
    ok(!client.defaults.headers.common['Authorization'])
    ok(!client.defaults.headers.common['X-XSRF-Token'])
  })
})
