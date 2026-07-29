// StudyShield Background Service Worker (Manifest V3)
const EXT_VERSION = '1.0.0'
const STORAGE_KEY = 'studyshield_state'

const DEFAULT_STATE = {
  sessionActive: false, remainingTime: 0, totalDuration: 0, endTime: 0,
  strictMode: false, version: 1,
}

async function getState() {
  const r = await chrome.storage.local.get(STORAGE_KEY)
  return r[STORAGE_KEY] || { ...DEFAULT_STATE }
}
async function setState(updates) {
  const next = { ...(await getState()), ...updates }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
  return next
}

let timerInterval = null

async function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(async () => {
    const state = await getState()
    if (!state.sessionActive) { clearInterval(timerInterval); timerInterval = null; return }
    const remaining = Math.max(0, Math.round((state.endTime - Date.now()) / 1000))
    if (remaining <= 0) {
      await setState({ sessionActive: false, remainingTime: 0, totalDuration: 0, endTime: 0 })
      clearInterval(timerInterval); timerInterval = null
      chrome.alarms.clear('ss_timer')
      broadcastToDashboard({ type: 'SESSION_FINISHED' })
    } else {
      await setState({ remainingTime: remaining })
      broadcastToDashboard({ type: 'TIMER_UPDATE', payload: { remainingTime: remaining } })
    }
  }, 1000)
  chrome.alarms.create('ss_timer', { periodInMinutes: 0.5 })
}

async function broadcastToDashboard(message) {
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {})
    }
  } catch {}
}

function handleIncomingMessage(message, _sender, sendResponse) {
  if (!message || !message.type) { sendResponse({ type: 'PONG', payload: { version: EXT_VERSION } }); return }
  switch (message.type) {
    case 'PING': sendResponse({ type: 'PONG', payload: { version: EXT_VERSION } }); return
    case 'GET_STATUS':
      getState().then(s => sendResponse({ type: 'STATUS', payload: { version: EXT_VERSION, sessionActive: s.sessionActive, remainingTime: s.remainingTime, totalDuration: s.totalDuration, strictMode: s.strictMode } }))
      return
    case 'START_SESSION': {
      const dur = (message.payload?.durationMin || 25) * 60
      setState({ sessionActive: true, remainingTime: dur, totalDuration: dur, endTime: Date.now() + dur * 1000 }).then(() => {
        startTimer().then(() => {
          sendResponse({ type: 'SESSION_STARTED' })
          broadcastToDashboard({ type: 'SESSION_STARTED' })
        })
      })
      return
    }
    case 'STOP_SESSION':
      getState().then(s => {
        if (s.strictMode) { sendResponse({ type: 'ERROR', payload: { message: 'Strict mode is enabled' } }); return }
        setState({ sessionActive: false, remainingTime: 0, totalDuration: 0, endTime: 0 }).then(() => {
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
          chrome.alarms.clear('ss_timer')
          sendResponse({ type: 'SESSION_STOPPED' })
          broadcastToDashboard({ type: 'SESSION_STOPPED' })
        })
      })
      return
    case 'UPDATE_STRICT_MODE':
      setState({ strictMode: message.payload?.enabled ?? false }).then(() => {
        getState().then(ns => sendResponse({ type: 'STATUS', payload: { version: EXT_VERSION, sessionActive: ns.sessionActive, remainingTime: ns.remainingTime, totalDuration: ns.totalDuration, strictMode: ns.strictMode } }))
      })
      return
    default: sendResponse({ type: 'PONG', payload: { version: EXT_VERSION } })
  }
}

chrome.runtime.onMessage.addListener((m, s, r) => { handleIncomingMessage(m, s, r); return true })
chrome.runtime.onMessageExternal.addListener((m, s, r) => { handleIncomingMessage(m, s, r); return true })

async function restoreSession() {
  const s = await getState()
  if (s.sessionActive && s.endTime > 0) {
    const remaining = Math.round((s.endTime - Date.now()) / 1000)
    if (remaining > 0) { await setState({ remainingTime: remaining }); await startTimer() }
    else await setState({ sessionActive: false, remainingTime: 0, totalDuration: 0, endTime: 0 })
  }
}
chrome.runtime.onStartup.addListener(restoreSession)
chrome.runtime.onInstalled.addListener(restoreSession)

chrome.alarms.onAlarm.addListener(async () => {
  const s = await getState()
  if (!s.sessionActive) return
  const remaining = Math.max(0, Math.round((s.endTime - Date.now()) / 1000))
  if (remaining <= 0) {
    await setState({ sessionActive: false, remainingTime: 0, totalDuration: 0, endTime: 0 })
    chrome.alarms.clear('ss_timer')
    broadcastToDashboard({ type: 'SESSION_FINISHED' })
  } else {
    await setState({ remainingTime: remaining })
    broadcastToDashboard({ type: 'TIMER_UPDATE', payload: { remainingTime: remaining } })
  }
})
