import Payload from './utils/payload'
import * as Types from './lib/dspace.types'
import { initClient, apiClient, clientRequest } from './lib/client'
import { AxiosInstance } from 'axios'
import { authFunctions } from './lib/modules/auth'
import { coreFunctions } from './lib/modules/core'
import { communitiesFunctions } from './lib/modules/communities'
import { collectionsFunctions } from './lib/modules/collections'
import { itemsFunctions } from './lib/modules/items'
import { bundlesFunctions } from './lib/modules/bundles'
import { bitstreamsFunctions } from './lib/modules/bitstreams'
import { epersonsFunctions } from './lib/modules/epersons'
import { processesFunctions } from './lib/modules/processes'
import { workflowFunctions } from './lib/modules/workflow'
import { resourcePoliciesFunctions } from './lib/modules/resourcePolicies'

const dspaceApi = {
  init: initClient,
  core: coreFunctions,
  auth: authFunctions,
  communities: communitiesFunctions,
  collections: collectionsFunctions,
  items: itemsFunctions,
  bundles: bundlesFunctions,
  bitstreams: bitstreamsFunctions,
  epersons: epersonsFunctions,
  processes: processesFunctions,
  workflow: workflowFunctions,
  resourcePolicies: resourcePoliciesFunctions,

  /**
   * Provides direct access to the configured Axios instance for advanced use cases.
   * @returns {AxiosInstance}
   */
  getClient: (): AxiosInstance => {
    // apiClient is imported from client.ts
    if (!apiClient) {
      throw new Error('DSpace API client not initialized. Call init() first.')
    }
    return apiClient
  },
  /**
   * Provides direct access to clientRequest methods if needed.
   */
  clientRequest // clientRequest is imported from client.ts
}

export default dspaceApi
export { DSpaceApiError } from './lib/client'
export { dspaceApi, Payload, Types }
