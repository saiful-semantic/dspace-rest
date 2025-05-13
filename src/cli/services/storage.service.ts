import { fileOps } from '../utils/file-ops'
import os from 'node:os'

// Noble crypto imports
import { gcm } from '@noble/ciphers/aes'
import { randomBytes } from '@noble/ciphers/webcrypto' // For IV and salt
import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha512 } from '@noble/hashes/sha2'
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils'
import { promptService } from './prompt.service'

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
const SECURE_AUTH_STORE_PATH = fileOps.joinPath(CONFIG_DIR, 'auth-store.json')
const SESSION_KEY_PATH = fileOps.joinPath(CONFIG_DIR, '.session_key') // For disk-cached derived key

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH_BYTES = 32
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12

interface EncryptedStoreFile {
  salt: string // hex
  iv: string // hex
  ciphertext: string // hex
}

interface SessionKeyCache {
  keyHex: string
  expiresAt: string // ISO timestamp string
}

// --- Cache Durations (in milliseconds) ---
const CACHE_DURATIONS_MS = {
  NONE: 0, // Do not cache to disk
  HOUR: 60 * 60 * 1000,
  EIGHT_HOURS: 8 * 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
} as const

const CACHE_DURATION_OPTIONS_MAP: Record<string, number> = {
  '1': CACHE_DURATIONS_MS.NONE, // Default: No disk cache
  '2': CACHE_DURATIONS_MS.HOUR,
  '3': CACHE_DURATIONS_MS.EIGHT_HOURS,
  '4': CACHE_DURATIONS_MS.DAY
}
const CACHE_DURATION_PROMPT_TEXT = `
Cache the master key to avoid re-entering your password for future CLI sessions?
This is convenient but less secure as the key will be stored temporarily on disk.
Choose caching duration by typing the corresponding number:
  1. Do not cache (most secure, password needed next time)
  2. Cache for 1 hour
  3. Cache for 8 hours
  4. Cache for 1 day
Enter choice (1-4). Invalid entry defaults to 'Do not cache': `

// In-memory cache for the derived encryption key
let derivedEncryptionKey: Uint8Array | null = null
// Flag to prevent multiple disk cache reads/checks in the same CLI process execution
let diskCacheLoadAttemptedThisProcess = false

// --- Master Key Management & Caching ---

async function tryLoadKeyFromDiskCache(): Promise<boolean> {
  if (!fileOps.existsSync(SESSION_KEY_PATH)) {
    return false // No cache file
  }

  try {
    const content = await fileOps.readFileAsync(SESSION_KEY_PATH, 'utf-8')
    const cachedData = JSON.parse(content) as SessionKeyCache

    if (cachedData.keyHex && cachedData.expiresAt) {
      if (new Date(cachedData.expiresAt).getTime() > Date.now()) {
        derivedEncryptionKey = hexToBytes(cachedData.keyHex)
        // console.info(`INFO: Using master key cached on disk (valid until ${new Date(cachedData.expiresAt).toLocaleString()}).`)
        return true // Key loaded successfully
      } else {
        // console.info('INFO: Master key disk cache has expired. Deleting.')
        await fileOps.unlinkAsync(SESSION_KEY_PATH).catch(() => {}) // Delete expired key
      }
    }
  } catch {
    // console.warn('WARN: Could not read or parse session key disk cache. Deleting if it exists.', err)
    if (fileOps.existsSync(SESSION_KEY_PATH)) {
      await fileOps.unlinkAsync(SESSION_KEY_PATH).catch(() => {})
    }
  }
  return false // Key not loaded or expired/invalid
}

async function persistKeyToDiskCache(key: Uint8Array, durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    // "Do not cache" or invalid duration
    if (fileOps.existsSync(SESSION_KEY_PATH)) {
      try {
        await fileOps.unlinkAsync(SESSION_KEY_PATH)
        // console.info('INFO: Existing master key disk cache cleared as per user preference.')
      } catch {
        /* ignore */
      }
    }
    return
  }

  const expiresAt = new Date(Date.now() + durationMs).toISOString()
  const cacheData: SessionKeyCache = { keyHex: bytesToHex(key), expiresAt }
  try {
    await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true })
    await fileOps.writeFileAsync(SESSION_KEY_PATH, JSON.stringify(cacheData), { mode: 0o600 }) // Set strict permissions
    console.info(
      `INFO: Master key has been cached to disk. It will expire around ${new Date(expiresAt).toLocaleString()}.`
    )
    console.warn(
      'SECURITY WARNING: For convenience, the derived encryption key is temporarily stored on disk. Ensure your system and user account are secure. This cache will be cleared upon expiry or if you use the "login:reset" command or similar credential clearing operations.'
    )
  } catch (err) {
    console.error('ERROR: Could not save master key to disk cache.', err)
  }
}

