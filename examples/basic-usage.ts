/**
 * Example: Basic DSpace REST Client Usage
 * (This file is purely for documentation)
 */
// @ts-ignore
// Use import for ESM (add "type": "module" to package.json)
import { dspaceApi } from 'dspace-rest'
// Or for CommonJS:
// const { dspaceApi } = require('dspace-rest')

async function main() {
    dspaceApi.init('http://localhost:8080/server')

    dspaceApi.auth.login('admin', 'admin').then((loginResponse: boolean) => {
        if (loginResponse) {
            console.log('Login successful!')
        } else {
            console.log('Login failed')
        }
    })

    const info = await dspaceApi.core.info()
    console.log('------------\nServer Info\n------------')
    console.log('DSpace server Name:', info.dspaceName)
    console.log('DSpace server Version:', info.dspaceVersion)
    console.log('DSpace server UI URL:', info.dspaceUI)
    console.log('DSpace server API URL:', info.dspaceServer)
}

main()
