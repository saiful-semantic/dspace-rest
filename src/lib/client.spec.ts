import { equal, ok } from 'assert'
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
})
