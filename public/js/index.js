async function fetchJson(url, options) {
	const res = await fetch(url, options);
	return res.json();
}

(async function init() {
	try {
		const students = await fetchJson('/api/students?limit=1');
		document.getElementById('kpi-students').innerText = students.total ?? '-';
	} catch {}
	try {
		const fees = await fetchJson('/api/reports/fees');
		document.getElementById('kpi-pending').innerText = fees.totalPending ?? '-';
	} catch {}
	try {
		const today = new Date().toISOString().slice(0,10);
		const att = await fetchJson(`/api/attendance?from=${today}&to=${today}&status=Present`);
		document.getElementById('kpi-present').innerText = att.total ?? '-';
	} catch {}
})();


