#!/usr/bin/env node
import { Command } from 'commander'
import { fileOps } from './utils/file-ops'
import { authCommands } from './commands/auth'
import { configCommands } from './commands/config'
import { itemsCommands } from './commands/items'
import { bitstreamsCommands } from './commands/bitstreams'
import { collectionsCommands } from './commands/collections'

function setupCommands(program: Command) {
  // Configuration Commands
  program
    .command('config:set <REST_API_URL>')
    .description('Set the DSpace REST API URL')
    .action((value: string) => configCommands.set(value))

  program
    .command('config:reset')
    .description('Reset the configuration')
    .action(() => configCommands.reset())

  program
    .command('config:verify')
    .description('Verify DSpace REST API URL and update configuration')
    .action(() => configCommands.verify())

  program
    .command('config:show')
    .description('Show current configuration')
    .action(() => configCommands.show())

  // Authentication Commands
  program
    .command('login')
    .description('Store DSpace credentials securely')
    .action(() => authCommands.login())

  // Item Commands
  program
    .command('items:list')
    .description('List all items')
    .action(() => itemsCommands.handleItemsList())

  program
    .command('items:show <id>')
    .description('Show item details')
    .action((value: string) => itemsCommands.handleItemsShow(value))

  program
    .command('items:update <id> <metadataJson>')
    .description('Update item metadata')
    .action(() => itemsCommands.handleItemsUpdate())
  // TODO: Fix unsafe assignment of payload
  // .action((id: string, metadataJson: string) => itemsCommands.handleItemsUpdate(id, metadataJson))

  program
    .command('items:move <itemId> <collectionId>')
    .description('Move item to another collection')
    .action((itemId: string, collectionId: string) =>
      itemsCommands.handleItemsMove(itemId, collectionId)
    )

  // Bitstream Commands
  program
    .command('bitstreams:list <itemId> [type]')
    .description('List bitstreams for an item')
    .action((itemId: string, type?: string) =>
      bitstreamsCommands.handleBitstreamsList(itemId, type)
    )

  program
    .command('bitstreams:add <itemId> <name> <filePath>')
    .description('Add a new bitstream to an item')
    .action((itemId: string, name: string, filePath: string) =>
      bitstreamsCommands.handleBitstreamsAdd(itemId, name, filePath)
    )

  program
    .command('bitstreams:delete <id>')
    .description('Delete a bitstream')
    .action((id: string) => bitstreamsCommands.handleBitstreamsDelete(id))

  // Collection Commands
  program
    .command('collections:list')
    .description('List all collections')
    .action(() => collectionsCommands.handleCollectionsList())
}

function main(): void {
  const program = new Command()
  const packageJson = JSON.parse(
    fileOps.readFileSync(fileOps.joinPath(__dirname, '../../package.json'), 'utf-8')
  ) as { version: string }

  program
    .name('dspace-cli')
    .description('DSpace REST API CLI Client')
    .version(`v${packageJson.version}`, '-v, --version')

  setupCommands(program)

  program.parse(process.argv)
  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
}

if (require.main === module) {
  try {
    main()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('❌ Error:', errorMessage)
    process.exit(1)
  }
}
