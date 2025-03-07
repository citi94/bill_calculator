/**
 * Main Application Module
 * 
 * Coordinates between all other modules and handles application logic
 */

document.addEventListener('DOMContentLoaded', function() {
    // Ensure all DOM elements are fully loaded before accessing them
    setTimeout(function() {
        // Check if all required JavaScript objects are available
        if (!window.BillValidator) {
            console.error('BillValidator is not defined. Make sure validation.js is loaded correctly.');
            alert('Error: Required JavaScript components are missing. Please check the console for details.');
            return;
        }
        
        if (!window.BillStorageManager) {
            console.error('BillStorageManager is not defined. Make sure storage.js is loaded correctly.');
            alert('Error: Required JavaScript components are missing. Please check the console for details.');
            return;
        }
        
        if (!window.BillCalculator) {
            console.error('BillCalculator is not defined. Make sure calculator.js is loaded correctly.');
            alert('Error: Required JavaScript components are missing. Please check the console for details.');
            return;
        }
        
        if (!window.PDFGenerator) {
            console.error('PDFGenerator is not defined. Make sure pdf.js is loaded correctly.');
            alert('Error: Required JavaScript components are missing. Please check the console for details.');
            return;
        }
        
        if (!window.UI) {
            console.error('UI is not defined. Make sure ui.js is loaded correctly.');
            alert('Error: Required JavaScript components are missing. Please check the console for details.');
            return;
        }
        
        // All required objects are available, proceed with initialization
        console.log('All required JavaScript components are loaded.');

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
            const filter = document.getElementById('historyFilter').value;
            
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
            const readings = await StorageManager.getAllReadings();
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
            const readings = await StorageManager.getAllReadings();
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
            const readings = await StorageManager.getAllReadings();
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
                        if (document.getElementById('historyTab').classList.contains('active')) {
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
            document.getElementById('resultsCard').classList.add('hidden');
            currentCalculation = null;
            
            // Reload reading history if on history tab
            if (document.getElementById('historyTab').classList.contains('active')) {
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
    
    // Initialize the application
    init();
    }, 500); // Increased delay to ensure scripts are fully loaded
});