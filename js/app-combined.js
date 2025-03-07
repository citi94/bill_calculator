/**
 * Combined JavaScript file for Electricity Bill Calculator
 * This file contains all modules in the correct loading order
 */

// ====== VALIDATION MODULE ======
const BillValidator = (function() {
    /**
     * Validates a date string in DD-MM-YYYY format
     * @param {string} dateStr Date string to validate
     * @returns {Object} Validation result
     */
    function validateDateFormat(dateStr) {
        const result = { isValid: false, message: '', date: null };
        
        if (!dateStr) {
            result.message = 'Date is required';
            return result;
        }
        
        // Check format using regex (DD-MM-YYYY)
        const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
        if (!regex.test(dateStr)) {
            result.message = 'Date must be in DD-MM-YYYY format';
            return result;
        }
        
        // Parse the date
        const parts = dateStr.split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
        const year = parseInt(parts[2], 10);
        
        // Create date object and check if it's valid
        const date = new Date(year, month, day);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            result.message = 'Invalid date (e.g., February 31)';
            return result;
        }
        
        // Check if date is in the future
        if (date > new Date()) {
            result.message = 'Date cannot be in the future';
            return result;
        }
        
        result.isValid = true;
        result.date = date;
        return result;
    }
    
    /**
     * Validates date range (current > previous)
     * @param {Date} prevDate Previous date
     * @param {Date} currDate Current date
     * @returns {Object} Validation result
     */
    function validateDateRange(prevDate, currDate) {
        const result = { isValid: false, message: '', daysDifference: 0 };
        
        if (currDate <= prevDate) {
            result.message = 'Current date must be after previous date';
            return result;
        }
        
        // Calculate days difference
        const diffTime = Math.abs(currDate - prevDate);
        const daysDifference = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Sanity check: readings shouldn't be more than 1 year apart
        if (daysDifference > 366) {
            result.message = 'Warning: Readings are more than a year apart';
        }
        
        result.isValid = true;
        result.daysDifference = daysDifference;
        return result;
    }
    
    /**
     * Validates a meter reading
     * @param {string|number} reading Reading to validate
     * @returns {Object} Validation result
     */
    function validateMeterReading(reading) {
        const result = { isValid: false, message: '', value: null };
        
        if (reading === '' || reading === null || reading === undefined) {
            result.message = 'Reading is required';
            return result;
        }
        
        const numericValue = parseFloat(reading);
        
        if (isNaN(numericValue)) {
            result.message = 'Reading must be a number';
            return result;
        }
        
        if (numericValue < 0) {
            result.message = 'Reading cannot be negative';
            return result;
        }
        
        // Arbitrary upper limit as a sanity check
        if (numericValue > 1000000) {
            result.message = 'Reading appears too large';
            return result;
        }
        
        result.isValid = true;
        result.value = numericValue;
        return result;
    }
    
    /**
     * Validates reading progression (current > previous)
     * @param {number} prevReading Previous reading
     * @param {number} currReading Current reading
     * @returns {Object} Validation result
     */
    function validateReadingProgression(prevReading, currReading) {
        const result = { isValid: false, message: '', difference: 0 };
        
        if (currReading < prevReading) {
            result.message = 'Current reading must be higher than previous reading';
            return result;
        }
        
        // Calculate difference
        const difference = currReading - prevReading;
        
        // Sanity check: usage shouldn't be unrealistically high
        // Assuming 100 kWh per day as an extreme case for a property
        // A typical UK household uses ~8-10 kWh per day
        const daysDifference = Math.ceil(Math.abs(new Date() - new Date()) / (1000 * 60 * 60 * 24)) || 30; // Default to 30 if dates not available
        const maxExpectedUsage = daysDifference * 100;
        
        if (difference > maxExpectedUsage) {
            result.message = 'Warning: Usage appears unusually high';
        }
        
        result.isValid = true;
        result.difference = difference;
        return result;
    }
    
    /**
     * Validates sub-meter readings against main meter
     * @param {number} mainReading Main meter reading
     * @param {Array<number>} subReadings Array of sub-meter readings
     * @returns {Object} Validation result
     */
    function validateSubMeters(mainReading, subReadings) {
        const result = { isValid: false, message: '' };
        
        // Calculate total of sub-meter readings
        const subTotal = subReadings.reduce((sum, reading) => sum + reading, 0);
        
        if (subTotal > mainReading) {
            result.message = 'Sub-meter total cannot exceed main meter reading';
            return result;
        }
        
        result.isValid = true;
        return result;
    }
    
    /**
     * Validates rate value
     * @param {string|number} rate Rate to validate
     * @returns {Object} Validation result
     */
    function validateRate(rate) {
        const result = { isValid: false, message: '', value: null };
        
        if (rate === '' || rate === null || rate === undefined) {
            result.message = 'Rate is required';
            return result;
        }
        
        const numericValue = parseFloat(rate);
        
        if (isNaN(numericValue)) {
            result.message = 'Rate must be a number';
            return result;
        }
        
        if (numericValue <= 0) {
            result.message = 'Rate must be greater than zero';
            return result;
        }
        
        // Sanity check for UK electricity rates (in pence)
        // As of 2025, rates typically range from 15-50 pence per kWh
        if (numericValue > 100) {
            result.message = 'Warning: Rate appears unusually high';
        }
        
        result.isValid = true;
        result.value = numericValue;
        return result;
    }
    
    /**
     * Validates a complete set of readings
     * @param {Object} data Object containing all reading data
     * @returns {Object} Validation result with detailed errors
     */
    function validateReadingSet(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Validate dates
        const prevDateResult = validateDateFormat(data.prevDate);
        const currDateResult = validateDateFormat(data.currDate);
        
        if (!prevDateResult.isValid) {
            result.isValid = false;
            result.errors.push(`Previous date: ${prevDateResult.message}`);
        }
        
        if (!currDateResult.isValid) {
            result.isValid = false;
            result.errors.push(`Current date: ${currDateResult.message}`);
        }
        
        // Validate date range if both dates are valid
        if (prevDateResult.isValid && currDateResult.isValid) {
            const dateRangeResult = validateDateRange(prevDateResult.date, currDateResult.date);
            
            if (!dateRangeResult.isValid) {
                result.isValid = false;
                result.errors.push(dateRangeResult.message);
            } else if (dateRangeResult.message) {
                // This is a warning, not an error
                result.warnings.push(dateRangeResult.message);
            }
            
            // Store days difference for later use
            result.daysDifference = dateRangeResult.daysDifference;
        }
        
        // Validate main meter readings
        const prevMainResult = validateMeterReading(data.prevMain);
        const currMainResult = validateMeterReading(data.currMain);
        
        if (!prevMainResult.isValid) {
            result.isValid = false;
            result.errors.push(`Previous main meter: ${prevMainResult.message}`);
        }
        
        if (!currMainResult.isValid) {
            result.isValid = false;
            result.errors.push(`Current main meter: ${currMainResult.message}`);
        }
        
        // Validate main meter progression if both readings are valid
        if (prevMainResult.isValid && currMainResult.isValid) {
            const mainProgressionResult = validateReadingProgression(
                prevMainResult.value, 
                currMainResult.value
            );
            
            if (!mainProgressionResult.isValid) {
                result.isValid = false;
                result.errors.push(mainProgressionResult.message);
            } else if (mainProgressionResult.message) {
                // This is a warning, not an error
                result.warnings.push(mainProgressionResult.message);
            }
            
            // Store main usage for later use
            result.mainUsage = mainProgressionResult.difference;
        }
        
        // Validate sub-meter readings
        const subResults = {
            prev: [],
            curr: []
        };
        
        for (let i = 0; i < data.prevSub.length; i++) {
            const prevSubResult = validateMeterReading(data.prevSub[i]);
            const currSubResult = validateMeterReading(data.currSub[i]);
            
            subResults.prev.push(prevSubResult);
            subResults.curr.push(currSubResult);
            
            if (!prevSubResult.isValid) {
                result.isValid = false;
                result.errors.push(`Previous sub-meter ${i+1}: ${prevSubResult.message}`);
            }
            
            if (!currSubResult.isValid) {
                result.isValid = false;
                result.errors.push(`Current sub-meter ${i+1}: ${currSubResult.message}`);
            }
            
            // Validate sub-meter progression if both readings are valid
            if (prevSubResult.isValid && currSubResult.isValid) {
                const subProgressionResult = validateReadingProgression(
                    prevSubResult.value, 
                    currSubResult.value
                );
                
                if (!subProgressionResult.isValid) {
                    result.isValid = false;
                    result.errors.push(`Sub-meter ${i+1}: ${subProgressionResult.message}`);
                } else if (subProgressionResult.message) {
                    // This is a warning, not an error
                    result.warnings.push(`Sub-meter ${i+1}: ${subProgressionResult.message}`);
                }
            }
        }
        
        // Validate sub-meters against main meter if all readings are valid
        if (prevMainResult.isValid && currMainResult.isValid && 
            subResults.prev.every(r => r.isValid) && subResults.curr.every(r => r.isValid)) {
            
            // Check previous readings
            const prevSubValidation = validateSubMeters(
                prevMainResult.value, 
                subResults.prev.map(r => r.value)
            );
            
            if (!prevSubValidation.isValid) {
                result.isValid = false;
                result.errors.push(`Previous readings: ${prevSubValidation.message}`);
            }
            
            // Check current readings
            const currSubValidation = validateSubMeters(
                currMainResult.value, 
                subResults.curr.map(r => r.value)
            );
            
            if (!currSubValidation.isValid) {
                result.isValid = false;
                result.errors.push(`Current readings: ${currSubValidation.message}`);
            }
        }
        
        // Validate rates
        const rateResult = validateRate(data.ratePerKwh);
        const standingChargeResult = validateRate(data.standingCharge);
        
        if (!rateResult.isValid) {
            result.isValid = false;
            result.errors.push(`Rate per kWh: ${rateResult.message}`);
        } else if (rateResult.message) {
            result.warnings.push(rateResult.message);
        }
        
        if (!standingChargeResult.isValid) {
            result.isValid = false;
            result.errors.push(`Standing charge: ${standingChargeResult.message}`);
        } else if (standingChargeResult.message) {
            result.warnings.push(standingChargeResult.message);
        }
        
        return result;
    }
    
    // Return public methods
    return {
        validateDateFormat,
        validateDateRange,
        validateMeterReading,
        validateReadingProgression,
        validateSubMeters,
        validateRate,
        validateReadingSet
    };
})();

