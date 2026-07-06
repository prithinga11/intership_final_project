const API = 'http://127.0.0.1:5000';
let allEmp = [];
let analyticsLoaded = false;
let gradeLoaded = false;

if (!localStorage.getItem('vergex_role')) window.location.href = 'login.html';
if (localStorage.getItem('vergex_role') === 'employee') window.location.href = 'employee.html';

const uName = localStorage.getItem('vergex_name') || 'Manager';
document.getElementById('uName').textContent = uName;
document.getElementById('uAvatar').textContent = uName.charAt(0);
document.getElementById('dateEl').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

function show(sec, el) {
    document.querySelectorAll('[id^="s-"]').forEach(s => s.style.display = 'none');
    document.getElementById('s-' + sec).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const t = { dashboard:['Performance Dashboard','Welcome back! Here\'s what\'s happening with your team.'], employees:['Employee Directory','Search, filter and view all employee records.'], analytics:['Analytics','Deep dive into performance and productivity trends.'], reports:['Reports','Download performance reports and data exports.'], ai:['AI Insights','Automated analysis and recommendations for your team.'] };
    document.getElementById('pageTitle').textContent = t[sec][0];
    document.getElementById('pageSub').textContent = t[sec][1];
    if (sec === 'analytics' && !analyticsLoaded) loadAnalytics();
    if (sec === 'ai' && !gradeLoaded) loadAI();
    return false;
}

function logout() { localStorage.clear(); window.location.href = 'login.html'; }

// Summary
fetch(`${API}/api/summary`).then(r=>r.json()).then(d => {
    document.getElementById('c-total').textContent = d.totalEmployees;
    document.getElementById('c-perf').textContent = d.avgPerformanceScore + '%';
    document.getElementById('c-att').textContent = d.avgAttendance + '%';
    document.getElementById('c-task').textContent = d.avgTaskCompletion + '%';
});

fetch(`${API}/api/top-performers`).then(r=>r.json()).then(d => {
    const t = d[0];
    document.getElementById('h-topName').textContent = t.Name;
    document.getElementById('h-topDept').textContent = t.Department + ' · ' + t.Designation;
    document.getElementById('h-topScore').textContent = t.PerformanceScore;
});

fetch(`${API}/api/low-performers`).then(r=>r.json()).then(d => {
    const l = d[0];
    document.getElementById('h-lowName').textContent = l.Name;
    document.getElementById('h-lowDept').textContent = l.Department + ' · ' + l.Designation;
    document.getElementById('h-lowScore').textContent = l.PerformanceScore;
});

fetch(`${API}/api/attendance`).then(r=>r.json()).then(d => {
    document.getElementById('h-good').textContent = d.Good + ' employees';
    document.getElementById('h-avg').textContent = d.Average + ' employees';
    document.getElementById('h-poor').textContent = d.Poor + ' employees';
});

// Dashboard charts
fetch(`${API}/api/departments`).then(r=>r.json()).then(d => {
    new Chart(document.getElementById('deptChart'), {
        type: 'bar',
        data: { labels: d.map(x=>x.Department), datasets: [{ data: d.map(x=>x.avgPerformance), backgroundColor: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6'], borderRadius: 8, borderSkipped: false }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } }
    });
});

fetch(`${API}/api/attendance`).then(r=>r.json()).then(d => {
    new Chart(document.getElementById('attChart'), {
        type: 'doughnut',
        data: { labels: ['Good','Average','Poor'], datasets: [{ data: [d.Good,d.Average,d.Poor], backgroundColor: ['#10b981','#f59e0b','#ef4444'], borderWidth: 0, hoverOffset: 8 }] },
        options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { padding: 20, font: { size: 13 } } } } }
    });
});

fetch(`${API}/api/top-performers`).then(r=>r.json()).then(d => {
    new Chart(document.getElementById('topChart'), {
        type: 'bar',
        data: { labels: d.map(x=>x.Name), datasets: [{ data: d.map(x=>x.PerformanceScore), backgroundColor: '#6366f1', borderRadius: 8, borderSkipped: false }] },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 50, max: 100, grid: { color: '#f3f4f6' } }, y: { grid: { display: false } } } }
    });
});

