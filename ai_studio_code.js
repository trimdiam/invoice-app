/**
 * B. KHONGLAH CONSTRUCTION - Invoice Generator Core System
 * Pure Vanilla JavaScript Module
 */

// Application State
const state = {
    invoiceNo: '',
    date: '',
    billTo: '',
    contractorName: 'Barbara Khonglah',
    items: [],
    cgstRate: 9,
    sgstRate: 9,
    subtotal: 0,
    cgstAmt: 0,
    sgstAmt: 0,
    grandTotal: 0,
    grandTotalWords: ''
};

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    initDefaultDate();
    initInvoiceNumber();
    loadDefaults();
    registerEventListeners();
    calculateTotals();
});

// Default Date Configuration (Today's Date)
function initDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    const dateField = document.getElementById('input-date');
    dateField.value = `${yyyy}-${mm}-${dd}`;
    state.date = dateField.value;
}

// Auto-Incrementing Invoice Logic with Year Detection
function initInvoiceNumber() {
    const currentYear = new Date().getFullYear();
    let lastYear = localStorage.getItem('bkc_last_year');
    let lastSeq = localStorage.getItem('bkc_last_seq');

    // Sequence resets when changing years
    if (!lastYear || lastYear !== currentYear.toString()) {
        lastYear = currentYear.toString();
        lastSeq = '0';
    }

    const nextSeq = parseInt(lastSeq, 10) + 1;
    const paddedSeq = String(nextSeq).padStart(3, '0');
    const generatedInvoiceNo = `BKC/${currentYear}/${paddedSeq}`;
    
    document.getElementById('input-invoice-no').value = generatedInvoiceNo;
    state.invoiceNo = generatedInvoiceNo;
}

// Pre-populating sample items to demonstrate calculations instantly
function loadDefaults() {
    document.getElementById('input-bill-to').value = "The Principal,\nSt. Mary's College,\nLaitumkhrah, Shillong – 793003";
    
    // Default starter row entries
    addFormRow("Repair & maintenance works of RCC roof slab at Administrative building", 1, 48500.00);
    addFormRow("Supply of premium grade structural steel joints and binding wire", 120, 75.00);
}

// Global Event Listeners Registration
function registerEventListeners() {
    document.getElementById('btn-add-row').addEventListener('click', () => {
        addFormRow('', '', '');
    });

    document.getElementById('btn-generate').addEventListener('click', () => {
        if (validateInvoice()) {
            calculateTotals();
            showNotification('Invoice preview refreshed.');
        }
    });

    document.getElementById('btn-print').addEventListener('click', () => {
        if (validateInvoice()) {
            calculateTotals();
            window.print();
        }
    });

    document.getElementById('btn-next-bill').addEventListener('click', handleNextBill);

    // Dynamic Live Updating Elements
    document.getElementById('input-date').addEventListener('change', (e) => {
        state.date = e.target.value;
        calculateTotals();
    });
    
    document.getElementById('input-bill-to').addEventListener('input', (e) => {
        state.billTo = e.target.value;
        calculateTotals();
    });

    document.getElementById('input-contractor-name').addEventListener('input', (e) => {
        state.contractorName = e.target.value;
        calculateTotals();
    });

    document.getElementById('input-cgst').addEventListener('input', (e) => {
        state.cgstRate = parseFloat(e.target.value) || 0;
        calculateTotals();
    });

    document.getElementById('input-sgst').addEventListener('input', (e) => {
        state.sgstRate = parseFloat(e.target.value) || 0;
        calculateTotals();
    });
}

// Dynamic Invoice Rows Generator
let rowCounter = 0;
function addFormRow(desc = '', qty = '', rate = '') {
    rowCounter++;
    const tbody = document.getElementById('form-items-tbody');
    const rowId = `row-${rowCounter}`;

    const tr = document.createElement('tr');
    tr.setAttribute('id', rowId);
    tr.innerHTML = `
        <td><input type="text" class="row-desc" value="${desc}" placeholder="e.g. Masonry installation" required></td>
        <td><input type="number" class="row-qty" value="${qty}" min="0.01" step="any" placeholder="0" required></td>
        <td><input type="number" class="row-rate" value="${rate}" min="0.01" step="any" placeholder="0.00" required></td>
        <td><button type="button" class="btn-delete-row" data-id="${rowId}">×</button></td>
    `;
    tbody.appendChild(tr);

    // Event Delegation inside row to capture values instantly
    tr.querySelector('.row-qty').addEventListener('input', calculateTotals);
    tr.querySelector('.row-rate').addEventListener('input', calculateTotals);
    tr.querySelector('.row-desc').addEventListener('input', calculateTotals);

    tr.querySelector('.btn-delete-row').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        document.getElementById(id).remove();
        calculateTotals();
    });

    calculateTotals();
}