// Make BillValidator available globally
window.BillValidator = BillValidator;


// ====== STORAGE MODULE ======
const BillStorageManager = (function() {
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
    
    // Return public API
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

// Make BillStorageManager available globally
window.BillStorageManager = BillStorageManager;


// ====== CALCULATOR MODULE ======
const BillCalculator = (function() {
    /**
     * Calculate electricity bill
     * @param {Object} data Object containing all reading and rate data
     * @returns {Object} Calculation results
     */
    function calculateBill(data) {
        // Extract data for easier access
        const {
            prevDate,
            currDate,
            prevMain,
            currMain,
            prevSub,
            currSub,
            subMeterLabels,
            ratePerKwh,
            standingCharge,
            standingChargeSplit,
            customSplitPercentage
        } = data;
        
        // Convert rate values from pence to pounds
        const ratePerKwhPounds = ratePerKwh / 100;
        const standingChargePounds = standingCharge / 100;
        
        // Parse dates
        const parsedPrevDate = new Date(prevDate.split('-').reverse().join('-'));
        const parsedCurrDate = new Date(currDate.split('-').reverse().join('-'));
        
        // Calculate days between readings
        const daysDifference = Math.round((parsedCurrDate - parsedPrevDate) / (1000 * 60 * 60 * 24));
        
        // Calculate total standing charge for the period
        const totalStandingCharge = daysDifference * standingChargePounds;
        
        // Calculate main meter usage
        const mainMeterUsage = currMain - prevMain;
        
        // Calculate sub-meter usages and total
        const subMeterUsages = [];
        let totalSubMeterUsage = 0;
        
        for (let i = 0; i < prevSub.length; i++) {
            const usage = currSub[i] - prevSub[i];
            subMeterUsages.push(usage);
            totalSubMeterUsage += usage;
        }
        
        // Calculate property usage (main meter - sum of sub meters)
        const propertyUsage = mainMeterUsage - totalSubMeterUsage;
        
        // Distribute standing charge based on selected method
        let propertyStandingCharge = 0;
        let subMeterStandingCharges = [];
        
        switch (standingChargeSplit) {
            case 'equal':
                // Equal split between property and all sub-meters
                const equalShare = totalStandingCharge / (1 + prevSub.length);
                propertyStandingCharge = equalShare;
                subMeterStandingCharges = Array(prevSub.length).fill(equalShare);
                break;
                
            case 'usage':
                // Split based on usage proportion
                const totalUsage = mainMeterUsage;
                propertyStandingCharge = (propertyUsage / totalUsage) * totalStandingCharge;
                
                for (let i = 0; i < subMeterUsages.length; i++) {
                    subMeterStandingCharges.push((subMeterUsages[i] / totalUsage) * totalStandingCharge);
                }
                break;
                
            case 'custom':
                // Custom percentage for property
                const propertyPercentage = customSplitPercentage / 100;
                const subMeterPercentage = (1 - propertyPercentage) / prevSub.length;
                
                propertyStandingCharge = totalStandingCharge * propertyPercentage;
                subMeterStandingCharges = Array(prevSub.length).fill(totalStandingCharge * subMeterPercentage);
                break;
                
            default:
                // Default to equal split
                const defaultShare = totalStandingCharge / (1 + prevSub.length);
                propertyStandingCharge = defaultShare;
                subMeterStandingCharges = Array(prevSub.length).fill(defaultShare);
        }
        
        // Calculate costs
        const propertyCost = {
            usage: propertyUsage,
            energyCost: propertyUsage * ratePerKwhPounds,
            standingCharge: propertyStandingCharge,
            total: (propertyUsage * ratePerKwhPounds) + propertyStandingCharge
        };
        
        const subMeterCosts = [];
        for (let i = 0; i < subMeterUsages.length; i++) {
            subMeterCosts.push({
                label: subMeterLabels[i] || `Sub Meter ${i+1}`,
                usage: subMeterUsages[i],
                energyCost: subMeterUsages[i] * ratePerKwhPounds,
                standingCharge: subMeterStandingCharges[i],
                total: (subMeterUsages[i] * ratePerKwhPounds) + subMeterStandingCharges[i]
            });
        }
        
        // Calculate totals
        const totalCost = propertyCost.total + subMeterCosts.reduce((sum, cost) => sum + cost.total, 0);
        
        // Return detailed calculation results
        return {
            periodDays: daysDifference,
            readings: {
                prev: {
                    date: prevDate,
                    main: prevMain,
                    sub: prevSub
                },
                curr: {
                    date: currDate,
                    main: currMain,
                    sub: currSub
                }
            },
            rates: {
                ratePerKwh: ratePerKwh,
                standingCharge: standingCharge,
                standingChargeSplit: standingChargeSplit,
                customSplitPercentage: customSplitPercentage
            },
            usages: {
                main: mainMeterUsage,
                property: propertyUsage,
                subMeters: subMeterUsages,
                total: mainMeterUsage
            },
            costs: {
                property: propertyCost,
                subMeters: subMeterCosts,
                totalStandingCharge: totalStandingCharge,
                total: totalCost
            },
            meterLabels: {
                property: 'Main Property',
                subMeters: subMeterLabels
            }
        };
    }
    
    /**
     * Format a calculation result for display
     * @param {Object} calculation The calculation result
     * @param {Object} options Formatting options
     * @returns {Object} Formatted calculation result
     */
    function formatCalculation(calculation, options = {}) {
        const roundedValues = options.roundedValues !== undefined ? options.roundedValues : true;
        const roundTo = options.roundTo || 2;
        
        const roundNumber = (num) => {
            return roundedValues ? parseFloat(num.toFixed(roundTo)) : num;
        };
        
        const formatted = JSON.parse(JSON.stringify(calculation)); // Deep clone
        
        // Format usages
        formatted.usages.main = roundNumber(formatted.usages.main);
        formatted.usages.property = roundNumber(formatted.usages.property);
        formatted.usages.subMeters = formatted.usages.subMeters.map(usage => roundNumber(usage));
        
        // Format costs
        formatted.costs.property.energyCost = roundNumber(formatted.costs.property.energyCost);
        formatted.costs.property.standingCharge = roundNumber(formatted.costs.property.standingCharge);
        formatted.costs.property.total = roundNumber(formatted.costs.property.total);
        
        formatted.costs.subMeters = formatted.costs.subMeters.map(cost => ({
            ...cost,
            energyCost: roundNumber(cost.energyCost),
            standingCharge: roundNumber(cost.standingCharge),
            total: roundNumber(cost.total)
        }));
        
        formatted.costs.totalStandingCharge = roundNumber(formatted.costs.totalStandingCharge);
        formatted.costs.total = roundNumber(formatted.costs.total);
        
        return formatted;
    }
    
    /**
     * Create a reading history entry
     * @param {Object} calculation The calculation result
     * @returns {Object} Reading history entry
     */
    function createReadingHistoryEntry(calculation) {
        return {
            date: calculation.readings.curr.date,
            prevDate: calculation.readings.prev.date,
            mainMeter: calculation.readings.curr.main,
            subMeters: calculation.readings.curr.sub,
            subMeterLabels: calculation.meterLabels.subMeters,
            usages: calculation.usages,
            costs: calculation.costs,
            rates: calculation.rates,
            periodDays: calculation.periodDays,
            timestamp: new Date().getTime()
        };
    }
    
    /**
     * Calculate usage between two readings
     * @param {number} prevReading Previous reading
     * @param {number} currReading Current reading
     * @returns {number} Usage
     */
    function calculateUsage(prevReading, currReading) {
        return currReading - prevReading;
    }
    
    /**
     * Calculate energy cost
     * @param {number} usage Usage in kWh
     * @param {number} ratePerKwh Rate per kWh in pence
     * @returns {number} Energy cost in pounds
     */
    function calculateEnergyCost(usage, ratePerKwh) {
        return usage * (ratePerKwh / 100);
    }
    
    /**
     * Calculate standing charge
     * @param {number} days Number of days
     * @param {number} standingCharge Standing charge in pence per day
     * @returns {number} Standing charge in pounds
     */
    function calculateStandingCharge(days, standingCharge) {
        return days * (standingCharge / 100);
    }
    
    // Return public methods
    return {
        calculateBill,
        formatCalculation,
        createReadingHistoryEntry,
        calculateUsage,
        calculateEnergyCost,
        calculateStandingCharge
    };
})();

// Make BillCalculator available globally
window.BillCalculator = BillCalculator;


// ====== PDF GENERATOR MODULE ======
const PDFGenerator = (function() {
    /**
     * Generate a detailed PDF report from a calculation result
     * @param {Object} calculation The calculation result
     * @param {Object} options Additional options for the PDF
     * @returns {jsPDF} The PDF document object
     */
    function generateBillPDF(calculation, options = {}) {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // PDF configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = margin;
        
        // Helper function to check if we need a new page
        const checkPageBreak = (height) => {
            if (yPos + height > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
                return true;
            }
            return false;
        };
        
        // Helper function to add a line
        const addLine = (y) => {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
        };
        
        // Helper function to format a number
        const formatNumber = (num, decimals = 2) => {
            return parseFloat(num).toFixed(decimals);
        };
        
        // Add header
        doc.setFontSize(22);
        doc.setTextColor(74, 109, 167);
        doc.text("Electricity Bill Calculation", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;
        
        // Add property details if provided
        if (options.propertyName || options.propertyAddress) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            
            if (options.propertyName) {
                doc.text(options.propertyName, pageWidth / 2, yPos, { align: "center" });
                yPos += 6;
            }
            
            if (options.propertyAddress) {
                const addressLines = options.propertyAddress.split('\n');
                for (const line of addressLines) {
                    doc.text(line, pageWidth / 2, yPos, { align: "center" });
                    yPos += 5;
                }
            }
            
            yPos += 6;
        }
        
        // Add reading period
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Reading Period: ${calculation.readings.prev.date} to ${calculation.readings.curr.date}`, margin, yPos);
        yPos += 6;
        doc.setFontSize(12);
        doc.text(`${calculation.periodDays} days`, margin, yPos);
        yPos += 10;
        
        // Add horizontal line
        addLine(yPos);
        yPos += 8;
        
        // Add meter readings
        doc.setFontSize(16);
        doc.setTextColor(74, 109, 167);
        doc.text("Meter Readings", margin, yPos);
        yPos += 10;
        
        // Create table for meter readings
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text("Meter", margin + 5, yPos);
        doc.text("Previous Reading", margin + 70, yPos);
        doc.text("Current Reading", margin + 130, yPos);
        doc.text("Usage (kWh)", pageWidth - margin - 30, yPos);
        yPos += 8;
        
        // Reset font
        doc.setFont(undefined, 'normal');
        
        // Main meter
        doc.text("Main Meter", margin + 5, yPos);
        doc.text(formatNumber(calculation.readings.prev.main, 1), margin + 70, yPos);
        doc.text(formatNumber(calculation.readings.curr.main, 1), margin + 130, yPos);
        doc.text(formatNumber(calculation.usages.main, 1), pageWidth - margin - 30, yPos);
        yPos += 6;
        
        // Sub meters
        for (let i = 0; i < calculation.readings.prev.sub.length; i++) {
            const label = calculation.meterLabels.subMeters[i] || `Sub Meter ${i+1}`;
            doc.text(label, margin + 5, yPos);
            doc.text(formatNumber(calculation.readings.prev.sub[i], 1), margin + 70, yPos);
            doc.text(formatNumber(calculation.readings.curr.sub[i], 1), margin + 130, yPos);
            doc.text(formatNumber(calculation.usages.subMeters[i], 1), pageWidth - margin - 30, yPos);
            yPos += 6;
        }
        
        // Main property (derived)
        doc.text("Main Property (derived)", margin + 5, yPos);
        doc.text("-", margin + 70, yPos);
        doc.text("-", margin + 130, yPos);
        doc.text(formatNumber(calculation.usages.property, 1), pageWidth - margin - 30, yPos);
        yPos += 12;
        
        // Check for page break before rates section
        checkPageBreak(40);
        
        // Add rates
        doc.setFontSize(16);
        doc.setTextColor(74, 109, 167);
        doc.text("Rates", margin, yPos);
        yPos += 10;
        
        // Rate details
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Rate per kWh: ${calculation.rates.ratePerKwh} pence (£${formatNumber(calculation.rates.ratePerKwh / 100)})`, margin, yPos);
        yPos += 6;
        doc.text(`Standing Charge: ${calculation.rates.standingCharge} pence per day (£${formatNumber(calculation.rates.standingCharge / 100)})`, margin, yPos);
        yPos += 6;
        doc.text(`Total Standing Charge for period: £${formatNumber(calculation.costs.totalStandingCharge)}`, margin, yPos);
        yPos += 6;
        
        // Standing charge split method
        let splitMethod = "";
        switch (calculation.rates.standingChargeSplit) {
            case 'equal':
                splitMethod = "Equal split between all meters";
                break;
            case 'usage':
                splitMethod = "Split based on usage proportion";
                break;
            case 'custom':
                splitMethod = `Custom split (Main Property: ${calculation.rates.customSplitPercentage}%)`;
                break;
            default:
                splitMethod = "Equal split";
        }
        doc.text(`Standing Charge Split Method: ${splitMethod}`, margin, yPos);
        yPos += 12;
        
        // Check for page break before costs table
        checkPageBreak(60);
        
        // Add costs
        doc.setFontSize(16);
        doc.setTextColor(74, 109, 167);
        doc.text("Bill Breakdown", margin, yPos);
        yPos += 10;
        
        // Create table for costs
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Table headers
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text("Meter", margin + 5, yPos);
        doc.text("Usage (kWh)", margin + 70, yPos);
        doc.text("Energy Cost (£)", margin + 115, yPos);
        doc.text("Standing Charge (£)", margin + 160, yPos);
        doc.text("Total (£)", pageWidth - margin - 20, yPos);
        yPos += 8;
        
        // Reset font
        doc.setFont(undefined, 'normal');
        
        // Main property
        doc.text(calculation.meterLabels.property, margin + 5, yPos);
        doc.text(formatNumber(calculation.costs.property.usage, 1), margin + 70, yPos);
        doc.text(formatNumber(calculation.costs.property.energyCost, 2), margin + 115, yPos);
        doc.text(formatNumber(calculation.costs.property.standingCharge, 2), margin + 160, yPos);
        doc.text(formatNumber(calculation.costs.property.total, 2), pageWidth - margin - 20, yPos);
        yPos += 6;
        
        // Sub meters
        for (const subMeter of calculation.costs.subMeters) {
            doc.text(subMeter.label, margin + 5, yPos);
            doc.text(formatNumber(subMeter.usage, 1), margin + 70, yPos);
            doc.text(formatNumber(subMeter.energyCost, 2), margin + 115, yPos);
            doc.text(formatNumber(subMeter.standingCharge, 2), margin + 160, yPos);
            doc.text(formatNumber(subMeter.total, 2), pageWidth - margin - 20, yPos);
            yPos += 6;
        }
        
        // Total row
        doc.setDrawColor(100, 100, 100);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        doc.setFont(undefined, 'bold');
        doc.text("Total", margin + 5, yPos);
        doc.text(formatNumber(calculation.usages.total, 1), margin + 70, yPos);
        
        // Calculate total energy cost
        const totalEnergyCost = calculation.costs.property.energyCost + 
                              calculation.costs.subMeters.reduce((sum, meter) => sum + meter.energyCost, 0);
        
        doc.text(formatNumber(totalEnergyCost, 2), margin + 115, yPos);
        doc.text(formatNumber(calculation.costs.totalStandingCharge, 2), margin + 160, yPos);
        doc.text(formatNumber(calculation.costs.total, 2), pageWidth - margin - 20, yPos);
        yPos += 15;
        
        // Add footer with generation date
        checkPageBreak(20);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
        doc.text('Electricity Bill Calculator', margin, pageHeight - margin);
        
        return doc;
    }
    
    /**
     * Generate a summary PDF report from a calculation result
     * @param {Object} calculation The calculation result
     * @param {Object} options Additional options for the PDF
     * @returns {jsPDF} The PDF document object
     */
    function generateSummaryPDF(calculation, options = {}) {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // PDF configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = margin;
        
        // Helper function to format a number
        const formatNumber = (num, decimals = 2) => {
            return parseFloat(num).toFixed(decimals);
        };
        
        // Add header
        doc.setFontSize(22);
        doc.setTextColor(74, 109, 167);
        doc.text("Electricity Bill Summary", pageWidth / 2, yPos, { align: "center" });
        yPos += 15;
        
        // Add property details if provided
        if (options.propertyName) {
            doc.setFontSize(16);
            doc.setTextColor(100, 100, 100);
            doc.text(options.propertyName, pageWidth / 2, yPos, { align: "center" });
            yPos += 10;
        }
        
        // Add reading period
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Period: ${calculation.readings.prev.date} to ${calculation.readings.curr.date} (${calculation.periodDays} days)`, pageWidth / 2, yPos, { align: "center" });
        yPos += 20;
        
        // Add usage summary
        doc.setFontSize(14);
        doc.setTextColor(74, 109, 167);
        doc.text("Usage Summary", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Usage: ${formatNumber(calculation.usages.total, 1)} kWh`, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
        doc.text(`Main Property: ${formatNumber(calculation.usages.property, 1)} kWh`, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
        
        // Sub meters
        for (let i = 0; i < calculation.usages.subMeters.length; i++) {
            const label = calculation.meterLabels.subMeters[i] || `Sub Meter ${i+1}`;
            doc.text(`${label}: ${formatNumber(calculation.usages.subMeters[i], 1)} kWh`, pageWidth / 2, yPos, { align: "center" });
            yPos += 8;
        }
        
        yPos += 10;
        
        // Add cost summary
        doc.setFontSize(14);
        doc.setTextColor(74, 109, 167);
        doc.text("Cost Summary", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Rate: ${calculation.rates.ratePerKwh} pence per kWh`, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
        doc.text(`Standing Charge: ${calculation.rates.standingCharge} pence per day`, pageWidth / 2, yPos, { align: "center" });
        yPos += 15;
        
        // Main property cost
        doc.text(`${calculation.meterLabels.property}: £${formatNumber(calculation.costs.property.total, 2)}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
        
        // Sub meters costs
        for (const subMeter of calculation.costs.subMeters) {
            doc.text(`${subMeter.label}: £${formatNumber(subMeter.total, 2)}`, pageWidth / 2, yPos, { align: "center" });
            yPos += 8;
        }
        
        yPos += 10;
        
        // Add total
        doc.setFontSize(16);
        doc.setTextColor(74, 109, 167);
        doc.text(`Total Bill: £${formatNumber(calculation.costs.total, 2)}`, pageWidth / 2, yPos, { align: "center" });
        
        // Add footer with generation date
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - margin, { align: 'center' });
        
        return doc;
    }
    
    // Return public methods
    return {
        generateBillPDF,
        generateSummaryPDF
    };
})();

// Make PDFGenerator available globally
window.PDFGenerator = PDFGenerator;


// ====== UI MODULE ======
const UI = (function() {
    // DOM Elements
    let elements = {};
    
    // State
    let state = {
        subMeterCount: 1,
        currentTab: 'calculatorTab',
        darkMode: false,
        roundedValues: true
    };
    
    // Event handlers table
    const eventHandlers = {};
    
    /**
     * Initialize UI elements and event listeners
     * @param {Object} initialState Initial UI state
     */
    function init(initialState = {}) {
        console.log('Initializing UI...');
        // Merge with provided initial state
        state = { ...state, ...initialState };
        
        try {
            // Cache DOM elements
            cacheElements();
            
            // Attach event listeners
            attachEventListeners();
            
            // Initialize tabs
            initTabs();
            
            // Set dark mode if enabled
            if (state.darkMode) {
                enableDarkMode();
            }
            
            // Initialize sub-meter container
            try {
                for (let i = 1; i < state.subMeterCount; i++) {
                    addSubMeterFields();
                }
            } catch (e) {
                console.warn('Error initializing sub-meters:', e);
            }
            
            console.log('UI initialization complete');
        } catch (error) {
            console.error('UI initialization error:', error);
        }
    }
    
    /**
     * Cache commonly used DOM elements
     */
    function cacheElements() {
        console.log('Caching DOM elements...');
        
        // Safely get elements with fallbacks
        const safeGetElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with ID '${id}' not found in DOM`);
            }
            return element;
        };
        
        const safeQuerySelector = (selector) => {
            try {
                return document.querySelector(selector);
            } catch (e) {
                console.warn(`Selector '${selector}' caused an error:`, e);
                return null;
            }
        };
        
        const safeQuerySelectorAll = (selector) => {
            try {
                return document.querySelectorAll(selector);
            } catch (e) {
                console.warn(`Selector '${selector}' caused an error:`, e);
                return [];
            }
        };
        
        // Tab navigation
        elements.tabButtons = safeQuerySelectorAll('.tab-button');
        elements.tabContents = safeQuerySelectorAll('.tab-content');
        
        // Calculator tab
        elements.calculatorTab = safeGetElement('calculatorTab');
        elements.prevDate = safeGetElement('prevDate');
        elements.prevMainMeter = safeGetElement('prevMainMeter');
        elements.prevSubMetersContainer = safeGetElement('prevSubMetersContainer');
        elements.currDate = safeGetElement('currDate');
        elements.currMainMeter = safeGetElement('currMainMeter');
        elements.currSubMetersContainer = safeGetElement('currSubMetersContainer');
        elements.ratePerKwh = safeGetElement('ratePerKwh');
        elements.standingCharge = safeGetElement('standingCharge');
        elements.standingChargeSplit = safeGetElement('standingChargeSplit');
        elements.customSplitContainer = safeGetElement('customSplitContainer');
        elements.customSplitPercentage = safeGetElement('customSplitPercentage');
        elements.setTodayBtn = safeGetElement('setTodayBtn');
        elements.addSubMeterBtn = safeGetElement('addSubMeterBtn');
        elements.calculateBtn = safeGetElement('calculateBtn');
        elements.generatePdfBtn = safeGetElement('generatePdfBtn');
        elements.saveReadingBtn = safeGetElement('saveReadingBtn');
        elements.resultsCard = safeGetElement('resultsCard');
        
        // For elements that have complex selectors, use a try/catch approach
        try {
            if (safeGetElement('resultsTable')) {
                elements.resultsTable = safeGetElement('resultsTable').querySelector('tbody');
            }
        } catch (e) {
            console.warn('Error getting resultsTable tbody:', e);
        }
        
        elements.periodDays = safeGetElement('periodDays');
        elements.totalUsage = safeGetElement('totalUsage');
        
        // History tab
        elements.historyTab = safeGetElement('historyTab');
        
        try {
            if (safeGetElement('historyTable')) {
                elements.historyTable = safeGetElement('historyTable').querySelector('tbody');
            }
        } catch (e) {
            console.warn('Error getting historyTable tbody:', e);
        }
        
        elements.historyFilter = safeGetElement('historyFilter');
        elements.historyEmptyState = safeGetElement('historyEmptyState');
        elements.exportDataBtn = safeGetElement('exportDataBtn');
        elements.importDataBtn = safeGetElement('importDataBtn');
        elements.importFileInput = safeGetElement('importFileInput');
        
        // Settings tab
        elements.settingsTab = safeGetElement('settingsTab');
        elements.defaultRatePerKwh = safeGetElement('defaultRatePerKwh');
        elements.defaultStandingCharge = safeGetElement('defaultStandingCharge');
        elements.darkModeToggle = safeGetElement('darkModeToggle');
        elements.roundedValuesToggle = safeGetElement('roundedValuesToggle');
        elements.propertyName = safeGetElement('propertyName');
        elements.propertyAddress = safeGetElement('propertyAddress');
        elements.clearAllDataBtn = safeGetElement('clearAllDataBtn');
        elements.storageUsage = safeGetElement('storageUsage');
        
        // Alert and modal
        elements.alertBox = safeGetElement('alertBox');
        elements.modalOverlay = safeGetElement('modalOverlay');
        elements.modalContent = safeGetElement('modalContent');
        elements.modalTitle = safeGetElement('modalTitle');
        elements.modalBody = safeGetElement('modalBody');
        elements.modalCloseBtn = safeGetElement('modalCloseBtn');
        elements.modalCancelBtn = safeGetElement('modalCancelBtn');
        elements.modalConfirmBtn = safeGetElement('modalConfirmBtn');
        
        // Other
        elements.privacyLink = safeGetElement('privacyLink');
        
        console.log('DOM elements cached');
    }
    
    /**
     * Initialize tab navigation
     */
    function initTabs() {
        console.log('Initializing tabs...');
        
        if (!elements.tabButtons || elements.tabButtons.length === 0) {
            console.warn('Tab buttons not found');
            return;
        }
        
        elements.tabButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    const tabId = button.id.replace('tab', '') + 'Tab';
                    switchTab(tabId);
                });
            }
        });
        
        console.log('Tabs initialized');
    }
    
    /**
     * Switch active tab
     * @param {string} tabId The ID of the tab to switch to
     */
    function switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        
        if (!elements.tabButtons || !elements.tabContents) {
            console.warn('Tab elements not available');
            return;
        }
        
        // Update active class on tab buttons
        elements.tabButtons.forEach(button => {
            if (button) {
                if (button.id === tabId.replace('Tab', '')) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
        
        // Update active class on tab contents
        elements.tabContents.forEach(content => {
            if (content) {
                if (content.id === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            }
        });
        
        // Update state
        state.currentTab = tabId;
        
        // Special handling for tabs
        if (tabId === 'historyTab') {
            if (eventHandlers.onHistoryTabSelected) {
                eventHandlers.onHistoryTabSelected();
            }
        } else if (tabId === 'settingsTab') {
            if (eventHandlers.onSettingsTabSelected) {
                eventHandlers.onSettingsTabSelected();
            }
        }
    }
    
    /**
     * Attach all event listeners
     */
    function attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // Helper function to safely add event listeners
        const safeAddEventListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Cannot attach ${event} event: Element is null`);
            }
        };
        
        // Calculator tab
        safeAddEventListener(elements.setTodayBtn, 'click', setTodayDate);
        safeAddEventListener(elements.addSubMeterBtn, 'click', addSubMeterFields);
        safeAddEventListener(elements.calculateBtn, 'click', () => {
            if (eventHandlers.onCalculateClicked) {
                eventHandlers.onCalculateClicked(getFormData());
            }
        });
        safeAddEventListener(elements.generatePdfBtn, 'click', () => {
            if (eventHandlers.onGeneratePdfClicked) {
                eventHandlers.onGeneratePdfClicked();
            }
        });
        safeAddEventListener(elements.saveReadingBtn, 'click', () => {
            if (eventHandlers.onSaveReadingClicked) {
                eventHandlers.onSaveReadingClicked();
            }
        });
        safeAddEventListener(elements.standingChargeSplit, 'change', () => {
            toggleCustomSplitVisibility();
        });
        
        // History tab
        safeAddEventListener(elements.historyFilter, 'change', () => {
            if (eventHandlers.onHistoryFilterChanged) {
                eventHandlers.onHistoryFilterChanged(elements.historyFilter.value);
            }
        });
        safeAddEventListener(elements.exportDataBtn, 'click', () => {
            if (eventHandlers.onExportDataClicked) {
                eventHandlers.onExportDataClicked();
            }
        });
        safeAddEventListener(elements.importDataBtn, 'click', () => {
            if (elements.importFileInput) {
                elements.importFileInput.click();
            }
        });
        safeAddEventListener(elements.importFileInput, 'change', (e) => {
            if (e.target.files.length > 0 && eventHandlers.onImportFileSelected) {
                eventHandlers.onImportFileSelected(e.target.files[0]);
            }
        });
        
        // Settings tab
        safeAddEventListener(elements.darkModeToggle, 'change', () => {
            if (elements.darkModeToggle) {
                state.darkMode = elements.darkModeToggle.checked;
                if (state.darkMode) {
                    enableDarkMode();
                } else {
                    disableDarkMode();
                }
                if (eventHandlers.onDarkModeToggled) {
                    eventHandlers.onDarkModeToggled(state.darkMode);
                }
            }
        });
        safeAddEventListener(elements.roundedValuesToggle, 'change', () => {
            if (elements.roundedValuesToggle) {
                state.roundedValues = elements.roundedValuesToggle.checked;
                if (eventHandlers.onRoundedValuesToggled) {
                    eventHandlers.onRoundedValuesToggled(state.roundedValues);
                }
            }
        });
        safeAddEventListener(elements.defaultRatePerKwh, 'change', () => {
            if (eventHandlers.onDefaultRateChanged && elements.defaultRatePerKwh) {
                eventHandlers.onDefaultRateChanged(parseFloat(elements.defaultRatePerKwh.value));
            }
        });
        safeAddEventListener(elements.defaultStandingCharge, 'change', () => {
            if (eventHandlers.onDefaultStandingChargeChanged && elements.defaultStandingCharge) {
                eventHandlers.onDefaultStandingChargeChanged(parseFloat(elements.defaultStandingCharge.value));
            }
        });
        safeAddEventListener(elements.propertyName, 'change', () => {
            if (eventHandlers.onPropertyNameChanged && elements.propertyName) {
                eventHandlers.onPropertyNameChanged(elements.propertyName.value);
            }
        });
        safeAddEventListener(elements.propertyAddress, 'change', () => {
            if (eventHandlers.onPropertyAddressChanged && elements.propertyAddress) {
                eventHandlers.onPropertyAddressChanged(elements.propertyAddress.value);
            }
        });
        safeAddEventListener(elements.clearAllDataBtn, 'click', () => {
            showConfirmationModal(
                'Clear All Data', 
                'Are you sure you want to clear all data? This action cannot be undone.',
                () => {
                    if (eventHandlers.onClearAllDataConfirmed) {
                        eventHandlers.onClearAllDataConfirmed();
                    }
                }
            );
        });
        
        // Modal
        safeAddEventListener(elements.modalCloseBtn, 'click', closeModal);
        safeAddEventListener(elements.modalCancelBtn, 'click', closeModal);
        
        // Privacy link
        safeAddEventListener(elements.privacyLink, 'click', (e) => {
            e.preventDefault();
            showPrivacyPolicy();
        });
        
        console.log('Event listeners attached');
    }
    
    /**
     * Set today's date in the current date field
     */
    function setTodayDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        
        if (elements.currDate) {
            elements.currDate.value = `${day}-${month}-${year}`;
        }
    }
    
    /**
     * Toggle visibility of custom split percentage field
     */
    function toggleCustomSplitVisibility() {
        if (!elements.standingChargeSplit || !elements.customSplitContainer) {
            return;
        }
        
        if (elements.standingChargeSplit.value === 'custom') {
            elements.customSplitContainer.classList.remove('hidden');
        } else {
            elements.customSplitContainer.classList.add('hidden');
        }
    }
    
    /**
     * Add fields for an additional sub-meter
     */
    function addSubMeterFields() {
        if (!elements.currSubMetersContainer || !elements.prevSubMetersContainer) {
            console.warn('Sub-meter containers not found');
            return;
        }
        
        // Increment sub-meter count
        state.subMeterCount++;
        
        // Create fields for current reading
        const currSubMeterIndex = state.subMeterCount - 1;
        const currSubMeterGroup = document.createElement('div');
        currSubMeterGroup.className = 'form-group sub-meter-group';
        currSubMeterGroup.innerHTML = `
            <label for="currSubMeter_${currSubMeterIndex}">Sub Meter (kWh):</label>
            <input type="number" id="currSubMeter_${currSubMeterIndex}" step="0.01" min="0">
            <input type="text" id="subMeterLabel_${currSubMeterIndex}" placeholder="Label">
            <button class="icon-button remove-submeter-btn" data-index="${currSubMeterIndex}" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add to container
        elements.currSubMetersContainer.appendChild(currSubMeterGroup);
        
        // Create field for previous reading
        const prevSubMeterField = document.createElement('div');
        prevSubMeterField.className = 'form-group';
        prevSubMeterField.innerHTML = `
            <label for="prevSubMeter_${currSubMeterIndex}">Sub Meter (kWh):</label>
            <input type="text" id="prevSubMeter_${currSubMeterIndex}" readonly>
        `;
        
        // Add to container
        elements.prevSubMetersContainer.appendChild(prevSubMeterField);
        
        // Add event listener to remove button
        const removeBtn = currSubMeterGroup.querySelector('.remove-submeter-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeSubMeterFields(parseInt(this.getAttribute('data-index')));
            });
        }
    }
    
    /**
     * Remove fields for a sub-meter
     * @param {number} index The index of the sub-meter to remove
     */
    function removeSubMeterFields(index) {
        // Only allow removal if there's more than one sub-meter
        if (state.subMeterCount <= 1) {
            return;
        }
        
        // Remove the fields
        const currSubMeter = document.getElementById(`currSubMeter_${index}`);
        const prevSubMeter = document.getElementById(`prevSubMeter_${index}`);
        
        if (currSubMeter) {
            const currGroup = currSubMeter.closest('.form-group');
            if (currGroup) currGroup.remove();
        }
        
        if (prevSubMeter) {
            const prevGroup = prevSubMeter.closest('.form-group');
            if (prevGroup) prevGroup.remove();
        }
        
        // Decrement sub-meter count
        state.subMeterCount--;
    }
    
    /**
     * Get form data from calculator tab
     * @returns {Object} Form data
     */
    function getFormData() {
        const prevSub = [];
        const currSub = [];
        const subMeterLabels = [];
        
        // Get sub-meter readings
        for (let i = 0; i < state.subMeterCount; i++) {
            const prevSubMeter = document.getElementById(`prevSubMeter_${i}`);
            const currSubMeter = document.getElementById(`currSubMeter_${i}`);
            const subMeterLabel = document.getElementById(`subMeterLabel_${i}`);
            
            if (prevSubMeter && currSubMeter) {
                prevSub.push(prevSubMeter.value);
                currSub.push(currSubMeter.value);
                subMeterLabels.push(subMeterLabel ? subMeterLabel.value : `Sub Meter ${i+1}`);
            }
        }
        
        const standingChargeSplit = elements.standingChargeSplit ? elements.standingChargeSplit.value : 'equal';
        const customSplitPercentage = elements.customSplitPercentage ? elements.customSplitPercentage.value : 50;
        
        return {
            prevDate: elements.prevDate ? elements.prevDate.value : '',
            currDate: elements.currDate ? elements.currDate.value : '',
            prevMain: elements.prevMainMeter ? elements.prevMainMeter.value : '',
            currMain: elements.currMainMeter ? elements.currMainMeter.value : '',
            prevSub,
            currSub,
            subMeterLabels,
            ratePerKwh: elements.ratePerKwh ? elements.ratePerKwh.value : '',
            standingCharge: elements.standingCharge ? elements.standingCharge.value : '',
            standingChargeSplit,
            customSplitPercentage
        };
    }
    
    /**
     * Set form data in calculator tab
     * @param {Object} data Form data
     */
    function setFormData(data) {
        // Set date and meter readings
        if (data.prevDate && elements.prevDate) elements.prevDate.value = data.prevDate;
        if (data.prevMain && elements.prevMainMeter) elements.prevMainMeter.value = data.prevMain;
        
        // Set sub-meter readings
        if (data.prevSub && Array.isArray(data.prevSub)) {
            // Update sub-meter count if needed
            while (state.subMeterCount < data.prevSub.length) {
                addSubMeterFields();
            }
            
            // Set values
            for (let i = 0; i < data.prevSub.length; i++) {
                const prevSubMeter = document.getElementById(`prevSubMeter_${i}`);
                if (prevSubMeter) {
                    prevSubMeter.value = data.prevSub[i];
                }
            }
        }
        
        // Set rates
        if (data.ratePerKwh && elements.ratePerKwh) 
            elements.ratePerKwh.value = data.ratePerKwh;
            
        if (data.standingCharge && elements.standingCharge)
            elements.standingCharge.value = data.standingCharge;
        
        // Set standing charge split method
        if (data.standingChargeSplit && elements.standingChargeSplit) {
            elements.standingChargeSplit.value = data.standingChargeSplit;
            toggleCustomSplitVisibility();
        }
        
        // Set custom split percentage
        if (data.customSplitPercentage && elements.customSplitPercentage) {
            elements.customSplitPercentage.value = data.customSplitPercentage;
        }
        
        // Set sub-meter labels
        if (data.subMeterLabels && Array.isArray(data.subMeterLabels)) {
            for (let i = 0; i < data.subMeterLabels.length; i++) {
                const subMeterLabel = document.getElementById(`subMeterLabel_${i}`);
                if (subMeterLabel && data.subMeterLabels[i]) {
                    subMeterLabel.value = data.subMeterLabels[i];
                }
            }
        }
    }
    
    // Rest of the UI module functions would be here...
    // Including:
    // displayCalculationResult, displayReadingHistory, updateSettingsUI,
    // updateStorageUsage, showAlert, showConfirmationModal, showReadingDetailsModal, etc.
    
    function displayCalculationResult(result) {
        // Show results card
        if (elements.resultsCard) elements.resultsCard.classList.remove('hidden');
        
        // Set summary data
        if (elements.periodDays) elements.periodDays.textContent = result.periodDays;
        if (elements.totalUsage) elements.totalUsage.textContent = result.usages.main.toFixed(1);
        
        // Clear table first
        if (elements.resultsTable) elements.resultsTable.innerHTML = '';
        else return; // Can't continue without resultsTable
        
        // Property row
        const propertyRow = document.createElement('tr');
        propertyRow.innerHTML = `
            <td>${result.meterLabels.property}</td>
            <td>${result.costs.property.usage.toFixed(1)} kWh</td>
            <td>£${result.costs.property.energyCost.toFixed(2)}</td>
            <td>£${result.costs.property.standingCharge.toFixed(2)}</td>
            <td>£${result.costs.property.total.toFixed(2)}</td>
        `;
        elements.resultsTable.appendChild(propertyRow);
        
        // Sub-meter rows
        result.costs.subMeters.forEach(subMeter => {
            const subMeterRow = document.createElement('tr');
            subMeterRow.innerHTML = `
                <td>${subMeter.label}</td>
                <td>${subMeter.usage.toFixed(1)} kWh</td>
                <td>£${subMeter.energyCost.toFixed(2)}</td>
                <td>£${subMeter.standingCharge.toFixed(2)}</td>
                <td>£${subMeter.total.toFixed(2)}</td>
            `;
            elements.resultsTable.appendChild(subMeterRow);
        });
        
        // Total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        
        // Calculate total energy cost
        const totalEnergyCost = result.costs.property.energyCost + 
                              result.costs.subMeters.reduce((sum, meter) => sum + meter.energyCost, 0);
        
        totalRow.innerHTML = `
            <td>Total</td>
            <td>${result.usages.main.toFixed(1)} kWh</td>
            <td>£${totalEnergyCost.toFixed(2)}</td>
            <td>£${result.costs.totalStandingCharge.toFixed(2)}</td>
            <td>£${result.costs.total.toFixed(2)}</td>
        `;
        elements.resultsTable.appendChild(totalRow);
        
        // Scroll to results
        if (elements.resultsCard) elements.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    function displayReadingHistory(history, filter = 'all') {
        // Clear history table
        if (!elements.historyTable) {
            console.warn('History table not found');
            return;
        }
        
        elements.historyTable.innerHTML = '';
        
        // Filter history based on selected option
        let filteredHistory = [...history];
        const now = new Date();
        
        if (filter === 'lastYear') {
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            filteredHistory = history.filter(item => {
                const readingDate = parseDate(item.date);
                return readingDate >= oneYearAgo;
            });
        } else if (filter === 'lastQuarter') {
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            filteredHistory = history.filter(item => {
                const readingDate = parseDate(item.date);
                return readingDate >= threeMonthsAgo;
            });
        }
        
        // Show empty state if no history
        if (elements.historyEmptyState) {
            if (filteredHistory.length === 0) {
                elements.historyEmptyState.classList.remove('hidden');
                return;
            } else {
                elements.historyEmptyState.classList.add('hidden');
            }
        }
        
        // Sort by date (newest first)
        filteredHistory.sort((a, b) => {
            return parseDate(b.date) - parseDate(a.date);
        });
        
        // Create table rows
        filteredHistory.forEach(reading => {
            const row = document.createElement('tr');
            
            // Format sub-meter text
            let subMeterText = '';
            if (reading.subMeters && reading.subMeters.length > 0) {
                const subMeterLabels = reading.subMeterLabels || [];
                
                for (let i = 0; i < reading.subMeters.length; i++) {
                    const label = subMeterLabels[i] || `Sub ${i+1}`;
                    subMeterText += `${label}: ${reading.subMeters[i]}<br>`;
                }
            }
            
            // Format cost text
            let costText = '';
            if (reading.costs && reading.costs.property) {
                costText = `Property: £${reading.costs.property.total.toFixed(2)}<br>`;
                
                if (reading.costs.subMeters) {
                    reading.costs.subMeters.forEach(sm => {
                        costText += `${sm.label}: £${sm.total.toFixed(2)}<br>`;
                    });
                }
                
                costText += `<strong>Total: £${reading.costs.total.toFixed(2)}</strong>`;
            }
            
            row.innerHTML = `
                <td>${reading.date}</td>
                <td>${reading.mainMeter}</td>
                <td>${subMeterText}</td>
                <td>${reading.usages ? reading.usages.main.toFixed(1) + ' kWh' : '-'}</td>
                <td>${costText}</td>
                <td>
                    <button class="icon-button view-reading-btn" data-id="${reading.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-button use-as-prev-btn" data-id="${reading.id}" title="Use as Previous Reading">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="icon-button delete-reading-btn" data-id="${reading.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            elements.historyTable.appendChild(row);
        });
        
        // Add event listeners to buttons
        const viewButtons = elements.historyTable.querySelectorAll('.view-reading-btn');
        const useAsPrevButtons = elements.historyTable.querySelectorAll('.use-as-prev-btn');
        const deleteButtons = elements.historyTable.querySelectorAll('.delete-reading-btn');
        
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const readingId = button.getAttribute('data-id');
                if (eventHandlers.onViewReadingClicked) {
                    eventHandlers.onViewReadingClicked(readingId);
                }
            });
        });
        
        useAsPrevButtons.forEach(button => {
            button.addEventListener('click', () => {
                const readingId = button.getAttribute('data-id');
                if (eventHandlers.onUseAsPreviousClicked) {
                    eventHandlers.onUseAsPreviousClicked(readingId);
                }
            });
        });
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const readingId = button.getAttribute('data-id');
                showConfirmationModal(
                    'Delete Reading', 
                    'Are you sure you want to delete this reading? This action cannot be undone.',
                    () => {
                        if (eventHandlers.onDeleteReadingConfirmed) {
                            eventHandlers.onDeleteReadingConfirmed(readingId);
                        }
                    }
                );
            });
        });
    }
    
    function updateSettingsUI(settings) {
        // Make sure elements exist before trying to access them
        if (!elements || !elements.defaultRatePerKwh || !elements.defaultStandingCharge || 
            !elements.darkModeToggle || !elements.roundedValuesToggle ||
            !elements.propertyName || !elements.propertyAddress) {
            console.warn('Settings UI elements not fully loaded yet');
            return; // Exit early if elements aren't ready
        }

        if (settings.defaultRatePerKwh !== undefined) {
            elements.defaultRatePerKwh.value = settings.defaultRatePerKwh;
        }
        
        if (settings.defaultStandingCharge !== undefined) {
            elements.defaultStandingCharge.value = settings.defaultStandingCharge;
        }
        
        if (settings.darkMode !== undefined) {
            elements.darkModeToggle.checked = settings.darkMode;
            state.darkMode = settings.darkMode;
            
            if (settings.darkMode) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }
        
        if (settings.roundedValues !== undefined) {
            elements.roundedValuesToggle.checked = settings.roundedValues;
            state.roundedValues = settings.roundedValues;
        }
        
        if (settings.propertyName !== undefined) {
            elements.propertyName.value = settings.propertyName;
        }
        
        if (settings.propertyAddress !== undefined) {
            elements.propertyAddress.value = settings.propertyAddress;
        }
    }
    
    function updateStorageUsage(usageInBytes) {
        if (!elements.storageUsage) return;
        
        let formattedSize;
        
        if (usageInBytes < 1024) {
            formattedSize = `${usageInBytes} bytes`;
        } else if (usageInBytes < 1024 * 1024) {
            formattedSize = `${(usageInBytes / 1024).toFixed(2)} KB`;
        } else {
            formattedSize = `${(usageInBytes / (1024 * 1024)).toFixed(2)} MB`;
        }
        
        elements.storageUsage.textContent = formattedSize;
    }
    
    function showAlert(message, type = 'warning', duration = 5000) {
        // Make sure the element exists
        if (!elements.alertBox) {
            console.error('Alert box element not found');
            // Fallback to browser alert in case DOM isn't ready
            alert(message);
            return;
        }
        
        // Set alert type
        elements.alertBox.className = 'alert';
        elements.alertBox.classList.add('alert-' + type);
        
        // Set message
        elements.alertBox.textContent = message;
        
        // Show alert
        elements.alertBox.classList.remove('hidden');
        
        // Auto-hide after duration if not 0
        if (duration > 0) {
            setTimeout(() => {
                if (elements.alertBox) {
                    elements.alertBox.classList.add('hidden');
                }
            }, duration);
        }
    }
    
    function showConfirmationModal(title, message, onConfirm) {
        if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirmBtn || !elements.modalOverlay) {
            console.error('Modal elements not found');
            
            // Fallback to browser confirm
            if (confirm(message)) {
                if (onConfirm) onConfirm();
            }
            return;
        }
        
        // Set title and message
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = `<p>${message}</p>`;
        
        // Set confirm button action
        elements.modalConfirmBtn.onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };
        
        // Show modal
        elements.modalOverlay.classList.remove('hidden');
    }
    
    function showReadingDetailsModal(reading) {
        if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirmBtn || 
            !elements.modalCancelBtn || !elements.modalOverlay) {
            console.error('Modal elements not found');
            return;
        }
        
        // Set title
        elements.modalTitle.textContent = 'Reading Details';
        
        // Create modal content
        let content = `
            <div class="reading-details">
                <p><strong>Date:</strong> ${reading.date}</p>
                <p><strong>Previous Date:</strong> ${reading.prevDate || 'N/A'}</p>
                <p><strong>Period:</strong> ${reading.periodDays || 'N/A'} days</p>
                
                <h4>Meter Readings</h4>
                <p><strong>Main Meter:</strong> ${reading.mainMeter}</p>
        `;
        
        // Add sub-meter readings
        if (reading.subMeters && reading.subMeters.length > 0) {
            for (let i = 0; i < reading.subMeters.length; i++) {
                const label = reading.subMeterLabels && reading.subMeterLabels[i] 
                    ? reading.subMeterLabels[i] 
                    : `Sub Meter ${i+1}`;
                    
                content += `<p><strong>${label}:</strong> ${reading.subMeters[i]}</p>`;
            }
        }
        
        // Add usage and costs if available
        if (reading.usages && reading.costs) {
            content += `
                <h4>Usage</h4>
                <p><strong>Total:</strong> ${reading.usages.main.toFixed(1)} kWh</p>
                <p><strong>Property:</strong> ${reading.usages.property.toFixed(1)} kWh</p>
            `;
            
            // Add sub-meter usages
            if (reading.usages.subMeters && reading.usages.subMeters.length > 0) {
                for (let i = 0; i < reading.usages.subMeters.length; i++) {
                    const label = reading.subMeterLabels && reading.subMeterLabels[i] 
                        ? reading.subMeterLabels[i] 
                        : `Sub Meter ${i+1}`;
                        
                    content += `<p><strong>${label}:</strong> ${reading.usages.subMeters[i].toFixed(1)} kWh</p>`;
                }
            }
            
            content += `
                <h4>Costs</h4>
                <p><strong>Rate per kWh:</strong> ${reading.rates.ratePerKwh} pence</p>
                <p><strong>Standing Charge:</strong> ${reading.rates.standingCharge} pence per day</p>
                <p><strong>Total Standing Charge:</strong> £${reading.costs.totalStandingCharge.toFixed(2)}</p>
                <p><strong>Property Cost:</strong> £${reading.costs.property.total.toFixed(2)}</p>
            `;
            
            // Add sub-meter costs
            if (reading.costs.subMeters && reading.costs.subMeters.length > 0) {
                for (const subMeter of reading.costs.subMeters) {
                    content += `<p><strong>${subMeter.label} Cost:</strong> £${subMeter.total.toFixed(2)}</p>`;
                }
            }
            
            content += `<p><strong>Total Bill:</strong> £${reading.costs.total.toFixed(2)}</p>`;
        }
        
        content += '</div>';
        
        // Set modal content
        elements.modalBody.innerHTML = content;
        
        // Set confirm button text and hide cancel button
        elements.modalConfirmBtn.textContent = 'Generate PDF';
        elements.modalCancelBtn.textContent = 'Close';
        
        // Set confirm button action
        elements.modalConfirmBtn.onclick = () => {
            closeModal();
            if (eventHandlers.onGeneratePdfForReading) {
                eventHandlers.onGeneratePdfForReading(reading);
            }
        };
        
        // Show modal
        elements.modalOverlay.classList.remove('hidden');
    }
    
    function showPrivacyPolicy() {
        if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirmBtn || !elements.modalOverlay) {
            console.error('Modal elements not found');
            return;
        }
        
        // Set title
        elements.modalTitle.textContent = 'Privacy Policy';
        
        // Set content
        elements.modalBody.innerHTML = `
            <div class="privacy-policy">
                <h4>Data Storage</h4>
                <p>All data is stored locally on your device. We do not collect, transmit, or store any of your data on our servers.</p>
                
                <h4>What We Store</h4>
                <p>The following data is stored locally on your device:</p>
                <ul>
                    <li>Meter readings</li>
                    <li>Electricity rates</li>
                    <li>Calculation results</li>
                    <li>Application preferences</li>
                </ul>
                
                <h4>Data Exports</h4>
                <p>You can export your data at any time. Exported data is downloaded directly to your device and is not transmitted to our servers.</p>
                
                <h4>Cookies</h4>
                <p>This application does not use cookies.</p>
                
                <h4>Third-Party Services</h4>
                <p>This application uses the following third-party libraries:</p>
                <ul>
                    <li>jsPDF - For generating PDF reports</li>
                    <li>Font Awesome - For icons</li>
                </ul>
                
                <h4>Contact</h4>
                <p>If you have any questions about this privacy policy, please email [contact@example.com].</p>
            </div>
        `;
        
        // Hide confirm button and update cancel button
        elements.modalConfirmBtn.style.display = 'none';
        elements.modalCancelBtn.textContent = 'Close';
        
        // Show modal
        elements.modalOverlay.classList.remove('hidden');
        
        // Reset confirm button display on close
        const resetConfirmButton = () => {
            elements.modalConfirmBtn.style.display = 'block';
            elements.modalCancelBtn.textContent = 'Cancel';
            elements.modalOverlay.removeEventListener('hidden', resetConfirmButton);
        };
        
        elements.modalOverlay.addEventListener('hidden', resetConfirmButton);
    }
    
    function closeModal() {
        if (elements.modalOverlay) {
            elements.modalOverlay.classList.add('hidden');
        }
    }
    
    function enableDarkMode() {
        document.body.classList.add('dark-theme');
    }
    
    function disableDarkMode() {
        document.body.classList.remove('dark-theme');
    }
    
    function on(event, handler) {
        eventHandlers[event] = handler;
    }
    
    function parseDate(dateStr) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    
    // Return public methods
    return {
        init,
        on,
        setFormData,
        displayCalculationResult,
        displayReadingHistory,
        updateSettingsUI,
        updateStorageUsage,
        showAlert,
        showConfirmationModal,
        showReadingDetailsModal,
        switchTab
    };
})();

