import { dspaceClient } from '../services/dspace-client.service'

export const itemsCommands = {
  async handleItemsList(): Promise<void> {
    await dspaceClient.ensureAuth()
    await dspaceClient.showAllItems()
  },

  async handleItemsShow(id: string): Promise<void> {
    await dspaceClient.ensureAuth()
    await dspaceClient.showItem(id)
  },

  // TODO: Fix unsafe assignment of payload
  async handleItemsUpdate(): Promise<void> {
    // async handleItemsUpdate(id: string, metadataJson: string): Promise<void> {
    await dspaceClient.ensureAuth()
    // const payload = JSON.parse(metadataJson)
    // await dspaceClient.updateItem(id, payload)
  },

  async handleItemsMove(itemId: string, collectionId: string): Promise<void> {
    await dspaceClient.ensureAuth()
    await dspaceClient.moveItem(itemId, collectionId)
  }
}
