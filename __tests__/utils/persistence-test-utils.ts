import { StateStorage } from 'zustand/middleware'

// Mock storage for testing
export class MockStorage implements StateStorage {
  private storage = new Map<string, string>()

  getItem(name: string): string | null {
    return this.storage.get(name) || null
  }

  setItem(name: string, value: string): void {
    this.storage.set(name, value)
  }

  removeItem(name: string): void {
    this.storage.delete(name)
  }

  clear(): void {
    this.storage.clear()
  }
}

// Test storage configurations
export const testStorageConfigs = {
  userPreferences: new MockStorage(),
  formDrafts: new MockStorage(),
  uiState: new MockStorage(),
}
