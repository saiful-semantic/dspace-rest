import { dspaceApi, Payload } from '../../index'
import { configService } from './config.service'
import { authStore } from '../utils/store'
import { readFileSync } from 'node:fs'

export const dspaceClient = {
  init: dspaceApi.init,
  info: dspaceApi.core.info,
  login: dspaceApi.auth.login,
  logout: dspaceApi.auth.logout,

  async showAllItems(): Promise<void> {
    try {
      const res = await dspaceApi.items.all()
      const itemList = res._embedded.items
      let count = 0
      for (const item of itemList) {
        console.log(`${++count}. Title: ${item.name} (handle: ${item.handle})`)
        console.log(`    ${item._links.self.href}`)
        // console.log(item.lastModified)
      }
    } catch (e: any) {
      console.error(`Error getting item: ${e.errorCode}`)
    }
  },

  async showItem(itemId: string): Promise<void> {
    try {
      const item = await dspaceApi.items.byId(itemId)
      console.log(`${item.name} (handle: ${item.handle}, id: ${item.uuid})`)
      console.log(`URL: ${item._links.self.href}`)
    } catch (e: any) {
      console.error(`Error getting item with id: ${itemId}`)
    }
  },

  async updateItem(itemId: string, payload: {}): Promise<void> {
    try {
      const item = await dspaceApi.items.update(itemId, payload)
      console.log(`${item.name} (handle: ${item.handle}, id: ${item.uuid}) updated`)
    } catch (e: any) {
      console.error(`Error updating item with id: ${itemId}`)
    }
  },

  async moveItem(itemId: string, colId: string) {
    try {
      await dspaceApi.items.move(itemId, colId)
      console.log(`Item moved to collection: ${colId}`)
    } catch (e: any) {
      console.error(`Item move failed for itemId: ${itemId}`)
    }
  },

  async showItemBundles(itemId: string, type?: string) {
    try {
      const res = await dspaceApi.bundles.byItemId(itemId)
      const bundles = type
        ? res._embedded.bundles.filter(bundle => bundle.name === type)
        : res._embedded.bundles
      for (const bundle of bundles) {
        console.log(`${bundle.name} (Bundle id: ${bundle.uuid})`)
        console.log(`URL: ${bundle._links.self.href}`)
        await showBitstreams(bundle.uuid)
      }
    } catch (e: any) {
      console.error(`Error getting bundles with item id: ${itemId}`)
    }

    async function showBitstreams(bundleId: string): Promise<void> {
      try {
        const res = await dspaceApi.bitstreams.byBundleId(bundleId)
        const bitstreams = res._embedded.bitstreams
        bitstreams.forEach(bitstream => {
          console.log(`\t${bitstream.name} (size: ${bitstream.sizeBytes}, Bitstream id: ${bitstream.uuid})`)
          console.log(`\tContent: ${bitstream._links.content.href}`)
          console.log(`\tThumbnail: ${bitstream._links.thumbnail.href}\n`)
        })
      } catch (e: any) {
        console.error(`\tError getting bitstreams with bundle id: ${bundleId}`)
      }
    }
  },

  async newBitstream(itemId: string, name: string, filePath: string) {
    try {
      const bundleId = await getContentBundleId(itemId)
      if (bundleId.length) {
        const formData = new FormData()
        const contents = new Blob([readFileSync(`${filePath}/${name}`)])
        const properties = `${JSON.stringify(Payload.Bitstream(name))};type=application/json`
        formData.append('file', contents, name)
        formData.append('properties', properties)
        // console.log(contents, properties)
        await dspaceApi.bitstreams.create(bundleId, formData)
        console.log(`Bitstream created in item: ${itemId}`)
      } else {
        console.error(`Error in getting bundleId: ${itemId}`)
      }
    } catch (e: any) {
      console.error(`Create bitstream failed: ${e.errorCode}`)
    }

    async function getContentBundleId(itemId: string) {
      let bundleId = ''
      try {
        const res = await dspaceApi.bundles.byItemId(itemId)
        // const bundles = res._embedded.bundles.find(bundle => bundle.name === 'ORIGINAL')
        const bundle = res._embedded.bundles.find(bundle => bundle.name === 'ORIGINAL')
        bundleId = bundle ? bundle.uuid : ''
      } catch (e: any) {
        console.error(`Error getting bundle ID: ${e.errorCode}`)
      }
      return bundleId
    }
  },

  async deleteBitstreams(bitstreamId: string) {
    try {
      await dspaceApi.bitstreams.deleteById(bitstreamId)
      console.log(`Bitstream deleted: ${bitstreamId}`)
    } catch (e: any) {
      console.error(`Delete bitstream (id: ${bitstreamId} failed: ${e.errorCode}`)
    }
  },

  async deleteBitstreamsMulti(payload: any) {
    try {
      await dspaceApi.bitstreams.batchUpdate(payload)
    } catch (e: any) {
      console.error(`Delete bitstream failed: ${e.errorCode}`)
    }
  },

  async deleteBitstreamsByItemId(itemId: string) {
    try {
      const res = await dspaceApi.bundles.byItemId(itemId)
      const bundles = res._embedded.bundles.filter(bundle => bundle.name !== 'LICENSE')
      for (const bundle of bundles) {
        const bundleId = bundle.uuid
        if (bundleId.length) {
          const res = await dspaceApi.bitstreams.byBundleId(bundleId)
          const bitstreams = res._embedded.bitstreams
          for (const bitstream of bitstreams) {
            try {
              await dspaceApi.bitstreams.deleteById(bitstream.uuid)
              console.log(`Bitstream (bundle: ${bundle.name}) deleted: ${bitstream.name}`)
            } catch {
              console.log(`Delete bitstream (bundle: ${bundle.name}) failed for: ${bitstream.name}`)
            }
          }
        } else {
          console.error(`Error in getting bundleId: ${itemId}`)
        }
      }
      console.log(`Deleted bitstreams for itemId: ${itemId}`)
    } catch (e: any) {
      console.error(`Exception in deleting bitstreams for item: ${itemId}`)
    }
  },

  async deleteCollection(colId: string) {
    try {
      await dspaceApi.collections.deleteById(colId)
      console.log(`Collection deleted: ${colId}`)
    } catch (e: any) {
      console.error(`Delete collection failed: ${e.errorCode}`)
    }
  },

  async createCollection(comId: string, name: string) {
    try {
      await dspaceApi.collections.create(comId, Payload.Collection(name))
      console.log(`Collection created: ${name}`)
    } catch (e: any) {
      console.error(`Create collection failed: ${e.errorCode}`)
    }
  },

  async showCollections() {
    try {
      const res = await dspaceApi.communities.top()
      const commList = res._embedded.communities
      console.log('----------------\nTop Communities\n----------------')
      for (const comm of commList) {
        console.log(`${comm.name} (id: ${comm.uuid})`)

        const res2 = await dspaceApi.collections.byComId(comm.uuid)
        const colList = res2._embedded.collections
        if (colList.length) {
          console.log('\t=> Collections')
          colList.forEach(col => {
            console.log(`\t${col.name} (id: ${col.uuid})`)
          })
        }
      }
    } catch (e) {
      console.error('Error in getting collections')
    }
  },

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
