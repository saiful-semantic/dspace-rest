// Narrow the type to just a function
let _prompts: ((options: any) => Promise<any>) | null = null

export const promptService = {
  async prompt(message: string, isPassword = false): Promise<string> {
    _prompts = _prompts || (await import('prompts')).default

    const response = await _prompts({
      type: isPassword ? 'password' : 'text',
      name: 'value',
      message,
      validate: (value: string) => value.length > 0 || 'This field is required',
      onState: (state: any) => {
        if (state.aborted) {
          process.nextTick(() => process.exit(1))
        }
      }
    })
    return response.value
  },

  // Only for Tests: allow mocking with any compatible function
  __setPrompts(p: ((options: any) => Promise<any>) | null) {
    _prompts = p
  }
}
