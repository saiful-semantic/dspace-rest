import Payload from './utils/payload'
import * as Types from './lib/dspace.types'
import {
  initClient,
  clientRequest,
  getApiClient,
  getBaseVersion,
  setBaseVersion,
  getAuthorization,
  setAuthorization
} from './lib/client'
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

  getClient: getApiClient,
  clientRequest,
  getBaseVersion,
  setBaseVersion,
  setAuthorization,
  getAuthorization
}

export default dspaceApi
export { DSpaceApiError } from './lib/client'
export { dspaceApi, Payload, Types }
