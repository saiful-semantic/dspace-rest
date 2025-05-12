import { deepEqual } from 'assert'
import sinon from 'sinon'
import { AxiosInstance } from 'axios'
import dspaceApiMain from '../../index'
import { ENDPOINTS } from '../../constants'

describe('DSpace API Bitstreams Module Tests', () => {
  const baseUrl = 'https://example.edu/server'
  const userAgent = 'TestAgent/1.0'
  let client: AxiosInstance

  beforeEach(() => {
    dspaceApiMain.init(baseUrl, userAgent)
    client = dspaceApiMain.getClient()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should get bitstreams by bundle ID with custom pagination', async () => {
    const mockBitstreams = { _embedded: { bitstreams: [{ id: 'bit-1' }] } }
    const getStub = sinon.stub(client, 'get').resolves({ data: mockBitstreams })

    const result = await dspaceApiMain.bitstreams.byBundleId('test-bundle-id', 10, 1)
    deepEqual(result, mockBitstreams)
    sinon.assert.calledWith(
      getStub,
      `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams?size=10&page=1`
    )
  })

  it('should create new bitstream without explicit name', async () => {
    const mockBitstream = { id: 'new-bitstream', name: 'file.txt' } as unknown
    const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream })

    const formData = new FormData()
    formData.append('file', new Blob(['content']), 'file.txt')

    const result = await dspaceApiMain.bitstreams.create('test-bundle-id', formData)
    deepEqual(result, mockBitstream)
    sinon.assert.calledWith(
      postStub,
      `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams`,
      formData,
      sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
  })

  it('should create new bitstream with explicit name', async () => {
    const mockBitstream = { id: 'new-bitstream', name: 'customName.pdf' } as unknown
    const postStub = sinon.stub(client, 'post').resolves({ data: mockBitstream })

    const formData = new FormData()
    formData.append('file', new Blob(['pdf content']), 'original.pdf')
    const bitstreamName = 'customName.pdf'

    const result = await dspaceApiMain.bitstreams.create('test-bundle-id', formData, bitstreamName)
    deepEqual(result, mockBitstream)
    const expectedUrl = `${ENDPOINTS.BUNDLES}/test-bundle-id/bitstreams?name=${encodeURIComponent(bitstreamName)}`
    sinon.assert.calledWith(
      postStub,
      expectedUrl,
      formData,
      sinon.match({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
  })

  it('should delete bitstream by ID', async () => {
    const deleteStub = sinon.stub(client, 'delete').resolves({ data: undefined })

    await dspaceApiMain.bitstreams.deleteById('test-bitstream-id')
    sinon.assert.calledWith(deleteStub, `${ENDPOINTS.BITSTREAMS}/test-bitstream-id`)
  })

  it('should perform batch update on bitstreams (e.g. multiple delete)', async () => {
    const payload = [
      { op: 'remove', path: '/bitstreams/id1' },
      { op: 'remove', path: '/bitstreams/id2' }
    ]
    const patchStub = sinon.stub(client, 'patch').resolves({ data: { status: 'success' } })

    await dspaceApiMain.bitstreams.batchUpdate(payload)
    sinon.assert.calledWith(patchStub, ENDPOINTS.BITSTREAMS, payload)
  })

  it('should retrieve bitstream content', async () => {
    const mockArrayBuffer = new ArrayBuffer(8)
    const getStub = sinon.stub(client, 'get').resolves({ data: mockArrayBuffer })

    const result = await dspaceApiMain.bitstreams.retrieve('test-bitstream-id')
    deepEqual(result, mockArrayBuffer)
    sinon.assert.calledWith(getStub, `${ENDPOINTS.BITSTREAMS}/test-bitstream-id/content`, {
      responseType: 'arraybuffer'
    })
  })

  it('should update bitstream metadata', async () => {
    const mockBitstream = {
      id: 'bs-to-update',
      name: 'Updated Bitstream Name',
      type: 'bitstream'
    } as unknown
    const payload = [
      { op: 'replace', path: '/metadata/dc.title/0/value', value: 'Updated Bitstream Name' }
    ]
    const patchStub = sinon.stub(client, 'patch').resolves({ data: mockBitstream })
    const bitstreamId = 'bs-to-update'

    const result = await dspaceApiMain.bitstreams.updateMetadata(bitstreamId, payload)
    deepEqual(result, mockBitstream)
    sinon.assert.calledWith(patchStub, `${ENDPOINTS.BITSTREAMS}/${bitstreamId}`, payload)
  })
})
