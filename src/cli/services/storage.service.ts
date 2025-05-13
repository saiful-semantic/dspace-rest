import { fileOps } from '../utils/file-ops'
import os from 'node:os'

// Noble crypto imports
import { gcm } from '@noble/ciphers/aes'
import { randomBytes } from '@noble/ciphers/webcrypto' // For IV and salt
import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha512 } from '@noble/hashes/sha2'
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils'

// General config interface
export interface Config {
  api_url?: string
  verified?: boolean
  serverInfo?: {
    dspaceUI?: string
    dspaceName?: string
    dspaceVersion?: string
    dspaceServer?: string
  }
}

// --- Configuration for General Settings (Non-Sensitive) ---
const CONFIG_DIR = fileOps.joinPath(os.homedir(), '.dspace')
const GENERAL_CONFIG_PATH = fileOps.joinPath(CONFIG_DIR, 'config.json')

// --- Configuration for Secure Auth Store ---
const SECURE_AUTH_STORE_PATH = fileOps.joinPath(CONFIG_DIR, 'auth-store.json')
const PBKDF2_ITERATIONS = 100000 // Standard recommendation
const KEY_LENGTH_BYTES = 32 // 256-bit key for AES-256
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12 // Standard for AES-GCM

interface EncryptedStoreFile {
  salt: string // hex
  iv: string // hex
  ciphertext: string // hex
}

// In-memory cache for the derived encryption key
let derivedEncryptionKey: Uint8Array | null = null

// --- Master Key Management (Simplified Placeholder) ---
// In a real CLI, this would involve prompting the user, secure input, etc.
function getMasterPasswordFromUser(): string {
  // IMPORTANT: Replace this with actual secure password input
  // For example, using a library like 'inquirer' or 'prompts' with type: 'password'
  console.warn('!!! USING HARDCODED MASTER PASSWORD - REPLACE IN PRODUCTION !!!')
  return 'super-secret-cli-master-password' // FIXME: NEVER DO THIS IN PRODUCTION
}

function ensureDerivedKey(salt?: Uint8Array): Uint8Array {
  if (derivedEncryptionKey) {
    return derivedEncryptionKey
  }

  const masterPassword = getMasterPasswordFromUser()
  const masterPasswordBytes = utf8ToBytes(masterPassword)

  if (!salt) {
    // This case should ideally only happen if the store file is corrupted or empty
    // For first-time setup, `loadOrCreateSecureStore` will generate and pass the salt
    throw new Error('Salt is required to derive the key but was not provided')
  }

  derivedEncryptionKey = pbkdf2(sha512, masterPasswordBytes, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH_BYTES
  })
  return derivedEncryptionKey
}

// --- Secure Store Helper Functions ---
async function loadOrCreateSecureStore(): Promise<{
  salt: Uint8Array
  data: Record<string, unknown>
}> {
  await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true }) // Ensure directory exists

  if (!fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
    // First time: create a new salt and empty data structure
    const salt = randomBytes(SALT_LENGTH_BYTES)
    const initialData = {}
    // Encrypt empty data to create the initial file structure
    const iv = randomBytes(IV_LENGTH_BYTES)
    // For initial setup, we need a dummy key or we need the user to set a password first.
    // Let's assume the first 'set' operation will trigger password setup and salt generation.
    // For loading, if the file doesn't exist, it implies no secrets are stored yet.
    return { salt, data: initialData }
  }

  try {
    const fileContent = await fileOps.readFileAsync(SECURE_AUTH_STORE_PATH, 'utf-8')
    const storeFile = JSON.parse(fileContent) as EncryptedStoreFile

    const salt = hexToBytes(storeFile.salt)
    const iv = hexToBytes(storeFile.iv)
    const ciphertext = hexToBytes(storeFile.ciphertext)

    const key = ensureDerivedKey(salt) // Pass the loaded salt
    // Pass the loaded salt
    const aesGcm = gcm(key, iv)
    const decryptedBytes = aesGcm.decrypt(ciphertext)
    const decryptedJsonString = bytesToUtf8(decryptedBytes)
    const data = JSON.parse(decryptedJsonString) as Record<string, unknown>

    return { salt, data }
  } catch (error) {
    console.error('Failed to load or decrypt secure store:', error)
    // This could be due to wrong password, corrupted file, etc.
    // In a real app, you might want to offer to reset the store or re-enter password
    throw new Error(
      'Could not load or decrypt secure auth store Check master password or file integrity'
    )
  }
}

