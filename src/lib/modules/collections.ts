import { Collection, Collections } from '../dspace.types'
import { request, Payload } from '../client'
import { ENDPOINTS } from '../../constants'

export const collectionsFunctions = {
  all: (size: number = 20, page: number = 0): Promise<Collections> =>
    request.get<Collections>(`${ENDPOINTS.COLLECTIONS}?size=${size}&page=${page}`),
  byId: (colId: string): Promise<Collection> =>
    request.get<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`),
  byComId: (comId: string, size: number = 10, page: number = 0): Promise<Collections> =>
    request.get<Collections>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/collections?size=${size}&page=${page}`
    ),
  create: (
    comId: string,
    payload: Payload
  ): Promise<Collection> => // Create under a community
    request.post<Collection>(`${ENDPOINTS.COMMUNITIES}/${comId}/collections`, payload),
  deleteById: (colId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.COLLECTIONS}/${colId}`),
  update: (colId: string, payload: Payload): Promise<Collection> =>
    request.patch<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`, payload) // JSON Patch for updates
}
