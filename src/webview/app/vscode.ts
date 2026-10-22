import { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages';

interface VsCodeApi {
  postMessage: (message: WebviewToHostMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeInstance: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeInstance) {
    if (typeof acquireVsCodeApi === 'function') {
      vscodeInstance = acquireVsCodeApi();
    } else {
      vscodeInstance = {
        postMessage: () => {},
        getState: () => ({}),
        setState: () => {}
      };
    }
  }
  return vscodeInstance;
}

export function subscribeToHostMessages(handler: (msg: HostToWebviewMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    const data = event.data as HostToWebviewMessage | undefined;
    if (data && typeof data.type === 'string') {
      handler(data);
    }
  };
  window.addEventListener('message', listener);
  return () => {
    window.removeEventListener('message', listener);
  };
}
