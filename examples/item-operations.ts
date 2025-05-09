/**
 * Example: DSpace REST Client Usage for Item Operations
 * (This file is purely for documentation)
 */
// @ts-ignore
// Use import for ESM (add "type": "module" to package.json)
import { dspaceApi } from 'dspace-rest'

async function main() {
    dspaceApi.init('http://localhost:8080/server')
    
    dspaceApi.auth.login('admin', 'admin').then(async (loginResponse: string) => {
        if (loginResponse === 'login success') {
            await showAllItems()
        }
    })
}

async function showAllItems() {
    try {
        const res = await dspaceApi.items.all()
        const itemList = res._embedded.items
        let count = 0
        for (const item of itemList) {
            console.log(`${++count}. Title: ${item.name} (handle: ${item.handle})`)
            console.log(`    ${item._links.self.href}`)
        }
    } catch (e: any) {
        console.error(`Error getting item: ${e.errorCode}`)
    }
}

async function showItem(itemId: string) {
    try {
        const item = await dspaceApi.items.byId(itemId)
        console.log(`${item.name} (handle: ${item.handle}, id: ${item.uuid})`)
        console.log(`URL: ${item._links.self.href}`)
    } catch (e: any) {
        console.error(`Error getting item with id: ${itemId}`)
    }
}

async function updateItem(itemId: string, payload: {}) {
    try {
        const item = await dspaceApi.items.update(itemId, payload)
        console.log(`${item.name} (handle: ${item.handle}, id: ${item.uuid}) updated`)
    } catch (e: any) {
        console.error(`Error updating item with id: ${itemId}`)
    }
}

async function moveItem(itemId: string, colId: string) {
    try {
        await dspaceApi.items.move(itemId, colId)
        console.log(`Item moved to collection: ${colId}`)
    } catch (e: any) {
        console.error(`Item move failed for itemId: ${itemId}`)
    }
}

main()
