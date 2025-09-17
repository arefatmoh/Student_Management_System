async function fetchJson(url, options) {
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
	return res.json();
}

let currentPage = 1; let total = 0; let limit = 10;
async function loadFees() {
	const studentId = document.getElementById('filterStudentId').value;
	const status = document.getElementById('filterStatus').value;
	const from = document.getElementById('filterFrom').value;
	const to = document.getElementById('filterTo').value;
	const qs = new URLSearchParams({ studentId, status, from, to, page: currentPage, limit });
	const data = await fetchJson(`/api/fees?${qs.toString()}`);
	const body = document.getElementById('fees-body');
	body.innerHTML = '';
	for (const f of data.data || []) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${f.FEE_ID}</td><td>${f.STUDENT_ID}</td><td>${f.FEE_AMOUNT}</td><td>${f.PAID_DATE || ''}</td><td>${f.STATUS}</td>`;
		body.appendChild(tr);
	}
	// pagination
	total = data.total || 0; limit = data.limit || 10;
	document.getElementById('pageInfo').innerText = `Page ${data.page || 1}`;
}

document.getElementById('fee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveFeeBtn'); btn.disabled = true; btn.textContent = 'Saving...';
    const payload = {
        STUDENT_ID: Number(document.getElementById('studentId').value),
        FEE_AMOUNT: Number(document.getElementById('amount').value),
        PAID_DATE: document.getElementById('paidDate').value || null,
        STATUS: document.getElementById('status').value
    };
    try {
        await fetchJson('/api/fees', { method: 'POST', body: JSON.stringify(payload) });
        currentPage = 1;
        await loadFees();
        window.showToast('Fee saved');
    } catch (err) {
        window.showToast('Save failed');
    } finally {
        btn.disabled = false; btn.textContent = 'Save';
    }
});

document.getElementById('filterBtn').addEventListener('click', loadFees);

document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadFees(); } });
document.getElementById('nextPage').addEventListener('click', () => {
	const maxPage = Math.max(1, Math.ceil(total / limit));
	if (currentPage < maxPage) { currentPage++; loadFees(); }
});

loadFees();


