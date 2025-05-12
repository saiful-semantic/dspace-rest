/**
 * Example: DSpace REST Client Usage for Bitstream Operations
 * (This file is purely for documentation)
 */
// @ts-ignore
// Use import for ESM (add "type": "module" to package.json)
import {dspaceApi, Payload, Types} from 'dspace-rest'
import {readFileSync} from 'fs'

async function main() {
  dspaceApi.init('http://localhost:8080/server')

  dspaceApi.auth.login('admin', 'admin').then(async (loginResponse: boolean) => {
    if (loginResponse) {
      await showBitstreams('bundle-id')
    }
  })
}

export async function showItemBundles(itemId: string, type?: string) {
  try {
    const res: Types.Bundles = await dspaceApi.bundles.byItemId(itemId)
    const bundlesList: Types.Bundle[] = res._embedded.bundles
    const bundles = type
      ? bundlesList.filter(bundle => bundle.name === type)
      : bundlesList
    for (const bundle of bundles) {
      console.log(`${bundle.name} (Bundle id: ${bundle.uuid})`)
      console.log(`URL: ${bundle._links.self.href}`)
      await showBitstreams(bundle.uuid)
    }
  } catch (e: any) {
    console.error(`Error getting bundles with item id: ${itemId}`)
  }
}

export async function showBitstreams(bundleId: string) {
  try {
    const res: Types.Bitstreams = await dspaceApi.bitstreams.byBundleId(bundleId)
    const bitstreams: Types.Bitstream[] = res._embedded.bitstreams
    bitstreams.forEach(bitstream => {
      console.log(`\t${bitstream.name} (size: ${bitstream.sizeBytes}, Bitstream id: ${bitstream.uuid})`)
      console.log(`\tContent: ${bitstream._links.content.href}`)
      console.log(`\tThumbnail: ${bitstream._links.thumbnail.href}\n`)
    })
  } catch (e: any) {
    console.error(`\tError getting bitstreams with bundle id: ${bundleId}`)
  }
}

export async function newBitstream(itemId: string, name: string, filePath: string) {
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
      const res: Types.Bundles = await dspaceApi.bundles.byItemId(itemId)
      const bundlesList: Types.Bundle[] = res._embedded.bundles
      const bundle: Types.Bundle = bundlesList.find(bundle => bundle.name === 'ORIGINAL')
      bundleId = bundle ? bundle.uuid : ''
    } catch (e: any) {
      console.error(`Error getting bundle ID: ${e.errorCode}`)
    }
    return bundleId
  }
}

export async function deleteBitstreams(bitstreamId: string) {
  try {
    await dspaceApi.bitstreams.deleteById(bitstreamId)
    console.log(`Bitstream deleted: ${bitstreamId}`)
  } catch (e: any) {
    console.error(`Delete bitstream (id: ${bitstreamId} failed: ${e.errorCode}`)
  }
}

export async function deleteBitstreamsMulti(payload: any) {
  try {
    await dspaceApi.bitstreams.batchUpdate(payload)
  } catch (e: any) {
    console.error(`Delete bitstream failed: ${e.errorCode}`)
  }
}

export async function deleteBitstreamsByItemId(itemId: string) {
  try {
    const res: Types.Bundles = await dspaceApi.bundles.byItemId(itemId)
    const bundlesList: Types.Bundle[] = res._embedded.bundles
    const bundles = bundlesList.filter(bundle => bundle.name !== 'LICENSE')
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
}

main()
