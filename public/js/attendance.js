async function fetchJson(url, options) {
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
	return res.json();
}

let currentPage = 1; let total = 0; let limit = 10;
async function loadAttendance() {
	const studentId = document.getElementById('filterStudentId').value;
	const status = document.getElementById('filterStatus').value;
	const from = document.getElementById('filterFrom').value;
	const to = document.getElementById('filterTo').value;
	const qs = new URLSearchParams({ studentId, status, from, to, page: currentPage, limit });
	const data = await fetchJson(`/api/attendance?${qs.toString()}`);
	const body = document.getElementById('attendance-body');
	body.innerHTML = '';
	for (const a of data.data || []) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${a.ATTENDANCE_ID}</td><td>${a.STUDENT_ID}</td><td>${a.ATTENDANCE_DATE}</td><td>${a.STATUS}</td>`;
		body.appendChild(tr);
	}
	// pagination
	total = data.total || 0; limit = data.limit || 10;
	document.getElementById('pageInfo').innerText = `Page ${data.page || 1}`;
}

document.getElementById('attendance-form').addEventListener('submit', async (e) => {
	e.preventDefault();
	const btn = document.getElementById('saveAttBtn'); btn.disabled = true; btn.textContent = 'Saving...';
	const payload = {
		STUDENT_ID: Number(document.getElementById('studentId').value),
		ATTENDANCE_DATE: document.getElementById('date').value,
		STATUS: document.getElementById('status').value
	};
	const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
	if (!res.ok) {
		const msg = await res.json();
		alert(msg.message || 'Error');
	}
	currentPage = 1;
	await loadAttendance();
	window.showToast('Attendance saved');
	btn.disabled = false; btn.textContent = 'Save';
});

document.getElementById('filterBtn').addEventListener('click', loadAttendance);

document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadAttendance(); } });
document.getElementById('nextPage').addEventListener('click', () => {
	const maxPage = Math.max(1, Math.ceil(total / limit));
	if (currentPage < maxPage) { currentPage++; loadAttendance(); }
});

loadAttendance();


