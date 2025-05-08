import { dspaceClient } from '../services/dspace-client.service'

export const collectionsCommands = {
    async handleCollectionsList(): Promise<void> {
        await dspaceClient.ensureAuth()
        await dspaceClient.showCollections()
    }
}