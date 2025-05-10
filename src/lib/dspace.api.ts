import axios, { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import qs from 'node:querystring'
import {
  Communities,
  SubCommunities,
  Collection,
  Collections,
  Community,
  Item,
  Items,
  Bundle,
  Bundles,
  Bitstream,
  Bitstreams,
  ApiInfo
} from './dspace.types'
import { LOGIN_RESULT, ENDPOINTS } from '../constants'

// Define a more specific type for payloads if possible, or use a generic
// For now, we'll keep it as Record<string, any> for flexibility, but ideally,
// each function would define its expected payload type.
type Payload = Record<string, unknown>

// --- Custom Error Class ---
/**
 * Custom error class for API-specific errors.
 */
export class DSpaceApiError extends Error {
  public readonly status?: number
  public readonly data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'DSpaceApiError'
    this.status = status
    this.data = data
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DSpaceApiError.prototype)
  }
}

// --- Axios Instance and Configuration ---
let apiClient: AxiosInstance
let internalBaseUrl: string // Store baseUrl internally

/**
 * Initializes the DSpace API client with a base URL and user agent.
 * @param {string} baseUrl - The base URL of the DSpace instance.
 * @param {string} userAgent - The User-Agent string for requests.
 */
const init = (baseUrl: string, userAgent: string = 'DSpace NodeJs Client'): void => {
  internalBaseUrl = baseUrl // Store for use in specific cases like putUri
  apiClient = axios.create({
    baseURL: baseUrl,
    headers: {
      'User-Agent': userAgent
    },
    withCredentials: true // Ensures cookies are sent with requests
  })

  // Request interceptor
  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // If we have a CSRF token stored globally (e.g., after login),
    // it could be added here for all subsequent requests if needed by the API.
    // For this specific DSpace implementation, CSRF is handled per-request or stored
    // in defaults after login.
    return config
  })

  // Response interceptor for handling errors
  apiClient.interceptors.response.use(
    (res: AxiosResponse) => res, // Simply return successful responses
    (error: AxiosError) => {
      const response = error.response
      let errorMessage: string
      let errorStatus: number | undefined
      let errorData: unknown = null

      if (response) {
        errorStatus = response.status
        errorData = response.data
        switch (errorStatus) {
          case 400:
            errorMessage = `Bad Request: ${JSON.stringify(errorData)}`
            break
          case 401:
            errorMessage = 'Unauthorized. Please check your credentials or session.'
            break
          case 403:
            errorMessage = 'Forbidden. You do not have permission to access this resource.'
            break
          case 404:
            errorMessage = 'Resource Not Found.'
            break
          case 500:
            errorMessage = 'Internal Server Error. Please try again later.'
            break
          default:
            errorMessage = `Error ${errorStatus}: ${JSON.stringify(errorData)}`
        }
      } else if (error.request) {
        errorMessage = 'No response received from server. Check network connection.'
      } else {
        errorMessage = `Request setup error: ${error.message}`
      }
      return Promise.reject(new DSpaceApiError(errorMessage, errorStatus, errorData))
    }
  )
}

// --- Generic Response Handler ---
const responseBody = <T>(response: AxiosResponse<T>): T => response.data

