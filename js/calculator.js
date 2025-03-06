/**
 * Calculator Module
 * 
 * Handles electricity bill calculations based on meter readings
 */

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