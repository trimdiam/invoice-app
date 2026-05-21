/**
 * B. KHONGLAH CONSTRUCTION - Invoice Generator
 * Enhanced: unit column, discount, bank details, payment terms, auto-save draft
 */

const DRAFT_KEY = 'bkc_draft';
const UNITS = ['Nos', 'Sqft', 'Rmt', 'Rft', 'LS', 'Bags', 'MT', 'Kg', 'Ltrs', 'Days', 'Months'];

const state = {
    invoiceNo: '',
    date: '',
    billTo: '',
    contractorName: 'Barbara Khonglah',
    paymentTerms: 'On Demand',
    items: [],
    discountRate: 0,
    cgstRate: 9,
    sgstRate: 9,
    subtotal: 0,
    discountAmt: 0,
    taxableAmt: 0,
    cgstAmt: 0,
    sgstAmt: 0,
    grandTotal: 0,
    grandTotalWords: ''
};

document.addEventListener('DOMContentLoaded', () => {
    initDefaultDate();
    initInvoiceNumber();
    const restored = restoreDraft();
    if (!restored) loadDefaults();
    registerEventListeners();
    calculateTotals();
});

function initDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateField = document.getElementById('input-date');
    dateField.value = `${yyyy}-${mm}-${dd}`;
    state.date = dateField.value;
}

function initInvoiceNumber() {
    const currentYear = new Date().getFullYear();
    let lastYear = localStorage.getItem('bkc_last_year');
    let lastSeq = localStorage.getItem('bkc_last_seq');

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

function loadDefaults() {
    document.getElementById('input-bill-to').value = "The Principal,\nSt. Mary's College,\nLaitumkhrah, Shillong – 793003";
    addFormRow("Repair & maintenance works of RCC roof slab at Administrative building", "LS", 1, 48500.00);
    addFormRow("Supply of premium grade structural steel joints and binding wire", "Kg", 120, 75.00);
}

// --- Draft persistence ---

function saveDraft() {
    const rows = [];
    document.querySelectorAll('#form-items-tbody tr').forEach(row => {
        rows.push({
            desc: row.querySelector('.row-desc').value,
            unit: row.querySelector('.row-unit').value,
            qty: row.querySelector('.row-qty').value,
            rate: row.querySelector('.row-rate').value,
        });
    });

    const draft = {
        date: document.getElementById('input-date').value,
        billTo: document.getElementById('input-bill-to').value,
        contractorName: document.getElementById('input-contractor-name').value,
        paymentTerms: document.getElementById('input-payment-terms').value,
        discountRate: document.getElementById('input-discount').value,
        cgstRate: document.getElementById('input-cgst').value,
        sgstRate: document.getElementById('input-sgst').value,
        rows,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    try {
        const draft = JSON.parse(raw);
        document.getElementById('input-date').value = draft.date || '';
        document.getElementById('input-bill-to').value = draft.billTo || '';
        document.getElementById('input-contractor-name').value = draft.contractorName || 'Barbara Khonglah';
        document.getElementById('input-payment-terms').value = draft.paymentTerms || 'On Demand';
        document.getElementById('input-discount').value = draft.discountRate ?? 0;
        document.getElementById('input-cgst').value = draft.cgstRate ?? 9;
        document.getElementById('input-sgst').value = draft.sgstRate ?? 9;

        (draft.rows || []).forEach(r => addFormRow(r.desc, r.unit, r.qty, r.rate));

        if ((draft.rows || []).length === 0) addFormRow('', 'Nos', '', '');
        showNotification('Draft restored.', 'info');
        return true;
    } catch {
        return false;
    }
}

function clearDraft() {
    if (!confirm('Clear the saved draft and reset the form?')) return;
    localStorage.removeItem(DRAFT_KEY);
    document.getElementById('input-bill-to').value = '';
    document.getElementById('form-items-tbody').innerHTML = '';
    document.getElementById('input-discount').value = 0;
    document.getElementById('input-cgst').value = 9;
    document.getElementById('input-sgst').value = 9;
    document.getElementById('input-payment-terms').value = 'On Demand';
    loadDefaults();
    calculateTotals();
    showNotification('Draft cleared.', 'info');
}

// --- Event Listeners ---

function registerEventListeners() {
    document.getElementById('btn-add-row').addEventListener('click', () => addFormRow('', 'Nos', '', ''));
    document.getElementById('btn-generate').addEventListener('click', () => {
        if (validateInvoice()) { calculateTotals(); showNotification('Preview refreshed.'); }
    });
    document.getElementById('btn-print').addEventListener('click', () => {
        if (validateInvoice()) { calculateTotals(); window.print(); }
    });
    document.getElementById('btn-next-bill').addEventListener('click', handleNextBill);
    document.getElementById('btn-clear-draft').addEventListener('click', clearDraft);

    const liveFields = [
        'input-date', 'input-bill-to', 'input-contractor-name',
        'input-payment-terms', 'input-discount', 'input-cgst', 'input-sgst'
    ];
    liveFields.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => { calculateTotals(); saveDraft(); });
        el.addEventListener('input', () => { calculateTotals(); saveDraft(); });
    });
}

