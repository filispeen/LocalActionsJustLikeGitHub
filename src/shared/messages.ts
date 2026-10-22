export type HostToWebviewMessage =
  | { type: 'init' };

export type WebviewToHostMessage =
  | { type: 'ready' };
