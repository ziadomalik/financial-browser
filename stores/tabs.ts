import { defineStore } from 'pinia'

export interface Tab {
  id: string
  title: string
  content: any // This could be more specific based on your needs
  active: boolean
}

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as Tab[],
    activeTabId: '' as string
  }),
  
  getters: {
    activeTab: (state) => state.tabs.find(tab => tab.id === state.activeTabId),
    
    activeTabIndex: (state) => 
      state.tabs.findIndex(tab => tab.id === state.activeTabId),
  },
  
  actions: {
    addTab(title: string = 'New Tab', content: any = {}) {
      const id = `tab-${Date.now()}`
      
      // Deactivate all other tabs
      this.tabs.forEach(tab => tab.active = false)
      
      // Add new tab
      this.tabs.push({
        id,
        title,
        content,
        active: true
      })
      
      this.activeTabId = id
      
      return id
    },
    
    closeTab(tabId: string) {
      const index = this.tabs.findIndex(tab => tab.id === tabId)
      if (index === -1) return

      // Don't allow closing the last tab
      if (this.tabs.length === 1) return

      const wasActive = this.tabs[index].active

      // Remove the tab
      this.tabs.splice(index, 1)

      // If the closed tab was active, activate another tab
      if (wasActive) {
        // Activate the tab to the left or the first tab if it was the first one
        const newActiveIndex = Math.max(0, index - 1)
        this.activeTabId = this.tabs[newActiveIndex].id
        this.tabs[newActiveIndex].active = true
      }
    },
    
    setActiveTab(tabId: string) {
      // Deactivate all tabs
      this.tabs.forEach(tab => tab.active = false)
      
      // Activate the selected tab
      const tab = this.tabs.find(tab => tab.id === tabId)
      if (tab) {
        tab.active = true
        this.activeTabId = tabId
      }
    },
    
    updateTabContent(tabId: string, content: any) {
      const tab = this.tabs.find(tab => tab.id === tabId)
      if (tab) tab.content = content
    },
    
    updateTabTitle(tabId: string, title: string) {
      const tab = this.tabs.find(tab => tab.id === tabId)
      if (tab) tab.title = title
    },
    
    // Initialize store with at least one tab
    initialize() {
      if (this.tabs.length === 0) {
        this.addTab()
      }
    }
  }
})
