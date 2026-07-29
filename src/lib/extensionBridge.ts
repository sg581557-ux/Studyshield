import type { ExtensionMessage, ExtensionMessageType } from '../types';

const EXTENSION_SOURCE = 'studyshield-website';
const EXTENSION_TIMEOUT = 3000;
const HEARTBEAT_INTERVAL = 5000;

type MessageHandler = (message: ExtensionMessage) => void;

class ExtensionBridge {
  private listeners = new Set<MessageHandler>();
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatHandler: (() => void) | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.messageListener = this.handleWindowMessage.bind(this);
      window.addEventListener('message', this.messageListener);
    }
  }

  private handleWindowMessage(event: MessageEvent) {
    if (event.source !== window) return;
    const message = event.data as ExtensionMessage;
    if (!message || !message.type || message.source !== 'studyshield-extension') return;

    const pending = this.pendingRequests.get(message.type);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(message.type);
      pending.resolve(message.payload);
    }

    this.listeners.forEach((handler) => handler(message));
  }

  send<T = unknown>(type: ExtensionMessageType, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const message: ExtensionMessage = { type, source: EXTENSION_SOURCE, payload };
      const timer = setTimeout(() => {
        this.pendingRequests.delete(type);
        reject(new Error(`Extension did not respond to ${type}`));
      }, EXTENSION_TIMEOUT);
      this.pendingRequests.set(type, { resolve: resolve as (v: unknown) => void, reject, timer });
      window.postMessage(message, '*');
    });
  }

  sendNoWait(type: ExtensionMessageType, payload?: unknown): void {
    const message: ExtensionMessage = { type, source: EXTENSION_SOURCE, payload };
    window.postMessage(message, '*');
  }

  onMessage(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => { this.listeners.delete(handler); };
  }

  startHeartbeat(onConnected: () => void, onDisconnected: () => void): void {
    this.stopHeartbeat();
    this.heartbeatHandler = async () => {
      try {
        await this.send('SS_HEARTBEAT');
        onConnected();
      } catch {
        onDisconnected();
      }
    };
    this.heartbeatHandler();
    this.heartbeatTimer = setInterval(this.heartbeatHandler, HEARTBEAT_INTERVAL);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    this.heartbeatHandler = null;
  }

  destroy(): void {
    this.stopHeartbeat();
    this.listeners.clear();
    if (this.messageListener && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageListener);
    }
  }
}

export const extensionBridge = new ExtensionBridge();
