import { ClaimedTasks, PoolTasks, WorkflowItem, WorkflowItems, WorkflowTask } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { Payload, clientRequest } from '../client'

export const workflowFunctions = {
  /**
   * Retrieves all workflow items (items currently in workflow).
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<WorkflowItems>}
   */
  allItems: (size: number = 20, page: number = 0): Promise<WorkflowItems> =>
    clientRequest.get<WorkflowItems>(`${ENDPOINTS.WORKFLOW_ITEMS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific workflow item by its ID.
   * @param {string} workflowItemId - The workflow item UUID.
   * @returns {Promise<WorkflowItem>}
   */
  itemById: (workflowItemId: string): Promise<WorkflowItem> =>
    clientRequest.get<WorkflowItem>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemId}`),

  /**
   * Deletes (aborts/rejects) a workflow item.
   * @param {string} workflowItemId - The workflow item UUID.
   * @returns {Promise<void>}
   */
  deleteItem: (workflowItemId: string): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemId}`),

  /**
   * Sends a claimed task back to the pool or advances/rejects a workflow item.
   * The exact endpoint and method (POST, PATCH) can vary.
   * This is a generic action placeholder.
   * @param {string} workflowItemIdOrTaskId - The ID of the item or task.
   * @param {Payload} actionPayload - Payload describing the action (e.g., { "action": "returnToPool" }).
   * @returns {Promise<any>}
   */
  performActionOnItem: (workflowItemIdOrTaskId: string, actionPayload: Payload): Promise<any> =>
    clientRequest.post<any>(`${ENDPOINTS.WORKFLOW_ITEMS}/${workflowItemIdOrTaskId}`, actionPayload), // Or a specific sub-path like /tasks

  // --- Pool Tasks ---
  /**
   * Retrieves tasks available in the pool for the current user (or all pool tasks).
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<PoolTasks>}
   */
  poolTasks: (size: number = 20, page: number = 0): Promise<PoolTasks> =>
    clientRequest.get<PoolTasks>(`${ENDPOINTS.POOL_TASKS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific pool task by its ID.
   * @param {string} taskId - The task ID.
   * @returns {Promise<WorkflowTask>}
   */
  poolTaskById: (taskId: string): Promise<WorkflowTask> =>
    clientRequest.get<WorkflowTask>(`${ENDPOINTS.POOL_TASKS}/${taskId}`), // Or just /tasks/{id}

  // --- Claimed Tasks ---
  /**
   * Retrieves tasks claimed by the current user.
   * @param {number} [size=20]
   * @param {number} [page=0]
   * @returns {Promise<ClaimedTasks>}
   */
  claimedTasks: (size: number = 20, page: number = 0): Promise<ClaimedTasks> =>
    clientRequest.get<ClaimedTasks>(`${ENDPOINTS.CLAIMED_TASKS}?size=${size}&page=${page}`),

  /**
   * Retrieves a specific claimed task by its ID.
   * @param {string} taskId - The task ID.
   * @returns {Promise<WorkflowTask>}
   */
  claimedTaskById: (taskId: string): Promise<WorkflowTask> =>
    clientRequest.get<WorkflowTask>(`${ENDPOINTS.CLAIMED_TASKS}/${taskId}`), // Or just /tasks/{id}

  /**
   * Claims a task from the pool.
   * Typically a POST to the claimed tasks endpoint with the pool task ID in the body or as a query param.
   * Or POST to /api/workflow/tasks?action=claim&taskID={poolTaskID}
   * @param {string} poolTaskId - The ID of the pool task to claim.
   * @returns {Promise<WorkflowTask>} The claimed task.
   */
  claimTask: (poolTaskId: string): Promise<WorkflowTask> =>
    clientRequest.post<WorkflowTask>(`${ENDPOINTS.CLAIMED_TASKS}?poolTask=${poolTaskId}`, {}),
  // Alternative: clientRequest.post(`${ENDPOINTS.POOL_TASKS}/${poolTaskId}/claim`, {})
  // Or, if the API expects the task URI in the body:
  // clientRequest.post(ENDPOINTS.CLAIMED_TASKS, {uri: `${internalBaseUrl}${ENDPOINTS.POOL_TASKS}/${poolTaskId}` })

  /**
   * Returns a claimed task to the pool (unclaims it).
   * Typically a DELETE request to the specific claimed task URL.
   * @param {string} claimedTaskId - The ID of the task to unclaim.
   * @returns {Promise<void>}
   */
  unclaimTask: (claimedTaskId: string): Promise<void> =>
    clientRequest.delete<void>(`${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`), // Or a POST with an action

  /**
   * Submits/completes a claimed task (e.g., approve, reject, edit).
   * This often involves a POST or PATCH to the claimed task with a specific body/action.
   * @param {string} claimedTaskId - The ID of the claimed task.
   * @param {Payload} submissionPayload - Data for the submission (e.g., form data, decision).
   * For example: { "submit_approve": "true" } or form fields.
   * @returns {Promise<any>} Response might vary.
   */
  submitTask: (claimedTaskId: string, submissionPayload: Payload): Promise<any> =>
    clientRequest.post<any>(`${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`, submissionPayload)
  // DSpace 7 example: POST /claimedtasks/{TASK_ID}?submit_approve=true (or other submit_... buttons)
}
