/**
 * Validation Module
 * 
 * Handles form validation and data integrity checks
 */

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