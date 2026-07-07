const API = 'http://127.0.0.1:5000';
let allEmp = [];
let analyticsLoaded = false;
let gradeLoaded = false;
let current360Emp = null;

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
    document.getElementById('formAadhaar').value = e.Aadhaar || '';
    document.getElementById('formPAN').value = e.PAN || '';
    document.getElementById('formPassport').value = e.Passport || '';
    document.getElementById('formDL').value = e.DrivingLicence || '';
    const lv = e.Leave || {};
    document.getElementById('formSick').value = lv.Sick ? lv.Sick.taken : 0;
    document.getElementById('formCasual').value = lv.Casual ? lv.Casual.taken : 0;
    document.getElementById('formEarned').value = lv.Earned ? lv.Earned.taken : 0;
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
        Aadhaar: document.getElementById('formAadhaar').value.trim(),
        PAN: document.getElementById('formPAN').value.trim(),
        Passport: document.getElementById('formPassport').value.trim(),
        DrivingLicence: document.getElementById('formDL').value.trim(),
        SickLeaveTaken: document.getElementById('formSick').value,
        CasualLeaveTaken: document.getElementById('formCasual').value,
        EarnedLeaveTaken: document.getElementById('formEarned').value,
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
    current360Emp = e;
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
    document.getElementById('m360-aadhaar').textContent = e.AadhaarMasked || '--';
    document.getElementById('m360-pan').textContent = e.PANMasked || '--';
    document.getElementById('m360-passport').textContent = e.Passport || '--';
    document.getElementById('m360-dl').textContent = e.DrivingLicence || '--';

    const leave = e.Leave || {};
    ['Sick','Casual','Earned'].forEach(type => {
        const info = leave[type] || { total: 0, taken: 0, remaining: 0 };
        const key = type.toLowerCase();
        document.getElementById(`m360-${key}`).textContent = `${info.remaining}/${info.total}`;
        const pct = info.total ? (info.taken / info.total) * 100 : 0;
        document.getElementById(`m360-${key}Bar`).style.width = pct + '%';
    });
    // Performance & Tasks (deeper)
    document.getElementById('m360-qi').textContent = e.QualityIndex ?? '--';
    document.getElementById('m360-avgTasks').textContent = e.AvgTasksPerMonth ?? '--';
    const pri = e.TaskPriority || { High: 0, Medium: 0, Low: 0 };
    document.getElementById('m360-priHigh').style.width = pri.High + '%';
    document.getElementById('m360-priMed').style.width = pri.Medium + '%';
    document.getElementById('m360-priLow').style.width = pri.Low + '%';
    document.getElementById('m360-priHighTxt').textContent = pri.High + '%';
    document.getElementById('m360-priMedTxt').textContent = pri.Medium + '%';
    document.getElementById('m360-priLowTxt').textContent = pri.Low + '%';

    // Projects
    const statusColor = { Completed: '#10b981', 'In Progress': '#6366f1', 'On Hold': '#f59e0b' };
    const projects = e.Projects || [];
    document.getElementById('m360-projects').innerHTML = projects.map(p => `
        <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:600;color:#0f1224;">${p.name}</span>
                <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:12px;background:${statusColor[p.status]}20;color:${statusColor[p.status]};">${p.status}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px;">
                <span>Role: ${p.role}</span>
                <span>${p.completion}%</span>
            </div>
            <div style="background:#e5e7eb;border-radius:8px;height:6px;overflow:hidden;">
                <div style="height:100%;width:${p.completion}%;background:${statusColor[p.status]};border-radius:8px;"></div>
            </div>
        </div>
    `).join('');

    // Skills & Certifications
    const levelColor = { Beginner: '#9ca3af', Intermediate: '#f59e0b', Advanced: '#6366f1', Expert: '#10b981' };
    const skills = e.Skills || [];
    document.getElementById('m360-skills').innerHTML = skills.map(s => `
        <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span style="font-weight:600;color:#0f1224;">${s.name}</span>
                <span style="font-size:11px;font-weight:700;color:${levelColor[s.level]};">${s.level}</span>
            </div>
            <div style="background:#f3f4f6;border-radius:8px;height:6px;overflow:hidden;">
                <div style="height:100%;width:${s.proficiency}%;background:${levelColor[s.level]};border-radius:8px;"></div>
            </div>
        </div>
    `).join('');

    const certs = e.Certifications || [];
    document.getElementById('m360-certs').innerHTML = certs.length ? certs.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:8px;padding:10px 12px;">
            <span style="font-size:13px;color:#0f1224;font-weight:600;">🎓 ${c.name}</span>
            <span style="font-size:12px;color:#9ca3af;">${c.year}</span>
        </div>
    `).join('') : '<div style="font-size:13px;color:#9ca3af;">No certifications on record.</div>';

    // Achievements & Awards
    const achievements = e.Achievements || [];
    document.getElementById('m360-achievements').innerHTML = achievements.length ? achievements.map(a => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#fffbeb,#fff7ed);border-radius:10px;padding:12px 14px;border:1px solid #fde68a;">
            <span style="font-size:13px;color:#0f1224;font-weight:600;">🏆 ${a.title}</span>
            <span style="font-size:12px;color:#9ca3af;">${a.year}</span>
        </div>
    `).join('') : '<div style="font-size:13px;color:#9ca3af;">No achievements on record yet.</div>';

    // Feedback
    const feedback = e.Feedback || [];
    document.getElementById('m360-feedback').innerHTML = feedback.length ? feedback.map(f => {
        const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
        const when = f.monthsAgo === 1 ? '1 month ago' : `${f.monthsAgo} months ago`;
        return `
        <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:600;color:#0f1224;">${f.reviewer}</span>
                <span style="font-size:12px;color:#f59e0b;letter-spacing:1px;">${stars}</span>
            </div>
            <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:4px;">${f.comment}</p>
            <span style="font-size:11px;color:#9ca3af;">${when}</span>
        </div>`;
    }).join('') : '<div style="font-size:13px;color:#9ca3af;">No feedback on record yet.</div>';

    // Assets Assigned
    const assetIcon = { 'ID Card': '🪪', 'Access Card': '🔑', 'Laptop': '💻', 'External Monitor': '🖥️', 'Wireless Mouse & Keyboard': '⌨️', 'Noise-cancelling Headset': '🎧', 'Company Mobile Phone': '📱' };
    const assets = e.Assets || [];
    document.getElementById('m360-assets').innerHTML = assets.map(a => `
        <div style="background:#f9fafb;border-radius:10px;padding:12px;">
            <div style="font-size:13px;font-weight:600;color:#0f1224;margin-bottom:4px;">${assetIcon[a.name] || '📦'} ${a.name}</div>
            <div style="font-size:11px;color:#9ca3af;">${a.detail ? a.detail + ' · ' : ''}${a.tag}</div>
            <span style="display:inline-block;margin-top:6px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#d1fae5;color:#065f46;">${a.status}</span>
        </div>
    `).join('');

    // Documents
    const docIcon = { Resume: '📄', 'Offer Letter': '📝', Certificates: '🎓' };
    const documents = e.Documents || [];
    document.getElementById('m360-documents').innerHTML = documents.map(doc => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:8px;padding:10px 12px;">
            <span style="font-size:13px;color:#0f1224;font-weight:600;">${docIcon[doc.type] || '📎'} ${doc.name}</span>
            <span style="display:flex;align-items:center;gap:10px;">
                ${doc.date ? `<span style="font-size:11px;color:#9ca3af;">${doc.date}</span>` : ''}
                <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;background:${doc.uploaded ? '#d1fae5;color:#065f46' : '#fee2e2;color:#991b1b'};">${doc.uploaded ? 'Uploaded' : 'Not Uploaded'}</span>
            </span>
        </div>
    `).join('');

    document.getElementById('modal360').style.display = 'flex';
}

function downloadEmployee360PDF() {
    const e = current360Emp;
    if (!e || !window.jspdf) { alert('PDF library not loaded yet — please try again in a moment.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    const line = (text, size = 10, gap = 6) => { doc.setFontSize(size); doc.text(text, 14, y); y += gap; };
    const heading = (text) => { if (y > 265) { doc.addPage(); y = 20; } y += 4; line(text, 13, 8); };

    doc.setFontSize(18);
    doc.text('VergeX — Employee 360 Report', 14, y); y += 10;
    line(`${e.Name}  (${e.EmployeeID})`, 12, 7);
    line(`${e.Department} · ${e.Designation}`, 11, 10);

    heading('Performance');
    line(`Performance Score: ${e.PerformanceScore}  |  Grade: ${e.PerformanceGrade}`);
    line(`Attendance: ${e.Attendance}%  |  Deadline Adherence: ${e.DeadlineAdherence}%`);
    line(`Quality Index: ${e.QualityIndex}  |  Avg Tasks/Month: ${e.AvgTasksPerMonth}`);

    heading('Leave Balance');
    const leave = e.Leave || {};
    ['Sick', 'Casual', 'Earned'].forEach(t => {
        const info = leave[t] || { remaining: 0, total: 0 };
        line(`${t}: ${info.remaining}/${info.total} remaining`);
    });

    heading('Top Skills');
    (e.Skills || []).forEach(s => line(`${s.name} — ${s.level}`));

    heading('Certifications');
    const certs = e.Certifications || [];
    if (certs.length) certs.forEach(c => line(`${c.name} (${c.year})`));
    else line('No certifications on record.');

    heading('Achievements');
    const achievements = e.Achievements || [];
    if (achievements.length) achievements.forEach(a => line(`${a.title} (${a.year})`));
    else line('No achievements on record yet.');

    heading('Projects');
    (e.Projects || []).forEach(p => line(`${p.name} — ${p.role} — ${p.status} (${p.completion}%)`));

    heading('Recent Feedback');
    const feedback = e.Feedback || [];
    if (feedback.length) {
        feedback.forEach(f => {
            if (y > 260) { doc.addPage(); y = 20; }
            const lines = doc.splitTextToSize(`${f.reviewer} (${f.rating}/5): ${f.comment}`, 180);
            doc.setFontSize(10);
            doc.text(lines, 14, y);
            y += lines.length * 6 + 2;
        });
    } else {
        line('No feedback on record yet.');
    }

    heading('Assets Assigned');
    (e.Assets || []).forEach(a => line(`${a.name}${a.detail ? ' — ' + a.detail : ''} (${a.tag})`));

    doc.save(`${e.EmployeeID}_${e.Name.replace(/\s+/g, '_')}_Employee360.pdf`);
}

function closeModal360(e) {
    if (!e || e.target === document.getElementById('modal360')) {
        document.getElementById('modal360').style.display = 'none';
    }
}
