import axios, { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import qs from 'node:querystring'
import {
  ApiInfo,
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
  EPerson,
  EPersons,
  Process,
  Processes,
  WorkflowItem,
  WorkflowItems,
  WorkflowTask,
  // WorkflowTasks, // Use specific PoolTasks and ClaimedTasks for lists
  PoolTasks,
  ClaimedTasks,
  ResourcePolicy,
  ResourcePolicies,
  Group,
  AuthStatus
} from './dspace.types'
import { LOGIN_RESULT, ENDPOINTS } from '../constants'

type Payload = Record<string, unknown> | Array<Record<string, unknown>> // Allow array for JSON Patch

// --- Custom Error Class ---
export class DSpaceApiError extends Error {
  public readonly status?: number
  public readonly data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'DSpaceApiError'
    this.status = status
    this.data = data
    Object.setPrototypeOf(this, DSpaceApiError.prototype)
  }
}

// --- Axios Instance and Configuration ---
let apiClient: AxiosInstance
let internalBaseUrl: string

const init = (baseUrl: string, userAgent: string = 'DSpace NodeJs Client'): void => {
  internalBaseUrl = baseUrl
  apiClient = axios.create({
    baseURL: baseUrl,
    headers: {
      'User-Agent': userAgent
    },
    withCredentials: true
  })

  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    return config
  })

  apiClient.interceptors.response.use(
    (res: AxiosResponse) => res,
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
  info: async (): Promise<ApiInfo> => {
    const response = await apiClient.get<ApiInfo>(ENDPOINTS.BASE)
    return response.data
  }
}

const auth = {
  login: async (user: string, password: string): Promise<string> => {
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
          Cookie: `DSPACE-XSRF-COOKIE=${csrfToken}` // DSpace 7 might need this explicitly
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
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT)
    } catch {
      // Always clear auth headers on logout attempt, even if it fails
    } finally {
      delete apiClient.defaults.headers.common['Authorization']
      delete apiClient.defaults.headers.common['X-XSRF-Token']
    }
  },
  status: async (): Promise<AuthStatus> => {
    const response = await apiClient.get(ENDPOINTS.STATUS)
    const csrfToken =
      (response.headers['dspace-xsrf-token'] as string | undefined) ||
      (response.headers['xsrf-token'] as string | undefined)
    if (csrfToken && apiClient?.defaults?.headers?.common) {
      apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
    }
    return response.data as AuthStatus
  }
}

