/**
 * Example: DSpace REST Client Usage for Collections Operations
 * (This file is purely for documentation)
 */
// @ts-ignore
// Use import for ESM (add "type": "module" to package.json)
import { dspaceApi, Payload } from 'dspace-rest'

async function main() {
    dspaceApi.init('http://localhost:8080/server')
    
    dspaceApi.auth.login('admin', 'admin').then(async (loginResponse: string) => {
        if (loginResponse === 'login success') {
            await showCollections()
        }
    })
}

export async function createCollection(comId: string, name: string) {
    try {
        await dspaceApi.collections.create(comId, Payload.Collection(name))
        console.log(`Collection created: ${name}`)
    } catch (e: any) {
        console.error(`Create collection failed: ${e.errorCode}`)
    }
}

export async function showCollections() {
    try {
        const res = await dspaceApi.communities.top()
        const commList = res._embedded.communities
        console.log('----------------\nTop Communities\n----------------')
        for (const comm of commList) {
            console.log(`${comm.name} (id: ${comm.uuid})`)
            // console.log(comm._links.self.href)

            const res2 = await dspaceApi.collections.byComId(comm.uuid)
            const colList = res2._embedded.collections
            if (colList.length) {
                console.log('\t=> Collections')
                colList.forEach(col => {
                    console.log(`\t${col.name} (id: ${col.uuid})`)
                    // console.log(`\t${col._links.self.href}`)
                })
            }
        }
    } catch (e) {
        console.error('Error in getting collections')
    }
}

export async function deleteCollection(colId: string) {
    try {
        await dspaceApi.collections.deleteById(colId)
        console.log(`Collection deleted: ${colId}`)
    } catch (e: any) {
        console.error(`Delete collection failed: ${e.errorCode}`)
    }
}

main()
