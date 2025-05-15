import { Bitstream, Bitstreams } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { apiClient, Payload, clientRequest, responseBody } from '../client'

export const bitstreamsFunctions = {
  /**
   * Retrieves a specific Bitstream by its unique identifier.
   * @param {string} bitstreamId - The UUID of the Bitstream to retrieve.
   * @returns {Promise<Bitstream>} A promise that resolves with the Bitstream object.
   */
  byId: (bitstreamId: string): Promise<Bitstream> =>
    clientRequest.get<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),

  /**
   * Retrieves a paginated list of Bitstreams belonging to a specific Bundle.
   * @param {string} bundleId - The UUID of the parent Bundle.
   * @param {number} [size=20] - The number of results per page. Defaults to 20.
   * @param {number} [page=0] - The page number to retrieve (0-indexed). Defaults to 0.
   * @returns {Promise<Bitstreams>} A promise that resolves with an object containing the list of Bitstreams and pagination details.
   */
  byBundleId: (bundleId: string, size: number = 20, page: number = 0): Promise<Bitstreams> =>
    clientRequest.get<Bitstreams>(
      `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams?size=${size}&page=${page}`
    ),

  /**
   * Creates a new Bitstream within a specific Bundle by uploading file data.
   * @param {string} bundleId - The UUID of the parent Bundle where the Bitstream will be created.
   * @param {FormData} formData - The FormData object containing the file to upload.
   * @param {string} [name] - An optional name to assign to the new Bitstream. If provided, it's sent as a query parameter.
   * @returns {Promise<Bitstream>} A promise that resolves with the newly created Bitstream object.
   */
  create: (bundleId: string, formData: FormData, name?: string): Promise<Bitstream> => {
    let url = `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams`
    if (name) {
      // Name as query param for creation
      url += `?name=${encodeURIComponent(name)}`
    }
    // Use postForm for multipart/form-data
    return clientRequest.postForm<Bitstream>(url, formData)
  },

  /**
   * Deletes a specific Bitstream by its unique identifier.
   * @param {string} bitstreamId - The UUID of the Bitstream to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is successful.
   */
  deleteById: (bitstreamId: string): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),

  /**
   * Retrieves (downloads) the actual content (file) of a specific Bitstream.
   * @param {string} bitstreamId - The UUID of the Bitstream whose content should be retrieved.
   * @returns {Promise<ArrayBuffer>} A promise that resolves with the raw file content as an ArrayBuffer.
   */
  retrieve: (bitstreamId: string): Promise<ArrayBuffer> =>
    apiClient
      .get<ArrayBuffer>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}/content`, {
        // DSpace 7+ uses /content endpoint for download
        responseType: 'arraybuffer' // Crucial for getting binary data
      })
      .then(responseBody), // Extracts the response body

  /**
   * Updates the metadata of an existing Bitstream using JSON Patch operations.
   * @param {string} bitstreamId - The UUID of the Bitstream to update.
   * @param {Payload} payload - An array of JSON Patch operations describing the changes to apply.
   * @returns {Promise<Bitstream>} A promise that resolves with the updated Bitstream object.
   */
  updateMetadata: (
    bitstreamId: string,
    payload: Payload // JSON Patch for metadata
  ): Promise<Bitstream> =>
    clientRequest.patch<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload),

  /**
   * Performs batch operations on multiple Bitstreams using JSON Patch.
   * This can be used for operations like updating or deleting multiple bitstreams in one request.
   * @param {Payload} payload - An array of JSON Patch operations targeting multiple bitstreams.
   * @returns {Promise<unknown>} A promise that resolves with the result of the batch operation. The exact response structure may vary.
   */
  batchUpdate: (payload: Payload): Promise<unknown> =>
    clientRequest.patch<unknown>(ENDPOINTS.BITSTREAMS, payload) // Payload is an array of JSON Patch ops
}