// Validation Logic to prevent blank print errors
function validateInvoice() {
    const billTo = document.getElementById('input-bill-to').value.trim();
    if (!billTo) {
        showNotification('Recipient billing information is required.', 'error');
        document.getElementById('input-bill-to').focus();
        return false;
    }

    const rows = document.querySelectorAll('#form-items-tbody tr');
    if (rows.length === 0) {
        showNotification('At least one item line must exist in your invoice.', 'error');
        return false;
    }

    let validationPassed = true;
    rows.forEach((row, idx) => {
        const desc = row.querySelector('.row-desc').value.trim();
        const qty = parseFloat(row.querySelector('.row-qty').value);
        const rate = parseFloat(row.querySelector('.row-rate').value);

        if (!desc) {
            showNotification(`Provide description for line item ${idx + 1}.`, 'error');
            row.querySelector('.row-desc').focus();
            validationPassed = false;
        } else if (isNaN(qty) || qty <= 0) {
            showNotification(`Verify quantity on line item ${idx + 1}.`, 'error');
            row.querySelector('.row-qty').focus();
            validationPassed = false;
        } else if (isNaN(rate) || rate <= 0) {
            showNotification(`Verify rate on line item ${idx + 1}.`, 'error');
            row.querySelector('.row-rate').focus();
            validationPassed = false;
        }
    });

    return validationPassed;
}

// Main Calculation & Synchronous State Render
function calculateTotals() {
    state.invoiceNo = document.getElementById('input-invoice-no').value;
    state.date = document.getElementById('input-date').value;
    state.billTo = document.getElementById('input-bill-to').value;
    state.contractorName = document.getElementById('input-contractor-name').value;
    state.cgstRate = parseFloat(document.getElementById('input-cgst').value) || 0;
    state.sgstRate = parseFloat(document.getElementById('input-sgst').value) || 0;

    // Compile Line Items
    state.items = [];
    const rows = document.querySelectorAll('#form-items-tbody tr');
    let subtotalSum = 0;

    rows.forEach(row => {
        const desc = row.querySelector('.row-desc').value;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.row-rate').value) || 0;

        if (desc || qty > 0 || rate > 0) {
            state.items.push({
                description: desc,
                quantity: qty,
                rate: rate
            });
            subtotalSum += qty * rate;
        }
    });

    // Tax processing
    state.subtotal = subtotalSum;
    state.cgstAmt = subtotalSum * (state.cgstRate / 100);
    state.sgstAmt = subtotalSum * (state.sgstRate / 100);
    state.grandTotal = subtotalSum + state.cgstAmt + state.sgstAmt;
    state.grandTotalWords = numberToIndianWords(state.grandTotal);

    renderTwinPreview();
}

// Generate the Office Copy & Customer Copy template sheets inside DOM
function renderTwinPreview() {
    const printArea = document.getElementById('print-area');
    const officeCopyHTML = renderInvoiceLayout('OFFICE COPY');
    const customerCopyHTML = renderInvoiceLayout('CUSTOMER COPY');
    printArea.innerHTML = officeCopyHTML + customerCopyHTML;
}

