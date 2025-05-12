import qs from 'node:querystring'
import { apiClient, DSpaceApiError } from '../client'
import { ENDPOINTS } from '../../constants'

export const authFunctions = {
  /**
   * Logs into DSpace. It tries DSpace 8+ CSRF mechanism first, then falls back to DSpace 7.
   * @param {string} user - The username.
   * @param {string} password - The password.
   * @returns {Promise<boolean>} The result of the login attempt.
   */
  login: async (user: string, password: string): Promise<boolean> => {
    const tryLoginStrategy = async (csrfUrl: string, versionLabel: string): Promise<boolean> => {
      const csrfRes = await apiClient.get(csrfUrl) // apiClient is imported from client.ts
      const csrfToken =
        (csrfRes.headers['dspace-xsrf-token'] as string | undefined) ||
        (csrfRes.headers['xsrf-token'] as string | undefined)

      if (!csrfToken) {
        return Promise.reject(
          new DSpaceApiError(
            `Missing CSRF token in headers for ${versionLabel}. Relying on cookie if set.`,
            500,
            csrfRes
          )
        )
      }

      const loginRes = await apiClient.post(ENDPOINTS.LOGIN, qs.stringify({ user, password }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(csrfToken && { 'X-XSRF-Token': csrfToken }),
          Cookie: `DSPACE-XSRF-COOKIE=${csrfToken}`
        }
      })

      if (loginRes.headers.authorization) {
        apiClient.defaults.headers.common['Authorization'] = loginRes.headers
          .authorization as string
      }
      if (csrfToken) {
        apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
      }
      return true
    }

    try {
      return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE8, 'DSpace 8+')
    } catch {
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']
      try {
        return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE7, 'DSpace 7')
      } catch {
        return false
      }
    }
  },

  /**
   * Logs out from DSpace.
   * @returns {Promise<void>}
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT)
    } catch {
      // console.error('Logout request failed, but clearing auth headers anyway.')
    } finally {
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']
    }
  },

  /**
   * Checks the current authentication status.
   * @returns {Promise<any>} The status response.
   */
  status: async (): Promise<unknown> => {
    const response = await apiClient.get(ENDPOINTS.STATUS)
    const csrfToken =
      (response.headers['dspace-xsrf-token'] as string | undefined) ||
      (response.headers['xsrf-token'] as string | undefined)
    if (csrfToken && apiClient?.defaults?.headers?.common) {
      apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
    }
    return response.data
  }
}
