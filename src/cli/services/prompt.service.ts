import prompts from 'prompts'

let _prompts: typeof prompts | null = null

export const promptService = {
  async prompt(message: string, isPassword = false): Promise<string> {
    _prompts = _prompts || (await import('prompts')).default

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
