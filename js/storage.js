/* ============================================================
   STORAGE MODULE
   LocalStorage persistence for foods, shopping list, history
============================================================ */

class StorageManager {
  constructor() {
    this.KEYS = {
      foods: 'sabor_foods',
      shopping: 'sabor_shopping_list',
      history: 'sabor_history',
      stats: 'sabor_stats',
      preferences: 'sabor_preferences'
    };
  }

  /* ===== FOODS ===== */
  loadFoods() {
    try {
      const data = localStorage.getItem(this.KEYS.foods);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading foods:', error);
      return [];
    }
  }

  saveFoods(foods) {
    try {
      localStorage.setItem(this.KEYS.foods, JSON.stringify(foods));
    } catch (error) {
      console.error('Error saving foods:', error);
    }
  }

  addFood(food) {
    const foods = this.loadFoods();
    foods.push({
      id: Date.now(),
      addedDate: new Date().toISOString(),
      ...food
    });
    this.saveFoods(foods);
    return foods;
  }

  removeFood(foodId) {
    let foods = this.loadFoods();
    foods = foods.filter(f => f.id !== foodId);
    this.saveFoods(foods);
    return foods;
  }

  updateFood(foodId, updates) {
    let foods = this.loadFoods();
    foods = foods.map(f => f.id === foodId ? { ...f, ...updates } : f);
    this.saveFoods(foods);
    return foods;
  }

  /* ===== SHOPPING LIST ===== */
  loadShoppingList() {
    try {
      const data = localStorage.getItem(this.KEYS.shopping);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading shopping list:', error);
      return [];
    }
  }

  saveShoppingList(list) {
    try {
      localStorage.setItem(this.KEYS.shopping, JSON.stringify(list));
    } catch (error) {
      console.error('Error saving shopping list:', error);
    }
  }

  addShoppingItem(item) {
    const list = this.loadShoppingList();
    list.push({
      id: Date.now(),
      name: item,
      bought: false,
      addedDate: new Date().toISOString()
    });
    this.saveShoppingList(list);
    return list;
  }

  toggleShoppingItem(itemId) {
    let list = this.loadShoppingList();
    list = list.map(item => 
      item.id === itemId ? { ...item, bought: !item.bought } : item
    );
    this.saveShoppingList(list);
    return list;
  }

  removeShoppingItem(itemId) {
    let list = this.loadShoppingList();
    list = list.filter(item => item.id !== itemId);
    this.saveShoppingList(list);
    return list;
  }

  clearShoppingList() {
    this.saveShoppingList([]);
  }

  /* ===== HISTORY ===== */
  loadHistory() {
    try {
      const data = localStorage.getItem(this.KEYS.history);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  saveHistory(history) {
    try {
      // Keep only last 100 entries
      const limited = history.slice(-100);
      localStorage.setItem(this.KEYS.history, JSON.stringify(limited));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  addHistoryEntry(entry) {
    const history = this.loadHistory();
    history.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    });
    this.saveHistory(history);
    return history;
  }

  /* ===== STATISTICS ===== */
  loadStats() {
    try {
      const data = localStorage.getItem(this.KEYS.stats);
      return data ? JSON.parse(data) : this.getDefaultStats();
    } catch (error) {
      console.error('Error loading stats:', error);
      return this.getDefaultStats();
    }
  }

  saveStats(stats) {
    try {
      localStorage.setItem(this.KEYS.stats, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }

  getDefaultStats() {
    return {
      consumed: 0,
      wasted: 0,
      saved: 0,
      economySaved: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  updateStats(updates) {
    const stats = this.loadStats();
    const updated = { ...stats, ...updates, lastUpdated: new Date().toISOString() };
    this.saveStats(updated);
    return updated;
  }

  /* ===== PREFERENCES ===== */
  loadPreferences() {
    try {
      const data = localStorage.getItem(this.KEYS.preferences);
      return data ? JSON.parse(data) : this.getDefaultPreferences();
    } catch (error) {
      console.error('Error loading preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  savePreferences(prefs) {
    try {
      localStorage.setItem(this.KEYS.preferences, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  getDefaultPreferences() {
    return {
      darkMode: false,
      language: 'pt-BR',
      notifications: true
    };
  }

  toggleDarkMode() {
    const prefs = this.loadPreferences();
    prefs.darkMode = !prefs.darkMode;
    this.savePreferences(prefs);
    return prefs.darkMode;
  }

  /* ===== UTILITY ===== */
  clearAllData() {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  exportData() {
    return {
      foods: this.loadFoods(),
      shopping: this.loadShoppingList(),
      history: this.loadHistory(),
      stats: this.loadStats(),
      preferences: this.loadPreferences(),
      exportDate: new Date().toISOString()
    };
  }

  importData(data) {
    try {
      if (data.foods) this.saveFoods(data.foods);
      if (data.shopping) this.saveShoppingList(data.shopping);
      if (data.history) this.saveHistory(data.history);
      if (data.stats) this.saveStats(data.stats);
      if (data.preferences) this.savePreferences(data.preferences);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Global instance
const storage = new StorageManager();

// Backward compatibility - export functions for old code
function loadFoods() { return storage.loadFoods(); }
function saveFoods(foods) { return storage.saveFoods(foods); }
function loadShoppingList() { return storage.loadShoppingList(); }
function saveShoppingList(list) { return storage.saveShoppingList(list); }
function loadHistory() { return storage.loadHistory(); }
function saveHistory(history) { return storage.saveHistory(history); }
