import { ResourcePolicies, ResourcePolicy } from '../dspace.types'
import { ENDPOINTS } from '../../constants'
import { Payload, request } from '../client'

export const resourcePoliciesFunctions = {
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
