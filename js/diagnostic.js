// Diagnostic script to check application functionality
(function() {
    console.log("=== ELECTRICITY BILL CALCULATOR DIAGNOSTICS ===");
    
    // Wait for DOM to be fully loaded
    setTimeout(function() {
        // Check if our global objects exist
        console.log("Global objects check:");
        console.log("- BillValidator:", typeof window.BillValidator);
        console.log("- BillStorageManager:", typeof window.BillStorageManager);
        console.log("- BillCalculator:", typeof window.BillCalculator);
        console.log("- PDFGenerator:", typeof window.PDFGenerator);
        console.log("- UI:", typeof window.UI);
        
        // Check key DOM elements
        console.log("\nDOM elements check:");
        [
            "tabCalculator", "tabHistory", "tabSettings",
            "calculatorTab", "historyTab", "settingsTab",
            "prevDate", "prevMainMeter", "prevSubMetersContainer",
            "currDate", "currMainMeter", "currSubMetersContainer",
            "ratePerKwh", "standingCharge", "calculateBtn"
        ].forEach(id => {
            console.log(`- ${id}: ${document.getElementById(id) ? "✓" : "✗"}`);
        });
        
        // Try to manually trigger tab clicks
        console.log("\nAttempting to fix tab functionality...");
        const fixTabs = () => {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.id.replace('tab', '') + 'Tab';
                    
                    // Update active class on tab buttons
                    tabButtons.forEach(btn => {
                        btn.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Update active class on tab contents
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                    });
                    document.getElementById(tabId).classList.add('active');
                    
                    console.log(`Tab switched to: ${tabId}`);
                });
            });
            console.log(`Added click handlers to ${tabButtons.length} tab buttons`);
        };
        
        // Try to create a default previous reading if none exists
        const createDefaultReading = () => {
            console.log("\nAttempting to set default previous reading...");
            
            const prevDate = document.getElementById('prevDate');
            const prevMainMeter = document.getElementById('prevMainMeter');
            const prevSubMeter = document.getElementById('prevSubMeter_0');
            
            if (prevDate && prevMainMeter && prevSubMeter) {
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                
                const day = String(lastMonth.getDate()).padStart(2, '0');
                const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
                const year = lastMonth.getFullYear();
                
                prevDate.value = `${day}-${month}-${year}`;
                prevMainMeter.value = "1000";
                prevSubMeter.value = "500";
                
                console.log("Default previous reading set successfully");
                
                // Also set default current date
                const currDate = document.getElementById('currDate');
                if (currDate) {
                    const currentDay = String(today.getDate()).padStart(2, '0');
                    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
                    const currentYear = today.getFullYear();
                    
                    currDate.value = `${currentDay}-${currentMonth}-${currentYear}`;
                    console.log("Current date set successfully");
                }
            } else {
                console.log("Could not find previous reading input fields");
            }
        };
        
        // Execute fixes
        fixTabs();
        createDefaultReading();
        
        console.log("\nDiagnostics complete. Refresh the page and try using the tabs and calculator.");
        console.log("=== END DIAGNOSTICS ===");
    }, 1000);
})();