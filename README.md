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

## Example Usage

See the [examples directory](https://github.com/semanticlib/dspace-rest/tree/main/examples) for practical usage examples of this library.

```typescript
// Use import for ESM (add "type": "module" to package.json)
import { dspaceApi } from 'dspace-rest'
// Or for CommonJS:
// const { dspaceApi } = require('dspace-rest')

// Initialize client
dspaceApi.init('http://localhost:8080/server')

dspaceApi.core.info().then((info) => {
  console.log(info)
})

dspaceApi.auth.login('admin@example.edu', 'password').then((result) => {
  console.log(result)
})

dspaceApi.communities.top().then((communities) => {
  const communityList = topCommunitiesResponse._embedded.communities
  communityList.forEach((community) => {
    console.log(community.name)
  })
})

// More examples:
// https://github.com/semanticlib/dspace-rest/tree/main/examples
```

## CLI Usage

The package provides a command-line interface (CLI) for interacting with DSpace servers directly from your terminal.

### CLI Setup

The CLI is available as `dspace-cli`. You can run it in a few ways:

1.  **Using `npx` without prior installation (recommended for quick use or one-off commands):**
    This command will temporarily download the `dspace-rest` package (if not already cached) and then execute `dspace-cli`.
    ```bash
    npx -p dspace-rest dspace-cli --help
    ```

2.  **If `dspace-rest` is a dependency in your project:**
    After running `npm install dspace-rest` or `yarn add dspace-rest` in your project:
    ```bash
    npx dspace-cli --help
    ```

3.  **If `dspace-rest` is installed globally:**
    After running `npm install -g dspace-rest`:
    ```bash
    dspace-cli --help
    ```

### Configuration

Before using most commands, set your DSpace server URL and login credentials:

```bash
dspace-cli config:set baseURL https://demo.dspace.org/server
dspace-cli login
```

### Common Commands

- Server Information:
  ```bash
  dspace-cli server:info
  ```
- List all items:
  ```bash
  dspace-cli items:list
  ```
- Show item details:
  ```bash
  dspace-cli items:show <itemId>
  ```
- Update item metadata:
  ```bash
  dspace-cli items:update <itemId> '[{"op":"add","path":"/metadata/dc.title","value":[{"value":"New Title"}]}]'
  ```
- List all collections:
  ```bash
  dspace-cli collections:list
  ```
- Add a bitstream to an item:
  ```bash
  dspace-cli bitstreams:add <itemId> <filename> <filePath>
  ```
- Delete a bitstream:
  ```bash
  dspace-cli bitstreams:delete <bitstreamId>
  ```
- Move an item to another collection:
  ```bash
  dspace-cli items:move <itemId> <collectionId>
  ```

### More

Run `dspace-cli --help` or any subcommand with `--help` for a full list of available commands and options.

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

## Motivation and Use Cases

The motivation and example use cases are described here:
[Batch operations using DSpace 7 REST API](https://www.semanticconsulting.com/blog/batch-operations-using-dspace-7-rest-api)
