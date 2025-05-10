// ConfigStore will be initialized after dynamic import
import type ConfigStore from 'configstore'
let configStore: ConfigStore | undefined

export const initializeStore = async (): Promise<ConfigStore> => {
  if (!configStore) {
    const { default: ConfigStore } = await import('configstore')
    configStore = new ConfigStore('dspace-cli-auth')
  }
  return configStore
}

export const authStore = {
  get: <T = unknown>(key: string): T | undefined => configStore?.get(key) as T | undefined,
  set: (key: string, value: unknown): void => configStore?.set(key, value)
}
