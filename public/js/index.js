async function fetchJson(url, options) {
	const res = await fetch(url, options);
	return res.json();
}

// Check user role and show/hide admin features
async function checkUserRole() {
	try {
		const user = await fetchJson('/api/me');
		if (user.role === 'admin') {
			document.getElementById('adminCard').style.display = 'block';
		}
	} catch (error) {
		console.log('Could not check user role:', error);
	}
}

(async function init() {
	// Load KPIs
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
	
	try {
		const invoices = await fetchJson('/api/invoices?status=Overdue&limit=1');
		document.getElementById('kpi-overdue').innerText = invoices.pagination?.total ?? '-';
	} catch {}
	
	try {
		const classes = await fetchJson('/api/classes');
		document.getElementById('kpi-classes').innerText = classes.length ?? '-';
	} catch {}
	
	try {
		const subjects = await fetchJson('/api/classes/subjects');
		document.getElementById('kpi-subjects').innerText = subjects.length ?? '-';
	} catch {}
	
	// Check user role for admin features
	await checkUserRole();
})();


