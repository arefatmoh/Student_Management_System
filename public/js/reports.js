async function fetchJson(url) {
	const res = await fetch(url);
	return res.json();
}

document.getElementById('attRun').addEventListener('click', async () => {
	const c = document.getElementById('attClass').value;
	const f = document.getElementById('attFrom').value;
	const t = document.getElementById('attTo').value;
	const qs = new URLSearchParams({ class: c, from: f, to: t });
	const r = await fetchJson(`/api/reports/attendance?${qs.toString()}`);
	document.getElementById('attResult').innerText = `Present: ${r.present || 0}, Absent: ${r.absent || 0}`;
});

document.getElementById('feeRun').addEventListener('click', async () => {
	const c = document.getElementById('feeClass').value;
	const f = document.getElementById('feeFrom').value;
	const t = document.getElementById('feeTo').value;
	const qs = new URLSearchParams({ class: c, from: f, to: t });
	const r = await fetchJson(`/api/reports/fees?${qs.toString()}`);
	document.getElementById('feeResult').innerText = `Paid: ${r.totalPaid || 0}, Pending: ${r.totalPending || 0}, Total: ${r.total || 0}`;
});

document.getElementById('perfRun').addEventListener('click', async () => {
	const c = document.getElementById('perfClass').value;
	const qs = new URLSearchParams({ class: c });
	const r = await fetchJson(`/api/reports/performance?${qs.toString()}`);
	const body = document.getElementById('perfBody');
	body.innerHTML = '';
	for (const s of r.data || []) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${s.STUDENT_ID}</td><td>${s.NAME}</td><td>${s.ROLL_NUMBER}</td><td>${s.CLASS}</td><td>${s.attendanceRate}%</td><td>${s.pendingFees}</td>`;
		body.appendChild(tr);
	}
});


