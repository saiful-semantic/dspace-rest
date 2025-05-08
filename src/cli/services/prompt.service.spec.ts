// import { strict as assert } from 'assert'
// import sinon from 'sinon'
// import { promptService } from './prompt.service'

// describe('CLI: Prompt Service', () => {
//   let promptsStub: sinon.SinonStub
//   let importStub: sinon.SinonStub
//   let processExitStub: sinon.SinonStub

//   beforeEach(() => {
//     promptsStub = sinon.stub().resolves({ value: 'test-value' })
//     importStub = sinon.stub()
//     importStub.resolves({ default: promptsStub })
//     // Patch dynamic import
//     (promptService as any)._prompts = null
//     ;(global as any).import = importStub
//     processExitStub = sinon.stub(process, 'exit')
//   })

//   afterEach(() => {
//     sinon.restore()
//     delete (global as any).import
//   })

//   it('should prompt for text and return value', async () => {
//     // Patch dynamic import for test
//     (promptService as any)._prompts = promptsStub
//     const value = await promptService.prompt('Enter value:')
//     assert.equal(value, 'test-value')
//     assert.ok(promptsStub.calledOnce)
//     const arg = promptsStub.firstCall.args[0]
//     assert.equal(arg.type, 'text')
//     assert.equal(arg.message, 'Enter value:')
//   })

//   it('should prompt for password and return value', async () => {
//     (promptService as any)._prompts = promptsStub
//     const value = await promptService.prompt('Enter password:', true)
//     assert.equal(value, 'test-value')
//     assert.ok(promptsStub.calledOnce)
//     const arg = promptsStub.firstCall.args[0]
//     assert.equal(arg.type, 'password')
//     assert.equal(arg.message, 'Enter password:')
//   })

//   it('should call process.exit if aborted', async () => {
//     (promptService as any)._prompts = (opts: any) => {
//       opts.onState({ aborted: true })
//       return Promise.resolve({ value: '' })
//     }
//     await promptService.prompt('Test abort')
//     // process.exit is called on nextTick, so we simulate it
//     process.nextTick(() => {
//       assert.ok(processExitStub.calledWith(1))
//     })
//   })
// })
