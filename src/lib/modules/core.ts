import { clientRequest, setBaseVersion } from '../client'
import { ApiInfo } from '../dspace.types'
import { ENDPOINTS } from '../../constants'

export const coreFunctions = {
  /**
   * Retrieves base api info.
   * @returns {Promise<ApiInfo>}
   */
  info: async (): Promise<ApiInfo> => {
    return clientRequest.get<ApiInfo>(ENDPOINTS.BASE)
  },

  /**
   * Extracts the base version from the DSpace API info.
   * @returns {Promise<number>} The extracted base version
   */
  extractBaseVersion: async (): Promise<number> => {
    const apiInfo = await coreFunctions.info()
    const versionString = apiInfo.dspaceVersion || ''
    const baseVersion: number = parseFloat(versionString.split(' ')[1].replace(/[^0-9]./g, ''))
    if (isNaN(baseVersion)) {
      throw new Error(`Invalid version: ${versionString}`)
    }
    // Set the base version in the internal state
    setBaseVersion(baseVersion)
    return baseVersion
  }
}