// Base HTML Blueprint construction
function renderInvoiceLayout(copyLabel) {
    let rowsHTML = '';
    state.items.forEach((item, index) => {
        const total = item.quantity * item.rate;
        rowsHTML += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHtml(item.description)}</td>
                <td class="text-right">${item.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${formatInr(item.rate)}</td>
                <td class="text-right">${formatInr(total)}</td>
            </tr>
        `;
    });

    // Generates a clean empty sheet profile if rows are minimal
    const padMinRows = 6;
    if (state.items.length < padMinRows) {
        for (let i = state.items.length; i < padMinRows; i++) {
            rowsHTML += `
                <tr class="empty-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
            `;
        }
    }

    return `
    <div class="invoice-page">
        <span class="copy-badge">${copyLabel}</span>
        
        <header class="invoice-header">
            <div>
                <h1 class="company-name">B. KHONGLAH CONSTRUCTION</h1>
                <p class="company-subtitle">Contractor & General Supplier</p>
                <p class="company-meta"><strong>Proprietor:</strong> Barbara Khonglah</p>
                <p class="company-meta">Dum Dum, Nongthymmai, Shillong – 793014</p>
                <p class="company-meta"><strong>Phone:</strong> +91 94361 02456 | <strong>Email:</strong> bkhonglahcon@gmail.com</p>
            </div>
            <div class="invoice-title-box">
                <h2 class="invoice-title">TAX INVOICE</h2>
                <div class="gstin-badge">GSTIN: 17ABGPK4812N1Z8</div>
            </div>
        </header>

        <hr class="header-divider">

        <div class="invoice-meta-section">
            <div class="meta-col-left">
                <div class="meta-label">Bill To:</div>
                <div class="bill-to-text">${nl2br(escapeHtml(state.billTo)) || '<i>Billing Details Pending</i>'}</div>
            </div>
            <div>
                <table class="meta-table">
                    <tr>
                        <th>Invoice No:</th>
                        <td><strong>${state.invoiceNo}</strong></td>
                    </tr>
                    <tr>
                        <th>Date:</th>
                        <td>${formatInvoiceDate(state.date)}</td>
                    </tr>
                    <tr>
                        <th>Contractor:</th>
                        <td>${escapeHtml(state.contractorName)}</td>
                    </tr>
                </table>
            </div>
        </div>

        <table class="invoice-items-table">
            <thead>
                <tr>
                    <th width="8%">Sl.</th>
                    <th width="48%">Description of Work / Items Provided</th>
                    <th width="12%" class="text-right">Quantity</th>
                    <th width="14%" class="text-right">Rate (₹)</th>
                    <th width="18%" class="text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" class="no-border"></td>
                    <td class="text-right font-bold">Subtotal:</td>
                    <td class="text-right font-bold">${formatInr(state.subtotal)}</td>
                </tr>
                <tr>
                    <td colspan="3" class="no-border"></td>
                    <td class="text-right">CGST (${state.cgstRate}%):</td>
                    <td class="text-right">${formatInr(state.cgstAmt)}</td>
                </tr>
                <tr>
                    <td colspan="3" class="no-border"></td>
                    <td class="text-right">SGST (${state.sgstRate}%):</td>
                    <td class="text-right">${formatInr(state.sgstAmt)}</td>
                </tr>
                <tr class="grand-total-row">
                    <td colspan="3" class="no-border"></td>
                    <td class="text-right font-bold">Grand Total:</td>
                    <td class="text-right font-bold">${formatInr(state.grandTotal)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="amount-words-section">
            <p><strong>Amount in Words:</strong> <span class="words-value">Rupees ${state.grandTotalWords}</span></p>
        </div>

        <footer class="invoice-footer">
            <div class="footer-terms">
                <h4>Terms & Conditions</h4>
                <ol>
                    <li>Service details / measurements are mapped to approved project schedule limits.</li>
                    <li>Payments are processed exclusively via direct corporate Bank Remittance or CTS Account Payee Cheques.</li>
                    <li>Discrepancies found must be brought to invoice creator's immediate notice within 3 standard business days.</li>
                </ol>
            </div>
            <div class="footer-signatures">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p>Receiver's Signature</p>
                </div>
                <div class="signature-box">
                    <p class="sig-company-title">For B. KHONGLAH CONSTRUCTION</p>
                    <div class="signature-line"></div>
                    <p>Authorized Signatory</p>
                </div>
            </div>
        </footer>
    </div>
    `;
}

// Finalization and incremental execution of the system sequencing
function handleNextBill() {
    if (!validateInvoice()) return;

    // Secure the last generated values into localStorage
    const currentYear = new Date().getFullYear();
    const invoiceNoParts = state.invoiceNo.split('/');
    const activeSequenceNum = parseInt(invoiceNoParts[2], 10);

    localStorage.setItem('bkc_last_year', currentYear.toString());
    localStorage.setItem('bkc_last_seq', activeSequenceNum.toString());

    // Flush current form
    document.getElementById('input-bill-to').value = '';
    document.getElementById('form-items-tbody').innerHTML = '';
    
    // Setup fresh environment
    initInvoiceNumber();
    addFormRow('', '', '');
    calculateTotals();

    showNotification('Invoice saved successfully. Sequence updated.', 'success');
}

// Helper: Custom Toast Notification
function showNotification(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    setTimeout(() => {
        toast.classList.remove('hidden');
    }, 10);

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

// Helper: Safe HTML strings processing
function escapeHtml(string) {
    if (!string) return '';
    return string
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper: Format to Linebreaks
function nl2br(str) {
    return str.replace(/\n/g, '<br>');
}

// Helper: Indian Rupees Standard formatting
function formatInr(number) {
    return number.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Helper: Dates styling formatting (e.g., 21-May-2026)
function formatInvoiceDate(inputDateString) {
    if (!inputDateString) return '';
    const dateObj = new Date(inputDateString);
    if (isNaN(dateObj.getTime())) return inputDateString;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
}

// Core Math Helper: Indian Numbering scale converter
function numberToIndianWords(num) {
    num = Math.round(num * 100) / 100;
    if (num === 0) return 'Zero Only';
    
    const parts = num.toFixed(2).split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalPart = parseInt(parts[1], 10);
    
    let words = '';
    
    if (integerPart > 0) {
        words += convertSection(integerPart) + ' Only';
    }
    
    if (decimalPart > 0) {
        const decimalWords = convertSection(decimalPart);
        if (integerPart > 0) {
            words = words.replace(' Only', ` and ${decimalWords} Paise Only`);
        } else {
            words = `${decimalWords} Paise Only`;
        }
    }
    
    return words;
}

function convertSection(num) {
    const singles = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num < 20) return singles[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + singles[num % 10] : '');
    
    let expression = '';
    
    const crores = Math.floor(num / 10000000);
    num %= 10000000;
    
    const lakhs = Math.floor(num / 100000);
    num %= 100000;
    
    const thousands = Math.floor(num / 1000);
    num %= 1000;
    
    const hundreds = Math.floor(num / 100);
    num %= 100;
    
    if (crores > 0) {
        expression += convertSection(crores) + ' Crore ';
    }
    if (lakhs > 0) {
        expression += convertSection(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
        expression += convertSection(thousands) + ' Thousand ';
    }
    if (hundreds > 0) {
        expression += convertSection(hundreds) + ' Hundred ';
    }
    if (num > 0) {
        if (expression !== '') expression += 'and ';
        expression += convertSection(num);
    }
    
    return expression.trim();
}