// --- Row Management ---

let rowCounter = 0;

function buildUnitOptions(selected) {
    return UNITS.map(u =>
        `<option value="${u}"${u === selected ? ' selected' : ''}>${u}</option>`
    ).join('');
}

function addFormRow(desc = '', unit = 'Nos', qty = '', rate = '') {
    rowCounter++;
    const tbody = document.getElementById('form-items-tbody');
    const rowId = `row-${rowCounter}`;

    const tr = document.createElement('tr');
    tr.setAttribute('id', rowId);
    tr.innerHTML = `
        <td><input type="text" class="row-desc" value="${escapeAttr(desc)}" placeholder="e.g. Masonry works" required></td>
        <td>
            <select class="row-unit">${buildUnitOptions(unit)}</select>
        </td>
        <td><input type="number" class="row-qty" value="${qty}" min="0.01" step="any" placeholder="0" required></td>
        <td><input type="number" class="row-rate" value="${rate}" min="0.01" step="any" placeholder="0.00" required></td>
        <td><button type="button" class="btn-delete-row" data-id="${rowId}" title="Remove row">×</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => { calculateTotals(); saveDraft(); });
        el.addEventListener('change', () => { calculateTotals(); saveDraft(); });
    });

    tr.querySelector('.btn-delete-row').addEventListener('click', (e) => {
        document.getElementById(e.target.getAttribute('data-id')).remove();
        calculateTotals();
        saveDraft();
    });

    calculateTotals();
}

// --- Validation ---

function validateInvoice() {
    const billTo = document.getElementById('input-bill-to').value.trim();
    if (!billTo) {
        showNotification('Recipient billing information is required.', 'error');
        document.getElementById('input-bill-to').focus();
        return false;
    }

    const rows = document.querySelectorAll('#form-items-tbody tr');
    if (rows.length === 0) {
        showNotification('At least one item line must exist.', 'error');
        return false;
    }

    let ok = true;
    rows.forEach((row, idx) => {
        const desc = row.querySelector('.row-desc').value.trim();
        const qty = parseFloat(row.querySelector('.row-qty').value);
        const rate = parseFloat(row.querySelector('.row-rate').value);

        if (!desc) {
            showNotification(`Provide description for item ${idx + 1}.`, 'error');
            row.querySelector('.row-desc').focus();
            ok = false;
        } else if (isNaN(qty) || qty <= 0) {
            showNotification(`Invalid quantity on item ${idx + 1}.`, 'error');
            row.querySelector('.row-qty').focus();
            ok = false;
        } else if (isNaN(rate) || rate <= 0) {
            showNotification(`Invalid rate on item ${idx + 1}.`, 'error');
            row.querySelector('.row-rate').focus();
            ok = false;
        }
    });

    return ok;
}

// --- Calculations ---

function calculateTotals() {
    state.invoiceNo = document.getElementById('input-invoice-no').value;
    state.date = document.getElementById('input-date').value;
    state.billTo = document.getElementById('input-bill-to').value;
    state.contractorName = document.getElementById('input-contractor-name').value;
    state.paymentTerms = document.getElementById('input-payment-terms').value;
    state.discountRate = parseFloat(document.getElementById('input-discount').value) || 0;
    state.cgstRate = parseFloat(document.getElementById('input-cgst').value) || 0;
    state.sgstRate = parseFloat(document.getElementById('input-sgst').value) || 0;

    state.items = [];
    let subtotalSum = 0;

    document.querySelectorAll('#form-items-tbody tr').forEach(row => {
        const desc = row.querySelector('.row-desc').value;
        const unit = row.querySelector('.row-unit').value;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.row-rate').value) || 0;

        if (desc || qty > 0 || rate > 0) {
            state.items.push({ description: desc, unit, quantity: qty, rate });
            subtotalSum += qty * rate;
        }
    });

    state.subtotal = subtotalSum;
    state.discountAmt = subtotalSum * (state.discountRate / 100);
    state.taxableAmt = subtotalSum - state.discountAmt;
    state.cgstAmt = state.taxableAmt * (state.cgstRate / 100);
    state.sgstAmt = state.taxableAmt * (state.sgstRate / 100);
    state.grandTotal = state.taxableAmt + state.cgstAmt + state.sgstAmt;
    state.grandTotalWords = numberToIndianWords(state.grandTotal);

    renderTwinPreview();
}

// --- Render ---

function renderTwinPreview() {
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = renderInvoiceLayout('OFFICE COPY') + renderInvoiceLayout('CUSTOMER COPY');
}

function renderInvoiceLayout(copyLabel) {
    let rowsHTML = '';
    state.items.forEach((item, index) => {
        const total = item.quantity * item.rate;
        rowsHTML += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHtml(item.description)}</td>
                <td class="text-center">${escapeHtml(item.unit)}</td>
                <td class="text-right">${item.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">${formatInr(item.rate)}</td>
                <td class="text-right">${formatInr(total)}</td>
            </tr>
        `;
    });

    const padMinRows = 5;
    for (let i = state.items.length; i < padMinRows; i++) {
        rowsHTML += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
    }

    const discountRow = state.discountRate > 0 ? `
        <tr class="discount-row">
            <td colspan="4" class="no-border"></td>
            <td class="text-right">Discount (${state.discountRate}%):</td>
            <td class="text-right">– ${formatInr(state.discountAmt)}</td>
        </tr>
        <tr class="tax-row">
            <td colspan="4" class="no-border"></td>
            <td class="text-right">Taxable Amount:</td>
            <td class="text-right font-bold">${formatInr(state.taxableAmt)}</td>
        </tr>
    ` : '';

    return `
    <div class="invoice-page">
        <div class="invoice-accent-bar"></div>
        <div class="invoice-body">
            <span class="copy-badge">${copyLabel}</span>

            <header class="invoice-header">
                <div>
                    <h1 class="company-name">B. KHONGLAH CONSTRUCTION</h1>
                    <p class="company-subtitle">Contractor &amp; General Supplier</p>
                    <p class="company-meta"><strong>Proprietor:</strong> Barbara Khonglah</p>
                    <p class="company-meta">Dum Dum, Nongthymmai, Shillong – 793014</p>
                    <p class="company-meta"><strong>Ph:</strong> +91 94361 02456 &nbsp;|&nbsp; <strong>Email:</strong> bkhonglahcon@gmail.com</p>
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
                        <tr><th>Invoice No:</th><td><strong>${state.invoiceNo}</strong></td></tr>
                        <tr><th>Date:</th><td>${formatInvoiceDate(state.date)}</td></tr>
                        <tr><th>Contractor:</th><td>${escapeHtml(state.contractorName)}</td></tr>
                        <tr><th>Payment Terms:</th><td>${escapeHtml(state.paymentTerms)}</td></tr>
                    </table>
                </div>
            </div>

            <table class="invoice-items-table">
                <thead>
                    <tr>
                        <th width="6%">Sl.</th>
                        <th width="40%">Description of Work / Items</th>
                        <th width="8%" class="text-center">Unit</th>
                        <th width="10%" class="text-right">Qty</th>
                        <th width="14%" class="text-right">Rate (₹)</th>
                        <th width="16%" class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
                <tfoot>
                    <tr class="subtotal-row">
                        <td colspan="4" class="no-border"></td>
                        <td class="text-right font-bold">Subtotal:</td>
                        <td class="text-right font-bold">${formatInr(state.subtotal)}</td>
                    </tr>
                    ${discountRow}
                    <tr class="tax-row">
                        <td colspan="4" class="no-border"></td>
                        <td class="text-right">CGST (${state.cgstRate}%):</td>
                        <td class="text-right">${formatInr(state.cgstAmt)}</td>
                    </tr>
                    <tr class="tax-row">
                        <td colspan="4" class="no-border"></td>
                        <td class="text-right">SGST (${state.sgstRate}%):</td>
                        <td class="text-right">${formatInr(state.sgstAmt)}</td>
                    </tr>
                    <tr class="grand-total-row">
                        <td colspan="4" class="no-border"></td>
                        <td class="text-right font-bold">Grand Total:</td>
                        <td class="text-right font-bold">${formatInr(state.grandTotal)}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="amount-words-section">
                <p><strong>Amount in Words:</strong> <span class="words-value">Rupees ${state.grandTotalWords}</span></p>
            </div>

            <div class="bank-details-section">
                <div class="meta-label">Bank Details</div>
                <div class="bank-grid">
                    <span>Account Name:</span><strong>B. Khonglah Construction</strong>
                    <span>Bank &amp; Branch:</span><strong>SBI, Nongthymmai, Shillong</strong>
                    <span>Account No:</span><strong>XXXXXXXXXXXXXXX</strong>
                    <span>IFSC Code:</span><strong>SBIN0XXXXXX</strong>
                </div>
            </div>

            <footer class="invoice-footer">
                <div class="footer-terms">
                    <h4>Terms &amp; Conditions</h4>
                    <ol>
                        <li>Service details / measurements are mapped to the approved project schedule.</li>
                        <li>Payments via direct Bank Remittance or CTS Account Payee Cheques only.</li>
                        <li>Discrepancies must be reported within 3 working days of receipt.</li>
                        <li>Payment due: <strong>${escapeHtml(state.paymentTerms)}</strong> from invoice date.</li>
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
    </div>
    `;
}

