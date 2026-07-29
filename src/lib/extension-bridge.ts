// Extension bridge: real chrome.runtime messaging between the React dashboard
// and the StudyShield Chrome extension. No mocks, no placeholders.

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'not-installed'
  | 'disabled'
  | 'disconnected'

export interface ExtensionState {
  status: ConnectionStatus
  version: string | null
  sessionActive: boolean
  remainingTime: number
  totalDuration: number
  strictMode: boolean
  blocklist: string[]
}

export type MessageType =
  | 'PING'
  | 'PONG'
  | 'GET_STATUS'
  | 'STATUS'
  | 'START_SESSION'
  | 'STOP_SESSION'
  | 'SESSION_STARTED'
  | 'SESSION_STOPPED'
  | 'SESSION_FINISHED'
  | 'TIMER_UPDATE'
  | 'UPDATE_BLOCKLIST'
  | 'UPDATE_STRICT_MODE'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'

export interface ExtMessage {
  type: MessageType
  payload?: Record<string, unknown>
}

export interface StatusPayload {
  version: string
  sessionActive: boolean
  remainingTime: number
  totalDuration: number
  strictMode: boolean
  blocklist: string[]
}

// The extension ID is set at build time via Vite env, or auto-detected.
// For unpacked extensions, the content script injects a data attribute
// on <html> with the extension ID.
const ENV_EXT_ID = import.meta.env.VITE_EXTENSION_ID as string | undefined

function getExtensionId(): string | null {
  if (ENV_EXT_ID) return ENV_EXT_ID
  const w = window as unknown as { __STUDYSHIELD_EXT_ID__?: string }
  return w.__STUDYSHIELD_EXT_ID__ ?? null
}

function sendMessage(msg: ExtMessage, timeout = 3000): Promise<ExtMessage | null> {
  return new Promise((resolve) => {
    const extId = getExtensionId()
    if (!extId) {
      resolve(null)
      return
    }
    const timer = setTimeout(() => resolve(null), timeout)
    try {
      chrome.runtime.sendMessage(extId, msg, (response) => {
        clearTimeout(timer)
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response as ExtMessage | null)
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

export async function pingExtension(): Promise<string | null> {
  const res = await sendMessage({ type: 'PING' }, 3000)
  if (res?.type === 'PONG') {
    return (res.payload?.version as string) ?? 'unknown'
  }
  return null
}

export async function getStatus(): Promise<StatusPayload | null> {
  const res = await sendMessage({ type: 'GET_STATUS' }, 3000)
  if (res?.type === 'STATUS' && res.payload) {
    return res.payload as unknown as StatusPayload
  }
  return null
}

export async function startSession(durationMin: number): Promise<boolean> {
  const res = await sendMessage({ type: 'START_SESSION', payload: { durationMin } }, 3000)
  return res?.type === 'SESSION_STARTED'
}

export async function stopSession(): Promise<boolean> {
  const res = await sendMessage({ type: 'STOP_SESSION' }, 3000)
  return res?.type === 'SESSION_STOPPED'
}

export async function updateBlocklist(sites: string[]): Promise<boolean> {
  const res = await sendMessage({ type: 'UPDATE_BLOCKLIST', payload: { sites } }, 3000)
  return res?.type === 'STATUS'
}

export async function updateStrictMode(enabled: boolean): Promise<boolean> {
  const res = await sendMessage({ type: 'UPDATE_STRICT_MODE', payload: { enabled } }, 3000)
  return res?.type === 'STATUS'
}

export type MessageListener = (msg: ExtMessage) => void

export function addMessageListener(listener: MessageListener): () => void {
  const handler = (message: ExtMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: ExtMessage) => void) => {
    listener(message)
    sendResponse({ type: 'PONG' })
    return true
  }
  chrome.runtime.onMessage.addListener(handler)
  return () => chrome.runtime.onMessage.removeListener(handler)
}
