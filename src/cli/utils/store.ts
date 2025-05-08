// ConfigStore will be initialized after dynamic import
let configStore: any

export const initializeStore = async () => {
  if (!configStore) {
    const { default: ConfigStore } = await import('configstore')
    configStore = new ConfigStore('dspace-cli-auth')
  }
  return configStore
}

export const authStore = {
  get: (key: string) => configStore?.get(key),
  set: (key: string, value: unknown) => configStore?.set(key, value)
}