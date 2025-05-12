import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'
import { WorkflowItem, WorkflowTask } from '../dspace.types'

describe('DSpace API Workflow Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance
  const mockWorkflowItem: WorkflowItem = {
    id: 'wf-item-uuid-1',
    uuid: 'wf-item-uuid-1',
    name: 'Workflow Item 1', // Name might be from embedded item
    lastModified: new Date(),
    type: 'workflowitem',
    _links: { self: { href: `${baseUrl}${ENDPOINTS.WORKFLOW_ITEMS}/wf-item-uuid-1` } },
    _embedded: {
      item: {
        id: 'item-123',
        uuid: 'item-123',
        name: 'Test Item in Workflow',
        type: 'item'
      } as any
    }
  }
  const mockWorkflowItemsList = { _embedded: { workflowitems: [mockWorkflowItem] } }

  const mockWorkflowTask: WorkflowTask = {
    id: 'task-uuid-1',
    uuid: 'task-uuid-1',
    name: 'Review Task', // Name might not be directly on task
    type: 'workflowtask', // Or more specific like 'pooltask', 'claimedtask'
    _links: { self: { href: `${baseUrl}${ENDPOINTS.WORKFLOW_TASKS}/task-uuid-1` } }, // General tasks endpoint
    _embedded: { workflowitem: mockWorkflowItem }
  }
  const mockPoolTasksList = { _embedded: { pooltasks: [mockWorkflowTask] } }
  const mockClaimedTasksList = { _embedded: { claimedtasks: [mockWorkflowTask] } }

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should get all workflow items', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowItemsList })
    const result = await dspaceApiMain.workflow.allItems(10, 1)
    deepEqual(result, mockWorkflowItemsList)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.WORKFLOW_ITEMS}?size=10&page=1`)
  })

  it('should get workflow item by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowItem })
    const result = await dspaceApiMain.workflow.itemById('wf-item-uuid-1')
    deepEqual(result, mockWorkflowItem)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.WORKFLOW_ITEMS}/wf-item-uuid-1`)
  })

  it('should delete a workflow item', async () => {
    const wfItemId = 'wf-item-to-delete'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    await dspaceApiMain.workflow.deleteItem(wfItemId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.WORKFLOW_ITEMS}/${wfItemId}`)
  })

  it('should perform an action on a workflow item/task', async () => {
    const itemId = 'wf-item-uuid-1'
    const payload = { action: 'approve' }
    const mockResponse = { status: 'action_performed' }
    const postStub = sinon.stub(client, 'post').resolves({ data: mockResponse })
    const result = await dspaceApiMain.workflow.performActionOnItem(itemId, payload)
    deepEqual(result, mockResponse)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.WORKFLOW_ITEMS}/${itemId}`, payload)
  })

  it('should get pool tasks', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockPoolTasksList })
    const result = await dspaceApiMain.workflow.poolTasks(5, 0)
    deepEqual(result, mockPoolTasksList)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.POOL_TASKS}?size=5&page=0`)
  })

  it('should get pool task by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowTask })
    const result = await dspaceApiMain.workflow.poolTaskById('task-uuid-1')
    deepEqual(result, mockWorkflowTask)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.POOL_TASKS}/task-uuid-1`)
  })

  it('should get claimed tasks', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockClaimedTasksList })
    const result = await dspaceApiMain.workflow.claimedTasks(15, 0)
    deepEqual(result, mockClaimedTasksList)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.CLAIMED_TASKS}?size=15&page=0`)
  })

  it('should get claimed task by ID', async () => {
    const getStub = sinon.stub(client, 'get').resolves({ data: mockWorkflowTask })
    const result = await dspaceApiMain.workflow.claimedTaskById('task-uuid-1')
    deepEqual(result, mockWorkflowTask)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.CLAIMED_TASKS}/task-uuid-1`)
  })

  it('should claim a task', async () => {
    const poolTaskId = 'pool-task-to-claim'
    const postStub = sinon.stub(client, 'post').resolves({ data: mockWorkflowTask }) // Assuming claim returns the task
    const result = await dspaceApiMain.workflow.claimTask(poolTaskId)
    deepEqual(result, mockWorkflowTask)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.CLAIMED_TASKS}?poolTask=${poolTaskId}`, {})
  })

  it('should unclaim a task', async () => {
    const claimedTaskId = 'task-to-unclaim'
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })
    await dspaceApiMain.workflow.unclaimTask(claimedTaskId)
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`)
  })

  it('should submit a task', async () => {
    const claimedTaskId = 'task-to-submit'
    const payload = { decision: 'approved', comment: 'Looks good' }
    const mockResponse = { status: 'submitted' }
    const postStub = sinon.stub(client, 'post').resolves({ data: mockResponse })
    const result = await dspaceApiMain.workflow.submitTask(claimedTaskId, payload)
    deepEqual(result, mockResponse)
    sinon.assert.calledWith(postStub, `${ENDPOINTS.CLAIMED_TASKS}/${claimedTaskId}`, payload)
  })
})
