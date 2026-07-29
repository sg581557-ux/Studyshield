// StudyShield Content Script
const extId = chrome.runtime.id
document.documentElement.setAttribute('data-studyshield-ext-id', extId)
;(function() {
  const s = document.createElement('script')
  s.textContent = 'window.__STUDYSHIELD_EXT_ID__=' + JSON.stringify(extId) + ';'
  ;(document.head || document.documentElement).appendChild(s)
  s.remove()
})()
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  window.dispatchEvent(new CustomEvent('studyshield-message', { detail: message }))
  sendResponse({ type: 'OK' })
  return true
})
window.addEventListener('studyshield-heartbeat', () => {
  chrome.runtime.sendMessage({ type: 'HEARTBEAT' }).catch(() => {})
})