async function deriveKeyFromPasswordAndPromptCache(
  salt: Uint8Array,
  isFirstTimeStoreSetup: boolean
): Promise<Uint8Array> {
  let masterPasswordInput: string
  if (isFirstTimeStoreSetup) {
    console.log('🔒 Secure store setup: This is the first time you are saving sensitive data.')
    console.log('Please set a master password to encrypt and protect your stored credentials.')
    while (true) {
      const pass1 = await promptService.prompt('Enter new master password:', true)
      if (!pass1) throw new Error('Master password setup cancelled: password cannot be empty.')
      const pass2 = await promptService.prompt('Confirm master password:', true)
      if (!pass2 && pass1)
        throw new Error('Master password setup cancelled: confirmation was not provided.')
      if (pass1 === pass2) {
        masterPasswordInput = pass1
        break
      } else {
        console.error('Passwords do not match. Please try again.')
      }
    }
    console.log('Master password set. Your secure store will now be created.')
  } else {
    const pass = await promptService.prompt('Enter master password to unlock secure store:', true)
    if (!pass) {
      throw new Error('Master password entry cancelled or empty.')
    }
    masterPasswordInput = pass
  }

  const masterPasswordBytes = utf8ToBytes(masterPasswordInput)
  const key = pbkdf2(sha512, masterPasswordBytes, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH_BYTES
  })

  // Key successfully derived. Cache it in memory for current process.
  derivedEncryptionKey = key

  // Ask user about disk caching for future CLI sessions
  const choiceStr = await promptService.prompt(CACHE_DURATION_PROMPT_TEXT)
  const selectedDurationMs = CACHE_DURATION_OPTIONS_MAP[choiceStr] ?? CACHE_DURATIONS_MS.NONE

  await persistKeyToDiskCache(key, selectedDurationMs)
  return key
}

// Ensures a master key is available, trying memory, then disk, then prompting user.
async function ensureMasterKeyIsAvailable(
  saltForDerivation: Uint8Array,
  isFirstTimeStoreSetup: boolean
): Promise<Uint8Array> {
  if (derivedEncryptionKey) {
    return derivedEncryptionKey // Use in-memory key
  }

  if (!diskCacheLoadAttemptedThisProcess) {
    diskCacheLoadAttemptedThisProcess = true // Mark that we are attempting now
    if (await tryLoadKeyFromDiskCache()) {
      if (derivedEncryptionKey) return derivedEncryptionKey // Use disk-cached key
    }
  }

  // If we reach here, no valid cached key. Need to derive from password.
  return deriveKeyFromPasswordAndPromptCache(saltForDerivation, isFirstTimeStoreSetup)
}

// --- Secure Store Helper Functions ---
async function loadSecureStoreContents(): Promise<{
  salt: Uint8Array
  iv: Uint8Array // Return IV as well for potential re-use if needed, though GCM usually generates new IVs
  ciphertext: Uint8Array
}> {
  const fileContent = await fileOps.readFileAsync(SECURE_AUTH_STORE_PATH, 'utf-8')
  const storeFile = JSON.parse(fileContent) as EncryptedStoreFile
  return {
    salt: hexToBytes(storeFile.salt),
    iv: hexToBytes(storeFile.iv),
    ciphertext: hexToBytes(storeFile.ciphertext)
  }
}

async function decryptData(
  salt: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  isFirstTimeKeyDerivation: boolean // This typically should be false for decryption
): Promise<Record<string, unknown>> {
  try {
    const key = await ensureMasterKeyIsAvailable(salt, isFirstTimeKeyDerivation)
    const aesGcm = gcm(key, iv)
    const decryptedBytes = aesGcm.decrypt(ciphertext)
    const decryptedJsonString = bytesToUtf8(decryptedBytes)
    return JSON.parse(decryptedJsonString) as Record<string, unknown>
  } catch (error) {
    // Decryption failed, clear any key (memory/disk) as it might be wrong
    await storageService.auth.clearCachedKey() // This will also clear disk cache
    console.error('Failed to decrypt secure store:', error)
    throw new Error(
      'Could not decrypt secure auth store. Check master password or file integrity. Any cached master key has been cleared.'
    )
  }
}

