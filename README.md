# DSpace Node
![main](https://github.com/semanticlib/dspace-rest/actions/workflows/node.js.yml/badge.svg)
[![NPM version](https://img.shields.io/npm/v/dspace-rest.svg)](https://npmjs.org/package/dspace-rest)
[![NPM downloads](https://img.shields.io/npm/dm/dspace-rest.svg)](https://npmjs.org/package/dspace-rest)

NodeJs client for DSpace 7+ [REST API](https://github.com/DSpace/RestContract)

## Installation

```bash
npm install dspace-rest
```
or
```bash
yarn add dspace-rest
```

## Example Usage

Example of some of the operations currently supported:

```js
import * as DSpace from 'dspace-rest'

(async () => {
  const baseUrl = '' // e.g., https://demo.dspace.org/server
  const user = ''
  const password = ''

  // Init and login
  DSpace.init(baseUrl)
  await DSpace.login(user, password)

  // Show list of top communities and its collections
  await DSpace.showCollections()

  // Add/delete collections
  const parentCommunityId = '5c1d0962-2a01-4563-9626-d14c964ca3ad'
  await DSpace.createCollection(parentCommunityId, 'Test Collection 2')
  const collectionId = 'e30cdb05-1909-4365-ab28-68d4534b174a'
  await DSpace.deleteCollection(collectionId)

  // Move item to another collection (change 'owningCollection')
  const itemId = '6641e0c5-10c7-4251-ba31-1d23f1bd2813'
  const targetCollection = 'dcbde2c8-b438-46e9-82ba-9e9e674aa3c5'
  await DSpace.moveItem(itemId, targetCollection)

  // Update item with any payload (from v1.0.9)
  await DSpace.updateItem(itemId, [
    {
      op: 'add',
      path: '/metadata/dspace.entity.type',
      value: [{ value: 'Publication' }]
    }
  ])

  // Get bundle details
  await DSpace.showItemBundles(itemId)
  await DSpace.showItemBundles(itemId, 'ORIGINAL')

  // Add/delete bitstreams
  const bitstreamId = '4478411f-b01f-490c-a16a-59e9c9c558d9'
  await DSpace.newBitstream(itemId, 'Test Item 1.pdf', 'C:/temp/files')
  await DSpace.deleteBitstreams(bitstreamId)
  await DSpace.deleteBitstreamsByItemId(itemId)  // in all bundles, except 'LICENSE'
})()


```

## Motivation and Use Cases

The motivation to write with example use cases are described here:
[Batch operations using DSpace 7 REST API](https://www.semanticconsulting.com/blog/batch-operations-using-dspace-7-rest-api)


## Features

- Show communities/subcommunities/collections
- Show items/bundles/bitstreams
- Add/delete communities/collections
- Move items between collections
- Add/delete bitstreams
- [Delete multiple bitstreams](https://github.com/DSpace/RestContract/blob/main/bitstreams.md#multiple-bitstreams-delete) (`deleteBitstreamsMulti`)

