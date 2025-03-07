// DOM Inspector - Analyzes the actual structure of the page
(function() {
    console.log("=== DOM STRUCTURE INSPECTION ===");
    
    setTimeout(function() {
        // Log all tab-related elements
        console.log("Tab Button Elements:");
        document.querySelectorAll('button, [role="tab"]').forEach(el => {
            console.log(`- ${el.tagName} #${el.id || 'no-id'} .${Array.from(el.classList).join('.')} text:"${el.textContent.trim()}"`);
        });
        
        console.log("\nTab Content Elements:");
        document.querySelectorAll('section, div.tab-content, [role="tabpanel"]').forEach(el => {
            console.log(`- ${el.tagName} #${el.id || 'no-id'} .${Array.from(el.classList).join('.')}`);
        });
        
        // Find and fix tab functionality by looking at actual structure
        console.log("\nAttempting adaptive tab fix...");
        
        // Find all button elements with text matching our expected tabs
        const tabButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => ['Calculator', 'History', 'Settings'].includes(btn.textContent.trim()));
        
        console.log(`Found ${tabButtons.length} tab buttons`);
        
        // Find potential tab content sections
        const tabContents = document.querySelectorAll('section, div.tab-content');
        console.log(`Found ${tabContents.length} potential tab content elements`);
        
        // Apply universal fix
        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                console.log(`Adding click handler to "${button.textContent.trim()}" button`);
                
                button.addEventListener('click', function() {
                    // Highlight only this button
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    // Find matching content by checking for corresponding ID or text
                    const tabText = button.textContent.trim().toLowerCase();
                    let matchingContent = null;
                    
                    // Try different strategies to find the matching content
                    for (const content of tabContents) {
                        // Check if the content ID contains the tab name
                        if (content.id && content.id.toLowerCase().includes(tabText)) {
                            matchingContent = content;
                            break;
                        }
                        
                        // Check if the content has headings containing the tab name
                        const headings = content.querySelectorAll('h1, h2, h3, h4');
                        for (const heading of headings) {
                            if (heading.textContent.toLowerCase().includes(tabText)) {
                                matchingContent = content;
                                break;
                            }
                        }
                    }
                    
                    if (matchingContent) {
                        // Show only the matching content
                        tabContents.forEach(content => content.style.display = 'none');
                        matchingContent.style.display = 'block';
                        console.log(`Switched to ${tabText} tab content`);
                    } else {
                        console.warn(`Could not find tab content for "${tabText}"`);
                    }
                });
            });
            
            console.log("Tab handlers added. Try clicking the tab buttons now.");
        } else {
            console.log("No tab buttons found to fix.");
        }
        
        // Create a set of default readings if needed
        const setDefaultReadings = () => {
            console.log("\nChecking for meter reading fields...");
            
            // Find fields by both ID and placeholder/label text
            const findField = (idOrType) => {
                // Try by ID
                let field = document.getElementById(idOrType);
                if (field) return field;
                
                // Try by input type and placeholder
                return Array.from(document.querySelectorAll(`input[type="text"], input[type="number"]`))
                    .find(el => 
                        (el.placeholder && el.placeholder.toLowerCase().includes(idOrType.toLowerCase())) || 
                        (el.previousElementSibling && 
                         el.previousElementSibling.textContent.toLowerCase().includes(idOrType.toLowerCase()))
                    );
            };
            
            const prevDate = findField('prevDate') || findField('previous date');
            const prevMainMeter = findField('prevMainMeter') || findField('previous main');
            const prevSubMeter = findField('prevSubMeter') || findField('previous sub');
            
            const currDate = findField('currDate') || findField('current date');
            const currMainMeter = findField('currMainMeter') || findField('current main');
            const currSubMeter = findField('currSubMeter') || findField('current sub');
            
            const rateField = findField('ratePerKwh') || findField('rate');
            const standingField = findField('standingCharge') || findField('standing');
            
            console.log("Found fields:");
            console.log(`- Previous Date: ${prevDate ? '✓' : '✗'}`);
            console.log(`- Previous Main Meter: ${prevMainMeter ? '✓' : '✗'}`);
            console.log(`- Previous Sub Meter: ${prevSubMeter ? '✓' : '✗'}`);
            console.log(`- Current Date: ${currDate ? '✓' : '✗'}`);
            console.log(`- Current Main Meter: ${currMainMeter ? '✓' : '✗'}`);
            console.log(`- Current Sub Meter: ${currSubMeter ? '✓' : '✗'}`);
            console.log(`- Rate per kWh: ${rateField ? '✓' : '✗'}`);
            console.log(`- Standing Charge: ${standingField ? '✓' : '✗'}`);
            
            // Set default values if fields exist
            if (prevDate) {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const day = String(lastMonth.getDate()).padStart(2, '0');
                const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
                const year = lastMonth.getFullYear();
                prevDate.value = `${day}-${month}-${year}`;
            }
            
            if (currDate) {
                const today = new Date();
                const day = String(today.getDate()).padStart(2, '0');
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();
                currDate.value = `${day}-${month}-${year}`;
            }
            
            if (prevMainMeter) prevMainMeter.value = '1000';
            if (prevSubMeter) prevSubMeter.value = '500';
            if (rateField) rateField.value = '28';
            if (standingField) standingField.value = '140';
            
            console.log("Default values set for available fields");
            
            // Find calculate button and add click handler
            const calculateBtn = 
                document.querySelector('button:not([style*="display: none"])')?.textContent.includes('Calculate') ?
                document.querySelector('button:not([style*="display: none"])') :
                Array.from(document.querySelectorAll('button')).find(b => 
                    b.textContent.toLowerCase().includes('calculate')
                );
                
            if (calculateBtn) {
                console.log("Calculate button found, adding direct click handler");
                calculateBtn.addEventListener('click', function() {
                    if (currMainMeter && currMainMeter.value === '') {
                        alert("Please enter current main meter reading");
                        return;
                    }
                    
                    if (currSubMeter && currSubMeter.value === '') {
                        alert("Please enter current sub meter reading");
                        return;
                    }
                    
                    // Simple calculation logic if none exists
                    if (typeof window.BillCalculator === 'undefined') {
                        console.log("No calculator found, using simple calculation");
                        
                        const mainUsage = parseFloat(currMainMeter.value) - parseFloat(prevMainMeter.value);
                        const subUsage = parseFloat(currSubMeter.value) - parseFloat(prevSubMeter.value);
                        const propertyUsage = mainUsage - subUsage;
                        
                        const rate = parseFloat(rateField.value) / 100; // Convert to pounds
                        const standingCharge = parseFloat(standingField.value) / 100; // Convert to pounds
                        
                        // Calculate days
                        const prevDateParts = prevDate.value.split('-');
                        const currDateParts = currDate.value.split('-');
                        const prevDateObj = new Date(
                            parseInt(prevDateParts[2]), 
                            parseInt(prevDateParts[1])-1, 
                            parseInt(prevDateParts[0])
                        );
                        const currDateObj = new Date(
                            parseInt(currDateParts[2]), 
                            parseInt(currDateParts[1])-1, 
                            parseInt(currDateParts[0])
                        );
                        const days = Math.round((currDateObj - prevDateObj) / (1000 * 60 * 60 * 24));
                        
                        // Calculate costs
                        const totalStandingCharge = days * standingCharge;
                        const subMeterEnergyCost = subUsage * rate;
                        const propertyEnergyCost = propertyUsage * rate;
                        
                        // Display results
                        const resultDiv = document.createElement('div');
                        resultDiv.style.padding = '15px';
                        resultDiv.style.border = '1px solid #ddd';
                        resultDiv.style.borderRadius = '5px';
                        resultDiv.style.marginTop = '20px';
                        resultDiv.style.backgroundColor = '#f8f9fa';
                        
                        resultDiv.innerHTML = `
                            <h3>Calculation Results</h3>
                            <p>Period: ${days} days</p>
                            <p>Main Meter Usage: ${mainUsage.toFixed(1)} kWh</p>
                            <p>Sub Meter Usage: ${subUsage.toFixed(1)} kWh</p>
                            <p>Property Usage: ${propertyUsage.toFixed(1)} kWh</p>
                            <p>Total Standing Charge: £${totalStandingCharge.toFixed(2)}</p>
                            <hr>
                            <p>Sub Meter Cost: £${(subMeterEnergyCost + totalStandingCharge/2).toFixed(2)}</p>
                            <p>Property Cost: £${(propertyEnergyCost + totalStandingCharge/2).toFixed(2)}</p>
                            <p><strong>Total: £${(subMeterEnergyCost + propertyEnergyCost + totalStandingCharge).toFixed(2)}</strong></p>
                        `;
                        
                        // Find a good place to add the results
                        const resultsContainer = 
                            document.getElementById('resultsCard') || 
                            document.querySelector('.card, .container') || 
                            calculateBtn.parentElement;
                        
                        if (resultsContainer) {
                            // Remove previous results if any
                            const previousResults = resultsContainer.querySelector('div[style*="border: 1px solid"]');
                            if (previousResults) previousResults.remove();
                            
                            resultsContainer.appendChild(resultDiv);
                        } else {
                            // Fallback - add after the button
                            calculateBtn.insertAdjacentElement('afterend', resultDiv);
                        }
                    }
                });
            }
        };
        
        setDefaultReadings();
        
        console.log("\n=== DOM INSPECTION COMPLETE ===");
    }, 1500);
})();