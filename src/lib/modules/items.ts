import { Item, Items } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { internalBaseUrl, Payload, request } from '../client'

export const itemsFunctions = {
  all: (size: number = 20, page: number = 0): Promise<Items> =>
    request.get<Items>(`${ENDPOINTS.ITEMS}?size=${size}&page=${page}`),
  byId: (itemId: string): Promise<Item> => request.get<Item>(`${ENDPOINTS.ITEMS}/${itemId}`),
  create: (
    colId: string,
    payload: Payload
  ): Promise<Item> => // Create under a collection
    request.post<Item>(`${ENDPOINTS.COLLECTIONS}/${colId}/items`, payload),
  update: (
    itemId: string,
    payload: Payload
  ): Promise<Item> => // JSON Patch for metadata updates
    request.patch<Item>(`${ENDPOINTS.ITEMS}/${itemId}`, payload),
  deleteById: (itemId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.ITEMS}/${itemId}`),
  move: (itemId: string, targetColId: string): Promise<void> =>
    request.putUri<void>(
      `${ENDPOINTS.ITEMS}/${itemId}/owningCollection`,
      `${internalBaseUrl}${ENDPOINTS.COLLECTIONS}/${targetColId}` // URI list for move
    )
}
