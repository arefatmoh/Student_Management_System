async function loadClasses(){
	const list = await apiFetch('/api/classes');
	const body = document.getElementById('classes-body');
	body.innerHTML = '';
	for(const c of list){
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${c.CLASS_ID}</td><td>${c.NAME}</td><td>
			<div data-class="${c.CLASS_ID}" class="sections"></div>
			<form data-class="${c.CLASS_ID}" class="section-form">
				<input placeholder="New section" />
				<button type="submit" class="secondary">Add</button>
			</form>
		</td><td>
			<div data-class="${c.CLASS_ID}" class="subjects"></div>
			<form data-class="${c.CLASS_ID}" class="subject-form">
				<input placeholder="New subject" />
				<button type="submit" class="secondary">Add</button>
			</form>
		</td><td>
			<button data-id="${c.CLASS_ID}" class="del danger">Delete</button>
		</td>`;
		body.appendChild(tr);
	}

	// Load sub-lists
	for(const c of list){
		const sectionsBox = document.querySelector(`.sections[data-class="${c.CLASS_ID}"]`);
		const sections = await apiFetch(`/api/classes/${c.CLASS_ID}/sections`);
		sectionsBox.innerHTML = sections.map(s => `<span class="tag">${s.NAME} <a href="#" data-id="${s.SECTION_ID}" class="x">×</a></span>`).join(' ');

		const subjectsBox = document.querySelector(`.subjects[data-class="${c.CLASS_ID}"]`);
		const subjects = await apiFetch(`/api/classes/${c.CLASS_ID}/subjects`);
		subjectsBox.innerHTML = subjects.map(s => `<span class="tag">${s.NAME} <a href="#" data-id="${s.SUBJECT_ID}" class="x">×</a></span>`).join(' ');
	}

	// Bind deletes for tags
	document.querySelectorAll('.sections .x').forEach(a => a.addEventListener('click', async (e)=>{
		e.preventDefault();
		const id = e.target.getAttribute('data-id');
		const parent = e.target.closest('.sections');
		const classId = parent.getAttribute('data-class');
		await apiFetch(`/api/classes/${classId}/sections/${id}`, { method: 'DELETE' });
		window.showToast('Section removed');
		loadClasses();
	}));
	document.querySelectorAll('.subjects .x').forEach(a => a.addEventListener('click', async (e)=>{
		e.preventDefault();
		const id = e.target.getAttribute('data-id');
		const parent = e.target.closest('.subjects');
		const classId = parent.getAttribute('data-class');
		await apiFetch(`/api/classes/${classId}/subjects/${id}`, { method: 'DELETE' });
		window.showToast('Subject removed');
		loadClasses();
	}));

	// Add section/subject
	document.querySelectorAll('.section-form').forEach(f => f.addEventListener('submit', async (e)=>{
		e.preventDefault();
		const classId = e.target.getAttribute('data-class');
		const input = e.target.querySelector('input');
		await apiFetch(`/api/classes/${classId}/sections`, { method: 'POST', body: JSON.stringify({ NAME: input.value }) });
		input.value = '';
		loadClasses();
	}));
	document.querySelectorAll('.subject-form').forEach(f => f.addEventListener('submit', async (e)=>{
		e.preventDefault();
		const classId = e.target.getAttribute('data-class');
		const input = e.target.querySelector('input');
		await apiFetch(`/api/classes/${classId}/subjects`, { method: 'POST', body: JSON.stringify({ NAME: input.value }) });
		input.value = '';
		loadClasses();
	}));

	// Class delete
	document.querySelectorAll('button.del').forEach(btn => btn.addEventListener('click', async (e)=>{
		const id = e.target.getAttribute('data-id');
		if(!confirm('Delete class? This removes sections and subjects.')) return;
		await apiFetch(`/api/classes/${id}`, { method: 'DELETE' });
		window.showToast('Class deleted');
		loadClasses();
	}));
}

document.getElementById('class-form').addEventListener('submit', async (e)=>{
	e.preventDefault();
	await apiFetch('/api/classes', { method: 'POST', body: JSON.stringify({ NAME: document.getElementById('className').value }) });
	document.getElementById('className').value='';
	loadClasses();
});

loadClasses();


