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
     * @param {number} mainConsumption Main meter consumption (difference between readings)
     * @param {Array<number>} subConsumptions Array of sub-meter consumptions (differences)
     * @returns {Object} Validation result
     */
    function validateSubMeters(mainConsumption, subConsumptions) {
        const result = { isValid: false, message: '' };
        
        // Calculate total of sub-meter consumptions
        const subTotal = subConsumptions.reduce((sum, consumption) => sum + consumption, 0);
        
        if (subTotal > mainConsumption) {
            result.message = `Sub-meter usage (${subTotal.toFixed(2)} kWh) cannot exceed main meter usage (${mainConsumption.toFixed(2)} kWh)`;
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
            
            // Calculate consumptions instead of comparing raw readings
            const mainConsumption = currMainResult.value - prevMainResult.value;
            const subConsumptions = subResults.curr.map((curr, i) => curr.value - subResults.prev[i].value);
            
            // Use the updated validateSubMeters function to check consumption
            const subMetersValidation = validateSubMeters(mainConsumption, subConsumptions);
            
            if (!subMetersValidation.isValid) {
                result.isValid = false;
                result.errors.push(subMetersValidation.message);
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
// BillStorageManager is defined in index.html using localStorage
// This section was previously creating a duplicate definition causing errors
// Instead of defining it here, we'll just check if it exists and use it

// Add a check to ensure BillStorageManager exists before trying to use it
(function() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.BillStorageManager) {
            console.error('BillStorageManager not found. The storage functionality may be limited.');
            // Create minimal fallback if missing
            window.BillStorageManager = {
                init: function() {
                    console.log('Initializing fallback storage manager');
                    // Create empty structures if they don't exist
                    if (!localStorage.getItem('electricity_readings')) {
                        localStorage.setItem('electricity_readings', JSON.stringify([]));
                    }
                    if (!localStorage.getItem('electricity_settings')) {
                        localStorage.setItem('electricity_settings', JSON.stringify({
                            defaultRatePerKwh: 28.0,
                            defaultStandingCharge: 53.0,
                            darkMode: false,
                            roundedValues: true
                        }));
                    }
                },
                getAllReadings: async function() {
                    try {
                        return JSON.parse(localStorage.getItem('electricity_readings') || '[]');
                    } catch (error) {
                        console.error('Error getting readings:', error);
                        return [];
                    }
                },
                getMostRecentReading: async function() {
                    try {
                        const readings = JSON.parse(localStorage.getItem('electricity_readings') || '[]');
                        if (readings.length === 0) return null;
                        
                        readings.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
                        return readings[0];
                    } catch (error) {
                        console.error('Error getting most recent reading:', error);
                        return null;
                    }
                },
                saveReading: async function(reading) {
                    try {
                        const readings = JSON.parse(localStorage.getItem('electricity_readings') || '[]');
                        reading.id = `reading_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
                        readings.push(reading);
                        localStorage.setItem('electricity_readings', JSON.stringify(readings));
                        return { success: true };
                    } catch (error) {
                        console.error('Error saving reading:', error);
                        return { success: false, error: error.message };
                    }
                },
                getSettings: function() {
                    return JSON.parse(localStorage.getItem('electricity_settings') || '{}');
                },
                saveSettings: function(settings) {
                    localStorage.setItem('electricity_settings', JSON.stringify(settings));
                    return true;
                },
                getStorageUsage: function() {
                    const readings = localStorage.getItem('electricity_readings') || '[]';
                    const settings = localStorage.getItem('electricity_settings') || '{}';
                    const totalSize = (readings.length + settings.length) / 1024;
                    const readingsCount = JSON.parse(readings).length;
                    return {
                        totalSize: `${totalSize.toFixed(2)} KB`,
                        readingsCount,
                        limit: '5MB'
                    };
                },
                exportData: function() {
                    return {
                        readings: JSON.parse(localStorage.getItem('electricity_readings') || '[]'),
                        settings: JSON.parse(localStorage.getItem('electricity_settings') || '{}'),
                        timestamp: new Date().toISOString()
                    };
                },
                importData: function(data) {
                    if (data.readings) {
                        localStorage.setItem('electricity_readings', JSON.stringify(data.readings));
                    }
                    if (data.settings) {
                        localStorage.setItem('electricity_settings', JSON.stringify(data.settings));
                    }
                    return { success: true };
                },
                clearAllData: function() {
                    const backup = {
                        readings: JSON.parse(localStorage.getItem('electricity_readings') || '[]'),
                        settings: JSON.parse(localStorage.getItem('electricity_settings') || '{}'),
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('electricity_backup', JSON.stringify(backup));
                    localStorage.setItem('electricity_readings', JSON.stringify([]));
                    return { success: true };
                }
            };
        }
        
        // Ensure initialization is called
        if (window.BillStorageManager && window.BillStorageManager.init) {
            window.BillStorageManager.init();
        }
    });
})();

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
        // Create a new PDF in portrait mode
        const doc = new jsPDF();
        
        // PDF configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 15;
        
        // ======== UTILITY FUNCTIONS ========
        const formatCurrency = (value) => `£${parseFloat(value).toFixed(2)}`;
        const formatNumber = (num, decimals = 1) => parseFloat(num).toFixed(decimals);
        
        // Add new page and reset position
        const addNewPage = () => {
            doc.addPage();
            yPos = 15;
            // Add page header and footer
            addPageHeader();
            addPageFooter();
        };
        
        // Check if we need to add a new page
        const checkPageBreak = (neededSpace) => {
            if (yPos + neededSpace > pageHeight - 40) {
                addNewPage();
                return true;
            }
            return false;
        };
        
        // ======== STYLE FUNCTIONS ========
        // Function to add a page header to each page
        const addPageHeader = () => {
            // Add minimal header text
            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.5);
            doc.line(margin, 12, pageWidth - margin, 12);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("ELECTRICITY BILL", margin, 10);
            
            const dateText = new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            doc.text(dateText, pageWidth - margin, 10, { align: 'right' });
        };
        
        // Function to add a page footer
        const addPageFooter = () => {
            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.5);
            doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("Generated with Electricity Bill Calculator", margin, pageHeight - 12);
            doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
        };
        
        // Function to create a styled section title
        const addSectionTitle = (title, withBackground = false) => {
            if (withBackground) {
                doc.setFillColor(230, 230, 230);
                doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 12, 'F');
            } else {
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.1);
                doc.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
            }
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(11);
            doc.setTextColor(50, 50, 50);
            doc.text(title.toUpperCase(), margin, yPos + 3);
            yPos += 14;
        };
        
        // ======== BEGIN PDF GENERATION ========
        // Add first page header and footer
        addPageHeader();
        addPageFooter();
        
        // ======== INVOICE HEADER ========
        // Major title
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text("ELECTRICITY INVOICE", pageWidth / 2, yPos + 10, { align: 'center' });
        yPos += 25;
        
        // Add property information
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        
        // Invoice details box (right side)
        const boxWidth = 80;
        const boxHeight = 50;
        const boxX = pageWidth - margin - boxWidth;
        const boxY = yPos - 10;
        
        // Draw invoice details box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2);
        
        // Add invoice details text
        doc.setFontSize(9);
        doc.text("INVOICE DETAILS", boxX + 5, boxY + 8);
        doc.setFontSize(8);
        doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-GB')}`, boxX + 5, boxY + 18);
        doc.text(`Billing Period: ${calculation.readings.prev.date} to ${calculation.readings.curr.date}`, boxX + 5, boxY + 26);
        doc.text(`Days: ${calculation.periodDays}`, boxX + 5, boxY + 34);
        
        // Property details (left side)
        if (options.propertyName) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(options.propertyName, margin, yPos);
            doc.setFont(undefined, 'normal');
            yPos += 8;
            
            if (options.propertyAddress) {
                doc.setFontSize(9);
                const addressLines = options.propertyAddress.split('\n');
                for (const line of addressLines) {
                    doc.text(line, margin, yPos);
                    yPos += 5;
                }
            }
        }
        
        // Skip to after the box position
        yPos = Math.max(yPos + 10, boxY + boxHeight + 15);
        
        // ======== INVOICE SUMMARY ========
        // Add a highlighted summary box
        const summaryBoxWidth = pageWidth - (margin * 2);
        const summaryBoxHeight = 40;
        const summaryBoxY = yPos;
        
        // Draw summary box with gradient-like effect
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 'F');
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, summaryBoxY + 20, summaryBoxWidth, summaryBoxHeight - 20, 'F');
        
        // Add summary text
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("ELECTRICITY CONSUMPTION", margin + 10, summaryBoxY + 10);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Usage: ${formatNumber(calculation.usages.total)} kWh`, margin + 10, summaryBoxY + 30);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("TOTAL DUE:", pageWidth - margin - 90, summaryBoxY + 30);
        doc.setFontSize(16);
        doc.text(`${formatCurrency(calculation.costs.total)}`, pageWidth - margin - 10, summaryBoxY + 30, { align: 'right' });
        doc.setFont(undefined, 'normal');
        
        yPos = summaryBoxY + summaryBoxHeight + 20;
        
        // ======== METER READINGS ========
        addSectionTitle("METER READINGS", true);
        
        // Table columns configuration
        const colWidths = [50, 35, 35, 35];
        const col1 = margin;
        const col2 = col1 + colWidths[0] + 5;
        const col3 = col2 + colWidths[1] + 5;
        const col4 = col3 + colWidths[2] + 5;
        
        // Table header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 10, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'bold');
        doc.text("METER", col1, yPos);
        doc.text("PREVIOUS", col2, yPos);
        doc.text("CURRENT", col3, yPos);
        doc.text("USAGE (kWh)", col4, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 12;
        
        // Main meter
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Main Meter", col1, yPos);
        doc.text(formatNumber(calculation.readings.prev.main), col2, yPos);
        doc.text(formatNumber(calculation.readings.curr.main), col3, yPos);
        doc.text(formatNumber(calculation.usages.main), col4, yPos);
        yPos += 8;
        
        // Sub meters
        for (let i = 0; i < calculation.readings.prev.sub.length; i++) {
            const label = calculation.meterLabels.subMeters[i] || `Sub Meter ${i+1}`;
            doc.text(label, col1, yPos);
            doc.text(formatNumber(calculation.readings.prev.sub[i]), col2, yPos);
            doc.text(formatNumber(calculation.readings.curr.sub[i]), col3, yPos);
            doc.text(formatNumber(calculation.usages.subMeters[i]), col4, yPos);
            yPos += 8;
        }
        
        // Main property (derived)
        doc.setFont(undefined, 'bold');
        doc.text("Main Property (derived)", col1, yPos);
        doc.text("-", col2, yPos);
        doc.text("-", col3, yPos);
        doc.text(formatNumber(calculation.usages.property), col4, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 15;
        
        // ======== RATES SECTION ========
        checkPageBreak(50);
        addSectionTitle("RATE INFORMATION", true);
        
        const rateCol1 = margin + 5;
        const rateCol2 = margin + 100;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Rate per kWh
        doc.text("Rate per kWh:", rateCol1, yPos);
        doc.text(`${calculation.rates.ratePerKwh} pence (${formatCurrency(calculation.rates.ratePerKwh/100)} per kWh)`, rateCol2, yPos);
        yPos += 8;
        
        // Standing charge
        doc.text("Standing Charge:", rateCol1, yPos);
        doc.text(`${calculation.rates.standingCharge} pence per day (${formatCurrency(calculation.rates.standingCharge/100)} per day)`, rateCol2, yPos);
        yPos += 8;
        
        // Standing charge total
        doc.text("Total Standing Charge:", rateCol1, yPos);
        doc.text(`${formatCurrency(calculation.costs.totalStandingCharge)} for ${calculation.periodDays} days`, rateCol2, yPos);
        yPos += 8;
        
        // Standing charge split method
        let splitMethod = "";
        switch (calculation.rates.standingChargeSplit) {
            case 'equal': splitMethod = "Equal split between all meters"; break;
            case 'usage': splitMethod = "Split based on usage proportion"; break;
            case 'custom': splitMethod = `Custom split (Main Property: ${calculation.rates.customSplitPercentage}%)`; break;
            default: splitMethod = "Equal split";
        }
        
        doc.text("Standing Charge Split:", rateCol1, yPos);
        doc.text(splitMethod, rateCol2, yPos);
        yPos += 15;
        
        // ======== COST BREAKDOWN ========
        checkPageBreak(60);
        addSectionTitle("COST BREAKDOWN", true);
        
        // Cost table header
        const costCol1 = margin;
        const costCol2 = margin + 65;
        const costCol3 = margin + 100;
        const costCol4 = margin + 140;
        const costCol5 = pageWidth - margin - 10;
        
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 10, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'bold');
        doc.text("METER", costCol1, yPos);
        doc.text("USAGE (kWh)", costCol2, yPos);
        doc.text("ENERGY (£)", costCol3, yPos);
        doc.text("STANDING (£)", costCol4, yPos);
        doc.text("TOTAL (£)", costCol5, yPos, { align: 'right' });
        doc.setFont(undefined, 'normal');
        yPos += 12;
        
        // Zebra striping function for rows
        const addRowBackground = (index) => {
            if (index % 2 === 1) {
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8, 'F');
            }
        };
        
        // Cost rows
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Main property
        addRowBackground(0);
        doc.text(calculation.meterLabels.property, costCol1, yPos);
        doc.text(formatNumber(calculation.costs.property.usage), costCol2, yPos);
        doc.text(formatCurrency(calculation.costs.property.energyCost), costCol3, yPos);
        doc.text(formatCurrency(calculation.costs.property.standingCharge), costCol4, yPos);
        doc.text(formatCurrency(calculation.costs.property.total), costCol5, yPos, { align: 'right' });
        yPos += 8;
        
        // Sub meters
        calculation.costs.subMeters.forEach((subMeter, index) => {
            addRowBackground(index + 1);
            doc.text(subMeter.label, costCol1, yPos);
            doc.text(formatNumber(subMeter.usage), costCol2, yPos);
            doc.text(formatCurrency(subMeter.energyCost), costCol3, yPos);
            doc.text(formatCurrency(subMeter.standingCharge), costCol4, yPos);
            doc.text(formatCurrency(subMeter.total), costCol5, yPos, { align: 'right' });
            yPos += 8;
        });
        
        // Total row
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 10, 'F');
        
        // Calculate total energy cost
        const totalEnergyCost = calculation.costs.property.energyCost + 
                               calculation.costs.subMeters.reduce((sum, meter) => sum + meter.energyCost, 0);
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text("TOTAL", costCol1, yPos);
        doc.text(formatNumber(calculation.usages.total), costCol2, yPos);
        doc.text(formatCurrency(totalEnergyCost), costCol3, yPos);
        doc.text(formatCurrency(calculation.costs.totalStandingCharge), costCol4, yPos);
        doc.text(formatCurrency(calculation.costs.total), costCol5, yPos, { align: 'right' });
        doc.setFont(undefined, 'normal');
        yPos += 20;
        
        // ======== PAYMENT INFORMATION ========
        checkPageBreak(40);
        addSectionTitle("PAYMENT INFORMATION");
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Please make payment within 14 days of receipt of this bill.", margin, yPos);
        yPos += 8;
        doc.text("For any queries regarding this bill, please contact the property manager.", margin, yPos);
        yPos += 15;
        
        // Add a note about calculations
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Note: This bill was calculated based on the meter readings provided.", margin, yPos);
        yPos += 6;
        doc.text("All costs include VAT where applicable.", margin, yPos);
        
        return doc;
    }
    
    /**
     * Generate a summary PDF report from a calculation result
     * @param {Object} calculation The calculation result
     * @param {Object} options Additional options for the PDF
     * @returns {jsPDF} The PDF document object
     */
    function generateSummaryPDF(calculation, options = {}) {
        // Initialize jsPDF in landscape for the summary
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // PDF configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 20;
        
        // Utility functions
        const formatCurrency = (value) => `£${parseFloat(value).toFixed(2)}`;
        const formatNumber = (num, decimals = 1) => parseFloat(num).toFixed(decimals);
        
        // Function to add section title
        const addSectionTitle = (title) => {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text(title.toUpperCase(), margin, yPos + 10);
            yPos += 20;
        };
        
        // Add document title
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text("ELECTRICITY BILL SUMMARY", pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Add property info and period
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');
        
        if (options.propertyName) {
            doc.text(options.propertyName, pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;
        }
        
        doc.text(`Period: ${calculation.readings.prev.date} to ${calculation.readings.curr.date} (${calculation.periodDays} days)`, 
            pageWidth / 2, yPos, { align: 'center' });
        yPos += 25;
        
        // Create a visual summary box
        const boxWidth = 260;
        const boxHeight = 100;
        const boxX = (pageWidth - boxWidth) / 2;
        const boxY = yPos;
        
        // Draw outer box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 5, 5, 'FD');
        
        // Draw inner sections
        doc.setFillColor(240, 240, 240);
        doc.rect(boxX, boxY + 30, boxWidth, 30, 'F');
        
        // Add content to box
        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'bold');
        doc.text("ELECTRICITY BILL", boxX + (boxWidth / 2), boxY + 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Total Usage:", boxX + 20, boxY + 50);
        doc.text(`${formatNumber(calculation.usages.total)} kWh`, boxX + boxWidth - 20, boxY + 50, { align: 'right' });
        
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text("TOTAL DUE:", boxX + 20, boxY + 85);
        doc.setFontSize(20);
        doc.text(formatCurrency(calculation.costs.total), boxX + boxWidth - 20, boxY + 85, { align: 'right' });
        
        yPos = boxY + boxHeight + 30;
        
        // Add usage breakdown
        addSectionTitle("USAGE BREAKDOWN");
        
        const colWidth = (pageWidth - (margin * 2)) / 4;
        const usageCol1 = margin + 10;
        const usageCol2 = margin + colWidth;
        const usageCol3 = margin + (colWidth * 2);
        const usageCol4 = margin + (colWidth * 3);
        
        // Headers
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'bold');
        doc.text("METER", usageCol1, yPos);
        doc.text("USAGE (kWh)", usageCol2, yPos);
        doc.text("COST (£)", usageCol3, yPos);
        doc.text("% OF TOTAL", usageCol4, yPos);
        yPos += 10;
        
        // Main property
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'normal');
        doc.text(calculation.meterLabels.property, usageCol1, yPos);
        doc.text(formatNumber(calculation.usages.property), usageCol2, yPos);
        doc.text(formatCurrency(calculation.costs.property.total), usageCol3, yPos);
        const propertyPercent = (calculation.costs.property.total / calculation.costs.total * 100).toFixed(1);
        doc.text(`${propertyPercent}%`, usageCol4, yPos);
        yPos += 8;
        
        // Sub meters
        calculation.costs.subMeters.forEach(subMeter => {
            doc.text(subMeter.label, usageCol1, yPos);
            doc.text(formatNumber(subMeter.usage), usageCol2, yPos);
            doc.text(formatCurrency(subMeter.total), usageCol3, yPos);
            const percent = (subMeter.total / calculation.costs.total * 100).toFixed(1);
            doc.text(`${percent}%`, usageCol4, yPos);
            yPos += 8;
        });
        
        // Add a horizontal divider
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Generated with Electricity Bill Calculator", margin, pageHeight - 10);
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        
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
        elements.setPrevDateBtn = safeGetElement('setPrevDateBtn');
        
        // Skip removed elements but set to null to avoid errors elsewhere
        elements.loadLastReadingBtn = null; // Removed in UI simplification
        elements.loadFromHistoryBtn = null; // Removed in UI simplification
        
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
        
        // History tab (removed - set to null)
        elements.historyTab = null; // Removed in UI simplification
        elements.historyTable = null; // Removed in UI simplification
        elements.historyFilter = null; // Removed in UI simplification
        elements.historyEmptyState = null; // Removed in UI simplification
        
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
        elements.modalHeader = safeGetElement('modalHeader');
        elements.modalTitle = safeGetElement('modalTitle');
        elements.modalBody = safeGetElement('modalBody');
        elements.modalFooter = safeGetElement('modalFooter');
        elements.modalCloseBtn = safeGetElement('modalCloseBtn');
        elements.modalCancelBtn = safeGetElement('modalCancelBtn');
        elements.modalConfirmBtn = safeGetElement('modalConfirmBtn');
        
        // Privacy link
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
        
        // Fallback if elements are missing
        if (!elements.tabButtons || !elements.tabContents) {
            console.warn('Tab elements not available, trying direct DOM access');
            
            // Direct DOM access as fallback
            const allTabButtons = document.querySelectorAll('.tab-button, [role="tab"], button');
            const allTabContents = document.querySelectorAll('.tab-content, [role="tabpanel"], section');
            
            // Find button by content or ID
            let targetButton = null;
            let targetContent = null;
            
            switch(tabId) {
                case 'calculatorTab':
                    targetButton = Array.from(allTabButtons).find(btn => 
                        btn.textContent.includes('Calculator') || btn.id.includes('Calculator'));
                    targetContent = document.getElementById('calculatorTab') || 
                        Array.from(allTabContents).find(content => content.id.includes('calculator'));
                    break;
                // History tab removed - case removed
                case 'settingsTab':
                    targetButton = Array.from(allTabButtons).find(btn => 
                        btn.textContent.includes('Settings') || btn.id.includes('Settings'));
                    targetContent = document.getElementById('settingsTab') || 
                        Array.from(allTabContents).find(content => content.id.includes('settings'));
                    break;
            }
            
            // Update active classes
            if (targetButton) {
                allTabButtons.forEach(btn => btn.classList.remove('active'));
                targetButton.classList.add('active');
            }
            
            if (targetContent) {
                allTabContents.forEach(content => content.classList.remove('active'));
                targetContent.classList.add('active');
            }
            
            // Update state
            state.currentTab = tabId;
            
            // Handle special tab behaviors - history tab removed
            if (tabId === 'settingsTab' && eventHandlers.onSettingsTabSelected) {
                eventHandlers.onSettingsTabSelected();
            }
            
            return;
        }
        
        // Regular tab switching with cached elements
        elements.tabButtons.forEach(button => {
            if (button) {
                if (button.id === tabId.replace('Tab', '') || 
                    button.textContent.trim().toLowerCase() === tabId.replace('Tab', '').toLowerCase()) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
        
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
        
        // Special handling for tabs - history tab removed
        if (tabId === 'settingsTab') {
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
        safeAddEventListener(elements.setPrevDateBtn, 'click', setPreviousDate);
        
        // Skip events for removed buttons
        // These elements no longer exist in the UI
        /*
        safeAddEventListener(elements.loadLastReadingBtn, 'click', () => {
            if (eventHandlers.onLoadLastReadingClicked) {
                eventHandlers.onLoadLastReadingClicked();
            }
        });
        safeAddEventListener(elements.loadFromHistoryBtn, 'click', () => {
            if (eventHandlers.onLoadFromHistoryClicked) {
                eventHandlers.onLoadFromHistoryClicked();
            }
        });
        */
        
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
        
        // History tab - skip removed elements
        /*
        safeAddEventListener(elements.historyFilter, 'change', () => {
            if (eventHandlers.onHistoryFilterChanged) {
                eventHandlers.onHistoryFilterChanged(elements.historyFilter.value);
            }
        });
        */
        
        // Data management buttons
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
     * Set previous date field to today's date
     */
    function setPreviousDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        
        if (elements.prevDate) {
            elements.prevDate.value = `${day}-${month}-${year}`;
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
    function showFirstTimeSetup() {
        // Create a modal for first-time setup
        if (!elements.modalTitle || !elements.modalBody || !elements.modalConfirmBtn || !elements.modalOverlay) {
            console.error('Modal elements not found');
            return;
        }
        
        // Set title
        elements.modalTitle.textContent = 'Welcome to Electricity Bill Calculator';
        
        // Create form content
        elements.modalBody.innerHTML = `
            <div class="first-time-setup">
                <p>It looks like this is your first time using the app. Please enter your initial meter readings:</p>
                
                <div class="form-group">
                    <label for="initialDate">Initial Reading Date:</label>
                    <input type="text" id="initialDate" placeholder="DD-MM-YYYY" class="form-control">
                </div>
                
                <div class="form-group">
                    <label for="initialMainMeter">Main Meter Reading (kWh):</label>
                    <input type="number" id="initialMainMeter" step="0.01" min="0" class="form-control">
                </div>
                
                <div id="initialSubMetersContainer">
                    <div class="form-group">
                        <label for="initialSubMeter_0">Sub Meter Reading (kWh):</label>
                        <input type="number" id="initialSubMeter_0" step="0.01" min="0" class="form-control">
                        <input type="text" id="initialSubMeterLabel_0" placeholder="Label (e.g., Coffee Shop)" value="Coffee Shop">
                    </div>
                </div>
                
                <button id="addInitialSubMeterBtn" class="secondary-button">
                    <i class="fas fa-plus"></i> Add Another Sub Meter
                </button>
            </div>
        `;
        
        // Set button text
        elements.modalConfirmBtn.textContent = 'Save Initial Readings';
        elements.modalCancelBtn.textContent = 'Use Default Values';
        
        // Set up event listeners
        const addInitialSubMeterBtn = document.getElementById('addInitialSubMeterBtn');
        if (addInitialSubMeterBtn) {
            addInitialSubMeterBtn.addEventListener('click', addInitialSubMeterField);
        }
        
        // Set today's date in the initial date field
        const initialDateField = document.getElementById('initialDate');
        if (initialDateField) {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            initialDateField.value = `${day}-${month}-${year}`;
        }
        
        // Set confirm button action
        elements.modalConfirmBtn.onclick = () => {
            const initialData = getInitialReadingsData();
            closeModal();
            if (eventHandlers.onFirstTimeSetupCompleted) {
                eventHandlers.onFirstTimeSetupCompleted(initialData);
            }
        };
        
        // Set cancel button action
        elements.modalCancelBtn.onclick = () => {
            closeModal();
            if (eventHandlers.onFirstTimeSetupSkipped) {
                eventHandlers.onFirstTimeSetupSkipped();
            }
        };
        
        // Show modal
        elements.modalOverlay.classList.remove('hidden');
    }
    
    function addInitialSubMeterField() {
        const container = document.getElementById('initialSubMetersContainer');
        if (!container) return;
        
        // Count existing sub meters
        const subMeterCount = container.querySelectorAll('.form-group').length;
        
        // Create new sub meter field
        const subMeterGroup = document.createElement('div');
        subMeterGroup.className = 'form-group';
        subMeterGroup.innerHTML = `
            <label for="initialSubMeter_${subMeterCount}">Sub Meter Reading (kWh):</label>
            <input type="number" id="initialSubMeter_${subMeterCount}" step="0.01" min="0" class="form-control">
            <input type="text" id="initialSubMeterLabel_${subMeterCount}" placeholder="Label">
            <button class="icon-button remove-initial-submeter-btn" data-index="${subMeterCount}" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add to container
        container.appendChild(subMeterGroup);
        
        // Add event listener to remove button
        const removeBtn = subMeterGroup.querySelector('.remove-initial-submeter-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const group = document.getElementById(`initialSubMeter_${index}`).closest('.form-group');
                if (group) group.remove();
            });
        }
    }
    
    function getInitialReadingsData() {
        const initialDate = document.getElementById('initialDate')?.value || '';
        const initialMainMeter = document.getElementById('initialMainMeter')?.value || '';
        const container = document.getElementById('initialSubMetersContainer');
        
        const subMeters = [];
        const subMeterLabels = [];
        
        if (container) {
            const subMeterGroups = container.querySelectorAll('.form-group');
            subMeterGroups.forEach((group, index) => {
                const subMeterInput = document.getElementById(`initialSubMeter_${index}`);
                const subMeterLabelInput = document.getElementById(`initialSubMeterLabel_${index}`);
                
                if (subMeterInput) {
                    subMeters.push(subMeterInput.value || '0');
                }
                
                if (subMeterLabelInput) {
                    subMeterLabels.push(subMeterLabelInput.value || `Sub Meter ${index+1}`);
                }
            });
        }
        
        return {
            date: initialDate,
            mainMeter: initialMainMeter,
            subMeters: subMeters,
            subMeterLabels: subMeterLabels
        };
    }
    
    function addNewReadingCycleButton() {
        // Find a good place to add the button
        const calculateBtn = document.getElementById('calculateBtn');
        if (!calculateBtn) return;
        
        // Check if button already exists
        if (document.getElementById('newReadingCycleBtn')) return;
        
        // Create new button
        const newBtn = document.createElement('button');
        newBtn.id = 'newReadingCycleBtn';
        newBtn.className = 'secondary-button';
        newBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Start New Reading Cycle';
        newBtn.style.marginRight = '10px';
        
        // Add event listener
        newBtn.addEventListener('click', () => {
            if (eventHandlers.onNewReadingCycleClicked) {
                eventHandlers.onNewReadingCycleClicked();
            }
        });
        
        // Insert before calculate button
        calculateBtn.parentElement.insertBefore(newBtn, calculateBtn);
    }
    
    function on(event, handler) {
        eventHandlers[event] = handler;
    }
    
    function parseDate(dateStr) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    
    /**
     * Updates the count of sub-meters based on visible fields
     */
    function updateSubMeterCount() {
        // Count the current meter fields
        const currSubMeters = document.querySelectorAll('input[id^="currSubMeter_"]');
        
        // Also check prev sub meters (they might have been added through loading)
        const prevSubMeters = document.querySelectorAll('input[id^="prevSubMeter_"]');
        
        // Take the maximum of the two counts to ensure we have the accurate count
        state.subMeterCount = Math.max(currSubMeters.length, prevSubMeters.length);
        
        // Ensure both sections have the same number of sub-meter fields
        syncSubMeterFields();
    }
    
    /**
     * Ensures both previous and current sections have the same number of sub-meter fields
     */
    function syncSubMeterFields() {
        const currSubMeters = document.querySelectorAll('input[id^="currSubMeter_"]');
        const prevSubMeters = document.querySelectorAll('input[id^="prevSubMeter_"]');
        
        // If prev has more, add to current
        if (prevSubMeters.length > currSubMeters.length) {
            for (let i = currSubMeters.length; i < prevSubMeters.length; i++) {
                addSubMeterFields();
            }
        }
        
        // If current has more, add to prev
        if (currSubMeters.length > prevSubMeters.length) {
            for (let i = prevSubMeters.length; i < currSubMeters.length; i++) {
                // Add sub meter to prev section
                const subMeterField = document.createElement('div');
                subMeterField.className = 'form-group';
                subMeterField.innerHTML = `
                    <label for="prevSubMeter_${i}">Sub Meter (kWh):</label>
                    <input type="number" id="prevSubMeter_${i}" step="0.01" min="0">
                `;
                elements.prevSubMetersContainer.appendChild(subMeterField);
            }
        }
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
        // showCustomModal, // Temporarily removed - not properly defined
        // closeModal, // Temporarily removed - already defined as DOM element function
        switchTab,
        showFirstTimeSetup,
        addInitialSubMeterField,
        getInitialReadingsData,
        addNewReadingCycleButton,
        updateSubMeterCount,
        syncSubMeterFields
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
        
        // Skip event handlers for removed buttons
        // UI.on('onLoadLastReadingClicked', loadLastReadingAsPrevious);
        // UI.on('onLoadFromHistoryClicked', showLoadFromHistoryModal);
        
        // Skip History tab events (tab removed)
        /*
        UI.on('onHistoryTabSelected', loadReadingHistory);
        UI.on('onHistoryFilterChanged', handleHistoryFilter);
        UI.on('onViewReadingClicked', viewReadingDetails);
        UI.on('onUseAsPreviousClicked', useAsPreviousReading);
        UI.on('onDeleteReadingConfirmed', deleteReading);
        */
        
        // Data Export/Import events
        UI.on('onExportDataClicked', exportData);
        UI.on('onImportFileSelected', importData);
        
        // Skip PDF for reading history (History tab removed)
        // UI.on('onGeneratePdfForReading', generatePdfFromHistory);
        
        // Settings tab events
        UI.on('onSettingsTabSelected', updateStorageUsage);
        UI.on('onDarkModeToggled', toggleDarkMode);
        UI.on('onRoundedValuesToggled', toggleRoundedValues);
        UI.on('onDefaultRateChanged', saveDefaultRate);
        UI.on('onDefaultStandingChargeChanged', saveDefaultStandingCharge);
        UI.on('onPropertyNameChanged', savePropertyName);
        UI.on('onPropertyAddressChanged', savePropertyAddress);
        UI.on('onClearAllDataConfirmed', clearAllData);
        // Add new event handlers
    UI.on('onFirstTimeSetupCompleted', handleFirstTimeSetupCompleted);
    UI.on('onFirstTimeSetupSkipped', handleFirstTimeSetupSkipped);
    UI.on('onNewReadingCycleClicked', handleNewReadingCycle);
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
            const readings = await BillStorageManager.getAllReadings();
            
            if (readings && readings.length > 0) {
                // Sort readings by date (newest first)
                readings.sort((a, b) => {
                    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
                
                const mostRecentReading = readings[0];
                
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
                
                // Add New Reading Cycle button
                UI.addNewReadingCycleButton();
            } else {
                // No readings found, but don't show first-time setup
                console.log('No previous readings found. Skipping first-time setup popup.');
                
                // Set default values instead
                const defaultSettings = {
                    defaultRatePerKwh: 28.0,
                    defaultStandingCharge: 53.0
                };
                
                // Set default values in the form
                UI.setFormData({
                    prevDate: '', // Leave date empty
                    prevMain: 0,
                    prevSub: [0],
                    ratePerKwh: defaultSettings.defaultRatePerKwh,
                    standingCharge: defaultSettings.defaultStandingCharge,
                    standingChargeSplit: 'equal',
                    customSplitPercentage: 50,
                    subMeterLabels: ['Coffee Shop']
                });
            }
        } catch (error) {
            console.error('Error loading most recent reading:', error);
            UI.showAlert('Error loading previous readings.', 'warning');
            
            // Set default values instead of showing first-time setup
            const defaultSettings = {
                defaultRatePerKwh: 28.0,
                defaultStandingCharge: 53.0
            };
            
            // Set default values in the form
            UI.setFormData({
                prevDate: '', // Leave date empty
                prevMain: 0,
                prevSub: [0],
                ratePerKwh: defaultSettings.defaultRatePerKwh,
                standingCharge: defaultSettings.defaultStandingCharge,
                standingChargeSplit: 'equal',
                customSplitPercentage: 50,
                subMeterLabels: ['Coffee Shop']
            });
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
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
                console.error('jsPDF library not found');
                UI.showAlert('PDF generation library is not available. Please check your internet connection.', 'danger');
                return;
            }
            
            console.log('Generating PDF from calculation:', currentCalculation);
            
            // Generate detailed PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // PDF configuration
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = margin;
            
            // Add header
            doc.setFontSize(22);
            doc.setTextColor(74, 109, 167);
            doc.text("Electricity Bill Calculation", pageWidth / 2, yPos, { align: "center" });
            yPos += 10;
            
            // Add property details if provided
            if (appSettings.propertyName) {
                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text(appSettings.propertyName, pageWidth / 2, yPos, { align: "center" });
                yPos += 10;
            }
            
            // Add reading period
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`Reading Period: ${currentCalculation.readings.prev.date} to ${currentCalculation.readings.curr.date}`, margin, yPos);
            yPos += 6;
            doc.setFontSize(12);
            doc.text(`${currentCalculation.periodDays} days`, margin, yPos);
            yPos += 10;
            
            // Add meter readings
            doc.setFontSize(16);
            doc.setTextColor(74, 109, 167);
            doc.text("Meter Readings", margin, yPos);
            yPos += 10;
            
            // Table headers
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
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
            doc.text(currentCalculation.readings.prev.main.toString(), margin + 70, yPos);
            doc.text(currentCalculation.readings.curr.main.toString(), margin + 130, yPos);
            doc.text(currentCalculation.usages.main.toFixed(1), pageWidth - margin - 30, yPos);
            yPos += 6;
            
            // Sub meters
            for (let i = 0; i < currentCalculation.readings.prev.sub.length; i++) {
                const label = currentCalculation.meterLabels.subMeters[i] || `Sub Meter ${i+1}`;
                doc.text(label, margin + 5, yPos);
                doc.text(currentCalculation.readings.prev.sub[i].toString(), margin + 70, yPos);
                doc.text(currentCalculation.readings.curr.sub[i].toString(), margin + 130, yPos);
                doc.text(currentCalculation.usages.subMeters[i].toFixed(1), pageWidth - margin - 30, yPos);
                yPos += 6;
            }
            
            // Costs
            yPos += 8;
            doc.setFontSize(16);
            doc.setTextColor(74, 109, 167);
            doc.text("Costs", margin, yPos);
            yPos += 10;
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Rate per kWh: ${currentCalculation.rates.ratePerKwh} pence`, margin + 5, yPos);
            yPos += 6;
            doc.text(`Standing Charge: ${currentCalculation.rates.standingCharge} pence per day`, margin + 5, yPos);
            yPos += 10;
            
            // Table headers
            doc.setFont(undefined, 'bold');
            doc.text("Meter", margin + 5, yPos);
            doc.text("Energy Cost (£)", margin + 80, yPos);
            doc.text("Standing Charge (£)", margin + 140, yPos);
            doc.text("Total (£)", pageWidth - margin - 30, yPos);
            yPos += 8;
            
            // Reset font
            doc.setFont(undefined, 'normal');
            
            // Property
            doc.text("Main Property", margin + 5, yPos);
            doc.text(currentCalculation.costs.property.energyCost.toFixed(2), margin + 80, yPos);
            doc.text(currentCalculation.costs.property.standingCharge.toFixed(2), margin + 140, yPos);
            doc.text(currentCalculation.costs.property.total.toFixed(2), pageWidth - margin - 30, yPos);
            yPos += 6;
            
            // Sub meters
            for (const subMeter of currentCalculation.costs.subMeters) {
                doc.text(subMeter.label, margin + 5, yPos);
                doc.text(subMeter.energyCost.toFixed(2), margin + 80, yPos);
                doc.text(subMeter.standingCharge.toFixed(2), margin + 140, yPos);
                doc.text(subMeter.total.toFixed(2), pageWidth - margin - 30, yPos);
                yPos += 6;
            }
            
            // Total
            yPos += 4;
            doc.setFont(undefined, 'bold');
            doc.text("Total", margin + 5, yPos);
            doc.text(currentCalculation.costs.total.toFixed(2), pageWidth - margin - 30, yPos);
            
            // Footer
            yPos = pageHeight - margin;
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPos);
            
            // Generate filename based on date
            const dateStr = currentCalculation.readings.curr.date.replace(/-/g, '');
            const filename = `ElectricityBill_${dateStr}.pdf`;
            
            // Save PDF
            doc.save(filename);
            
            UI.showAlert('PDF generated successfully.', 'success');
        } catch (error) {
            console.error('PDF generation error:', error);
            UI.showAlert('Error generating PDF: ' + error.message, 'danger');
        }
    }

    // Function to fix the PDF button handler
function fixPdfButtonHandler() {
    // Find the button
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    if (!generatePdfBtn) {
        console.error('Generate PDF button not found');
        return;
    }
    
    // Add a direct click handler
    generatePdfBtn.addEventListener('click', function() {
        console.log('Generate PDF button clicked');
        generatePdf();
    });
    
    console.log('Added direct click handler to Generate PDF button');
}

// Function to ensure jsPDF library is properly loaded
function checkAndLoadJsPDF() {
    // Check if jsPDF is already available
    if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
        console.log('jsPDF library already loaded');
        return Promise.resolve();
    }
    
    console.log('Attempting to load jsPDF library');
    
    // Create a script element to load jsPDF
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.integrity = 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKLRRhRvkVXXsEngpRzurLJm9U8emWRNSF8649g==';
        script.crossOrigin = 'anonymous';
        script.referrerpolicy = 'no-referrer';
        script.onload = () => {
            console.log('jsPDF library loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load jsPDF library');
            reject(new Error('Failed to load jsPDF library'));
        };
        document.head.appendChild(script);
    });
}

// Function to initialize all PDF-related fixes
async function initPdfFixes() {
    try {
        // Try to load jsPDF if it's not already loaded
        await checkAndLoadJsPDF();
        
        // Fix the PDF button handler
        fixPdfButtonHandler();
        
        console.log('PDF functionality fixes applied');
        return true;
    } catch (error) {
        console.error('Failed to initialize PDF fixes:', error);
        return false;
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
            console.log('Import requested for file:', file.name);
            
            // Quick validation of filename
            if (file.name.includes('package') || file.name.includes('node_modules')) {
                UI.showAlert('This appears to be a Node.js package file, not a bill calculator backup. Please select a valid backup file.', 'danger');
                return;
            }
            
            // Show confirmation modal
            UI.showConfirmationModal(
                'Import Data',
                'Importing data will replace all existing data. Are you sure you want to continue?',
                async () => {
                    try {
                        UI.showAlert('Reading file...', 'info');
                        
                        // Read file as text
                        const fileText = await readFileAsText(file);
                        console.log('File read successfully, length:', fileText.length);
                        
                        // Debug: Log the first 100 characters to see what we're working with
                        console.log('File preview:', fileText.substring(0, 100) + '...');
                        
                        try {
                            // Parse JSON
                            const data = JSON.parse(fileText);
                            console.log('JSON parsed successfully:', data);
                            
                            // Validate if this looks like a bill calculator backup
                            if (data.name && data.packages && !data.readings) {
                                console.error('This appears to be a package.json or package-lock.json file, not a bill calculator backup');
                                UI.showAlert('Invalid backup file: This appears to be a package.json file, not a bill calculator backup.', 'danger');
                                return;
                            }
                            
                            // Check data structure before sending to storage
                            console.log('Data has readings property:', Boolean(data.readings));
                            if (data.readings) {
                                console.log('Readings array length:', data.readings.length);
                                if (data.readings.length > 0) {
                                    console.log('First reading sample:', data.readings[0]);
                                }
                            }
                            
                            UI.showAlert('Importing data...', 'info');
                            
                            // Import data
                            const result = await BillStorageManager.importData(data);
                            console.log('Import result:', result);
                            
                            if (!result.success) {
                                UI.showAlert('Import failed: ' + result.message, 'danger');
                                return;
                            }
                            
                            // Reload settings
                            await loadSettings();
                            
                            // Reload most recent reading
                            await loadMostRecentReading();
                            
                            // History tab has been removed
                            /*
                            // Reload reading history if on history tab
                            if (document.getElementById('historyTab')?.classList.contains('active')) {
                                await loadReadingHistory();
                            }
                            */
                            
                            // Update storage usage
                            await updateStorageUsage();
                            
                            // Trigger a refresh of the previous readings dropdown
                            const previousReadingSelect = document.getElementById('previousReadingSelect');
                            if (previousReadingSelect) {
                                // Create and dispatch a custom event to refresh the dropdown
                                const refreshEvent = new CustomEvent('refresh-dropdown');
                                previousReadingSelect.dispatchEvent(refreshEvent);
                            }
                            
                            UI.showAlert('Data imported successfully.', 'success');
                        } catch (jsonError) {
                            console.error('JSON parsing error:', jsonError);
                            console.log('Invalid JSON content preview:', fileText.substring(0, 200) + '...');
                            UI.showAlert('Failed to parse JSON data: ' + jsonError.message, 'danger');
                        }
                    } catch (fileError) {
                        console.error('File reading error:', fileError);
                        UI.showAlert('Failed to read file: ' + fileError.message, 'danger');
                    }
                }
            );
        } catch (error) {
            console.error('Import error:', error);
            UI.showAlert('Import failed: ' + error.message, 'danger');
        }
    }
    
    /**
     * Read a file as text
     * @param {File} file The file to read
     * @returns {Promise<string>} The file contents as text
     */
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            console.log('Reading file:', file.name, 'size:', file.size, 'type:', file.type);
            
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            // Warn if not a JSON file
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                console.warn('Warning: File may not be JSON:', file.type || 'unknown type');
            }
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const result = event.target.result;
                console.log('File read complete, result size:', result.length);
                
                // Check if result starts with expected JSON chars
                if (result.length > 0) {
                    const firstChar = result.trim()[0];
                    if (firstChar !== '{' && firstChar !== '[') {
                        console.warn('Warning: File content does not appear to be JSON. First character:', firstChar);
                    }
                }
                
                resolve(result);
            };
            
            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                reject(new Error('Failed to read file: ' + (error.message || 'Unknown error')));
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
            
            // History tab has been removed
            /*
            // Reload reading history if on history tab
            if (document.getElementById('historyTab')?.classList.contains('active')) {
                await loadReadingHistory();
            }
            */
            
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
/**
 * Handle first-time setup completion
 * @param {Object} initialData Initial readings data
 */
async function handleFirstTimeSetupCompleted(initialData) {
    try {
        // Validate the data
        if (!initialData.date || !initialData.mainMeter) {
            UI.showAlert('Initial readings must include date and main meter reading.', 'warning');
            return;
        }
        
        // Create an initial reading entry
        const initialReading = {
            date: initialData.date,
            mainMeter: parseFloat(initialData.mainMeter),
            subMeters: initialData.subMeters.map(val => parseFloat(val)),
            subMeterLabels: initialData.subMeterLabels,
            timestamp: new Date().getTime()
        };
        
        // Save the initial reading
        await BillStorageManager.saveReading(initialReading);
        
        // Set as previous reading
        UI.setFormData({
            prevDate: initialData.date,
            prevMain: initialData.mainMeter,
            prevSub: initialData.subMeters,
            subMeterLabels: initialData.subMeterLabels,
            ratePerKwh: appSettings.defaultRatePerKwh,
            standingCharge: appSettings.defaultStandingCharge
        });
        
        // Add New Reading Cycle button
        UI.addNewReadingCycleButton();
        
        UI.showAlert('Initial readings saved. You can now enter your current readings.', 'success');
    } catch (error) {
        console.error('Error handling initial setup:', error);
        UI.showAlert('Error saving initial readings.', 'danger');
    }
}

/**
 * Handle first-time setup skipped
 */
async function handleFirstTimeSetupSkipped() {
    try {
        // Create default initial readings
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        
        const initialReading = {
            date: `${day}-${month}-${year}`,
            mainMeter: 1000,
            subMeters: [500],
            subMeterLabels: ['Coffee Shop'],
            timestamp: new Date().getTime()
        };
        
        // Save the initial reading
        await BillStorageManager.saveReading(initialReading);
        
        // Set as previous reading
        UI.setFormData({
            prevDate: initialReading.date,
            prevMain: initialReading.mainMeter,
            prevSub: initialReading.subMeters,
            subMeterLabels: initialReading.subMeterLabels,
            ratePerKwh: appSettings.defaultRatePerKwh,
            standingCharge: appSettings.defaultStandingCharge
        });
        
        // Add New Reading Cycle button
        UI.addNewReadingCycleButton();
        
        UI.showAlert('Default initial readings set. You can now enter your current readings.', 'success');
    } catch (error) {
        console.error('Error setting default readings:', error);
        UI.showAlert('Error setting default readings.', 'danger');
    }
}

/**
 * Handle new reading cycle
 */
function handleNewReadingCycle() {
    UI.showConfirmationModal(
        'Start New Reading Cycle',
        'This will use your most recent readings as the starting point for a new cycle. Continue?',
        async () => {
            try {
                // Get most recent reading
                const mostRecentReading = await BillStorageManager.getMostRecentReading();
                
                if (!mostRecentReading) {
                    // No popup when no readings found
                    console.log('No previous readings found.');
                    return;
                }
                
                // Set form data with values from the most recent reading
                UI.setFormData({
                    prevDate: mostRecentReading.date,
                    prevMain: mostRecentReading.mainMeter,
                    prevSub: mostRecentReading.subMeters,
                    subMeterLabels: mostRecentReading.subMeterLabels,
                    ratePerKwh: mostRecentReading.rates ? mostRecentReading.rates.ratePerKwh : appSettings.defaultRatePerKwh,
                    standingCharge: mostRecentReading.rates ? mostRecentReading.rates.standingCharge : appSettings.defaultStandingCharge,
                    standingChargeSplit: mostRecentReading.rates ? mostRecentReading.rates.standingChargeSplit : 'equal',
                    customSplitPercentage: mostRecentReading.rates ? mostRecentReading.rates.customSplitPercentage : 50
                });
                
                // Clear current readings
                const currDateInput = document.getElementById('currDate');
                const currMainMeterInput = document.getElementById('currMainMeter');
                
                if (currDateInput) {
                    const today = new Date();
                    const day = String(today.getDate()).padStart(2, '0');
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const year = today.getFullYear();
                    currDateInput.value = `${day}-${month}-${year}`;
                }
                
                if (currMainMeterInput) currMainMeterInput.value = '';
                
                // Clear sub meter readings
                for (let i = 0; i < state.subMeterCount; i++) {
                    const currSubMeter = document.getElementById(`currSubMeter_${i}`);
                    if (currSubMeter) currSubMeter.value = '';
                }
                
                // Hide results if visible
                const resultsCard = document.getElementById('resultsCard');
                if (resultsCard) resultsCard.classList.add('hidden');
                
                currentCalculation = null;
                
                UI.showAlert('New reading cycle started.', 'success');
            } catch (error) {
                console.error('Error starting new reading cycle:', error);
                UI.showAlert('Error starting new reading cycle.', 'danger');
            }
        }
    );
}

    /**
     * Sets the previous date field to today's date or displays a calendar
     */
    function setPreviousDate() {
        const prevDateInput = elements.prevDate;
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        prevDateInput.value = `${day}-${month}-${year}`;
    }

    /**
     * Loads the most recent reading as the previous reading
     */
    async function loadLastReadingAsPrevious() {
        try {
            const mostRecentReading = await BillStorageManager.getMostRecentReading();
            
            if (mostRecentReading) {
                // Set date to the current reading date from the most recent record
                const date = new Date(mostRecentReading.currentDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                
                // Use UI elements
                const prevDateElement = document.getElementById('prevDate');
                const prevMainMeterElement = document.getElementById('prevMainMeter');
                const prevSubMetersContainer = document.getElementById('prevSubMetersContainer');
                
                if (prevDateElement) {
                    prevDateElement.value = `${day}-${month}-${year}`;
                }
                
                if (prevMainMeterElement) {
                    prevMainMeterElement.value = mostRecentReading.currentMainReading;
                }
                
                if (prevSubMetersContainer) {
                    // Clear existing sub meter fields
                    prevSubMetersContainer.innerHTML = '';
                    
                    // Add sub meter fields with current values from the most recent reading
                    mostRecentReading.currentSubReadings.forEach((reading, index) => {
                        const subMeterField = document.createElement('div');
                        subMeterField.className = 'form-group';
                        subMeterField.innerHTML = `
                            <label for="prevSubMeter_${index}">Sub Meter (kWh):</label>
                            <input type="number" id="prevSubMeter_${index}" step="0.01" min="0" value="${reading}">
                        `;
                        prevSubMetersContainer.appendChild(subMeterField);
                    });
                }
                
                UI.showAlert('Last reading loaded as previous reading', 'success');
                
                // Sync the number of sub-meter fields for current and previous readings
                syncSubMeterFieldsManually();
            } else {
                // No popup when no readings found
                console.log('No previous readings found');
            }
        } catch (error) {
            console.error('Error loading last reading:', error);
            UI.showAlert('Failed to load last reading', 'error');
        }
    }

    /**
     * Shows a modal with reading history to select as previous reading
     */
    async function showLoadFromHistoryModal() {
        try {
            const readings = await BillStorageManager.getAllReadings();
            
            if (!readings || readings.length === 0) {
                UI.showAlert('No reading history available', 'warning');
                return;
            }
            
            // Create a table of readings for the modal
            let tableHTML = `
                <h3>Select a Reading</h3>
                <div class="table-container modal-table">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Main Meter</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            readings.forEach(reading => {
                const date = new Date(reading.currentDate);
                const formattedDate = date.toLocaleDateString();
                
                tableHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${reading.currentMainReading} kWh</td>
                        <td>
                            <button class="small-button use-reading-btn" data-reading-id="${reading.id}">
                                Use
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            UI.showCustomModal('Select Previous Reading', tableHTML, null, true);
            
            // Add event listeners to the "Use" buttons
            document.querySelectorAll('.use-reading-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const readingId = this.getAttribute('data-reading-id');
                    useHistoryReading(readingId);
                    UI.closeModal();
                });
            });
            
        } catch (error) {
            console.error('Error showing history modal:', error);
            UI.showAlert('Failed to load reading history', 'error');
        }
    }

    /**
     * Uses a reading from history as the previous reading
     * @param {string} readingId - The ID of the reading to use
     */
    async function useHistoryReading(readingId) {
        try {
            const readings = await BillStorageManager.getAllReadings();
            const selectedReading = readings.find(reading => reading.id === readingId);
            
            if (selectedReading) {
                // Set date
                const date = new Date(selectedReading.currentDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                
                // Use direct DOM access
                const prevDateElement = document.getElementById('prevDate');
                const prevMainMeterElement = document.getElementById('prevMainMeter');
                const prevSubMetersContainer = document.getElementById('prevSubMetersContainer');
                
                if (prevDateElement) {
                    prevDateElement.value = `${day}-${month}-${year}`;
                }
                
                if (prevMainMeterElement) {
                    prevMainMeterElement.value = selectedReading.currentMainReading;
                }
                
                if (prevSubMetersContainer) {
                    // Clear existing sub meter fields
                    prevSubMetersContainer.innerHTML = '';
                    
                    // Add sub meter fields
                    selectedReading.currentSubReadings.forEach((reading, index) => {
                        const subMeterField = document.createElement('div');
                        subMeterField.className = 'form-group';
                        subMeterField.innerHTML = `
                            <label for="prevSubMeter_${index}">Sub Meter (kWh):</label>
                            <input type="number" id="prevSubMeter_${index}" step="0.01" min="0" value="${reading}">
                        `;
                        prevSubMetersContainer.appendChild(subMeterField);
                    });
                }
                
                UI.showAlert('Selected reading loaded as previous reading', 'success');
                
                // Sync the number of sub-meter fields for current and previous readings
                syncSubMeterFieldsManually();
            }
        } catch (error) {
            console.error('Error using history reading:', error);
            UI.showAlert('Failed to load selected reading', 'error');
        }
    }
    
    /**
     * Shows a custom modal with specified content
     */
    function showCustomModal(title, bodyHTML, onConfirm, hideFooter = false) {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = bodyHTML;
        
        if (hideFooter && modalFooter) {
            modalFooter.style.display = 'none';
        } else if (modalFooter) {
            modalFooter.style.display = 'flex';
            
            const confirmBtn = document.getElementById('modalConfirmBtn');
            if (confirmBtn && onConfirm) {
                // Remove existing listeners by cloning
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                
                // Add new listener
                newConfirmBtn.addEventListener('click', () => {
                    onConfirm();
                    closeModal();
                });
            }
        }
        
        if (modalOverlay) modalOverlay.classList.remove('hidden');
    }

    /**
     * Attaches event listeners to DOM elements
     */
    function attachEventListeners() {
        // ... [rest of the original code remains unchanged]
    }

    /**
     * Function to manually sync sub-meter fields between previous and current sections
     * This is used after loading readings from history
     */
    function syncSubMeterFieldsManually() {
        const currSubMeters = document.querySelectorAll('input[id^="currSubMeter_"]');
        const prevSubMeters = document.querySelectorAll('input[id^="prevSubMeter_"]');
        const prevSubMetersContainer = document.getElementById('prevSubMetersContainer');
        const currSubMetersContainer = document.getElementById('currSubMetersContainer');
        
        if (!prevSubMetersContainer || !currSubMetersContainer) {
            return;
        }
        
        // If current has fewer sub-meters than previous, add more to current
        if (currSubMeters.length < prevSubMeters.length) {
            for (let i = currSubMeters.length; i < prevSubMeters.length; i++) {
                // Create a similar structure to what addSubMeterFields() would do
                const fieldContainer = document.createElement('div');
                fieldContainer.className = 'form-group sub-meter-group';
                fieldContainer.innerHTML = `
                    <label for="currSubMeter_${i}">Sub Meter (kWh):</label>
                    <input type="number" id="currSubMeter_${i}" step="0.01" min="0">
                    <input type="text" id="subMeterLabel_${i}" placeholder="Label (e.g., Coffee Shop)">
                `;
                currSubMetersContainer.appendChild(fieldContainer);
            }
        }
        // If previous has fewer sub-meters than current, add more to previous
        else if (prevSubMeters.length < currSubMeters.length) {
            for (let i = prevSubMeters.length; i < currSubMeters.length; i++) {
                const fieldContainer = document.createElement('div');
                fieldContainer.className = 'form-group';
                fieldContainer.innerHTML = `
                    <label for="prevSubMeter_${i}">Sub Meter (kWh):</label>
                    <input type="number" id="prevSubMeter_${i}" step="0.01" min="0">
                `;
                prevSubMetersContainer.appendChild(fieldContainer);
            }
        }
    }
    
    /**
     * Close modal - wrapper for UI.closeModal
     */
    function closeModal() {
        if (UI && typeof UI.closeModal === 'function') {
            UI.closeModal();
        } else {
            const modalOverlay = document.getElementById('modalOverlay');
            if (modalOverlay) {
                modalOverlay.classList.add('hidden');
            }
        }
    }
});