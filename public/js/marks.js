document.getElementById('mark-form').addEventListener('submit', async (e)=>{
	e.preventDefault();
	const payload = {
		STUDENT_ID: Number(document.getElementById('studentId').value),
		SUBJECT_ID: Number(document.getElementById('subjectId').value),
		TERM: document.getElementById('term').value,
		SCORE: Number(document.getElementById('score').value),
		MAX_SCORE: document.getElementById('maxScore').value ? Number(document.getElementById('maxScore').value) : undefined
	};
	try{
		await apiFetch('/api/marks', { method: 'POST', body: JSON.stringify(payload) });
		window.showToast('Mark saved');
	} catch(err){ window.showToast(err.message || 'Error'); }
});

document.getElementById('loadByStudent').addEventListener('click', async ()=>{
	const studentId = document.getElementById('queryStudentId').value;
	const term = document.getElementById('queryTerm').value;
	const qs = new URLSearchParams({ term });
	const rows = await apiFetch(`/api/marks/student/${studentId}?${qs.toString()}`);
	const body = document.getElementById('student-marks');
	body.innerHTML = '';
	for(const r of rows){
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${r.SUBJECT_NAME}</td><td>${r.TERM}</td><td>${r.SCORE}</td><td>${r.MAX_SCORE}</td>`;
		body.appendChild(tr);
	}
});


