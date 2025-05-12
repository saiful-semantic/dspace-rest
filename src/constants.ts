const API_PREFIX = '/api'
const CORE_PREFIX = `${API_PREFIX}/core`
const EPERSON_PREFIX = `${API_PREFIX}/eperson`
const AUTHN_PREFIX = `${API_PREFIX}/authn`
const AUTHZ_PREFIX = `${API_PREFIX}/authz` // For resource policies
const WORKFLOW_PREFIX = `${API_PREFIX}/workflow` // For workflow items and tasks
const SYSTEM_PREFIX = `${API_PREFIX}/system` // For processes (can vary, DSpace 7 used this)
const DISCOVER_PREFIX = `${API_PREFIX}/discover`
const SUBMISSION_PREFIX = `${API_PREFIX}/submission`
const INTEGRATION_PREFIX = `${API_PREFIX}/integration` // For authorities, external sources
const VERSIONING_PREFIX = `${API_PREFIX}/versioning`
const SECURITY_PREFIX = `${API_PREFIX}/security`
// Future potential prefixes:
// const REGISTRATION_PREFIX = `${API_PREFIX}/registrations`
// const IDENTIFIERS_PREFIX = `${API_PREFIX}/identifiers`
// const STATISTICS_PREFIX = `${API_PREFIX}/statistics`
// const LDAP_PREFIX = `${API_PREFIX}/ldap`
// const SUGGESTION_PREFIX = `${API_PREFIX}/submission/suggestions`
// const SWORDV2_PREFIX = '/swordv2' // SWORD might be separate
// const OAI_PREFIX = '/oai' // OAI-PMH is often separate

export const ENDPOINTS = {
  BASE: API_PREFIX,
  CSRF_DSPACE8: `${SECURITY_PREFIX}/csrf`,
  CSRF_DSPACE7: `${AUTHN_PREFIX}/status`,
  LOGIN: `${AUTHN_PREFIX}/login`,
  LOGOUT: `${AUTHN_PREFIX}/logout`,
  STATUS: `${AUTHN_PREFIX}/status`,

  // Core Objects
  COMMUNITIES: `${CORE_PREFIX}/communities`,
  COLLECTIONS: `${CORE_PREFIX}/collections`,
  ITEMS: `${CORE_PREFIX}/items`,
  BUNDLES: `${CORE_PREFIX}/bundles`,
  BITSTREAMS: `${CORE_PREFIX}/bitstreams`,

  // New Endpoints
  EPERSONS: `${EPERSON_PREFIX}/epersons`,
  GROUPS: `${EPERSON_PREFIX}/groups`, // Assuming groups are under eperson module
  PROCESSES: `${SYSTEM_PREFIX}/processes`, // Or `${CORE_PREFIX}/processes` in DSpace 8+
  // DSpace 8+ seems to move processes to core:
  // PROCESSES: `${CORE_PREFIX}/processes`,

  WORKFLOW_ITEMS: `${WORKFLOW_PREFIX}/workflowitems`,
  POOL_TASKS: `${WORKFLOW_PREFIX}/pooltasks`, // Tasks available for users to claim
  CLAIMED_TASKS: `${WORKFLOW_PREFIX}/claimedtasks`, // Tasks claimed by the current user
  WORKFLOW_TASKS: `${WORKFLOW_PREFIX}/tasks`, // General tasks endpoint, might be specific tasks by ID

  RESOURCE_POLICIES: `${AUTHZ_PREFIX}/resourcepolicies`,

  // Search Endpoints (Examples)
  SEARCH_OBJECTS: `${DISCOVER_PREFIX}/search/objects`,
  SEARCH_FACETS: `${DISCOVER_PREFIX}/search/facets`,

  // Submission Endpoints
  SUBMISSIONS: `${SUBMISSION_PREFIX}/workspaceitems`, // Or submissions
  UPLOAD_CONFIG: `${SUBMISSION_PREFIX}/configurations/upload`, // Example

  // Other potential endpoints
  AUTHORITIES: `${INTEGRATION_PREFIX}/authorities`,
  EXTERNAL_SOURCES: `${INTEGRATION_PREFIX}/externalsources`,
  VERSIONS: `${VERSIONING_PREFIX}/versions`,
  SIGNPOST: `${API_PREFIX}/signposting` // Signposting API
}

// --- Login Result ---
export const LOGIN_RESULT = {
  SUCCESS: 'login success',
  FAILURE: 'login failure'
} as const
