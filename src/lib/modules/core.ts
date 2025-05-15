import { apiClient } from '../client'
import { ApiInfo } from '../dspace.types'
import { ENDPOINTS } from '../../constants'

export const coreFunctions = {
  /**
   * Retrieves base api info.
   * @returns {Promise<ApiInfo>}
   */
  info: async (): Promise<ApiInfo> => {
    // Directly using apiClient.get here as an example, or could use clientRequest.get
    const response = await apiClient.get<ApiInfo>(ENDPOINTS.BASE)
    return response.data
  }
}
