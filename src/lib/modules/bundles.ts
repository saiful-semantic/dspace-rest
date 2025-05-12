import { Bundle, Bundles } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { Payload, request } from '../client'

export const bundlesFunctions = {
  /**
   * Retrieves a specific Bundle by its unique identifier.
   * @param {string} bundleId - The UUID of the Bundle to retrieve.
   * @returns {Promise<Bundle>} A promise that resolves with the Bundle object.
   */
  byId: (bundleId: string): Promise<Bundle> =>
    request.get<Bundle>(`${ENDPOINTS.BUNDLES}/${bundleId}`),

  /**
   * Retrieves a paginated list of Bundles belonging to a specific Item.
   * @param {string} itemId - The UUID of the parent Item.
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Bundles>} A promise that resolves with an object containing the list of Bundles and pagination details.
   */
  byItemId: (itemId: string, size: number = 20, page: number = 0): Promise<Bundles> =>
    request.get<Bundles>(`${ENDPOINTS.ITEMS}/${itemId}/bundles?size=${size}&page=${page}`),

  /**
   * Creates a new Bundle within a specific Item.
   * @param {string} itemId - The UUID of the parent Item where the Bundle will be created.
   * @param {Payload} payload - The data for the new Bundle (typically an object with properties like 'name', 'metadata').
   * @returns {Promise<Bundle>} A promise that resolves with the newly created Bundle object.
   */
  create: (
    itemId: string,
    payload: Payload // Create under an item
  ): Promise<Bundle> => request.post<Bundle>(`${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload),

  /**
   * Deletes a specific Bundle by its unique identifier.
   * @param {string} bundleId - The UUID of the Bundle to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is successful.
   */
  deleteById: (bundleId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BUNDLES}/${bundleId}`)
}
