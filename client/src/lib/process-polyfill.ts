// Simple polyfill for the Node.js process object in browser environments
// This prevents "process is not defined" errors when using libraries that expect Node.js

// Only define the process object if it doesn't already exist
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {},
    // Add other process properties as needed by the googleapis library
    nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0),
    version: '',
    versions: { node: '16.0.0' },
    platform: 'browser',
    // Add stdout and stderr with isTTY property
    stdout: { isTTY: false },
    stderr: { isTTY: false }
  };
}

export {};