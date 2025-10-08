async function fetchJson(url, options) {
	const res = await fetch(url, options);
	return res.json();
}

// Check user role and show/hide admin features
async function checkUserRole() {
	try {
		const user = await fetchJson('/api/auth/me');
		if (user.role === 'admin') {
			document.getElementById('adminCard').style.display = 'block';
		}
		
		// Update user info display
		document.getElementById('userName').textContent = user.username || 'User';
		document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrator' : (user.role === 'teacher' ? 'Teacher' : 'User');
	} catch (error) {
		console.log('Could not check user role:', error);
		document.getElementById('userName').textContent = 'User';
		document.getElementById('userRole').textContent = 'User';
	}
}

// Animate KPI values
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Update KPI change indicators
function updateKPIChange(elementId, current, previous) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;
    
    if (change > 0) {
        element.className = 'kpi-change positive';
        element.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${changePercent}%</span>`;
    } else if (change < 0) {
        element.className = 'kpi-change negative';
        element.innerHTML = `<i class="fas fa-arrow-down"></i><span>${changePercent}%</span>`;
    } else {
        element.className = 'kpi-change';
        element.innerHTML = `<i class="fas fa-minus"></i><span>No change</span>`;
    }
}

(async function init() {
	// Check user role first
	await checkUserRole();
	
	// Load KPIs with animation
	try {
		const students = await fetchJson('/api/students?limit=1');
		const totalStudents = students.total ?? 0;
		animateValue(document.getElementById('kpi-students'), 0, totalStudents, 1000);
		updateKPIChange('students-change', totalStudents, totalStudents - 5); // Mock previous value
	} catch (error) {
		console.error('Error loading students:', error);
		document.getElementById('kpi-students').textContent = '-';
	}
	
	try {
		const currentMonth = new Date().toISOString().slice(0,7);
		const fees = await fetchJson(`/api/fees?month=${currentMonth}&status=Paid&limit=1000`);
		const studentsPaid = new Set(fees.data?.map(f => f.STUDENT_ID) || []).size;
		animateValue(document.getElementById('kpi-students-paid'), 0, studentsPaid, 1000);
		updateKPIChange('fees-change', studentsPaid, studentsPaid - 2); // Mock previous value
	} catch (error) {
		console.error('Error loading students paid:', error);
		document.getElementById('kpi-students-paid').textContent = '-';
	}
	
	try {
		const today = new Date().toISOString().slice(0,10);
		const att = await fetchJson(`/api/attendance?from=${today}&to=${today}&status=Present`);
		const presentToday = att.total ?? 0;
		animateValue(document.getElementById('kpi-present'), 0, presentToday, 1000);
		updateKPIChange('attendance-change', presentToday, presentToday - 2); // Mock previous value
	} catch (error) {
		console.error('Error loading attendance:', error);
		document.getElementById('kpi-present').textContent = '-';
	}
	
	
	try {
		const classes = await fetchJson('/api/classes');
		const totalClasses = classes.length ?? 0;
		animateValue(document.getElementById('kpi-classes'), 0, totalClasses, 1000);
		updateKPIChange('classes-change', totalClasses, totalClasses - 1); // Mock previous value
	} catch (error) {
		console.error('Error loading classes:', error);
		document.getElementById('kpi-classes').textContent = '-';
	}
	
	try {
		const subjects = await fetchJson('/api/classes/subjects');
		const totalSubjects = subjects.length ?? 0;
		animateValue(document.getElementById('kpi-subjects'), 0, totalSubjects, 1000);
		updateKPIChange('subjects-change', totalSubjects, totalSubjects - 2); // Mock previous value
	} catch (error) {
		console.error('Error loading subjects:', error);
		document.getElementById('kpi-subjects').textContent = '-';
	}
})();


