/**
 * Storage Module
 * 
 * Handles all data persistence using IndexedDB with localStorage fallback
 * This module provides an abstraction layer for data storage
 */

const StorageManager = (function() {
    // Database configuration
    const DB_NAME = 'ElectricityBillCalculator';
    const DB_VERSION = 1;
    const STORES = {
        READINGS: 'readings',
        SETTINGS: 'settings',
        METERS: 'meters'
    };
    
    // Local variables
    let db = null;
    let isUsingFallback = false;
    
    /**
     * Initialize the database connection
     * @returns {Promise} Resolves when database is ready
     */
    function init() {
        return new Promise((resolve, reject) => {
            // Check if IndexedDB is supported
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, falling back to localStorage');
                isUsingFallback = true;
                setupLocalStorageFallback();
                resolve();
                return;
            }
            
            // Open database connection
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                isUsingFallback = true;
                setupLocalStorageFallback();
                resolve();
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database connection established');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.READINGS)) {
                    const readingsStore = db.createObjectStore(STORES.READINGS, { keyPath: 'id', autoIncrement: true });
                    readingsStore.createIndex('date', 'date', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains(STORES.METERS)) {
                    db.createObjectStore(STORES.METERS, { keyPath: 'id' });
                }
                
                console.log('Database schema updated');
            };
        });
    }
    
    /**
     * Set up localStorage fallback mechanism
     * Creates empty structures if they don't exist
     */
    function setupLocalStorageFallback() {
        if (!localStorage.getItem(STORES.READINGS)) {
            localStorage.setItem(STORES.READINGS, JSON.stringify([]));
        }
        
        if (!localStorage.getItem(STORES.SETTINGS)) {
            localStorage.setItem(STORES.SETTINGS, JSON.stringify({}));
        }
        
        if (!localStorage.getItem(STORES.METERS)) {
            localStorage.setItem(STORES.METERS, JSON.stringify([]));
        }
    }
    
    /**
     * Save a reading to the database
     * @param {Object} reading The reading data to save
     * @returns {Promise} Resolves with the saved reading (including generated ID)
     */
    function saveReading(reading) {
        // Ensure reading has a timestamp if not provided
        if (!reading.timestamp) {
            reading.timestamp = new Date().getTime();
        }
        
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const readings = JSON.parse(localStorage.getItem(STORES.READINGS));
                reading.id = Date.now(); // Generate a unique ID
                readings.push(reading);
                localStorage.setItem(STORES.READINGS, JSON.stringify(readings));
                resolve(reading);
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.READINGS], 'readwrite');
            const store = transaction.objectStore(STORES.READINGS);
            const request = store.add(reading);
            
            request.onsuccess = (event) => {
                // Get the ID of the newly added reading
                reading.id = event.target.result;
                resolve(reading);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get all readings from the database
     * @returns {Promise} Resolves with an array of readings
     */
    function getAllReadings() {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const readings = JSON.parse(localStorage.getItem(STORES.READINGS));
                resolve(readings);
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.READINGS], 'readonly');
            const store = transaction.objectStore(STORES.READINGS);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get readings within a date range
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise} Resolves with an array of readings
     */
    function getReadingsByDateRange(startDate, endDate) {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const readings = JSON.parse(localStorage.getItem(STORES.READINGS));
                const filteredReadings = readings.filter((reading) => {
                    const readingDate = new Date(reading.date);
                    return readingDate >= startDate && readingDate <= endDate;
                });
                resolve(filteredReadings);
            });
        }
        
        return new Promise((resolve, reject) => {
            getAllReadings()
                .then((readings) => {
                    const filteredReadings = readings.filter((reading) => {
                        const readingDate = new Date(reading.date);
                        return readingDate >= startDate && readingDate <= endDate;
                    });
                    resolve(filteredReadings);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
    
    /**
     * Get the most recent reading
     * @returns {Promise} Resolves with the most recent reading or null if none exists
     */
    function getMostRecentReading() {
        return getAllReadings()
            .then((readings) => {
                if (readings.length === 0) {
                    return null;
                }
                
                // Sort readings by date (newest first)
                readings.sort((a, b) => {
                    return new Date(b.date) - new Date(a.date);
                });
                
                return readings[0];
            });
    }
    
    /**
     * Delete a reading by ID
     * @param {number} id The ID of the reading to delete
     * @returns {Promise} Resolves when the reading is deleted
     */
    function deleteReading(id) {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const readings = JSON.parse(localStorage.getItem(STORES.READINGS));
                const updatedReadings = readings.filter((reading) => reading.id !== id);
                localStorage.setItem(STORES.READINGS, JSON.stringify(updatedReadings));
                resolve();
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.READINGS], 'readwrite');
            const store = transaction.objectStore(STORES.READINGS);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Save a setting
     * @param {string} key The setting key
     * @param {any} value The setting value
     * @returns {Promise} Resolves when the setting is saved
     */
    function saveSetting(key, value) {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const settings = JSON.parse(localStorage.getItem(STORES.SETTINGS));
                settings[key] = value;
                localStorage.setItem(STORES.SETTINGS, JSON.stringify(settings));
                resolve();
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get a setting by key
     * @param {string} key The setting key
     * @param {any} defaultValue Default value if setting doesn't exist
     * @returns {Promise} Resolves with the setting value or defaultValue if not found
     */
    function getSetting(key, defaultValue = null) {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const settings = JSON.parse(localStorage.getItem(STORES.SETTINGS));
                resolve(settings[key] !== undefined ? settings[key] : defaultValue);
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.value);
                } else {
                    resolve(defaultValue);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Save meter configuration
     * @param {Object} meter The meter configuration
     * @returns {Promise} Resolves when the meter is saved
     */
    function saveMeter(meter) {
        if (!meter.id) {
            meter.id = Date.now().toString();
        }
        
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const meters = JSON.parse(localStorage.getItem(STORES.METERS));
                const existingIndex = meters.findIndex(m => m.id === meter.id);
                
                if (existingIndex >= 0) {
                    meters[existingIndex] = meter;
                } else {
                    meters.push(meter);
                }
                
                localStorage.setItem(STORES.METERS, JSON.stringify(meters));
                resolve(meter);
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.METERS], 'readwrite');
            const store = transaction.objectStore(STORES.METERS);
            const request = store.put(meter);
            
            request.onsuccess = () => {
                resolve(meter);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get all meters
     * @returns {Promise} Resolves with an array of meters
     */
    function getAllMeters() {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const meters = JSON.parse(localStorage.getItem(STORES.METERS));
                resolve(meters);
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.METERS], 'readonly');
            const store = transaction.objectStore(STORES.METERS);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Delete a meter by ID
     * @param {string} id The ID of the meter to delete
     * @returns {Promise} Resolves when the meter is deleted
     */
    function deleteMeter(id) {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                const meters = JSON.parse(localStorage.getItem(STORES.METERS));
                const updatedMeters = meters.filter((meter) => meter.id !== id);
                localStorage.setItem(STORES.METERS, JSON.stringify(updatedMeters));
                resolve();
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.METERS], 'readwrite');
            const store = transaction.objectStore(STORES.METERS);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Clear all data
     * @returns {Promise} Resolves when all data is cleared
     */
    function clearAllData() {
        if (isUsingFallback) {
            return new Promise((resolve) => {
                localStorage.removeItem(STORES.READINGS);
                localStorage.removeItem(STORES.SETTINGS);
                localStorage.removeItem(STORES.METERS);
                setupLocalStorageFallback();
                resolve();
            });
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.READINGS, STORES.SETTINGS, STORES.METERS], 'readwrite');
            
            let completedStores = 0;
            const totalStores = 3;
            
            transaction.oncomplete = () => {
                resolve();
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
            
            const clearStore = (storeName) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    completedStores++;
                    if (completedStores === totalStores) {
                        resolve();
                    }
                };
            };
            
            clearStore(STORES.READINGS);
            clearStore(STORES.SETTINGS);
            clearStore(STORES.METERS);
        });
    }
    
    /**
     * Export all data
     * @returns {Promise} Resolves with all data as a JSON object
     */
    function exportData() {
        return Promise.all([
            getAllReadings(),
            getAllMeters(),
            (async () => {
                const settings = {};
                // Get common settings
                settings.darkMode = await getSetting('darkMode', false);
                settings.defaultRatePerKwh = await getSetting('defaultRatePerKwh', 28);
                settings.defaultStandingCharge = await getSetting('defaultStandingCharge', 140);
                settings.propertyName = await getSetting('propertyName', 'My Property');
                settings.propertyAddress = await getSetting('propertyAddress', '');
                settings.roundedValues = await getSetting('roundedValues', true);
                
                return settings;
            })()
        ]).then(([readings, meters, settings]) => {
            return {
                version: 1,
                exportDate: new Date().toISOString(),
                readings,
                meters,
                settings
            };
        });
    }
    
    /**
     * Import data
     * @param {Object} data The data to import
     * @returns {Promise} Resolves when the import is complete
     */
    function importData(data) {
        if (!data || !data.version || !data.readings) {
            return Promise.reject(new Error('Invalid data format'));
        }
        
        return clearAllData()
            .then(() => {
                const promises = [];
                
                // Import readings
                if (data.readings && Array.isArray(data.readings)) {
                    data.readings.forEach((reading) => {
                        promises.push(saveReading(reading));
                    });
                }
                
                // Import meters
                if (data.meters && Array.isArray(data.meters)) {
                    data.meters.forEach((meter) => {
                        promises.push(saveMeter(meter));
                    });
                }
                
                // Import settings
                if (data.settings) {
                    for (const [key, value] of Object.entries(data.settings)) {
                        promises.push(saveSetting(key, value));
                    }
                }
                
                return Promise.all(promises);
            });
    }
    
    /**
     * Calculate storage usage
     * @returns {Promise} Resolves with storage usage in bytes
     */
    function getStorageUsage() {
        if (isUsingFallback) {
            let totalSize = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += (localStorage[key].length + key.length) * 2; // UTF-16 uses 2 bytes per character
                }
            }
            return Promise.resolve(totalSize);
        }
        
        return exportData()
            .then((data) => {
                const jsonString = JSON.stringify(data);
                return new Blob([jsonString]).size;
            });
    }
    
    // Public API
    return {
        init,
        saveReading,
        getAllReadings,
        getReadingsByDateRange,
        getMostRecentReading,
        deleteReading,
        saveSetting,
        getSetting,
        saveMeter,
        getAllMeters,
        deleteMeter,
        clearAllData,
        exportData,
        importData,
        getStorageUsage,
        isUsingFallback: () => isUsingFallback
    };
})();