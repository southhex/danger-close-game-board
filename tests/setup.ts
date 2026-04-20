import '@testing-library/jest-dom'

// Provide a working localStorage mock for environments where jsdom's
// built-in localStorage is broken (e.g. when Node passes --localstorage-file).
function makeLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
}

// Only install mock if the native localStorage is non-functional
try {
  localStorage.setItem('__test__', '1')
  localStorage.removeItem('__test__')
} catch {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeLocalStorageMock(),
    writable: true,
  })
}

// If localStorage.clear is not a function, replace it entirely
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeLocalStorageMock(),
    writable: true,
  })
}
