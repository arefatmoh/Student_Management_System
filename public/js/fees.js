async function fetchJson(url, options) {
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
	return res.json();
}

async function loadFees() {
	const studentId = document.getElementById('filterStudentId').value;
	const status = document.getElementById('filterStatus').value;
	const from = document.getElementById('filterFrom').value;
	const to = document.getElementById('filterTo').value;
	const qs = new URLSearchParams({ studentId, status, from, to });
	const data = await fetchJson(`/api/fees?${qs.toString()}`);
	const body = document.getElementById('fees-body');
	body.innerHTML = '';
	for (const f of data.data || []) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${f.FEE_ID}</td><td>${f.STUDENT_ID}</td><td>${f.FEE_AMOUNT}</td><td>${f.PAID_DATE || ''}</td><td>${f.STATUS}</td>`;
		body.appendChild(tr);
	}
}

document.getElementById('fee-form').addEventListener('submit', async (e) => {
	e.preventDefault();
	const payload = {
		STUDENT_ID: Number(document.getElementById('studentId').value),
		FEE_AMOUNT: Number(document.getElementById('amount').value),
		PAID_DATE: document.getElementById('paidDate').value || null,
		STATUS: document.getElementById('status').value
	};
	await fetchJson('/api/fees', { method: 'POST', body: JSON.stringify(payload) });
	loadFees();
});

document.getElementById('filterBtn').addEventListener('click', loadFees);

loadFees();


