import { dspaceClient } from '../services/dspace-client.service'

export const bitstreamsCommands = {
    async handleBitstreamsList(itemId: string, type?: string): Promise<void> {
        await dspaceClient.ensureAuth()
        await dspaceClient.showItemBundles(itemId, type)
    },

    async handleBitstreamsAdd(itemId: string, name: string, filePath: string): Promise<void> {
        await dspaceClient.ensureAuth()
        await dspaceClient.newBitstream(itemId, name, filePath)
    },

    async handleBitstreamsDelete(id: string): Promise<void> {
        await dspaceClient.ensureAuth()
        await dspaceClient.deleteBitstreams(id)
    }
}