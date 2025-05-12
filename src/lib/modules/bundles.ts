import { Bundle, Bundles } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { Payload, request } from '../client'

export const bundlesFunctions = {
  byId: (bundleId: string): Promise<Bundle> =>
    request.get<Bundle>(`${ENDPOINTS.BUNDLES}/${bundleId}`),
  byItemId: (itemId: string, size: number = 20, page: number = 0): Promise<Bundles> =>
    request.get<Bundles>(`${ENDPOINTS.ITEMS}/${itemId}/bundles?size=${size}&page=${page}`),
  create: (
    itemId: string,
    payload: Payload
  ): Promise<Bundle> => // Create under an item
    request.post<Bundle>(`${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload),
  deleteById: (bundleId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BUNDLES}/${bundleId}`)
}