// --- Request Methods Wrapper ---
// These methods now use the configured apiClient
const request = {
  get: <T>(url: string, config?: InternalAxiosRequestConfig) =>
    apiClient.get<T>(url, config).then(responseBody),
  post: <T>(url: string, body: Payload, config?: InternalAxiosRequestConfig) =>
    apiClient.post<T>(url, body, config).then(responseBody),
  patch: <T>(url: string, body: Payload, config?: InternalAxiosRequestConfig) =>
    apiClient.patch<T>(url, body, config).then(responseBody),
  postForm: <T>(url: string, body: FormData | Payload, config?: InternalAxiosRequestConfig) =>
    apiClient
      .post<T>(url, body, {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(responseBody),
  put: <T>(url: string, body: Payload, config?: InternalAxiosRequestConfig) =>
    apiClient.put<T>(url, body, config).then(responseBody),
  putUri: <T>(url: string, uri: string, config?: InternalAxiosRequestConfig) =>
    apiClient
      .put<T>(url, uri, {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'text/uri-list'
        }
      })
      .then(responseBody),
  delete: <T>(url: string, config?: InternalAxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then(responseBody)
}

const core = {
  /**
   * Retrieves base api info.
   * @returns {Promise<ApiInfo>}
   */
  info: async (): Promise<ApiInfo> => {
    const response = await apiClient.get<ApiInfo>(ENDPOINTS.BASE)
    return response.data
  }
}

// --- Authentication Logic ---
const auth = {
  /**
   * Logs into DSpace. It tries DSpace 8+ CSRF mechanism first, then falls back to DSpace 7.
   * @param {string} user - The username.
   * @param {string} password - The password.
   * @returns {Promise<string>} The result of the login attempt.
   */
  login: async (user: string, password: string): Promise<string> => {
    /**
     * Attempts to log in using a specific CSRF URL and DSpace version label.
     */
    const tryLoginStrategy = async (csrfUrl: string, versionLabel: string): Promise<string> => {
      const csrfRes = await apiClient.get(csrfUrl)
      const csrfToken =
        (csrfRes.headers['dspace-xsrf-token'] as string | undefined) ||
        (csrfRes.headers['xsrf-token'] as string | undefined)

      if (!csrfToken) {
        return Promise.reject(
          new DSpaceApiError(
            `Missing CSRF token in headers for ${versionLabel}. Relying on cookie if set.`,
            500,
            csrfRes
          )
        )
      }

      const loginRes = await apiClient.post(ENDPOINTS.LOGIN, qs.stringify({ user, password }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(csrfToken && { 'X-XSRF-Token': csrfToken }),
          Cookie: `DSPACE-XSRF-COOKIE=${csrfToken}`
        }
      })

      if (loginRes.headers.authorization) {
        apiClient.defaults.headers.common['Authorization'] = loginRes.headers
          .authorization as string
      }
      if (csrfToken) {
        apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
      }
      return LOGIN_RESULT.SUCCESS
    }

    try {
      return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE8, 'DSpace 8+')
    } catch {
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']

      try {
        return await tryLoginStrategy(ENDPOINTS.CSRF_DSPACE7, 'DSpace 7')
      } catch {
        return LOGIN_RESULT.FAILURE
      }
    }
  },

  /**
   * Logs out from DSpace.
   * @returns {Promise<void>}
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT)
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']
    } catch (error: unknown) {
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']
      throw new DSpaceApiError('Logout failed', 400, error)
    }
  },

  /**
   * Checks the current authentication status.
   * @returns {Promise<any>} The status response.
   */
  status: async (): Promise<unknown> => {
    const response = await apiClient.get(ENDPOINTS.STATUS)
    const csrfToken =
      (response.headers['dspace-xsrf-token'] as string | undefined) ||
      (response.headers['xsrf-token'] as string | undefined)
    if (csrfToken && apiClient?.defaults?.headers?.common) {
      // Ensure apiClient and headers are defined
      apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
    }
    return response.data
  }
}

// --- API Modules ---

const communities = {
  /**
   * Retrieves all communities with pagination.
   * @param {number} [size=20] - The number of communities per page.
   * @param {number} [page=0] - The page number (0-indexed).
   * @returns {Promise<Communities>}
   */
  all: (size: number = 20, page: number = 0): Promise<Communities> =>
    request.get<Communities>(`${ENDPOINTS.COMMUNITIES}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific community by its ID.
   * @param {string} comId - The community UUID.
   * @returns {Promise<Community>} Assuming the API returns a single Community object. Adjust if it's wrapped.
   */
  byId: (
    comId: string
  ): Promise<Community> => // Changed to Promise<Community> for a single entity
    request.get<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`),

  /**
   * Retrieves top-level communities.
   * @param {number} [size=20] - The number of communities per page.
   * @param {number} [page=0] - The page number.
   * @returns {Promise<Communities>}
   */
  top: (size: number = 20, page: number = 0): Promise<Communities> =>
    request.get<Communities>(`${ENDPOINTS.COMMUNITIES}/search/top?size=${size}&page=${page}`),

  /**
   * Retrieves sub-communities of a specific community.
   * @param {string} comId - The parent community UUID.
   * @param {number} [size=100] - The number of sub-communities per page.
   * @param {number} [page=0] - The page number.
   * @returns {Promise<SubCommunities>}
   */
  subById: (comId: string, size: number = 100, page: number = 0): Promise<SubCommunities> =>
    request.get<SubCommunities>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/subcommunities?size=${size}&page=${page}`
    ),

  /**
   * Creates a new community.
   * @param {Payload} payload - The community data. See DSpace REST API documentation for payload structure.
   * Typically includes metadata, name, etc.
   * @param {string} [parentCommunityId] - Optional UUID of the parent community.
   * @returns {Promise<Community>} The created community.
   */
  create: (payload: Payload, parentCommunityId?: string): Promise<Community> => {
    const url = parentCommunityId
      ? `${ENDPOINTS.COMMUNITIES}?parent=${parentCommunityId}`
      : ENDPOINTS.COMMUNITIES
    return request.post<Community>(url, payload)
  },

  /**
   * Deletes a community by its ID.
   * @param {string} comId - The community UUID.
   * @returns {Promise<void>}
   */
  deleteById: (comId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.COMMUNITIES}/${comId}`),

  /**
   * Updates a community.
   * @param {string} comId - The UUID of the community to update.
   * @param {Payload} payload - The update operations (e.g., using JSON Patch).
   * @returns {Promise<Community>} The updated community.
   */
  update: (
    comId: string,
    payload: Payload
  ): Promise<Community> => // Typically uses PATCH
    request.patch<Community>(`${ENDPOINTS.COMMUNITIES}/${comId}`, payload)
}

