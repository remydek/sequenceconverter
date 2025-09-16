/**
 * Test setup configuration
 * Sets up global test environment and mocks
 */

// Mock global objects
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
global.FileReader = class {
  readAsArrayBuffer = jest.fn();
  result: any = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  constructor() {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) {
        this.onload.call(this, {} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
} as any;

// Mock File and Blob
global.File = class extends Blob {
  name: string;
  lastModified: number;

  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, options);
    this.name = name;
    this.lastModified = Date.now();
  }
} as any;

// Mock FFmpeg
global.window = global.window || {};
(global.window as any).FFmpeg = {
  createFFmpeg: jest.fn(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
    run: jest.fn().mockResolvedValue(undefined),
    FS: jest.fn((method: string, ...args: any[]) => {
      if (method === 'readFile') {
        return new Uint8Array([0, 1, 2, 3]);
      }
      return undefined;
    }),
    exit: jest.fn(),
    setProgress: jest.fn(),
    setLogger: jest.fn()
  })),
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]))
};

// Mock Supabase
(global.window as any).supabase = {
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
};

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    jsHeapSizeLimit: 2147483648,
    totalJSHeapSize: 10485760,
    usedJSHeapSize: 5242880
  },
  writable: true
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
};

// Mock Worker
global.Worker = class {
  postMessage = jest.fn();
  terminate = jest.fn();
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;

  constructor(scriptURL: string | URL, options?: WorkerOptions) {}
} as any;

// Mock SharedArrayBuffer (may not be available in test environment)
if (typeof SharedArrayBuffer === 'undefined') {
  global.SharedArrayBuffer = class SharedArrayBuffer {
    byteLength: number;

    constructor(length: number) {
      this.byteLength = length;
    }

    slice(begin?: number, end?: number): SharedArrayBuffer {
      return new SharedArrayBuffer(this.byteLength);
    }
  } as any;
}

// Console spy setup for tests
beforeEach(() => {
  jest.clearAllMocks();

  // Clear any previous console spies
  if (jest.isMockFunction(console.log)) {
    (console.log as jest.MockedFunction<typeof console.log>).mockClear();
  }
  if (jest.isMockFunction(console.error)) {
    (console.error as jest.MockedFunction<typeof console.error>).mockClear();
  }
  if (jest.isMockFunction(console.warn)) {
    (console.warn as jest.MockedFunction<typeof console.warn>).mockClear();
  }
});

afterEach(() => {
  // Clean up any global state
  document.body.innerHTML = '';

  // Clear timers
  jest.clearAllTimers();

  // Reset fetch mock
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
});

// Custom matchers
expect.extend({
  toBeValidFile(received: File) {
    const pass = received instanceof File && received.name && received.size >= 0;
    return {
      message: () => `expected ${received} to be a valid File object`,
      pass
    };
  },

  toHaveValidProcessingOptions(received: any) {
    const requiredProps = ['fps', 'codec', 'quality', 'outputFormat'];
    const pass = requiredProps.every(prop => prop in received);
    return {
      message: () => `expected ${received} to have valid processing options`,
      pass
    };
  }
});

// Type extensions for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidFile(): R;
      toHaveValidProcessingOptions(): R;
    }
  }
}