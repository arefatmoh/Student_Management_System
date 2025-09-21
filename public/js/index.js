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
		
		// Update user info display
		document.getElementById('userName').textContent = user.username || 'User';
		document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrator' : 'Teacher';
	} catch (error) {
		console.log('Could not check user role:', error);
		document.getElementById('userName').textContent = 'User';
		document.getElementById('userRole').textContent = 'Unknown';
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
		const fees = await fetchJson('/api/reports/fees');
		const pendingFees = fees.totalPending ?? 0;
		animateValue(document.getElementById('kpi-pending'), 0, pendingFees, 1000);
		updateKPIChange('fees-change', pendingFees, pendingFees + 3); // Mock previous value
	} catch (error) {
		console.error('Error loading fees:', error);
		document.getElementById('kpi-pending').textContent = '-';
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
		const invoices = await fetchJson('/api/invoices?status=Overdue&limit=1');
		const overdueInvoices = invoices.pagination?.total ?? 0;
		animateValue(document.getElementById('kpi-overdue'), 0, overdueInvoices, 1000);
		updateKPIChange('overdue-change', overdueInvoices, overdueInvoices + 1); // Mock previous value
	} catch (error) {
		console.error('Error loading invoices:', error);
		document.getElementById('kpi-overdue').textContent = '-';
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