async function saveSecureStore(salt: Uint8Array, data: Record<string, unknown>): Promise<void> {
  const key = ensureDerivedKey(salt) // Ensure key is derived using the correct salt
  // Ensure key is derived using the correct salt
  const iv = randomBytes(IV_LENGTH_BYTES)
  const plaintextJsonString = JSON.stringify(data)
  const plaintextBytes = utf8ToBytes(plaintextJsonString)

  const aesGcm = gcm(key, iv)
  const ciphertext = aesGcm.encrypt(plaintextBytes)

  const storeFile: EncryptedStoreFile = {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ciphertext)
  }

  await fileOps.writeFileAsync(SECURE_AUTH_STORE_PATH, JSON.stringify(storeFile, null, 2))
}

export const storageService = {
  // General config methods (non-sensitive)
  config: {
    load: async (): Promise<Config> => {
      try {
        if (!fileOps.existsSync(GENERAL_CONFIG_PATH)) {
          await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true })
          await fileOps.writeFileAsync(GENERAL_CONFIG_PATH, JSON.stringify({}, null, 2))
        }
        return JSON.parse(await fileOps.readFileAsync(GENERAL_CONFIG_PATH, 'utf-8')) as Config
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load config: ${errorMessage}`)
      }
    },

    save: async (config: Config): Promise<void> => {
      try {
        await fileOps.writeFileAsync(GENERAL_CONFIG_PATH, JSON.stringify(config, null, 2))
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to save config: ${errorMessage}`)
      }
    }
  },

  // Auth methods (secure storage using @noble/ciphers)
  auth: {
    get: async <T = unknown>(accountKey: string): Promise<T | undefined> => {
      if (!fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        return undefined // No store, no secret
      }
      try {
        const { data } = await loadOrCreateSecureStore()
        return data[accountKey] as T | undefined
      } catch (error) {
        // loadOrCreateSecureStore already logs and throws a more specific error
        // console.error(`Error getting secret for '${accountKey}':`, error)
        // Potentially clear the derived key if decryption failed due to wrong password
        derivedEncryptionKey = null
        throw error
      }
    },

    set: async (accountKey: string, value: unknown): Promise<void> => {
      let currentSalt: Uint8Array
      let currentData: Record<string, unknown>

      if (fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        // Load existing store to get salt and data
        const loaded = await loadOrCreateSecureStore()
        currentSalt = loaded.salt
        currentData = loaded.data
      } else {
        // First time setting a secret, generate a new salt
        currentSalt = randomBytes(SALT_LENGTH_BYTES)
        currentData = {}
        // The key will be derived when ensureDerivedKey is called in saveSecureStore,
        // using this new salt. The user will be prompted for a password then.
      }

      currentData[accountKey] = value
      await saveSecureStore(currentSalt, currentData)
    },

    delete: async (accountKey: string): Promise<boolean> => {
      if (!fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        return false // Nothing to delete
      }
      try {
        const { salt, data } = await loadOrCreateSecureStore()
        if (accountKey in data) {
          delete data[accountKey]
          await saveSecureStore(salt, data)
          return true
        }
        return false // Key not found
      } catch (error) {
        derivedEncryptionKey = null
        throw error
      }
    },

    // Utility to clear the cached derived key (e.g., on logout or password change)
    clearCachedKey: (): void => {
      derivedEncryptionKey = null
    },
    // Utility to check if master password seems to be set up (i.e., store exists)
    isMasterPasswordSetup: (): boolean => {
      return fileOps.existsSync(SECURE_AUTH_STORE_PATH)
    }
  }
}
