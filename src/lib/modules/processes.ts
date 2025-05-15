import { Process, Processes } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { apiClient, clientRequest, responseBody } from '../client'

export const processesFunctions = {
  /**
   * Retrieves all processes with pagination.
   * Note: DSpace 8+ might use `${CORE_PREFIX}/processes`. Adjust ENDPOINTS.PROCESSES if needed.
   * @param {number} [size=20] - Number of processes per page.
   * @param {number} [page=0] - Page number.
   * @returns {Promise<Processes>}
   */
  all: (size: number = 20, page: number = 0): Promise<Processes> =>
    clientRequest.get<Processes>(`${ENDPOINTS.PROCESSES}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific process by its ID.
   * @param {string} processId - The process ID (usually a number for DSpace processes).
   * @returns {Promise<Process>}
   */
  byId: (
    processId: string | number
  ): Promise<Process> => // Process ID is often numeric
    clientRequest.get<Process>(`${ENDPOINTS.PROCESSES}/${processId}`),

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
    // return clientRequest.post<Process>(ENDPOINTS.PROCESSES, payload);

    // Using query params for this example:
    return clientRequest.post<Process>(`${ENDPOINTS.PROCESSES}?${queryParams.toString()}`, {})
  },

  /**
   * Deletes a process by its ID. (May not be supported for all process types or states).
   * @param {string} processId - The process ID.
   * @returns {Promise<void>}
   */
  deleteById: (processId: string | number): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.PROCESSES}/${processId}`),

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