// Employee table
fetch(`${API}/api/employees`).then(r=>r.json()).then(d => {
    allEmp = d;
    renderTable(d);
});

function renderTable(data) {
    const bm = { Excellent: 'badge-excellent', Good: 'badge-good', Average: 'badge-avg', Poor: 'badge-poor' };
    document.getElementById('empBody').innerHTML = data.map(e => {
        const rate = ((e.TasksCompleted / e.TasksAssigned) * 100).toFixed(0);
        const g = e.PerformanceGrade || (e.PerformanceScore >= 90 ? 'Excellent' : e.PerformanceScore >= 75 ? 'Good' : e.PerformanceScore >= 60 ? 'Average' : 'Poor');
        return `<tr>
            <td><strong>${e.EmployeeID}</strong></td>
            <td>${e.Name}</td>
            <td>${e.Department}</td>
            <td>${e.Designation}</td>
            <td>${e.Experience} yrs</td>
            <td>${e.Attendance}%</td>
            <td>${e.TasksCompleted}/${e.TasksAssigned} (${rate}%)</td>
            <td><strong>${e.PerformanceScore}</strong></td>
            <td><span class="badge ${bm[g]}">${g}</span></td>
        </tr>`;
    }).join('');
}

function filterTable() {
    const s = document.getElementById('searchBox').value.toLowerCase();
    const d = document.getElementById('deptFilter').value;
    const g = document.getElementById('gradeFilter').value;
    renderTable(allEmp.filter(e => {
        const ms = e.Name.toLowerCase().includes(s) || e.Department.toLowerCase().includes(s) || e.EmployeeID.toLowerCase().includes(s);
        const md = !d || e.Department === d;
        const grade = e.PerformanceScore >= 90 ? 'Excellent' : e.PerformanceScore >= 75 ? 'Good' : e.PerformanceScore >= 60 ? 'Average' : 'Poor';
        const mg = !g || grade === g;
        return ms && md && mg;
    }));
}

