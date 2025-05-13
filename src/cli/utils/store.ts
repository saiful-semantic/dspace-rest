// ConfigStore will be initialized after dynamic import
import type ConfigStore from 'configstore'
let configStore: ConfigStore | undefined

/**
 * @deprecated Use storageService.initialize instead. This function will be removed in a future version.
 */
export const initializeStore = async (): Promise<ConfigStore> => {
  console.warn(
    'DEPRECATED: initializeStore() is deprecated. Use storageService.initialize() instead.'
  )
  if (!configStore) {
    const { default: ConfigStore } = await import('configstore')
    configStore = new ConfigStore('dspace-cli-auth')
  }
  return configStore
}

/**
 * @deprecated Use storageService.auth instead. This object will be removed in a future version.
 */
export const authStore = {
  get: <T = unknown>(key: string): T | undefined => {
    console.warn(
      'DEPRECATED: authStore.get() is deprecated. Use storageService.auth.get() instead.'
    )
    return configStore?.get(key) as T | undefined
  },
  set: (key: string, value: unknown): void => {
    console.warn(
      'DEPRECATED: authStore.set() is deprecated. Use storageService.auth.set() instead.'
    )
    configStore?.set(key, value)
  }
}