const communities = {
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

const collections = {
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

const items = {
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

const bundles = {
  byId: (bundleId: string): Promise<Bundle> =>
    request.get<Bundle>(`${ENDPOINTS.BUNDLES}/${bundleId}`),
  byItemId: (itemId: string, size: number = 20, page: number = 0): Promise<Bundles> =>
    request.get<Bundles>(`${ENDPOINTS.ITEMS}/${itemId}/bundles?size=${size}&page=${page}`),
  create: (
    itemId: string,
    payload: Payload
  ): Promise<Bundle> => // Create under an item
    request.post<Bundle>(`${ENDPOINTS.ITEMS}/${itemId}/bundles`, payload),
  deleteById: (bundleId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BUNDLES}/${bundleId}`)
}

const bitstreams = {
  byId: (bitstreamId: string): Promise<Bitstream> =>
    request.get<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),
  byBundleId: (bundleId: string, size: number = 20, page: number = 0): Promise<Bitstreams> =>
    request.get<Bitstreams>(
      `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams?size=${size}&page=${page}`
    ),
  create: (bundleId: string, formData: FormData, name?: string): Promise<Bitstream> => {
    let url = `${ENDPOINTS.BUNDLES}/${bundleId}/bitstreams`
    if (name) {
      url += `?name=${encodeURIComponent(name)}` // Name as query param for creation
    }
    return request.postForm<Bitstream>(url, formData) // Use postForm for multipart
  },
  deleteById: (bitstreamId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`),
  retrieve: (bitstreamId: string): Promise<ArrayBuffer> =>
    apiClient
      .get<ArrayBuffer>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}/content`, {
        // DSpace 7+ uses /content
        responseType: 'arraybuffer'
      })
      .then(responseBody),
  updateMetadata: (
    bitstreamId: string,
    payload: Payload
  ): Promise<Bitstream> => // JSON Patch for metadata
    request.patch<Bitstream>(`${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload),
  batchUpdate: (payload: Payload): Promise<unknown> =>
    request.patch<unknown>(ENDPOINTS.BITSTREAMS, payload) // For batch operations like multiple deletes // Payload is an array of JSON Patch ops
}

// --- New API Modules ---

const epersons = {
  /**
   * Retrieves all epersons with pagination.
   * @param {number} [size=20] - Number of epersons per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<EPersons>}
   */
  all: (size: number = 20, page: number = 0): Promise<EPersons> =>
    request.get<EPersons>(`${ENDPOINTS.EPERSONS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific eperson by their UUID.
   * @param {string} epersonId - The eperson UUID.
   * @returns {Promise<EPerson>}
   */
  byId: (epersonId: string): Promise<EPerson> =>
    request.get<EPerson>(`${ENDPOINTS.EPERSONS}/${epersonId}`),

  /**
   * Creates a new eperson.
   * @param {Payload} payload - EPerson data (e.g., email, firstName, lastName, password).
   * Password might be handled differently (e.g. registration flow or admin only).
   * @returns {Promise<EPerson>} The created eperson.
   */
  create: (payload: Payload): Promise<EPerson> =>
    request.post<EPerson>(ENDPOINTS.EPERSONS, payload),

  /**
   * Updates an eperson.
   * @param {string} epersonId - The UUID of the eperson to update.
   * @param {Payload} payload - JSON Patch operations array for updates.
   * @returns {Promise<EPerson>} The updated eperson.
   */
  update: (epersonId: string, payload: Payload): Promise<EPerson> =>
    request.patch<EPerson>(`${ENDPOINTS.EPERSONS}/${epersonId}`, payload),

  /**
   * Deletes an eperson by their UUID.
   * @param {string} epersonId - The eperson UUID.
   * @returns {Promise<void>}
   */
  deleteById: (epersonId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.EPERSONS}/${epersonId}`),

  /**
   * Searches for epersons by email.
   * @param {string} email - The email to search for.
   * @returns {Promise<EPerson>} DSpace REST typically returns a single EPerson or error if not unique/found.
   * Or it might be a list, adjust if needed.
   */
  byEmail: (
    email: string
  ): Promise<EPerson> => // This endpoint might vary
    request.get<EPerson>(`${ENDPOINTS.EPERSONS}/search/byEmail?email=${encodeURIComponent(email)}`),

  /**
   * Retrieves the currently authenticated EPerson.
   * Relies on the /api/authn/status endpoint's _embedded eperson or a dedicated endpoint if available.
   * This is a common pattern, but DSpace might vary.
   * @returns {Promise<EPerson | null>} The current EPerson or null if not authenticated/found.
   */
  current: async (): Promise<EPerson | null> => {
    try {
      const statusResponse = await auth.status()
      if (statusResponse?._embedded?.eperson) {
        return statusResponse._embedded.eperson
      }
      // Fallback or alternative if DSpace provides a direct /api/eperson/current or similar
      // const currentEPerson = await request.get<EPerson>(`${ENDPOINTS.EPERSONS}/current`);
      // return currentEPerson;
      return null
    } catch {
      return null
    }
  },
  /**
   * Retrieves groups an EPerson is a member of.
   * @param {string} epersonId - The EPerson UUID.
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<any>} Adjust return type, expecting _embedded.groups
   */
  getGroups: (
    epersonId: string,
    size: number = 20,
    page: number = 0
  ): Promise<{ _embedded: { groups: Group[] } }> =>
    request.get<any>(`${ENDPOINTS.EPERSONS}/${epersonId}/groups?size=${size}&page=${page}`)
}

const processes = {
  /**
   * Retrieves all processes with pagination.
   * Note: DSpace 8+ might use `${CORE_PREFIX}/processes`. Adjust ENDPOINTS.PROCESSES if needed.
   * @param {number} [size=20] - Number of processes per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Processes>}
   */
  all: (size: number = 20, page: number = 0): Promise<Processes> =>
    request.get<Processes>(`${ENDPOINTS.PROCESSES}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific process by its ID.
   * @param {string} processId - The process ID (usually a number for DSpace processes).
   * @returns {Promise<Process>}
   */
  byId: (
    processId: string | number
  ): Promise<Process> => // Process ID is often numeric
    request.get<Process>(`${ENDPOINTS.PROCESSES}/${processId}`),

  /**
   * Starts a new process (e.g., run a script).
   * @param {string} scriptName - The name of the script to run (e.g., "metadata-export").
   * @param {Array<{key: string, value: string}>} parameters - Parameters for the script.
   * @returns {Promise<Process>} The created process (or a response indicating it started).
   */
  create: (
    scriptName: string,
    parameters: Array<{ key: string; value: string }>
  ): Promise<Process> => {
    // The payload structure for starting a process can vary.
    // This is a common way: POST to /processes with script name and parameters.
    // Or it might be /processes/scriptName with parameters in body or query.
    // Example payload: { scriptName: "...", parameters: [...] }
    // Or using form data if the API expects that for script execution.
    // For DSpace 7, it was often POST /processes?script=<name>&parameters=...
    // For DSpace 8+, it might be POST to /processes with a body like:
    // { "script": "script-name", "parameters": [ {"name": "-p", "value": "param_value"} ] }
    // This example uses query parameters as it's common for simple script triggers.
    const queryParams = new URLSearchParams()
    queryParams.append('scriptName', scriptName) // Or just 'script'
    parameters.forEach((p) => queryParams.append(p.key, p.value)) // Or construct a JSON body

    // If DSpace expects a JSON body for process creation:
    // const payload = {
    //   script: scriptName,
    //   parameters: parameters.map(p => ({ name: p.key, value: p.value }))
    // };
    // return request.post<Process>(ENDPOINTS.PROCESSES, payload);

    // Using query params for this example:
    return request.post<Process>(`${ENDPOINTS.PROCESSES}?${queryParams.toString()}`, {})
  },

  /**
   * Deletes a process by its ID. (May not be supported for all process types or states).
   * @param {string} processId - The process ID.
   * @returns {Promise<void>}
   */
  deleteById: (processId: string | number): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.PROCESSES}/${processId}`),

  /**
   * Retrieves the log/output of a specific process.
   * This endpoint might be /processes/{id}/output or similar.
   * @param {string} processId - The process ID.
   * @returns {Promise<string>} The process log as text.
   */
  getLog: (processId: string | number): Promise<string> =>
    apiClient
      .get<string>(`${ENDPOINTS.PROCESSES}/${processId}/output`, { responseType: 'text' })
      .then(responseBody)
}

const workflow = {
  /**
   * Retrieves all workflow items (items currently in workflow).
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<WorkflowItems>}
   */
  allItems: (size: number = 20, page: number = 0): Promise<WorkflowItems> =>
    request.get<WorkflowItems>(`${ENDPOINTS.WORKFLOW_ITEMS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific workflow item by its ID.
   * @param {string} workflowItemId - The workflow item UUID.
   * @returns {Promise<WorkflowItem>}
   */
  itemById: (workflowItemId: string): Promise<WorkflowItem> =>
    request.get<WorkflowItem>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemId}`),

  /**
   * Deletes (aborts/rejects) a workflow item.
   * @param {string} workflowItemId - The workflow item UUID.
   * @returns {Promise<void>}
   */
  deleteItem: (workflowItemId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemId}`),

  /**
   * Sends a claimed task back to the pool or advances/rejects a workflow item.
   * The exact endpoint and method (POST, PATCH) can vary.
   * This is a generic action placeholder.
   * @param {string} workflowItemIdOrTaskId - The ID of the item or task.
   * @param {Payload} actionPayload - Payload describing the action (e.g., { "action": "returnToPool" }).
   * @returns {Promise<any>}
   */
  performActionOnItem: (workflowItemIdOrTaskId: string, actionPayload: Payload): Promise<any> =>
    request.post<any>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemIdOrTaskId}`, actionPayload), // Or a specific sub-path like /tasks

  // --- Pool Tasks ---
  /**
   * Retrieves tasks available in the pool for the current user (or all pool tasks).
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<PoolTasks>}
   */
  poolTasks: (size: number = 20, page: number = 0): Promise<PoolTasks> =>
    request.get<PoolTasks>(`${ENDPOINTS.POOL_TASKS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific pool task by its ID.
   * @param {string} taskId - The task ID.
   * @returns {Promise<WorkflowTask>}
   */
  poolTaskById: (taskId: string): Promise<WorkflowTask> =>
    request.get<WorkflowTask>(`${ENDPOINTS.POOL_TASKS}/${taskId}`), // Or just /tasks/{id}

  // --- Claimed Tasks ---
  /**
   * Retrieves tasks claimed by the current user.
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<ClaimedTasks>}
   */
  claimedTasks: (size: number = 20, page: number = 0): Promise<ClaimedTasks> =>
    request.get<ClaimedTasks>(`${ENDPOINTS.CLAIMED_TASKS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific claimed task by its ID.
   * @param {string} taskId - The task ID.
   * @returns {Promise<WorkflowTask>}
   */
  claimedTaskById: (taskId: string): Promise<WorkflowTask> =>
    request.get<WorkflowTask>(`${ENDPOINTS.CLAIMED_TASKS}/${taskId}`), // Or just /tasks/{id}

  /**
   * Claims a task from the pool.
   * Typically a POST to the claimed tasks endpoint with the pool task ID in the body or as a query param.
   * Or POST to /api/workflow/tasks?action=claim&taskID={poolTaskID}
   * @param {string} poolTaskId - The ID of the pool task to claim.
   * @returns {Promise<WorkflowTask>} The claimed task.
   */
  claimTask: (poolTaskId: string): Promise<WorkflowTask> =>
    request.post<WorkflowTask>(`${ENDPOINTS.CLAIMED_TASKS}?poolTask=${poolTaskId}`, {}),
  // Alternative: request.post(`${ENDPOINTS.POOL_TASKS}/${poolTaskId}/claim`, {})
  // Or, if the API expects the task URI in the body:
  // request.post(ENDPOINTS.CLAIMED_TASKS, {uri: `${internalBaseUrl}${ENDPOINTS.POOL_TASKS}/${poolTaskId}` })

  /**
   * Returns a claimed task to the pool (unclaims it).
   * Typically a DELETE request to the specific claimed task URL.
   * @param {string} claimedTaskId - The ID of the task to unclaim.
   * @returns {Promise<void>}
   */
  unclaimTask: (claimedTaskId: string): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`), // Or a POST with an action

  /**
   * Submits/completes a claimed task (e.g., approve, reject, edit).
   * This often involves a POST or PATCH to the claimed task with a specific body/action.
   * @param {string} claimedTaskId - The ID of the claimed task.
   * @param {Payload} submissionPayload - Data for the submission (e.g., form data, decision).
   * For example: { "submit_approve": "true" } or form fields.
   * @returns {Promise<any>} Response might vary.
   */
  submitTask: (claimedTaskId: string, submissionPayload: Payload): Promise<any> =>
    request.post<any>(`${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`, submissionPayload)
  // DSpace 7 example: POST /claimedtasks/{TASK_ID}?submit_approve=true (or other submit_... buttons)
}

const resourcePolicies = {
  /**
   * Retrieves all resource policies for a specific DSpace object (e.g., item, collection).
   * @param {string} objectUuid - The UUID of the DSpace object.
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<ResourcePolicies>}
   */
  allByObject: (
    objectUuid: string,
    size: number = 20,
    page: number = 0
  ): Promise<ResourcePolicies> =>
    request.get<ResourcePolicies>(
      `${ENDPOINTS.RESOURCE_POLICIES}/search/object?uuid=${objectUuid}&size=${size}&page=${page}`
    ),
  // The search path might vary, e.g. /authz/resourcepolicies?resource=<uuid>

  /**
   * Retrieves a specific resource policy by its ID.
   * @param {string} policyId - The resource policy ID (usually numeric).
   * @returns {Promise<ResourcePolicy>}
   */
  byId: (policyId: string | number): Promise<ResourcePolicy> =>
    request.get<ResourcePolicy>(`${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`),

  /**
   * Creates a new resource policy for a DSpace object.
   * The policy is typically created on a specific object's policies link, e.g., /api/core/items/{uuid}/resourcePolicies
   * Or POST to /resourcepolicies with the object UUID in the payload.
   * @param {string} objectUuid - UUID of the object this policy applies to.
   * @param {Payload} payload - Policy data (action, groupUuid, epersonUuid, dates, etc.).
   * Example: { action: "READ", group: "/api/eperson/groups/{uuid}", resource: "/api/core/items/{uuid}" }
   * @returns {Promise<ResourcePolicy>} The created resource policy.
   */
  create: (objectUuid: string, payload: Payload): Promise<ResourcePolicy> => {
    // This is a common pattern: POST to the global policies endpoint,
    // with the resource UUID specified in the payload or as a query parameter.
    // The payload needs to link to the DSpace object (item, collection, etc.)
    // and the EPerson/Group.
    // Example: payload might include `resource: "/api/core/items/${objectUuid}"`
    // Or, the API might expect POSTing to `/api/core/items/${objectUuid}/resourcePolicies`
    // For this example, let's assume POSTing to the main endpoint with object UUID as a query param.
    return request.post<ResourcePolicy>(
      `${ENDPOINTS.RESOURCE_POLICIES}?resource=${objectUuid}`,
      payload
    )
  },

  /**
   * Updates an existing resource policy.
   * @param {string} policyId - The ID of the resource policy to update.
   * @param {Payload} payload - JSON Patch operations or the full updated policy object.
   * @returns {Promise<ResourcePolicy>} The updated resource policy.
   */
  update: (policyId: string | number, payload: Payload): Promise<ResourcePolicy> =>
    request.patch<ResourcePolicy>(`${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`, payload), // PATCH is common for updates

  /**
   * Deletes a resource policy by its ID.
   * @param {string} policyId - The resource policy ID.
   * @returns {Promise<void>}
   */
  deleteById: (policyId: string | number): Promise<void> =>
    request.delete<void>(`${ENDPOINTS.RESOURCE_POLICIES}/${policyId}`)
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
  epersons,
  processes,
  workflow,
  resourcePolicies,
  getClient: (): AxiosInstance => {
    if (!apiClient) {
      throw new Error('DSpace API client not initialized. Call init() first.')
    }
    return apiClient
  },
  request
}

export default dspaceApi
