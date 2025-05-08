import { strict as assert } from 'assert'
import sinon from 'sinon'
import { itemsCommands } from './items'
import { dspaceClient } from '../services/dspace-client.service'

describe('CLI: Items Commands', () => {
  let ensureAuthStub: sinon.SinonStub
  let showAllItemsStub: sinon.SinonStub
  let showItemStub: sinon.SinonStub
  let updateItemStub: sinon.SinonStub
  let moveItemStub: sinon.SinonStub

  beforeEach(() => {
    ensureAuthStub = sinon.stub(dspaceClient, 'ensureAuth').resolves()
    showAllItemsStub = sinon.stub(dspaceClient, 'showAllItems').resolves()
    showItemStub = sinon.stub(dspaceClient, 'showItem').resolves()
    updateItemStub = sinon.stub(dspaceClient, 'updateItem').resolves()
    moveItemStub = sinon.stub(dspaceClient, 'moveItem').resolves()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should list all items', async () => {
    await itemsCommands.handleItemsList()
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(showAllItemsStub.calledOnce)
  })

  it('should show an item by id', async () => {
    await itemsCommands.handleItemsShow('item1')
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(showItemStub.calledWith('item1'))
  })

  it('should update an item with metadata', async () => {
    const metadata = { title: 'Test' }
    await itemsCommands.handleItemsUpdate('item1', JSON.stringify(metadata))
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(updateItemStub.calledWith('item1', metadata))
  })

  it('should move an item to a collection', async () => {
    await itemsCommands.handleItemsMove('item1', 'col1')
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(moveItemStub.calledWith('item1', 'col1'))
  })
})
