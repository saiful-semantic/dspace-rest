import { Item, Items } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { internalBaseUrl, Payload, request } from '../client'

export const itemsFunctions = {
  /**
   * Retrieves a paginated list of all Items in the repository.
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Items>} A promise that resolves with an object containing the list of Items and pagination details.
   */
  all: (size: number = 20, page: number = 0): Promise<Items> =>
    request.get<Items>(`${ENDPOINTS.ITEMS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific Item by its unique identifier.
   * @param {string} itemId - The UUID of the Item to retrieve.
   * @returns {Promise<Item>} A promise that resolves with the Item object.
   */
  byId: (itemId: string): Promise<Item> => request.get<Item>(`${ENDPOINTS.ITEMS}/${itemId}`),

  /**
   * Creates a new Item within a specific Collection.
   * @param {string} colId - The UUID of the parent Collection where the Item will be created.
   * @param {Payload} payload - The data for the new Item (e.g., metadata).
   * @returns {Promise<Item>} A promise that resolves with the newly created Item object.
   */
  create: (
    colId: string,
    payload: Payload // Create under a collection
  ): Promise<Item> => request.post<Item>(`${ENDPOINTS.COLLECTIONS}/${colId}/items`, payload),

  /**
   * Updates the metadata of an existing Item using JSON Patch operations.
   * @param {string} itemId - The UUID of the Item to update.
   * @param {Payload} payload - An array of JSON Patch operations describing the metadata changes.
   * @returns {Promise<Item>} A promise that resolves with the updated Item object.
   */
  update: (
    itemId: string,
    payload: Payload // JSON Patch for metadata updates
  ): Promise<Item> => request.patch<Item>(`${ENDPOINTS.ITEMS}/${itemId}`, payload),

  /**
   * Deletes a specific Item by its unique identifier.
   * @param {string} itemId - The UUID of the Item to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is successful.
   */
  deleteById: (itemId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.ITEMS}/${itemId}`),

  /**
   * Moves an existing Item to a different Collection.
   * This operation changes the Item's owning collection.
   * @param {string} itemId - The UUID of the Item to move.
   * @param {string} targetColId - The UUID of the destination Collection.
   * @returns {Promise<void>} A promise that resolves when the move operation is successful.
   */
  move: (itemId: string, targetColId: string): Promise<void> =>
    // Sends a PUT request with the target collection's URI in the body
    // The content type is 'text/uri-list'
    request.putUri<void>(
      `${ENDPOINTS.ITEMS}/${itemId}/owningCollection`, // The endpoint to update the owning collection relationship
      `${internalBaseUrl}${ENDPOINTS.COLLECTIONS}/${targetColId}` // The full URI of the target collection
    )
}
