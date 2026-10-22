import React, { useEffect, useState } from 'react';

interface VsCodeApi {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VsCodeApi;

export function App(): React.ReactElement {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ type: 'ready' });
    } catch {
      setInitialized(true);
    }

    const handleMessage = (event: MessageEvent): void => {
      const data = event.data as Record<string, unknown> | undefined;
      if (data?.type === 'init') {
        setInitialized(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="p-4" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
      <div className="Subhead">
        <h2 className="Subhead-heading">Local Actions</h2>
        <div className="Subhead-description">
          {initialized ? 'Actions Page ready.' : 'Connecting to extension...'}
        </div>
      </div>
    </div>
  );
}
