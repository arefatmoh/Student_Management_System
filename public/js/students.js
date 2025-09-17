async function fetchJson(url, options) {
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
	return res.json();
}

let currentPage = 1; let total = 0; let limit = 10;
async function loadStudents() {
	const name = document.getElementById('searchName').value || '';
	const roll = document.getElementById('searchRoll').value || '';
	const cls = document.getElementById('searchClass').value || '';
	const data = await fetchJson(`/api/students?name=${encodeURIComponent(name)}&roll=${encodeURIComponent(roll)}&class=${encodeURIComponent(cls)}&page=${currentPage}&limit=${limit}`);
	const body = document.getElementById('students-body');
	body.innerHTML = '';
    for (const s of data.data || []) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.STUDENT_ID}</td><td>${s.NAME}</td><td>${s.ROLL_NUMBER}</td><td>${s.CLASS}</td><td>${s.PARENT_CONTACT||''}</td><td>
            <button data-id="${s.STUDENT_ID}" class="edit">Edit</button>
            <button data-id="${s.STUDENT_ID}" class="del danger">Delete</button>
            <button data-id="${s.STUDENT_ID}" class="addFee">Add Fee</button>
            <button data-id="${s.STUDENT_ID}" class="viewFees secondary">View Fees</button>
            <button data-id="${s.STUDENT_ID}" class="markAtt">Mark Attendance</button>
            <button data-id="${s.STUDENT_ID}" class="viewAtt secondary">View Attendance</button>
            <button data-id="${s.STUDENT_ID}" class="summary">Summary</button>
        </td>`;
        body.appendChild(tr);
    }
	body.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', async (e) => {
		const id = e.target.getAttribute('data-id');
		const s = await fetchJson(`/api/students/${id}`);
		document.getElementById('studentId').value = s.STUDENT_ID;
		document.getElementById('name').value = s.NAME;
		document.getElementById('roll').value = s.ROLL_NUMBER;
		document.getElementById('class').value = s.CLASS;
		document.getElementById('contact').value = s.PARENT_CONTACT || '';
	}));
    body.querySelectorAll('.del').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!confirm('Delete this student?')) return;
        try {
            await fetchJson(`/api/students/${id}`, { method: 'DELETE' });
            window.showToast('Deleted');
            loadStudents();
        } catch (err) {
            window.showToast('Delete failed');
        }
    }));

    // Integrations
    body.querySelectorAll('.addFee').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        location.href = `/fees.html?studentId=${id}&focus=form`;
    }));
    body.querySelectorAll('.viewFees').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        location.href = `/fees.html?studentId=${id}`;
    }));
    body.querySelectorAll('.markAtt').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const today = new Date().toISOString().slice(0,10);
        location.href = `/attendance.html?studentId=${id}&date=${today}&focus=form`;
    }));
    body.querySelectorAll('.viewAtt').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        location.href = `/attendance.html?studentId=${id}`;
    }));
    body.querySelectorAll('.summary').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        location.href = `/reports.html?studentId=${id}`;
    }));
	// pagination info
	total = data.total || 0; limit = data.limit || 10;
	document.getElementById('pageInfo').innerText = `Page ${data.page || 1}`;
}

document.getElementById('student-form').addEventListener('submit', async (e) => {
	e.preventDefault();
	const saveBtn = document.getElementById('saveBtn');
	saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
	const id = document.getElementById('studentId').value;
	const payload = {
		NAME: document.getElementById('name').value,
		ROLL_NUMBER: document.getElementById('roll').value,
		CLASS: document.getElementById('class').value,
		PARENT_CONTACT: document.getElementById('contact').value || null
	};
    try {
        if (id) {
            await fetchJson(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await fetchJson('/api/students', { method: 'POST', body: JSON.stringify(payload) });
        }
        document.getElementById('student-form').reset();
        currentPage = 1;
        await loadStudents();
        window.showToast('Saved successfully');
    } catch (err) {
        window.showToast('Save failed');
    } finally {
        saveBtn.disabled = false; saveBtn.textContent = 'Save';
    }
});

document.getElementById('reset').addEventListener('click', () => {
	document.getElementById('student-form').reset();
});

document.getElementById('searchBtn').addEventListener('click', loadStudents);

document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadStudents(); } });
document.getElementById('nextPage').addEventListener('click', () => {
	const maxPage = Math.max(1, Math.ceil(total / limit));
	if (currentPage < maxPage) { currentPage++; loadStudents(); }
});

loadStudents();


