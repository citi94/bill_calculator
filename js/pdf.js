/**
 * PDF Module
 * 
 * Handles PDF generation for bill reports
 */

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