// Make UI available globally
window.UI = UI;


// ====== MAIN APP MODULE ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded. Starting application initialization...');
    
    // State variables
    let currentCalculation = null;
    let appSettings = {
        darkMode: false,
        roundedValues: true,
        defaultRatePerKwh: 28.0,
        defaultStandingCharge: 140.0,
        propertyName: 'My Property',
        propertyAddress: ''
    };
    
    // Wait to ensure all scripts and DOM elements are fully loaded
    setTimeout(function() {
        try {
            // Check if all required JavaScript objects are available in the global scope
            console.log('Checking for required JavaScript components...');
            
            if (!window.BillValidator) {
                console.error('BillValidator is not defined. Make sure validation.js is loaded correctly.');
                alert('Error: Required JavaScript component BillValidator is missing.');
                return;
            }
            
            if (!window.BillStorageManager) {
                console.error('BillStorageManager is not defined. Make sure storage.js is loaded correctly.');
                alert('Error: Required JavaScript component BillStorageManager is missing.');
                return;
            }
            
            if (!window.BillCalculator) {
                console.error('BillCalculator is not defined. Make sure calculator.js is loaded correctly.');
                alert('Error: Required JavaScript component BillCalculator is missing.');
                return;
            }
            
            if (!window.PDFGenerator) {
                console.error('PDFGenerator is not defined. Make sure pdf.js is loaded correctly.');
                alert('Error: Required JavaScript component PDFGenerator is missing.');
                return;
            }
            
            if (!window.UI) {
                console.error('UI is not defined. Make sure ui.js is loaded correctly.');
                alert('Error: Required JavaScript component UI is missing.');
                return;
            }
            
            console.log('All required JavaScript components are available.');
            
            // Initialize the application
            init();
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Error initializing the application: ' + error.message);
        }
    }, 500); // Increased delay to ensure scripts are fully loaded
    
    // Initialize the application
    async function init() {
        try {
            console.log('Initializing application...');
            
            // Initialize UI with default settings first
            UI.init({
                darkMode: false,
                roundedValues: true
            });
            
            // Then initialize storage
            await BillStorageManager.init();
            console.log('Storage initialized');
            
            // Load settings from storage
            await loadSettings();
            console.log('Settings loaded');
            
            // Now update UI with loaded settings
            UI.updateSettingsUI(appSettings);
            
            // Set up event handlers
            setupEventHandlers();
            console.log('Event handlers set up');
            
            // Load most recent readings as previous readings
            await loadMostRecentReading();
            console.log('Most recent reading loaded');
            
            // Set default rate values
            const rateElement = document.getElementById('ratePerKwh');
            const standingChargeElement = document.getElementById('standingCharge');
            
            if (rateElement) rateElement.value = appSettings.defaultRatePerKwh;
            if (standingChargeElement) standingChargeElement.value = appSettings.defaultStandingCharge;
            
            // Update storage usage display
            updateStorageUsage();
            
            // Set default date
            const dateInput = document.getElementById('currDate');
            if (dateInput && !dateInput.value) {
                const today = new Date();
                const day = String(today.getDate()).padStart(2, '0');
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();
                dateInput.value = `${day}-${month}-${year}`;
            }
            
            console.log('Application initialization complete');
        } catch (error) {
            console.error('Initialization error:', error);
            // Try to show alert, but use vanilla JS as fallback
            try {
                UI.showAlert('Error initializing the application. Please try refreshing the page.', 'danger');
            } catch (e) {
                console.error('Could not show UI alert:', e);
                alert('Error initializing the application. Please try refreshing the page.');
            }
        }
    }
    
    /**
     * Set up all event handlers
     */
    function setupEventHandlers() {
        // Calculator tab events
        UI.on('onCalculateClicked', handleCalculation);
        UI.on('onGeneratePdfClicked', generatePdf);
        UI.on('onSaveReadingClicked', saveReading);
        
        // History tab events
        UI.on('onHistoryTabSelected', loadReadingHistory);
        UI.on('onHistoryFilterChanged', handleHistoryFilter);
        UI.on('onViewReadingClicked', viewReadingDetails);
        UI.on('onUseAsPreviousClicked', useAsPreviousReading);
        UI.on('onDeleteReadingConfirmed', deleteReading);
        UI.on('onExportDataClicked', exportData);
        UI.on('onImportFileSelected', importData);
        UI.on('onGeneratePdfForReading', generatePdfFromHistory);
        
        // Settings tab events
        UI.on('onSettingsTabSelected', updateStorageUsage);
        UI.on('onDarkModeToggled', toggleDarkMode);
        UI.on('onRoundedValuesToggled', toggleRoundedValues);
        UI.on('onDefaultRateChanged', saveDefaultRate);
        UI.on('onDefaultStandingChargeChanged', saveDefaultStandingCharge);
        UI.on('onPropertyNameChanged', savePropertyName);
        UI.on('onPropertyAddressChanged', savePropertyAddress);
        UI.on('onClearAllDataConfirmed', clearAllData);
    }
    
    /**
     * Load application settings from storage
     */
    async function loadSettings() {
        appSettings.darkMode = await BillStorageManager.getSetting('darkMode', false);
        appSettings.roundedValues = await BillStorageManager.getSetting('roundedValues', true);
        appSettings.defaultRatePerKwh = await BillStorageManager.getSetting('defaultRatePerKwh', 28.0);
        appSettings.defaultStandingCharge = await BillStorageManager.getSetting('defaultStandingCharge', 140.0);
        appSettings.propertyName = await BillStorageManager.getSetting('propertyName', 'My Property');
        appSettings.propertyAddress = await BillStorageManager.getSetting('propertyAddress', '');
        
        // Update settings UI
        UI.updateSettingsUI(appSettings);
    }
    
    /**
     * Load the most recent reading to use as the previous reading
     */
    async function loadMostRecentReading() {
        try {
            const mostRecentReading = await BillStorageManager.getMostRecentReading();
            
            if (mostRecentReading) {
                // Set form data with values from the most recent reading
                UI.setFormData({
                    prevDate: mostRecentReading.date,
                    prevMain: mostRecentReading.mainMeter,
                    prevSub: mostRecentReading.subMeters,
                    ratePerKwh: mostRecentReading.rates ? mostRecentReading.rates.ratePerKwh : appSettings.defaultRatePerKwh,
                    standingCharge: mostRecentReading.rates ? mostRecentReading.rates.standingCharge : appSettings.defaultStandingCharge,
                    standingChargeSplit: mostRecentReading.rates ? mostRecentReading.rates.standingChargeSplit : 'equal',
                    customSplitPercentage: mostRecentReading.rates ? mostRecentReading.rates.customSplitPercentage : 50,
                    subMeterLabels: mostRecentReading.subMeterLabels
                });
            }
        } catch (error) {
            console.error('Error loading most recent reading:', error);
            UI.showAlert('Error loading previous readings.', 'warning');
        }
    }
    
    /**
     * Handle calculation when the calculate button is clicked
     * @param {Object} formData Form data from the UI
     */
    function handleCalculation(formData) {
        // Validate form data
        const validationResult = BillValidator.validateReadingSet(formData);
        
        if (!validationResult.isValid) {
            // Show validation errors
            UI.showAlert(`Please correct the following errors:\n${validationResult.errors.join('\n')}`, 'danger');
            return;
        }
        
        // Show warnings if any
        if (validationResult.warnings.length > 0) {
            console.warn('Validation warnings:', validationResult.warnings);
            UI.showAlert(`Warning: ${validationResult.warnings.join(' ')}`, 'warning');
        }
        
        try {
            // Perform calculation
            currentCalculation = BillCalculator.calculateBill(formData);
            
            // Format calculation for display based on settings
            const formattedCalculation = BillCalculator.formatCalculation(
                currentCalculation, 
                { roundedValues: appSettings.roundedValues }
            );
            
            // Display calculation results
            UI.displayCalculationResult(formattedCalculation);
        } catch (error) {
            console.error('Calculation error:', error);
            UI.showAlert('Error performing calculation. Please check your inputs.', 'danger');
        }
    }
    
    /**
     * Generate PDF from current calculation
     */
    function generatePdf() {
        if (!currentCalculation) {
            UI.showAlert('Please calculate the bill first.', 'warning');
            return;
        }
        
        try {
            // Generate detailed PDF
            const pdf = PDFGenerator.generateBillPDF(currentCalculation, {
                propertyName: appSettings.propertyName,
                propertyAddress: appSettings.propertyAddress
            });
            
            // Generate filename based on date
            const dateStr = currentCalculation.readings.curr.date.replace(/-/g, '');
            const filename = `ElectricityBill_${dateStr}.pdf`;
            
            // Save PDF
            pdf.save(filename);
            
            UI.showAlert('PDF generated successfully.', 'success');
        } catch (error) {
            console.error('PDF generation error:', error);
            UI.showAlert('Error generating PDF.', 'danger');
        }
    }
    
    /**
     * Save current reading and calculation to storage
     */
    async function saveReading() {
        if (!currentCalculation) {
            UI.showAlert('Please calculate the bill first.', 'warning');
            return;
        }
        
        try {
            // Create reading history entry
            const readingEntry = BillCalculator.createReadingHistoryEntry(currentCalculation);
            
            // Save to storage
            await BillStorageManager.saveReading(readingEntry);
            
            UI.showAlert('Reading saved successfully.', 'success');
        } catch (error) {
            console.error('Error saving reading:', error);
            UI.showAlert('Error saving reading.', 'danger');
        }
    }
    
    /**
     * Load reading history
     */
    async function loadReadingHistory() {
        try {
            const readings = await BillStorageManager.getAllReadings();
            const filter = document.getElementById('historyFilter')?.value || 'all';
            
            UI.displayReadingHistory(readings, filter);
        } catch (error) {
            console.error('Error loading reading history:', error);
            UI.showAlert('Error loading reading history.', 'danger');
        }
    }
    
    /**
     * Handle history filter change
     * @param {string} filter Selected filter
     */
    async function handleHistoryFilter(filter) {
        try {
            const readings = await BillStorageManager.getAllReadings();
            UI.displayReadingHistory(readings, filter);
        } catch (error) {
            console.error('Error filtering reading history:', error);
            UI.showAlert('Error filtering reading history.', 'danger');
        }
    }
    
    /**
     * View reading details
     * @param {string} readingId Reading ID
     */
    async function viewReadingDetails(readingId) {
        try {
            const readings = await BillStorageManager.getAllReadings();
            const reading = readings.find(r => r.id.toString() === readingId.toString());
            
            if (reading) {
                UI.showReadingDetailsModal(reading);
            } else {
                UI.showAlert('Reading not found.', 'warning');
            }
        } catch (error) {
            console.error('Error viewing reading details:', error);
            UI.showAlert('Error viewing reading details.', 'danger');
        }
    }
    
    /**
     * Use a reading as the previous reading
     * @param {string} readingId Reading ID
     */
    async function useAsPreviousReading(readingId) {
        try {
            const readings = await BillStorageManager.getAllReadings();
            const reading = readings.find(r => r.id.toString() === readingId.toString());
            
            if (reading) {
                // Set form data with values from the selected reading
                UI.setFormData({
                    prevDate: reading.date,
                    prevMain: reading.mainMeter,
                    prevSub: reading.subMeters,
                    ratePerKwh: reading.rates ? reading.rates.ratePerKwh : appSettings.defaultRatePerKwh,
                    standingCharge: reading.rates ? reading.rates.standingCharge : appSettings.defaultStandingCharge,
                    standingChargeSplit: reading.rates ? reading.rates.standingChargeSplit : 'equal',
                    customSplitPercentage: reading.rates ? reading.rates.customSplitPercentage : 50,
                    subMeterLabels: reading.subMeterLabels
                });
                
                // Switch to calculator tab
                UI.switchTab('calculatorTab');
                
                UI.showAlert('Previous reading updated.', 'success');
            } else {
                UI.showAlert('Reading not found.', 'warning');
            }
        } catch (error) {
            console.error('Error using reading as previous:', error);
            UI.showAlert('Error updating previous reading.', 'danger');
        }
    }
    
    /**
     * Delete a reading
     * @param {string} readingId Reading ID
     */
    async function deleteReading(readingId) {
        try {
            await BillStorageManager.deleteReading(parseInt(readingId));
            
            // Reload reading history
            await loadReadingHistory();
            
            UI.showAlert('Reading deleted successfully.', 'success');
        } catch (error) {
            console.error('Error deleting reading:', error);
            UI.showAlert('Error deleting reading.', 'danger');
        }
    }
    
    /**
     * Export all data
     */
    async function exportData() {
        try {
            // Get all data from storage
            const data = await BillStorageManager.exportData();
            
            // Convert to JSON string
            const jsonString = JSON.stringify(data, null, 2);
            
            // Create blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // Set link properties
            link.href = url;
            link.download = `ElectricityBillData_${new Date().toISOString().slice(0, 10)}.json`;
            
            // Append to document, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            UI.showAlert('Data exported successfully.', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            UI.showAlert('Error exporting data.', 'danger');
        }
    }
    
    /**
     * Import data from a file
     * @param {File} file The file to import
     */
    async function importData(file) {
        try {
            // Show confirmation modal
            UI.showConfirmationModal(
                'Import Data',
                'Importing data will replace all existing data. Are you sure you want to continue?',
                async () => {
                    try {
                        // Read file as text
                        const fileText = await readFileAsText(file);
                        
                        // Parse JSON
                        const data = JSON.parse(fileText);
                        
                        // Import data
                        await BillStorageManager.importData(data);
                        
                        // Reload settings
                        await loadSettings();
                        
                        // Reload most recent reading
                        await loadMostRecentReading();
                        
                        // Reload reading history if on history tab
                        if (document.getElementById('historyTab')?.classList.contains('active')) {
                            await loadReadingHistory();
                        }
                        
                        // Update storage usage
                        await updateStorageUsage();
                        
                        UI.showAlert('Data imported successfully.', 'success');
                    } catch (error) {
                        console.error('Error importing data:', error);
                        UI.showAlert('Error importing data. Please make sure the file is valid.', 'danger');
                    }
                }
            );
        } catch (error) {
            console.error('Error preparing to import data:', error);
            UI.showAlert('Error preparing to import data.', 'danger');
        }
    }
    
    /**
     * Read a file as text
     * @param {File} file The file to read
     * @returns {Promise<string>} The file contents as text
     */
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Generate PDF from a reading in history
     * @param {Object} reading Reading data
     */
    function generatePdfFromHistory(reading) {
        try {
            // Generate PDF (either detailed or summary based on available data)
            let pdf;
            
            if (reading.usages && reading.costs) {
                // We have full calculation data
                pdf = PDFGenerator.generateBillPDF(
                    {
                        periodDays: reading.periodDays,
                        readings: {
                            prev: {
                                date: reading.prevDate,
                                main: null, // We might not have this information
                                sub: []
                            },
                            curr: {
                                date: reading.date,
                                main: reading.mainMeter,
                                sub: reading.subMeters
                            }
                        },
                        rates: reading.rates,
                        usages: reading.usages,
                        costs: reading.costs,
                        meterLabels: {
                            property: 'Main Property',
                            subMeters: reading.subMeterLabels || []
                        }
                    },
                    {
                        propertyName: appSettings.propertyName,
                        propertyAddress: appSettings.propertyAddress
                    }
                );
            } else {
                // We only have basic reading data
                pdf = PDFGenerator.generateSummaryPDF(
                    {
                        readings: {
                            prev: {
                                date: reading.prevDate || 'Unknown',
                                main: null,
                                sub: []
                            },
                            curr: {
                                date: reading.date,
                                main: reading.mainMeter,
                                sub: reading.subMeters
                            }
                        }
                    },
                    {
                        propertyName: appSettings.propertyName
                    }
                );
            }
            
            // Generate filename based on date
            const dateStr = reading.date.replace(/-/g, '');
            const filename = `ElectricityBill_${dateStr}.pdf`;
            
            // Save PDF
            pdf.save(filename);
            
            UI.showAlert('PDF generated successfully.', 'success');
        } catch (error) {
            console.error('PDF generation error:', error);
            UI.showAlert('Error generating PDF.', 'danger');
        }
    }
    
    /**
     * Toggle dark mode
     * @param {boolean} enabled Whether dark mode is enabled
     */
    async function toggleDarkMode(enabled) {
        try {
            // Update app settings
            appSettings.darkMode = enabled;
            
            // Save to storage
            await BillStorageManager.saveSetting('darkMode', enabled);
        } catch (error) {
            console.error('Error saving dark mode setting:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Toggle rounded values
     * @param {boolean} enabled Whether rounded values is enabled
     */
    async function toggleRoundedValues(enabled) {
        try {
            // Update app settings
            appSettings.roundedValues = enabled;
            
            // Save to storage
            await BillStorageManager.saveSetting('roundedValues', enabled);
            
            // Update calculation display if available
            if (currentCalculation) {
                const formattedCalculation = BillCalculator.formatCalculation(
                    currentCalculation, 
                    { roundedValues: enabled }
                );
                
                // Display calculation results
                UI.displayCalculationResult(formattedCalculation);
            }
        } catch (error) {
            console.error('Error saving rounded values setting:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Save default rate
     * @param {number} rate Default rate per kWh
     */
    async function saveDefaultRate(rate) {
        try {
            // Validate rate
            if (isNaN(rate) || rate <= 0) {
                UI.showAlert('Rate must be a positive number.', 'warning');
                return;
            }
            
            // Update app settings
            appSettings.defaultRatePerKwh = rate;
            
            // Save to storage
            await BillStorageManager.saveSetting('defaultRatePerKwh', rate);
        } catch (error) {
            console.error('Error saving default rate:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Save default standing charge
     * @param {number} charge Default standing charge
     */
    async function saveDefaultStandingCharge(charge) {
        try {
            // Validate charge
            if (isNaN(charge) || charge <= 0) {
                UI.showAlert('Standing charge must be a positive number.', 'warning');
                return;
            }
            
            // Update app settings
            appSettings.defaultStandingCharge = charge;
            
            // Save to storage
            await BillStorageManager.saveSetting('defaultStandingCharge', charge);
        } catch (error) {
            console.error('Error saving default standing charge:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Save property name
     * @param {string} name Property name
     */
    async function savePropertyName(name) {
        try {
            // Update app settings
            appSettings.propertyName = name;
            
            // Save to storage
            await BillStorageManager.saveSetting('propertyName', name);
        } catch (error) {
            console.error('Error saving property name:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Save property address
     * @param {string} address Property address
     */
    async function savePropertyAddress(address) {
        try {
            // Update app settings
            appSettings.propertyAddress = address;
            
            // Save to storage
            await BillStorageManager.saveSetting('propertyAddress', address);
        } catch (error) {
            console.error('Error saving property address:', error);
            UI.showAlert('Error saving setting.', 'danger');
        }
    }
    
    /**
     * Clear all data
     */
    async function clearAllData() {
        try {
            // Clear all data from storage
            await BillStorageManager.clearAllData();
            
            // Reset app settings to defaults
            appSettings = {
                darkMode: false,
                roundedValues: true,
                defaultRatePerKwh: 28.0,
                defaultStandingCharge: 140.0,
                propertyName: 'My Property',
                propertyAddress: ''
            };
            
            // Update settings UI
            UI.updateSettingsUI(appSettings);
            
            // Clear previous readings
            UI.setFormData({
                prevDate: '01-01-2023',
                prevMain: '0',
                prevSub: ['0'],
                ratePerKwh: appSettings.defaultRatePerKwh,
                standingCharge: appSettings.defaultStandingCharge
            });
            
            // Clear results
            const resultsCard = document.getElementById('resultsCard');
            if (resultsCard) resultsCard.classList.add('hidden');
            currentCalculation = null;
            
            // Reload reading history if on history tab
            if (document.getElementById('historyTab')?.classList.contains('active')) {
                await loadReadingHistory();
            }
            
            // Update storage usage
            await updateStorageUsage();
            
            UI.showAlert('All data cleared successfully.', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            UI.showAlert('Error clearing data.', 'danger');
        }
    }
    
    /**
     * Update storage usage display
     */
    async function updateStorageUsage() {
        try {
            const usageInBytes = await BillStorageManager.getStorageUsage();
            UI.updateStorageUsage(usageInBytes);
        } catch (error) {
            console.error('Error updating storage usage:', error);
        }
    }
});