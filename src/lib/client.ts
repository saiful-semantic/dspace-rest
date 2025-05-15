import axios, { AxiosError, AxiosResponse, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// Define a more specific type for payloads if possible, or use a generic
export type Payload = Record<string, unknown> | Array<Record<string, unknown>>

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
export let apiClient: AxiosInstance
export let internalBaseUrl: string // Store baseUrl internally

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error('API client not initialized. Please call initClient() first.')
  }
  return apiClient
}

// --- Base Version Handling ---
let baseVersion: number | undefined
export const getBaseVersion = (): number | undefined => {
  return baseVersion
}
export const setBaseVersion = (version: number): void => {
  baseVersion = version
}

// --- Authentication Handling ---

export const clearAuthorization = (): void => {
  delete apiClient.defaults.headers.common['Authorization']
  delete apiClient.defaults.headers.common['X-XSRF-Token']
}

export const setAuthorization = (authToken: string, csrfToken: string): void => {
  apiClient.defaults.headers.common['Authorization'] = authToken
  apiClient.defaults.headers.common['X-XSRF-Token'] = csrfToken
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

// --- Generic Response Handler ---
export const responseBody = <T>(response: AxiosResponse<T>): T => response.data

// --- Request Methods Wrapper ---
// These methods now use the configured apiClient
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
