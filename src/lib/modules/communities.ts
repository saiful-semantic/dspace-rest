import { Communities, Community, SubCommunities } from '../dspace.types'
import { clientRequest, Payload } from '../client'
import { ENDPOINTS } from '../../constants'

export const communitiesFunctions = {
  /**
   * Retrieves a paginated list of all Communities in the repository.
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Communities>} A promise that resolves with an object containing the list of all Communities and pagination details.
   */
  all: (size: number = 20, page: number = 0): Promise<Communities> =>
    clientRequest.get<Communities>(`${ENDPOINTS.COMMUNITIES}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific Community by its unique identifier.
   * @param {string} comId - The UUID of the Community to retrieve.
   * @returns {Promise<Community>} A promise that resolves with the Community object.
   */
  byId: (comId: string): Promise<Community> =>
    clientRequest.get<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`),

  /**
   * Retrieves a paginated list of top-level Communities (those without a parent community).
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Communities>} A promise that resolves with an object containing the list of top-level Communities and pagination details.
   */
  top: (size: number = 20, page: number = 0): Promise<Communities> =>
    clientRequest.get<Communities>(`${ENDPOINTS.COMMUNITIES}/search/top?size=${size}&page=${page}`),

  /**
   * Retrieves a paginated list of sub-communities belonging to a specific parent Community.
   * @param {string} comId - The UUID of the parent Community.
   * @param {number} [size=100] - The number of results per page. Defaults to 100.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<SubCommunities>} A promise that resolves with an object containing the list of sub-communities and pagination details. Note: The type `SubCommunities` might be similar or identical to `Communities` depending on your DSpace types definition.
   */
  subById: (comId: string, size: number = 100, page: number = 0): Promise<SubCommunities> =>
    clientRequest.get<SubCommunities>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/subcommunities?size=${size}&page=${page}`
    ),

  /**
   * Creates a new Community. It can be created as a top-level community or as a sub-community of an existing one.
   * @param {Payload} payload - The data for the new Community (e.g., name, metadata).
   * @param {string} [parentCommunityId] - Optional. The UUID of the parent Community. If provided, the new community will be created as a sub-community.
   * @returns {Promise<Community>} A promise that resolves with the newly created Community object.
   */
  create: (payload: Payload, parentCommunityId?: string): Promise<Community> => {
    // Determine the URL based on whether a parent ID is provided
    const url = parentCommunityId
      ? `${ENDPOINTS.COMMUNITIES}?parent=${parentCommunityId}` // Append parent UUID as query parameter
      : ENDPOINTS.COMMUNITIES // Base endpoint for top-level communities
    return clientRequest.post<Community>(url, payload)
  },

  /**
   * Deletes a specific Community by its unique identifier.
   * Note: This might fail if the community contains collections or sub-communities, depending on DSpace configuration.
   * @param {string} comId - The UUID of the Community to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is successful.
   */
  deleteById: (comId: string): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.COMMUNITIES}/${comId}`),

  /**
   * Updates an existing Community using JSON Patch operations.
   * @param {string} comId - The UUID of the Community to update.
   * @param {Payload} payload - An array of JSON Patch operations describing the changes to apply.
   * @returns {Promise<Community>} A promise that resolves with the updated Community object.
   */
  update: (comId: string, payload: Payload): Promise<Community> =>
    clientRequest.patch<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`, payload) // JSON Patch for updates
}