// --- Next Bill ---

function handleNextBill() {
    if (!validateInvoice()) return;

    const currentYear = new Date().getFullYear();
    const activeSeq = parseInt(state.invoiceNo.split('/')[2], 10);
    localStorage.setItem('bkc_last_year', currentYear.toString());
    localStorage.setItem('bkc_last_seq', activeSeq.toString());
    localStorage.removeItem(DRAFT_KEY);

    document.getElementById('input-bill-to').value = '';
    document.getElementById('form-items-tbody').innerHTML = '';
    document.getElementById('input-discount').value = 0;

    initInvoiceNumber();
    addFormRow('', 'Nos', '', '');
    calculateTotals();

    showNotification('Invoice saved. Ready for next bill.', 'success');
}

// --- Notification ---

function showNotification(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    setTimeout(() => toast.classList.remove('hidden'), 10);
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

// --- Helpers ---

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function nl2br(str) {
    return str.replace(/\n/g, '<br>');
}

function formatInr(number) {
    return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInvoiceDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    if (isNaN(d.getTime())) return str;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function numberToIndianWords(num) {
    num = Math.round(num * 100) / 100;
    if (num === 0) return 'Zero Only';

    const parts = num.toFixed(2).split('.');
    const intPart = parseInt(parts[0], 10);
    const decPart = parseInt(parts[1], 10);

    let words = '';
    if (intPart > 0) words += convertSection(intPart) + ' Only';
    if (decPart > 0) {
        const decWords = convertSection(decPart);
        words = intPart > 0
            ? words.replace(' Only', ` and ${decWords} Paise Only`)
            : `${decWords} Paise Only`;
    }
    return words;
}

function convertSection(num) {
    const singles = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
                     'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    if (num < 20) return singles[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + singles[num % 10] : '');

    let expr = '';
    const crores = Math.floor(num / 10000000); num %= 10000000;
    const lakhs = Math.floor(num / 100000);    num %= 100000;
    const thousands = Math.floor(num / 1000);  num %= 1000;
    const hundreds = Math.floor(num / 100);    num %= 100;

    if (crores > 0)   expr += convertSection(crores) + ' Crore ';
    if (lakhs > 0)    expr += convertSection(lakhs) + ' Lakh ';
    if (thousands > 0) expr += convertSection(thousands) + ' Thousand ';
    if (hundreds > 0) expr += convertSection(hundreds) + ' Hundred ';
    if (num > 0) {
        if (expr !== '') expr += 'and ';
        expr += convertSection(num);
    }
    return expr.trim();
}
