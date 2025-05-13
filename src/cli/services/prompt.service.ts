import prompts from 'prompts'

let _prompts: typeof prompts | null = null

// For testing purposes
export const __resetPromptsForTesting = (mockPrompts?: typeof prompts | null) => {
  _prompts = mockPrompts || null
}

export const promptService = {
  async prompt(message: string, isPassword = false): Promise<string> {
    if (!_prompts) {
      try {
        _prompts = (await import('prompts')).default
      } catch {
        // Fallback to the imported version if dynamic import fails
        _prompts = prompts
      }
    }

    const response = await _prompts({
      type: isPassword ? 'password' : 'text',
      name: 'value',
      message,
      validate: (value: string) => value.length > 0 || 'This field is required',
      onState: (state: { aborted: boolean }) => {
        if (state.aborted) {
          process.nextTick(() => process.exit(1))
        }
      }
    })
    return response.value as string
  }
}
