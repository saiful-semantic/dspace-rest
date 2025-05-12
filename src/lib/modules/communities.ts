import { Communities, Community, SubCommunities } from '../dspace.types'
import { request, Payload } from '../client'
import { ENDPOINTS } from '../../constants'

export const communitiesFunctions = {
  all: (size: number = 20, page: number = 0): Promise<Communities> =>
    request.get<Communities>(`${ENDPOINTS.COMMUNITIES}?size=${size}&page=${page}`),
  byId: (comId: string): Promise<Community> =>
    request.get<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`),
  top: (size: number = 20, page: number = 0): Promise<Communities> =>
    request.get<Communities>(`${ENDPOINTS.COMMUNITIES}/search/top?size=${size}&page=${page}`),
  subById: (comId: string, size: number = 100, page: number = 0): Promise<SubCommunities> =>
    request.get<SubCommunities>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/subcommunities?size=${size}&page=${page}`
    ),
  create: (payload: Payload, parentCommunityId?: string): Promise<Community> => {
    const url = parentCommunityId
      ? `${ENDPOINTS.COMMUNITIES}?parent=${parentCommunityId}` // Query param for parent
      : ENDPOINTS.COMMUNITIES
    return request.post<Community>(url, payload)
  },
  deleteById: (comId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.COMMUNITIES}/${comId}`),
  update: (comId: string, payload: Payload): Promise<Community> =>
    request.patch<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`, payload) // JSON Patch for updates
}
