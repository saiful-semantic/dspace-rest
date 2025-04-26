# DSpace REST API Client

![main](https://github.com/semanticlib/dspace-rest/actions/workflows/node.js.yml/badge.svg)
[![NPM version](https://img.shields.io/npm/v/dspace-rest.svg)](https://npmjs.org/package/dspace-rest)
[![NPM downloads](https://img.shields.io/npm/dm/dspace-rest.svg)](https://npmjs.org/package/dspace-rest)

NodeJs client for DSpace 7+ [REST API](https://github.com/DSpace/RestContract)

**Note: This is a successor of [dspace7-node](https://github.com/semanticlib/dspace7-node)**

## Requirements

- Node.js >= 18.0.0
- DSpace 7.x or newer

## Installation

```bash
npm install dspace-rest
```
or
```bash
yarn add dspace-rest
```

## Example Usage

The library provides both CommonJS and ES Module builds. Here are some examples:

```typescript
import * as DSpace from 'dspace-rest'
// Or for CommonJS:
// const DSpace = require('dspace-rest')

async function main() {
  try {
    const baseUrl = 'https://demo.dspace.org/server'
    const user = 'admin@example.com'
    const password = 'password'

    // Init and login
    DSpace.init(baseUrl)
    const loginResult = await DSpace.login(user, password)
    if (loginResult !== 'login success') {
      throw new Error('Login failed')
    }

    // Show list of top communities and collections
    await DSpace.showCollections()

    // Create and delete collections
    const parentCommunityId = '5c1d0962-2a01-4563-9626-d14c964ca3ad' 
    await DSpace.createCollection(parentCommunityId, 'Test Collection')
    
    // Work with items
    const itemId = '6641e0c5-10c7-4251-ba31-1d23f1bd2813'
    
    // Update item metadata
    await DSpace.updateItem(itemId, [
      {
        op: 'add',
        path: '/metadata/dc.title',
        value: [{ value: 'Updated Title' }]
      }
    ])

    // Move item to another collection
    const targetCollectionId = 'dcbde2c8-b438-46e9-82ba-9e9e674aa3c5'
    await DSpace.moveItem(itemId, targetCollectionId)

    // Manage bitstreams
    await DSpace.showItemBundles(itemId, 'ORIGINAL')
    await DSpace.newBitstream(itemId, 'document.pdf', './files')
    
    // Batch delete bitstreams
    await DSpace.deleteBitstreamsByItemId(itemId) // Deletes all except LICENSE bundle

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
```

## TypeScript Support

The library includes TypeScript definitions. Key types:

```typescript
interface DspaceEntity {
  id: string
  uuid: string
  name: string
  handle: string
  metadata: {
    [key: string]: [{
      value: string | number | Date
      language: string
      authority: string
      confidence: number
      place: number
    }]
  }
}

interface Item extends DspaceEntity {
  type: 'item'
  inArchive: boolean
  discoverable: boolean
  withdrawn: boolean
  lastModified: Date
}
```

## Features

- Authentication and session management
- Communities and Collections
  - List/search communities and subcommunities
  - Create and delete collections
  - Retrieve collection metadata
- Items
  - Search and retrieve items
  - Update item metadata
  - Move items between collections
- Bundles
  - List bundles by item
  - Get bundle details
- Bitstreams
  - Upload new bitstreams
  - Delete single or multiple bitstreams
  - Delete all bitstreams from an item
  - Support for ORIGINAL and LICENSE bundles

## Development

### Running Tests

```bash
npm test
```

Tests cover all major functionality including:
- Authentication flows
- Community/Collection operations  
- Item management
- Bundle operations
- Bitstream CRUD operations

## Motivation and Use Cases

The motivation and example use cases are described here:
[Batch operations using DSpace 7 REST API](https://www.semanticconsulting.com/blog/batch-operations-using-dspace-7-rest-api)
