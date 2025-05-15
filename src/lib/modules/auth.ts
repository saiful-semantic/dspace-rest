import qs from 'node:querystring'
import {
  apiClient,
  clearAuthorization,
  DSpaceApiError,
  getBaseVersion,
  setAuthorization
} from '../client'
import { ENDPOINTS } from '../../constants'
import { coreFunctions } from './core'

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
        const authToken = loginRes.headers.authorization as string
        setAuthorization(authToken, csrfToken)
        return true
      } else {
        // If login is successful (e.g. 200 OK) but no authorization header, it's an issue.
        throw new DSpaceApiError(
          `Login successful but no authorization token received for ${versionLabel}.`,
          500, // Or an appropriate status code indicating an unexpected server response
          loginRes
        )
      }
    }

    try {
      // Check the base version of DSpace
      const baseVersion = getBaseVersion() || (await coreFunctions.extractBaseVersion())
      if (baseVersion < 8) {
        return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE7, 'DSpace 7')
      } else {
        return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE8, 'DSpace 8+')
      }
    } catch (error: unknown) {
      clearAuthorization()
      const errorMessage = (error as Error).message || 'Unknown error during login'
      return Promise.reject(new DSpaceApiError(errorMessage, 401, error))
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
      clearAuthorization()
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