async function encryptAndSaveData(
  salt: Uint8Array,
  data: Record<string, unknown>,
  isFirstTimeStoreCreation: boolean // True if creating auth-store.json for the first time
): Promise<void> {
  // This determines if deriveKeyFromPasswordAndPromptCache prompts for "new" or "existing" password
  const key = await ensureMasterKeyIsAvailable(salt, isFirstTimeStoreCreation)

  const iv = randomBytes(IV_LENGTH_BYTES) // Always use a fresh IV for new encryption
  const plaintextJsonString = JSON.stringify(data)
  const plaintextBytes = utf8ToBytes(plaintextJsonString)

  const aesGcm = gcm(key, iv)
  const ciphertext = aesGcm.encrypt(plaintextBytes)

  const storeFile: EncryptedStoreFile = {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ciphertext)
  }
  await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true }) // Ensure directory exists
  await fileOps.writeFileAsync(SECURE_AUTH_STORE_PATH, JSON.stringify(storeFile, null, 2))
}

export const storageService = {
  // General config methods (non-sensitive) - remain the same
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
        await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true })
        await fileOps.writeFileAsync(GENERAL_CONFIG_PATH, JSON.stringify(config, null, 2))
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to save config: ${errorMessage}`)
      }
    }
  },

  // Auth methods (secure storage)
  auth: {
    get: async <T = unknown>(accountKey: string): Promise<T | undefined> => {
      if (!fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        return undefined
      }
      const { salt, iv, ciphertext } = await loadSecureStoreContents()
      // For get, it's never a "first time store setup" for key derivation
      const data = await decryptData(salt, iv, ciphertext, false)
      return data[accountKey] as T | undefined
      // Error already logged by decryptData, which also clears keys.
    },

    set: async (accountKey: string, value: unknown): Promise<void> => {
      let currentSalt: Uint8Array
      let currentData: Record<string, unknown> = {}
      let isFirstTimeStoreCreation = false

      await fileOps.mkdirAsync(CONFIG_DIR, { recursive: true }) // Ensure dir exists for all ops

      if (fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        try {
          const { salt, iv, ciphertext } = await loadSecureStoreContents()
          // For set on existing store, it's not "first time store setup" for key derivation
          const existingData = await decryptData(salt, iv, ciphertext, false)
          currentSalt = salt
          currentData = existingData
        } catch (error) {
          // If loading/decrypting fails, we might be in a state where user wants to reset/overwrite.
          // However, prompting for new password if old one fails is complex.
          // For now, rethrow. User might need to login_reset or fix password.
          console.error(
            'Failed to load existing secure store before setting new value. Please check master password or reset credentials if needed.'
          )
          throw error
        }
      } else {
        // First time setting a secret, store does not exist.
        currentSalt = randomBytes(SALT_LENGTH_BYTES)
        isFirstTimeStoreCreation = true // Signal for master password setup flow
      }

      currentData[accountKey] = value
      await encryptAndSaveData(currentSalt, currentData, isFirstTimeStoreCreation)
    },

    delete: async (accountKey: string): Promise<boolean> => {
      if (!fileOps.existsSync(SECURE_AUTH_STORE_PATH)) {
        return false
      }
      const { salt, iv, ciphertext } = await loadSecureStoreContents()
      // For delete, it's not "first time store setup" for key derivation
      const data = await decryptData(salt, iv, ciphertext, false)
      if (accountKey in data) {
        delete data[accountKey]
        // Not a "first time store creation" when saving after delete
        await encryptAndSaveData(salt, data, false)
        return true
      }
      return false
    },

    clearCachedKey: async (): Promise<void> => {
      // Made async due to fileOps
      derivedEncryptionKey = null
      diskCacheLoadAttemptedThisProcess = false // Allow re-check on next op in same process
      if (fileOps.existsSync(SESSION_KEY_PATH)) {
        try {
          await fileOps.unlinkAsync(SESSION_KEY_PATH)
          // console.info('INFO: Master key disk cache cleared.')
        } catch (e) {
          console.warn('WARN: Could not delete master key disk cache file.', e)
        }
      }
    },
    isMasterPasswordSetup: (): boolean => {
      return fileOps.existsSync(SECURE_AUTH_STORE_PATH)
    }
  }
}
