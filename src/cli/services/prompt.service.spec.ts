import { strict as assert } from 'assert'
import sinon from 'sinon'
import { promptService } from './prompt.service'

describe('CLI: Prompt Service', () => {
  let promptsStub: sinon.SinonStub
  let processExitStub: sinon.SinonStub

  beforeEach(() => {
    promptsStub = sinon.stub().resolves({ value: 'test-value' })
    promptService.__setPrompts(promptsStub)
    processExitStub = sinon.stub(process, 'exit')
  })

  afterEach(() => {
    sinon.restore()
    promptService.__setPrompts(null)
  })

  it('should prompt for text and return value', async () => {
    const value = await promptService.prompt('Enter value:')
    assert.equal(value, 'test-value')
    assert.ok(promptsStub.calledOnce)
    const arg = promptsStub.firstCall.args[0]
    assert.equal(arg.type, 'text')
    assert.equal(arg.message, 'Enter value:')
  })

  it('should prompt for password and return value', async () => {
    const value = await promptService.prompt('Enter password:', true)
    assert.equal(value, 'test-value')
    assert.ok(promptsStub.calledOnce)
    const arg = promptsStub.firstCall.args[0]
    assert.equal(arg.type, 'password')
    assert.equal(arg.message, 'Enter password:')
  })

  it('should call process.exit if aborted', async () => {
    const fakePrompt = (opts: any) => {
      opts.onState({ aborted: true })
      return Promise.resolve({ value: '' })
    }
    promptService.__setPrompts(fakePrompt)

    await promptService.prompt('Test abort')

    await new Promise((resolve) => {
      process.nextTick(() => {
        assert.ok(processExitStub.calledWith(1))
        resolve(null)
      })
    })
  })
})
