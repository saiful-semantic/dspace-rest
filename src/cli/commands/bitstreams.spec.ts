import { strict as assert } from 'assert'
import sinon from 'sinon'
import { bitstreamsCommands } from './bitstreams'
import { dspaceClient } from '../services/dspace-client.service'

describe('CLI: Bitstreams Commands', () => {
  let ensureAuthStub: sinon.SinonStub
  let showItemBundlesStub: sinon.SinonStub
  let newBitstreamStub: sinon.SinonStub
  let deleteBitstreamsStub: sinon.SinonStub

  beforeEach(() => {
    ensureAuthStub = sinon.stub(dspaceClient, 'ensureAuth').resolves()
    showItemBundlesStub = sinon.stub(dspaceClient, 'showItemBundles').resolves()
    newBitstreamStub = sinon.stub(dspaceClient, 'newBitstream').resolves()
    deleteBitstreamsStub = sinon.stub(dspaceClient, 'deleteBitstreams').resolves()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should list bitstreams for an item', async () => {
    await bitstreamsCommands.handleBitstreamsList('item1', 'ORIGINAL')
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(showItemBundlesStub.calledWith('item1', 'ORIGINAL'))
  })

  it('should add a bitstream to an item', async () => {
    await bitstreamsCommands.handleBitstreamsAdd('item1', 'file.txt', '/tmp/file.txt')
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(newBitstreamStub.calledWith('item1', 'file.txt', '/tmp/file.txt'))
  })

  it('should delete a bitstream by id', async () => {
    await bitstreamsCommands.handleBitstreamsDelete('bitstream1')
    assert.ok(ensureAuthStub.calledOnce)
    assert.ok(deleteBitstreamsStub.calledWith('bitstream1'))
  })
})
