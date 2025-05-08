import { strict as assert } from 'assert'
import sinon from 'sinon'
import { collectionsCommands } from './collections'
import { dspaceClient } from '../services/dspace-client.service'

describe('CLI: Collections Commands', () => {
  let ensureAuthStub: sinon.SinonStub
  let showCollectionsStub: sinon.SinonStub

  beforeEach(() => {
    ensureAuthStub = sinon.stub(dspaceClient, 'ensureAuth').resolves()
    showCollectionsStub = sinon.stub(dspaceClient, 'showCollections').resolves()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should list collections', async () => {
    await collectionsCommands.handleCollectionsList()
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(showCollectionsStub.calledOnce)
  })
})
