import { AuthStatus, EPerson, EPersons, Group } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { Payload, request } from '../client'
import { authFunctions } from './auth'

export const epersonsFunctions = {
  /**
   * Retrieves all epersons with pagination.
   * @param {number} [size=20] - Number of epersons per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<EPersons>}
   */
  all: (size: number = 20, page: number = 0): Promise<EPersons> =>
    request.get<EPersons>(`${ENDPOINTS.EPERSONS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific eperson by their UUID.
   * @param {string} epersonId - The eperson UUID.
   * @returns {Promise<EPerson>}
   */
  byId: (epersonId: string): Promise<EPerson> =>
    request.get<EPerson>(`${ENDPOINTS.EPERSONS}/${epersonId}`),

  /**
   * Creates a new eperson.
   * @param {Payload} payload - EPerson data (e.g., email, firstName, lastName, password).
   * Password might be handled differently (e.g. registration flow or admin only).
   * @returns {Promise<EPerson>} The created eperson.
   */
  create: (payload: Payload): Promise<EPerson> =>
    request.post<EPerson>(ENDPOINTS.EPERSONS, payload),

  /**
   * Updates an eperson.
   * @param {string} epersonId - The UUID of the eperson to update.
   * @param {Payload} payload - JSON Patch operations array for updates.
   * @returns {Promise<EPerson>} The updated eperson.
   */
  update: (epersonId: string, payload: Payload): Promise<EPerson> =>
    request.patch<EPerson>(`${ENDPOINTS.EPERSONS}/${epersonId}`, payload),

  /**
   * Deletes an eperson by their UUID.
   * @param {string} epersonId - The eperson UUID.
   * @returns {Promise<void>}
   */
  deleteById: (epersonId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.EPERSONS}/${epersonId}`),

  /**
   * Searches for epersons by email.
   * @param {string} email - The email to search for.
   * @returns {Promise<EPerson>} DSpace REST typically returns a single EPerson or error if not unique/found.
   * Or it might be a list, adjust if needed.
   */
  byEmail: (
    email: string
  ): Promise<EPerson> => // This endpoint might vary
    request.get<EPerson>(`${ENDPOINTS.EPERSONS}/search/byEmail?email=${encodeURIComponent(email)}`),

  /**
   * Retrieves the currently authenticated EPerson.
   * Relies on the /api/authn/status endpoint's _embedded eperson or a dedicated endpoint if available.
   * This is a common pattern, but DSpace might vary.
   * @returns {Promise<EPerson | null>} The current EPerson or null if not authenticated/found.
   */
  current: async (): Promise<EPerson | null> => {
    try {
      const statusResponse = (await authFunctions.status()) as AuthStatus
      if (statusResponse?._embedded?.eperson) {
        return statusResponse._embedded.eperson
      }
      // Fallback or alternative if DSpace provides a direct /api/eperson/current or similar
      // const currentEPerson = await request.get<EPerson>(`${ENDPOINTS.EPERSONS}/current`);
      // return currentEPerson;
      return null
    } catch {
      return null
    }
  },
  /**
   * Retrieves groups an EPerson is a member of.
   * @param {string} epersonId - The EPerson UUID.
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<any>} Adjust return type, expecting _embedded.groups
   */
  getGroups: (
    epersonId: string,
    size: number = 20,
    page: number = 0
  ): Promise<{ _embedded: { groups: Group[] } }> =>
    request.get<any>(`${ENDPOINTS.EPERSONS}/${epersonId}/groups?size=${size}&page=${page}`)
}