// Analytics
function loadAnalytics() {
    analyticsLoaded = true;
    fetch(`${API}/api/departments`).then(r=>r.json()).then(d => {
        new Chart(document.getElementById('a-dept'), {
            type: 'bar',
            data: { labels: d.map(x=>x.Department), datasets: [{ label: 'Avg Performance', data: d.map(x=>x.avgPerformance), backgroundColor: '#6366f1', borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100 }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('a-task'), {
            type: 'bar',
            data: { labels: d.map(x=>x.Department), datasets: [{ label: 'Task Completion %', data: d.map(x=>x.avgTaskCompletion), backgroundColor: '#10b981', borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100 }, x: { grid: { display: false } } } }
        });
        new Chart(document.getElementById('a-att'), {
            type: 'bar',
            data: { labels: d.map(x=>x.Department), datasets: [{ label: 'Avg Attendance %', data: d.map(x=>x.avgAttendance), backgroundColor: '#f59e0b', borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100 }, x: { grid: { display: false } } } }
        });
    });
    fetch(`${API}/api/low-performers`).then(r=>r.json()).then(d => {
        new Chart(document.getElementById('a-low'), {
            type: 'bar',
            data: { labels: d.map(x=>x.Name), datasets: [{ data: d.map(x=>x.PerformanceScore), backgroundColor: '#ef4444', borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 }, y: { grid: { display: false } } } }
        });
    });
}

// AI Insights
function loadAI() {
    gradeLoaded = true;
    fetch(`${API}/api/summary`).then(r=>r.json()).then(d => {
        const insights = [
            { title: 'Overall Performance', text: `The team average performance score is ${d.avgPerformanceScore}%. ${d.excellentCount} employees are rated Excellent and ${d.goodCount} are Good. Focus on upskilling the ${d.poorCount} employees rated Poor.` },
            { title: 'Attendance Analysis', text: `Average attendance stands at ${d.avgAttendance}%. Teams with attendance below 75% require immediate manager intervention. Consider flexible scheduling for low-attendance employees.` },
            { title: 'Productivity Insight', text: `Task completion rate is ${d.avgTaskCompletion}%. High completion correlates directly with performance scores. Employees with low task rates should receive workload review.` },
            { title: 'Recommendations', text: `Recognize the ${d.excellentCount} top performers with rewards. Set up mentorship programs pairing Excellent-rated staff with Average-rated peers to drive team-wide improvement.` },
        ];
        const grid = document.getElementById('aiGrid');
        insights.forEach(i => {
            grid.innerHTML += `<div class="ai-card"><div class="ai-card-header"><div class="ai-dot"></div><div class="ai-card-title">${i.title}</div></div><p>${i.text}</p></div>`;
        });
        new Chart(document.getElementById('gradeChart'), {
            type: 'doughnut',
            data: { labels: ['Excellent','Good','Average','Poor'], datasets: [{ data: [d.excellentCount, d.goodCount, d.averageCount, d.poorCount], backgroundColor: ['#10b981','#6366f1','#f59e0b','#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 20 } } } }
        });
    });
}

// Downloads
function dlCSV() {
    const h = ['EmployeeID','Name','Department','Designation','Experience','Attendance','TasksAssigned','TasksCompleted','DeadlineAdherence','PerformanceScore'];
    const rows = allEmp.map(e => h.map(k => e[k]).join(','));
    const blob = new Blob([[h.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vergex_employees.csv'; a.click();
}

function dlTopCSV() {
    fetch(`${API}/api/top-performers`).then(r=>r.json()).then(d => {
        const h = ['Name','Department','Designation','PerformanceScore','Attendance','TaskCompletionRate'];
        const rows = d.map(e => h.map(k => e[k]).join(','));
        const blob = new Blob([[h.join(','), ...rows].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'top_performers.csv'; a.click();
    });
}

function dlSummary() {
    fetch(`${API}/api/summary`).then(r=>r.json()).then(d => {
        const txt = `VERGEX — EXECUTIVE PERFORMANCE SUMMARY\nGenerated: ${new Date().toLocaleDateString()}\n${'='.repeat(45)}\n\nKEY METRICS\nTotal Employees     : ${d.totalEmployees}\nAvg Performance     : ${d.avgPerformanceScore}%\nAvg Attendance      : ${d.avgAttendance}%\nTask Completion     : ${d.avgTaskCompletion}%\n\nPERFORMANCE DISTRIBUTION\nExcellent  : ${d.excellentCount} employees\nGood       : ${d.goodCount} employees\nAverage    : ${d.averageCount} employees\nPoor       : ${d.poorCount} employees\n\nHIGHLIGHTS\nTop Performer   : ${document.getElementById('h-topName').textContent} (Score: ${document.getElementById('h-topScore').textContent})\nNeeds Attention : ${document.getElementById('h-lowName').textContent} (Score: ${document.getElementById('h-lowScore').textContent})\n\n${'='.repeat(45)}\nConfidential — VergeX Analytics Platform`;
        const blob = new Blob([txt], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vergex_executive_summary.txt'; a.click();
    });
}
// ============ CRUD ============

function renderTable(data) {
    const bm = { Excellent: 'badge-excellent', Good: 'badge-good', Average: 'badge-avg', Poor: 'badge-poor' };
    document.getElementById('empBody').innerHTML = data.map(e => {
        const rate = ((e.TasksCompleted / e.TasksAssigned) * 100).toFixed(0);
        const g = e.PerformanceGrade || (e.PerformanceScore >= 90 ? 'Excellent' : e.PerformanceScore >= 75 ? 'Good' : e.PerformanceScore >= 60 ? 'Average' : 'Poor');
        return `<tr>
            <td><strong>${e.EmployeeID}</strong></td>
            <td><span style="color:#6366f1;cursor:pointer;font-weight:600;" onclick='open360(${JSON.stringify(e)})'>${e.Name}</span></td>
            <td>${e.Department}</td>
            <td>${e.Designation}</td>
            <td>${e.Experience} yrs</td>
            <td>${e.Attendance}%</td>
            <td>${e.TasksCompleted}/${e.TasksAssigned} (${rate}%)</td>
            <td><strong>${e.PerformanceScore}</strong></td>
            <td><span class="badge ${bm[g]}">${g}</span></td>
            <td>
                <button class="action-btn edit-btn" onclick="openEdit(${JSON.stringify(e).split('"').join("'")})">Edit</button>
                <button class="action-btn del-btn" onclick="deleteEmp('${e.EmployeeID}')">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

function openAdd() {
    document.getElementById('modalTitle').textContent = 'Add Employee';
    document.getElementById('empForm').reset();
    document.getElementById('formEmpId').removeAttribute('readonly');
    document.getElementById('saveBtn').onclick = saveAdd;
    document.getElementById('modal').style.display = 'flex';
}

function openEdit(e) {
    if (typeof e === 'string') e = JSON.parse(e.split("'").join('"'));
    document.getElementById('modalTitle').textContent = 'Edit Employee';
    document.getElementById('formEmpId').value = e.EmployeeID;
    document.getElementById('formEmpId').setAttribute('readonly', true);
    document.getElementById('formName').value = e.Name;
    document.getElementById('formDept').value = e.Department;
    document.getElementById('formDesig').value = e.Designation;
    document.getElementById('formExp').value = e.Experience;
    document.getElementById('formAtt').value = e.Attendance;
    document.getElementById('formTA').value = e.TasksAssigned;
    document.getElementById('formTC').value = e.TasksCompleted;
    document.getElementById('formDA').value = e.DeadlineAdherence;
    document.getElementById('formPS').value = e.PerformanceScore;
    document.getElementById('formAge').value = e.Age || '';
    document.getElementById('formBlood').value = e.BloodGroup || '';
    document.getElementById('formDOJ').value = e.DateOfJoining || '';
    document.getElementById('formEcName').value = e.EmergencyContactName || '';
    document.getElementById('formEcPhone').value = e.EmergencyContactPhone || '';
    document.getElementById('formPhotoData').value = e.Photo || '';
    document.getElementById('saveBtn').onclick = () => saveEdit(e.EmployeeID);
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function readPhotoFile() {
    const fileInput = document.getElementById('formPhoto');
    const file = fileInput.files && fileInput.files[0];
    if (!file) return Promise.resolve(document.getElementById('formPhotoData').value || '');
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // data:image/...;base64,....
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getFormData(photoData) {
    return {
        EmployeeID: document.getElementById('formEmpId').value.trim().toUpperCase(),
        Name: document.getElementById('formName').value.trim(),
        Department: document.getElementById('formDept').value,
        Designation: document.getElementById('formDesig').value.trim(),
        Experience: document.getElementById('formExp').value,
        Attendance: document.getElementById('formAtt').value,
        TasksAssigned: document.getElementById('formTA').value,
        TasksCompleted: document.getElementById('formTC').value,
        DeadlineAdherence: document.getElementById('formDA').value,
        PerformanceScore: document.getElementById('formPS').value,
        Age: document.getElementById('formAge').value,
        BloodGroup: document.getElementById('formBlood').value,
        DateOfJoining: document.getElementById('formDOJ').value,
        EmergencyContactName: document.getElementById('formEcName').value.trim(),
        EmergencyContactPhone: document.getElementById('formEcPhone').value.trim(),
        Photo: photoData || '',
    };
}

async function saveAdd() {
    const photoData = await readPhotoFile();
    fetch(`${API}/api/employees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getFormData(photoData)) })
    .then(r => r.json()).then(d => {
        if (d.error) { alert(d.error); return; }
        closeModal();
        refreshTable();
    });
}

async function saveEdit(empId) {
    const photoData = await readPhotoFile();
    fetch(`${API}/api/employees/${empId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getFormData(photoData)) })
    .then(r => r.json()).then(d => {
        if (d.error) { alert(d.error); return; }
        closeModal();
        refreshTable();
    });
}

function deleteEmp(empId) {
    if (!confirm(`Delete employee ${empId}? This cannot be undone.`)) return;
    fetch(`${API}/api/employees/${empId}`, { method: 'DELETE' })
    .then(r => r.json()).then(() => refreshTable());
}

function refreshTable() {
    fetch(`${API}/api/employees`).then(r => r.json()).then(d => { allEmp = d; renderTable(d); });
}
// ============ EMPLOYEE 360 ============
function open360(e) {
    const score = e.PerformanceScore;
    const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Average' : 'Poor';
    const badgeMap = { Excellent: '#d1fae5;color:#065f46', Good: '#dbeafe;color:#1e40af', Average: '#fef3c7;color:#92400e', Poor: '#fee2e2;color:#991b1b' };
    const taskRate = ((e.TasksCompleted / e.TasksAssigned) * 100).toFixed(1);

    const avatarEl = document.getElementById('m360-avatar');
    if (e.Photo) {
        avatarEl.innerHTML = `<img src="${e.Photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        avatarEl.textContent = e.Name.charAt(0);
    }
    document.getElementById('m360-name').textContent = e.Name;
    document.getElementById('m360-meta').textContent = e.Department + ' · ' + e.Designation;
    document.getElementById('m360-badge').textContent = grade;
    document.getElementById('m360-badge').style.cssText = `display:inline-block;margin-top:8px;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${badgeMap[grade].split(';')[0]};color:${badgeMap[grade].split('color:')[1]}`;
    document.getElementById('m360-score').textContent = score;
    document.getElementById('m360-att').textContent = e.Attendance + '%';
    document.getElementById('m360-rate').textContent = taskRate + '%';
    document.getElementById('m360-deadline').textContent = e.DeadlineAdherence + '%';
    document.getElementById('m360-exp').textContent = e.Experience + ' yrs';
    document.getElementById('m360-id').textContent = e.EmployeeID;
    document.getElementById('m360-dept').textContent = e.Department;
    document.getElementById('m360-desig').textContent = e.Designation;
    document.getElementById('m360-expyr').textContent = e.Experience + ' years';
    document.getElementById('m360-ta').textContent = e.TasksAssigned;
    document.getElementById('m360-tc').textContent = e.TasksCompleted;
    document.getElementById('m360-tcr').textContent = taskRate + '%';
    document.getElementById('m360-da').textContent = e.DeadlineAdherence + '%';
    document.getElementById('m360-scoreBar').textContent = score + '/100';
    document.getElementById('m360-bar').style.width = score + '%';

    // Personal info
    document.getElementById('m360-age').textContent = e.Age || '--';
    document.getElementById('m360-blood').textContent = e.BloodGroup || '--';
    document.getElementById('m360-doj').textContent = e.DateOfJoining || '--';
    document.getElementById('m360-ecname').textContent = e.EmergencyContactName || '--';
    document.getElementById('m360-ecphone').textContent = e.EmergencyContactPhone || '--';

    const insight = score >= 85
        ? `${e.Name} is a top-performing employee with a score of ${score}. Their task completion rate of ${taskRate}% and attendance of ${e.Attendance}% reflect exceptional dedication. Consider them for leadership roles or mentorship programs.`
        : score >= 70
        ? `${e.Name} shows consistent performance with a score of ${score}. With a task completion rate of ${taskRate}%, there is room to grow. Focused coaching on deadline adherence could push them to the next level.`
        : `${e.Name} currently scores ${score} and needs structured support. Attendance at ${e.Attendance}% and task completion at ${taskRate}% indicate challenges that a personalised improvement plan could address.`;

    document.getElementById('m360-insight').textContent = insight;
    document.getElementById('modal360').style.display = 'flex';
}

function closeModal360(e) {
    if (!e || e.target === document.getElementById('modal360')) {
        document.getElementById('modal360').style.display = 'none';
    }
}