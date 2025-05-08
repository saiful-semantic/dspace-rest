// --- API Path Constants ---
const API_PREFIX = '/api'
const CORE_PREFIX = `${API_PREFIX}/core`
const AUTHN_PREFIX = `${API_PREFIX}/authn`
const SECURITY_PREFIX = `${API_PREFIX}/security`

export const ENDPOINTS = {
  CSRF_DSPACE8: `${SECURITY_PREFIX}/csrf`,
  CSRF_DSPACE7: `${AUTHN_PREFIX}/status`, // DSpace 7 uses /status to get initial CSRF
  LOGIN: `${AUTHN_PREFIX}/login`,
  LOGOUT: `${AUTHN_PREFIX}/logout`,
  STATUS: `${AUTHN_PREFIX}/status`,
  COMMUNITIES: `${CORE_PREFIX}/communities`,
  COLLECTIONS: `${CORE_PREFIX}/collections`,
  ITEMS: `${CORE_PREFIX}/items`,
  BUNDLES: `${CORE_PREFIX}/bundles`,
  BITSTREAMS: `${CORE_PREFIX}/bitstreams`,
}

// --- Login Result ---
export const LOGIN_RESULT = {
  SUCCESS: 'login success',
  FAILURE: 'login failure'
} as const