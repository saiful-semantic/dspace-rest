import * as DSpaceClient from '../../index'
import { dspaceApi } from '../../index'
import { configService } from './config.service'
import { authStore } from '../utils/store'

export const dspaceClient = {
  init: dspaceApi.init,
  info: dspaceApi.core.info,
  login: dspaceApi.auth.login,
  logout: DSpaceClient.logout,
  showAllItems: DSpaceClient.showAllItems,
  showItem: DSpaceClient.showItem,
  updateItem: DSpaceClient.updateItem,
  showItemBundles: DSpaceClient.showItemBundles,
  newBitstream: DSpaceClient.newBitstream,
  deleteBitstreams: DSpaceClient.deleteBitstreams,
  showCollections: DSpaceClient.showCollections,
  moveItem: DSpaceClient.moveItem,

  async ensureAuth(): Promise<void> {
    const config = configService.loadConfig()
    if (!config.baseURL) {
      throw new Error('Set the URL first with config:set <REST_API_URL>')
    }

    this.init(config.baseURL as string)

    const credentials = authStore.get('credentials')
    if (!credentials) {
      throw new Error('No saved credentials. Run "dspace-cli login" first.')
    }
    await this.login(credentials.username, credentials.password)
  }
}
