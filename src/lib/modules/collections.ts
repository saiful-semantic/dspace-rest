import { Collection, Collections } from '../dspace.types'
import { clientRequest, Payload } from '../client'
import { ENDPOINTS } from '../../constants'

export const collectionsFunctions = {
  /**
   * Retrieves a paginated list of all Collections in the repository.
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Collections>} A promise that resolves with an object containing the list of Collections and pagination details.
   */
  all: (size: number = 20, page: number = 0): Promise<Collections> =>
    clientRequest.get<Collections>(`${ENDPOINTS.COLLECTIONS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific Collection by its unique identifier.
   * @param {string} colId - The UUID of the Collection to retrieve.
   * @returns {Promise<Collection>} A promise that resolves with the Collection object.
   */
  byId: (colId: string): Promise<Collection> =>
    clientRequest.get<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`),

  /**
   * Retrieves a paginated list of Collections belonging to a specific Community.
   * @param {string} comId - The UUID of the parent Community.
   * @param {number} [size=10] - The number of results per page. Defaults to 10.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Collections>} A promise that resolves with an object containing the list of Collections and pagination details.
   */
  byComId: (comId: string, size: number = 10, page: number = 0): Promise<Collections> =>
    clientRequest.get<Collections>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/collections?size=${size}&page=${page}`
    ),

  /**
   * Creates a new Collection within a specific Community.
   * @param {string} comId - The UUID of the parent Community where the Collection will be created.
   * @param {Payload} payload - The data for the new Collection (e.g., name, metadata).
   * @returns {Promise<Collection>} A promise that resolves with the newly created Collection object.
   */
  create: (
    comId: string,
    payload: Payload // Create under a community
  ): Promise<Collection> =>
    clientRequest.post<Collection>(`${ENDPOINTS.COMMUNITIES}/${comId}/collections`, payload),

  /**
   * Deletes a specific Collection by its unique identifier.
   * @param {string} colId - The UUID of the Collection to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is successful.
   */
  deleteById: (colId: string): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.COLLECTIONS}/${colId}`),

  /**
   * Updates an existing Collection using JSON Patch operations.
   * @param {string} colId - The UUID of the Collection to update.
   * @param {Payload} payload - An array of JSON Patch operations describing the changes to apply.
   * @returns {Promise<Collection>} A promise that resolves with the updated Collection object.
   */
  update: (colId: string, payload: Payload): Promise<Collection> =>
    clientRequest.patch<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`, payload) // JSON Patch for updates
}
