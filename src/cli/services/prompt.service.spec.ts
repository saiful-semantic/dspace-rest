import { strict as assert } from 'assert'
import sinon from 'sinon'
import { promptService, __resetPromptsForTesting } from './prompt.service'
import prompts from 'prompts'

describe('CLI: Prompt Service', () => {
  let promptsStub: sinon.SinonStub
  let processExitStub: sinon.SinonStub

  beforeEach(() => {
    // Reset sinon for each test
    sinon.restore()

    // Create a stub for the prompts library
    promptsStub = sinon.stub().resolves({ value: 'test-value' })

    // Add required properties to match typeof prompts interface
    const promptsWithInterface = Object.assign(promptsStub, {
      inject: prompts.inject,
      override: prompts.override,
      prompt: prompts.prompt,
      prompts: prompts.prompts
    }) as typeof prompts

    // Reset the prompts service with our stub
    __resetPromptsForTesting(promptsWithInterface)

    // Stub process.exit
    processExitStub = sinon.stub(process, 'exit')
  })

  afterEach(() => {
    sinon.restore()
    __resetPromptsForTesting() // Reset the prompts service
  })

  it('should prompt for text and return value', async () => {
    const value = await promptService.prompt('Enter value:')
    assert.equal(value, 'test-value')
    assert.ok(promptsStub.calledOnce)
    const arg = promptsStub.firstCall.args[0] as { type: string; message: string }
    assert.equal(arg.type, 'text')
    assert.equal(arg.message, 'Enter value:')
  })

  it('should prompt for password and return value', async () => {
    const value = await promptService.prompt('Enter password:', true)
    assert.equal(value, 'test-value')
    assert.ok(promptsStub.calledOnce)
    const arg = promptsStub.firstCall.args[0] as { type: string; message: string }
    assert.equal(arg.type, 'password')
    assert.equal(arg.message, 'Enter password:')
  })

  it('should call process.exit if aborted', async () => {
    // Create a custom prompts function that triggers the onState with aborted=true
    const abortingPrompt = sinon
      .stub()
      .callsFake((opts: { onState?: (state: { aborted: boolean }) => void }) => {
        if (opts.onState) {
          opts.onState({ aborted: true })
        }
        return Promise.resolve({ value: '' })
      }) as unknown as typeof prompts

    // Set our custom prompt function
    __resetPromptsForTesting(abortingPrompt)

    await promptService.prompt('Test abort')

    // Use a promise to wait for the next tick
    await new Promise((resolve) =>
      process.nextTick(() => {
        assert.ok(processExitStub.calledWith(1))
        resolve(true)
      })
    )
  })
})