const collections = {
  /**
   * Retrieves all collections with pagination.
   * @param {number} [size=20] - Number of collections per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Collections>}
   */
  all: (size: number = 20, page: number = 0): Promise<Collections> =>
    request.get<Collections>(`${ENDPOINTS.COLLECTIONS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific collection by its ID.
   * @param {string} colId - The collection UUID.
   * @returns {Promise<Collection>}
   */
  byId: (colId: string): Promise<Collection> =>
    request.get<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`),

  /**
   * Retrieves collections within a specific community.
   * @param {string} comId - The community UUID.
   * @param {number} [size=10] - Number of collections per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Collections>}
   */
  byComId: (comId: string, size: number = 10, page: number = 0): Promise<Collections> =>
    request.get<Collections>(
      `${ENDPOINTS.COMMUNITIES}/${comId}/collections?size=${size}&page=${page}`
    ),

  /**
   * Creates a new collection within a community.
   * @param {string} comId - The parent community UUID.
   * @param {Payload} payload - Collection data (name, metadata, etc.).
   * @returns {Promise<Collection>}
   */
  create: (comId: string, payload: Payload): Promise<Collection> =>
    request.post<Collection>(`${ENDPOINTS.COMMUNITIES}/${comId}/collections`, payload),
  // Original had ?parent=comId on /api/core/collections, DSpace 7+ usually nests under community for creation

  /**
   * Deletes a collection by its ID.
   * @param {string} colId - The collection UUID.
   * @returns {Promise<void>}
   */
  deleteById: (colId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.COLLECTIONS}/${colId}`),

  /**
   * Updates a collection.
   * @param {string} colId - The UUID of the collection to update.
   * @param {Payload} payload - The update operations (e.g., using JSON Patch).
   * @returns {Promise<Collection>} The updated collection.
   */
  update: (colId: string, payload: Payload): Promise<Collection> =>
    request.patch<Collection>(`${ENDPOINTS.COLLECTIONS}/${colId}`, payload)
}

const items = {
  /**
   * Retrieves all items with pagination.
   * @param {number} [size=20] - Number of items per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Items>}
   */
  all: (size: number = 20, page: number = 0): Promise<Items> =>
    request.get<Items>(`${ENDPOINTS.ITEMS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific item by its ID.
   * @param {string} itemId - The item UUID.
   * @returns {Promise<Item>}
   */
  byId: (itemId: string): Promise<Item> => request.get<Item>(`${ENDPOINTS.ITEMS}/${itemId}`),

  /**
   * Creates an item within a collection.
   * @param {string} colId - The owning collection UUID.
   * @param {Payload} payload - Item data (metadata, etc.).
   * @returns {Promise<Item>}
   */
  create: (colId: string, payload: Payload): Promise<Item> =>
    request.post<Item>(`${ENDPOINTS.COLLECTIONS}/${colId}/items`, payload),

  /**
   * Updates an item's metadata or other properties.
   * @param {string} itemId - The item UUID.
   * @param {Payload} payload - JSON Patch operations array for metadata updates.
   * @returns {Promise<Item>}
   */
  update: (
    itemId: string,
    payload: Payload
  ): Promise<Item> => // Typically metadata updates via PATCH
    request.patch<Item>(`${ENDPOINTS.ITEMS}/${itemId}`, payload),

  /**
   * Deletes an item by its ID.
   * @param {string} itemId - The item UUID.
   * @returns {Promise<void>}
   */
  deleteById: (itemId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.ITEMS}/${itemId}`),

  /**
   * Moves an item to a different collection.
   * @param {string} itemId - The item UUID.
   * @param {string} targetColId - The UUID of the target collection.
   * @returns {Promise<void>}
   */
  move: (itemId: string, targetColId: string): Promise<void> =>
    request.putUri<void>(
      `${ENDPOINTS.ITEMS}/${itemId}/owningCollection`,
      `${internalBaseUrl}${ENDPOINTS.COLLECTIONS}/${targetColId}`
    ) // Ensure internalBaseUrl is used
}

const bundles = {
  /**
   * Retrieves a specific bundle by its ID.
   * @param {string} bundleId - The bundle UUID.
   * @returns {Promise<Bundle>}
   */
  byId: (bundleId: string): Promise<Bundle> =>
    request.get<Bundle>(`${ENDPOINTS.BUNDLES}/${bundleId}`),

  /**
   * Retrieves all bundles for a given item.
   * @param {string} itemId - The item UUID.
   * @param {number} [size=20] - Number of bundles per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Bundles>}
   */
  byItemId: (itemId: string, size: number = 20, page: number = 0): Promise<Bundles> =>
    request.get<Bundles>(`${ENDPOINTS.ITEMS}/${itemId}/bundles?size=${size}&page=${page}`),

  /**
   * Creates a new bundle within an item.
   * @param {string} itemId - The parent item UUID.
   * @param {Payload} payload - Bundle data (e.g., name: "ORIGINAL").
   * @returns {Promise<Bundle>}
   */
  create: (itemId: string, payload: Payload): Promise<Bundle> =>
    request.post<Bundle>(`${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload),

  /**
   * Deletes a bundle by its ID.
   * @param {string} bundleId - The bundle UUID.
   * @returns {Promise<void>}
   */
  deleteById: (bundleId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BUNDLES}/${bundleId}`)
}

const bitstreams = {
  /**
   * Retrieves a specific bitstream by its ID.
   * @param {string} bitstreamId - The bitstream UUID.
   * @returns {Promise<Bitstream>}
   */
  byId: (bitstreamId: string): Promise<Bitstream> =>
    request.get<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),
  /**
   * Retrieves all bitstreams for a given bundle.
   * @param {string} bundleId - The bundle UUID.
   * @param {number} [size=20] - Number of bitstreams per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Bitstreams>}
   */
  byBundleId: (bundleId: string, size: number = 20, page: number = 0): Promise<Bitstreams> =>
    request.get<Bitstreams>(
      `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams?size=${size}&page=${page}`
    ),

  /**
   * Uploads/creates a new bitstream within a bundle.
   * @param {string} bundleId - The parent bundle UUID.
   * @param {FormData} formData - The FormData object containing the file and potentially metadata.
   * The file should be appended with a key like 'file'.
   * Name can be passed as a query parameter e.g. /bitstreams?name=fileName.pdf
   * @param {string} [name] - Optional name for the bitstream. If provided, it's added as a query param.
   * @returns {Promise<Bitstream>}
   */
  create: (bundleId: string, formData: FormData, name?: string): Promise<Bitstream> => {
    let url = `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams`
    if (name) {
      url += `?name=${encodeURIComponent(name)}`
    }
    return request.postForm<Bitstream>(url, formData)
  },

  /**
   * Deletes a bitstream by its ID.
   * @param {string} bitstreamId - The bitstream UUID.
   * @returns {Promise<void>}
   */
  deleteById: (bitstreamId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),

  /**
   * Retrieves the content/data of a bitstream.
   * @param {string} bitstreamId - The bitstream UUID.
   * @returns {Promise<ArrayBuffer>} Or Blob, depending on how you want to handle the data.
   */
  retrieve: (bitstreamId: string): Promise<ArrayBuffer> =>
    apiClient
      .get<ArrayBuffer>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}/retrieve`, {
        responseType: 'arraybuffer'
      })
      .then(responseBody),

  /**
   * Updates bitstream metadata.
   * @param {string} bitstreamId - The UUID of the bitstream to update.
   * @param {Payload} payload - The update operations (e.g., using JSON Patch for metadata).
   * @returns {Promise<Bitstream>} The updated bitstream.
   */
  updateMetadata: (bitstreamId: string, payload: Payload): Promise<Bitstream> =>
    request.patch<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload),

  /**
   * DSpace 7.x supports a PATCH request to /api/core/bitstreams to perform batch operations like deletions.
   * The payload format is specific, often involving JSON Patch-like structures.
   * Example for deletion: [{"op": "remove", "path": "/bitstreams/{uuid}"}, {"op": "remove", "path": "/bitstreams/{uuid2}"}]
   * This is a placeholder for such functionality if needed, consult DSpace REST docs for exact payload.
   * @param {Payload} payload - The batch operation payload.
   * @returns {Promise<any>} Response might vary based on operations.
   */
  batchUpdate: (payload: Payload): Promise<unknown> =>
    request.patch<unknown>(ENDPOINTS.BITSTREAMS, payload)
}

// --- Main API Object ---
const dspaceApi = {
  init,
  core,
  auth,
  communities,
  collections,
  items,
  bundles,
  bitstreams,
  /**
   * Provides direct access to the configured Axios instance for advanced use cases.
   * @returns {AxiosInstance}
   */
  getClient: (): AxiosInstance => {
    if (!apiClient) {
      throw new Error('DSpace API client not initialized. Call init() first.')
    }
    return apiClient
  },
  /**
   * Provides direct access to request methods if needed.
   */
  request
}

export default dspaceApi
