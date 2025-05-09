#!/usr/bin/env node
import { Command } from 'commander'
import { initializeStore } from './utils/store'
import { fileOps } from './utils/file-ops'
import { authCommands } from './commands/auth'
import { configCommands } from './commands/config'
import { itemsCommands } from './commands/items'
import { bitstreamsCommands } from './commands/bitstreams'
import { collectionsCommands } from './commands/collections'
import { dspaceClient } from './services/dspace-client.service'

async function setupCommands(program: Command) {
  // Configuration Commands
  program
    .command('config:set <baseURL>')
    .description('Set the DSpace REST API URL')
    .action(configCommands.set)

  program
    .command('config:verify')
    .description('Verify DSpace REST API URL and update configuration')
    .action(configCommands.verify)

  program
    .command('config:show')
    .description('Show current configuration')
    .action(configCommands.show)

  // Core info
  program
    .command('server:info')
    .description('Show DSpace info')
    .action(async (): Promise<void> => {
      await dspaceClient.ensureAuth()
      const info = await dspaceClient.info()
      console.log(`DSpace Name: ${info.dspaceName}`)
      console.log(`DSpace Server: ${info.dspaceServer}`)
      console.log(`DSpace UI: ${info.dspaceUI}`)
      console.log(`DSpace Version: ${info.dspaceVersion}`)
    })

  // Authentication Commands
  program
    .command('login')
    .description('Store DSpace credentials securely')
    .option('-u, --username <username>', 'DSpace username')
    .option('-p, --password <password>', 'DSpace password')
    .action(authCommands.login)

  // Item Commands
  program
    .command('items:list')
    .description('List all items')
    .action(itemsCommands.handleItemsList)

  program
    .command('items:show <id>')
    .description('Show item details')
    .action(itemsCommands.handleItemsShow)

  program
    .command('items:update <id> <metadataJson>')
    .description('Update item metadata')
    .action(itemsCommands.handleItemsUpdate)

  program
    .command('items:move <itemId> <collectionId>')
    .description('Move item to another collection')
    .action(itemsCommands.handleItemsMove)

  // Bitstream Commands
  program
    .command('bitstreams:list <itemId> [type]')
    .description('List bitstreams for an item')
    .action(bitstreamsCommands.handleBitstreamsList)

  program
    .command('bitstreams:add <itemId> <name> <filePath>')
    .description('Add a new bitstream to an item')
    .action(bitstreamsCommands.handleBitstreamsAdd)

  program
    .command('bitstreams:delete <id>')
    .description('Delete a bitstream')
    .action(bitstreamsCommands.handleBitstreamsDelete)

  // Collection Commands
  program
    .command('collections:list')
    .description('List all collections')
    .action(collectionsCommands.handleCollectionsList)
}

async function main() {
  await initializeStore()

  const program = new Command()
  const packageJson = JSON.parse(
    fileOps.readFileSync(
      fileOps.joinPath(__dirname, '../../package.json'),
      'utf-8'
    )
  )

  program
    .name('dspace-cli')
    .description('DSpace REST API CLI Client')
    .version(packageJson.version, '-v, --version')

  await setupCommands(program)

  program.parse(process.argv)
  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
}
