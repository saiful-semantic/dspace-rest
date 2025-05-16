import axios, { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

/**
 * Type definition for payload data sent to the DSpace API.
 * Can be either a single object or an array of objects.
 */
export type Payload = Record<string, unknown> | Array<Record<string, unknown>>

/**
 * Custom error class for DSpace API errors.
 * Extends the standard Error class with additional properties for HTTP status and response data.
 */
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

/**
 * The main Axios instance used for all DSpace API requests.
 * This is initialized by the initClient function.
 */
export let apiClient: AxiosInstance

/**
 * Stores the base URL of the DSpace instance internally.
 * This is set by the initClient function.
 */
export let internalBaseUrl: string

/**
 * Returns the initialized Axios instance for making API requests.
 * @returns {AxiosInstance} The configured Axios instance.
 * @throws {Error} If the API client has not been initialized.
 */
export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error('API client not initialized. Please call initClient() first.')
  }
  return apiClient
}

/**
 * Stores the DSpace base version number.
 * This is used to determine which API endpoints to use.
 */
let baseVersion: number | undefined

/**
 * Gets the currently set DSpace base version.
 * @returns {number|undefined} The current base version or undefined if not set.
 */
export const getBaseVersion = (): number | undefined => {
  return baseVersion
}

/**
 * Sets the DSpace base version number.
 * @param {number} version - The DSpace base version to set.
 */
export const setBaseVersion = (version: number): void => {
  baseVersion = version
}

/**
 * Clears the authorization headers from the API client.
 * This is typically called during logout or when authentication expires.
 */
export const clearAuthorization = (): void => {
  delete apiClient.defaults.headers.common['Authorization']
  delete apiClient.defaults.headers.common['X-XSRF-Token']
}

/**
 * Sets the authorization headers on the API client.
 * @param {string} authToken - The authorization token (usually a Bearer token).
 * @param {string} csrfToken - The CSRF token for cross-site request forgery protection.
 */
export const setAuthorization = (authToken: string, csrfToken?: string): void => {
  apiClient.defaults.headers.common['Authorization'] = authToken
  apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken || ''
}

/**
 * Get the current authorization token from the API client.
 * @returns {string|undefined} The current authorization token or undefined if not set.
 */
export const getAuthorization = (): string | undefined => {
  const authHeader = apiClient.defaults.headers.common['Authorization']
  return authHeader !== null ? (authHeader as string) : undefined
}

/**
 * Initializes the DSpace API client with a base URL and user agent.
 * @param {string} baseUrl - The base URL of the DSpace instance.
 * @param {string} userAgent - The User-Agent string for requests.
 */
export const initClient = (baseUrl: string, userAgent: string = 'DSpace NodeJs Client'): void => {
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

/**
 * Extracts the data property from an Axios response.
 * @template T The type of data expected in the response.
 * @param {AxiosResponse<T>} response - The Axios response object.
 * @returns {T} The data from the response.
 */
export const responseBody = <T>(response: AxiosResponse<T>): T => response.data

/**
 * Object containing wrapper methods for making HTTP requests to the DSpace API.
 * These methods use the configured apiClient and automatically extract the response data.
 */
export const clientRequest = {
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
