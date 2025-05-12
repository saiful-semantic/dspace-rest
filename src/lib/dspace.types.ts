export interface ApiInfo {
  dspaceUI: string
  dspaceName: string
  dspaceServer: string
  dspaceVersion: string
  type: string
}

export interface AuthStatus {
  okay: string
  authenticated: boolean
  type: string
  _links?: {
    eperson?: {
      href: string
    }
  }
  _embedded?: {
    eperson?: EPerson
  }
}

export interface DspaceEntity {
  id: string
  uuid: string
  name?: string
  handle?: string // Handle is not present on all entities like EPerson
  metadata?: {
    // Optional as not all entities (e.g. Process) will have extensive metadata
    [propName: string]: Array<{
      value: string | number | Date
      language: string
      authority: string
      confidence: number
      place: number
    }>
  }
  _links: {
    [propName: string]: {
      href: string
    }
  }
  type: string // Make type mandatory at base level
}

export interface Collection extends DspaceEntity {
  type: 'collection'
  archivedItemsCount: number
}

export interface Community extends DspaceEntity {
  type: 'community'
  archivedItemsCount: number
}

export interface Item extends DspaceEntity {
  type: 'item'
  inArchive: boolean
  discoverable: boolean
  withdrawn: boolean
  lastModified: Date
}

export interface Bitstream extends DspaceEntity {
  type: 'bitstream'
  sequenceId?: number // Optional as it might not always be present
  sizeBytes: number
  checkSum: {
    checkSumAlgorithm: string
    value: string
  }
  _embedded?: {
    // For thumbnail, etc.
    thumbnail?: DspaceEntity // Simplified, could be more specific
  }
}

export interface Bundle extends DspaceEntity {
  type: 'bundle'
  _embedded: {
    bitstreams: Bitstream[]
  }
}

// --- New Types ---

export interface EPerson extends DspaceEntity {
  type: 'eperson'
  email: string
  netid?: string
  canLogIn: boolean
  requireCertificate: boolean
  selfRegistered: boolean
  lastActive: Date
  subscribes?: never // Define more specifically if needed
  epersongroups?: Group[] // Assuming a Group type might be needed
  supervisorFor?: never // Define more specifically if needed
  avatar?: Bitstream
}

export interface Group extends DspaceEntity {
  type: 'group'
  permanent: boolean
  // other group-specific properties
}

export interface Process extends DspaceEntity {
  type: 'process'
  processId: number
  scriptName: string
  startTime: Date
  endTime?: Date
  processStatus: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CLEANUP'
  creationTime: Date
  parameters: Array<{ name: string; value: string }>
  userId?: string // UUID of EPerson who started it
}

export interface WorkflowItem extends DspaceEntity {
  type: 'workflowitem'
  lastModified: Date
  // WorkflowItems are wrappers around Items during submission
  _embedded?: {
    item?: Item
    submissionDefinition?: DspaceEntity // Simplified
    submitter?: EPerson
    collection?: Collection
    // tasks would be WorkflowTask[]
    tasks?: WorkflowTask[]
  }
}

export interface WorkflowTask extends DspaceEntity {
  type: 'workflowtask' // Could be pooltask, claimedtask etc. DSpace often uses specific types here.
  workflowType?: string // e.g. 'reviewstep', 'editstep'
  // Other task-specific properties
  _embedded?: {
    workflowitem?: WorkflowItem
    owner?: EPerson // Who claimed the task
    // other embedded resources like 'step'
  }
}

export interface ResourcePolicy extends DspaceEntity {
  type: 'resourcepolicy'
  name?: string // Optional, might not always be present
  description?: string // Optional
  action: string // e.g., READ, WRITE, ADMIN
  startDate?: Date
  endDate?: Date
  rpType?: string // e.g. TYPE_SUBMISSION
  // Other policy-specific properties
  _embedded?: {
    eperson?: EPerson
    group?: Group
  }
}

// --- List Response Types ---
export interface ListResponse {
  _links: {
    [propName: string]: {
      href: string
    }
  }
  page: {
    size?: number
    totalElements?: number
    totalPages?: number
    number?: number
  }
}

export interface Communities extends ListResponse {
  _embedded: {
    communities: Community[]
  }
}

export interface SubCommunities extends ListResponse {
  _embedded: {
    subcommunities: Community[] // DSpace often uses 'subcommunities' or just 'communities'
  }
}

export interface Collections extends ListResponse {
  _embedded: {
    collections: Collection[]
  }
}

export interface Items extends ListResponse {
  _embedded: {
    items: Item[]
  }
}

export interface Bundles extends ListResponse {
  _embedded: {
    bundles: Bundle[]
  }
}

export interface Bitstreams extends ListResponse {
  _embedded: {
    bitstreams: Bitstream[]
  }
}

export interface EPersons extends ListResponse {
  _embedded: {
    epersons: EPerson[]
  }
}

export interface Processes extends ListResponse {
  _embedded: {
    processes: Process[]
  }
}

export interface WorkflowItems extends ListResponse {
  _embedded: {
    workflowitems: WorkflowItem[] // or 'workspaceitems', 'workflowitems' depending on endpoint
  }
}

export interface WorkflowTasks extends ListResponse {
  _embedded: {
    tasks: WorkflowTask[] // DSpace uses 'tasks', 'pooltasks', 'claimedtasks'
  }
}

export interface PoolTasks extends ListResponse {
  _embedded: {
    pooltasks: WorkflowTask[]
  }
}

export interface ClaimedTasks extends ListResponse {
  _embedded: {
    claimedtasks: WorkflowTask[]
  }
}

export interface ResourcePolicies extends ListResponse {
  _embedded: {
    resourcepolicies: ResourcePolicy[] // or 'policies'
  }
}

// Potentially a generic type for HAL embedded resources
export interface EmbeddedResource<T> {
  _embedded: T
}
