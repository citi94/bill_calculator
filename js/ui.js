/**
 * UI Module
 * 
 * Manages all user interface interactions
 */

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
        
        elements.currDate.value = `${day}-${month}-${year}`;
    }
    
    /**
     * Toggle visibility of custom split percentage field
     */
    function toggleCustomSplitVisibility() {
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
        removeBtn.addEventListener('click', function() {
            removeSubMeterFields(parseInt(this.getAttribute('data-index')));
        });
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
        const currSubMeter = document.getElementById(`currSubMeter_${index}`).closest('.form-group');
        const prevSubMeter = document.getElementById(`prevSubMeter_${index}`).closest('.form-group');
        
        if (currSubMeter) currSubMeter.remove();
        if (prevSubMeter) prevSubMeter.remove();
        
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
        
        return {
            prevDate: elements.prevDate.value,
            currDate: elements.currDate.value,
            prevMain: elements.prevMainMeter.value,
            currMain: elements.currMainMeter.value,
            prevSub,
            currSub,
            subMeterLabels,
            ratePerKwh: elements.ratePerKwh.value,
            standingCharge: elements.standingCharge.value,
            standingChargeSplit: elements.standingChargeSplit.value,
            customSplitPercentage: elements.customSplitPercentage.value
        };
    }
    
    /**
     * Set form data in calculator tab
     * @param {Object} data Form data
     */
    function setFormData(data) {
        // Set date and meter readings
        if (data.prevDate) elements.prevDate.value = data.prevDate;
        if (data.prevMain) elements.prevMainMeter.value = data.prevMain;
        
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
        if (data.ratePerKwh) elements.ratePerKwh.value = data.ratePerKwh;
        if (data.standingCharge) elements.standingCharge.value = data.standingCharge;
        
        // Set standing charge split method
        if (data.standingChargeSplit) {
            elements.standingChargeSplit.value = data.standingChargeSplit;
            toggleCustomSplitVisibility();
        }
        
        // Set custom split percentage
        if (data.customSplitPercentage) {
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
    
    /**
     * Display calculation results
     * @param {Object} result Calculation result
     */
    function displayCalculationResult(result) {
        // Show results card
        elements.resultsCard.classList.remove('hidden');
        
        // Set summary data
        elements.periodDays.textContent = result.periodDays;
        elements.totalUsage.textContent = result.usages.main.toFixed(1);
        
        // Clear table first
        elements.resultsTable.innerHTML = '';
        
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
        elements.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Display reading history
     * @param {Array} history Reading history
     * @param {string} filter Filter setting
     */
    function displayReadingHistory(history, filter = 'all') {
        // Clear history table
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
        if (filteredHistory.length === 0) {
            elements.historyEmptyState.classList.remove('hidden');
            return;
        } else {
            elements.historyEmptyState.classList.add('hidden');
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
    
    /**
     * Update settings UI
     * @param {Object} settings Settings object
     */
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
    
    /**
     * Update storage usage display
     * @param {number} usageInBytes Usage in bytes
     */
    function updateStorageUsage(usageInBytes) {
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
    
    /**
     * Show alert message
     * @param {string} message Alert message
     * @param {string} type Alert type ('success', 'warning', 'danger')
     * @param {number} duration Duration in milliseconds (0 for no auto-hide)
     */
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
    
    /**
     * Show confirmation modal
     * @param {string} title Modal title
     * @param {string} message Modal message
     * @param {Function} onConfirm Callback on confirm
     */
    function showConfirmationModal(title, message, onConfirm) {
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
    
    /**
     * Show reading details modal
     * @param {Object} reading Reading data
     */
    function showReadingDetailsModal(reading) {
        // Set title
        elements.modalTitle.textContent = 'Reading Details';
        
        // Create modal content
        let content = `
            <div class="reading-details">
                <p><strong>Date:</strong> ${reading.date}</p>
                <p><strong>Previous Date:</strong> ${reading.prevDate}</p>
                <p><strong>Period:</strong> ${reading.periodDays} days</p>
                
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
    
    /**
     * Show privacy policy modal
     */
    function showPrivacyPolicy() {
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
    
    /**
     * Close modal
     */
    function closeModal() {
        elements.modalOverlay.classList.add('hidden');
    }
    
    /**
     * Enable dark mode
     */
    function enableDarkMode() {
        document.body.classList.add('dark-theme');
    }
    
    /**
     * Disable dark mode
     */
    function disableDarkMode() {
        document.body.classList.remove('dark-theme');
    }
    
    /**
     * Register event handler
     * @param {string} event Event name
     * @param {Function} handler Handler function
     */
    function on(event, handler) {
        eventHandlers[event] = handler;
    }
    
    /**
     * Helper function to parse date string (DD-MM-YYYY)
     * @param {string} dateStr Date string
     * @returns {Date} Date object
     */
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