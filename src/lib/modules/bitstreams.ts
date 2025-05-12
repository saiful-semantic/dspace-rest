import { Bitstream, Bitstreams } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { apiClient, Payload, request, responseBody } from '../client'

export const bitstreamsFunctions = {
  byId: (bitstreamId: string): Promise<Bitstream> =>
    request.get<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),
  byBundleId: (bundleId: string, size: number = 20, page: number = 0): Promise<Bitstreams> =>
    request.get<Bitstreams>(
      `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams?size=${size}&page=${page}`
    ),
  create: (bundleId: string, formData: FormData, name?: string): Promise<Bitstream> => {
    let url = `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams`
    if (name) {
      url += `?name=${encodeURIComponent(name)}` // Name as query param for creation
    }
    return request.postForm<Bitstream>(url, formData) // Use postForm for multipart
  },
  deleteById: (bitstreamId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),
  retrieve: (bitstreamId: string): Promise<ArrayBuffer> =>
    apiClient
      .get<ArrayBuffer>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}/content`, {
        // DSpace 7+ uses /content
        responseType: 'arraybuffer'
      })
      .then(responseBody),
  updateMetadata: (
    bitstreamId: string,
    payload: Payload
  ): Promise<Bitstream> => // JSON Patch for metadata
    request.patch<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload),

  // For batch operations like multiple deletes
  // Payload is an array of JSON Patch ops
  batchUpdate: (payload: Payload): Promise<unknown> =>
    request.patch<unknown>(ENDPOINTS.BITSTREAMS, payload)
}
