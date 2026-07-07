import os
import sqlite3
import json
import random
import hashlib
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'vergex.db')

# Global constant moved from init_db to prevent NameError
LEAVE_TOTALS = {'Sick': 12, 'Casual': 12, 'Earned': 15}

# Deterministic per-employee "random" generator so the same employee always
# sees the same Task Priority split / Project list, without storing it in the DB.
def _seeded_random(seed_str):
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)

PROJECT_POOL = {
    'Engineering': ['API Gateway Migration', 'Microservices Refactor', 'Internal Dev Tools Upgrade', 'Cloud Cost Optimization', 'Mobile App Revamp', 'CI/CD Pipeline Overhaul'],
    'Human Resources': ['Employee Onboarding Revamp', 'HRMS Migration', 'Wellness Program Rollout', 'Policy Handbook Refresh', 'Diversity Hiring Initiative'],
    'Sales': ['Q3 Sales Enablement', 'CRM Data Cleanup', 'Regional Expansion Pilot', 'Key Account Retention Drive', 'Sales Playbook Refresh'],
    'Finance': ['Budget Forecasting Model', 'Audit Readiness Prep', 'Expense Automation Rollout', 'Vendor Contract Review', 'Financial Reporting Revamp'],
    'Marketing': ['Campaign Launch - Summer', 'Brand Refresh Initiative', 'SEO Content Overhaul', 'Social Media Analytics Dashboard', 'Customer Persona Research'],
}

def get_task_priority(emp_id):
    r = _seeded_random(emp_id + '-priority')
    high = r.randint(20, 40)
    medium = r.randint(25, 45)
    low = max(10, 100 - high - medium)
    total = high + medium + low
    high = round(high * 100 / total)
    medium = round(medium * 100 / total)
    low = 100 - high - medium
    return {'High': high, 'Medium': medium, 'Low': low}

def get_projects(emp_id, department):
    pool = PROJECT_POOL.get(department, PROJECT_POOL['Engineering'])
    r = _seeded_random(emp_id + '-projects')
    count = min(r.randint(2, 4), len(pool))
    chosen = r.sample(pool, count)
    statuses = ['Completed', 'In Progress', 'On Hold']
    roles = ['Lead', 'Contributor', 'Reviewer', 'Coordinator']
    projects = []
    for name in chosen:
        status = r.choices(statuses, weights=[0.45, 0.4, 0.15])[0]
        if status == 'Completed':
            completion = 100
        elif status == 'In Progress':
            completion = r.randint(35, 90)
        else:
            completion = r.randint(10, 40)
        projects.append({'name': name, 'role': r.choice(roles), 'status': status, 'completion': completion})
    return projects

SKILLS_POOL = {
    'Engineering': ['Python', 'JavaScript', 'System Design', 'SQL', 'Cloud Architecture', 'Docker & Kubernetes', 'Data Structures & Algorithms', 'CI/CD'],
    'Human Resources': ['Talent Acquisition', 'Employee Relations', 'HR Analytics', 'Conflict Resolution', 'Payroll Management', 'Onboarding Design'],
    'Sales': ['Negotiation', 'CRM Tools', 'Lead Generation', 'Account Management', 'Sales Forecasting', 'Client Relationship Building'],
    'Finance': ['Financial Modeling', 'Budgeting & Forecasting', 'Excel/VBA', 'Risk Analysis', 'Regulatory Compliance', 'Cost Accounting'],
    'Marketing': ['SEO/SEM', 'Content Strategy', 'Social Media Marketing', 'Marketing Analytics', 'Brand Management', 'Campaign Design'],
}

CERTIFICATIONS_POOL = {
    'Engineering': ['AWS Certified Solutions Architect', 'Certified Kubernetes Administrator', 'Oracle Certified Java Programmer', 'Google Cloud Professional Developer'],
    'Human Resources': ['SHRM Certified Professional', 'HR Analytics Certification', 'Certified Compensation Professional'],
    'Sales': ['Certified Sales Professional', 'HubSpot Sales Certification', 'Salesforce Certified Administrator'],
    'Finance': ['Chartered Financial Analyst (Level 1)', 'Certified Management Accountant', 'Financial Modeling Certification'],
    'Marketing': ['Google Ads Certification', 'HubSpot Content Marketing', 'Meta Blueprint Certification'],
}

ACHIEVEMENT_POOL = ['Employee of the Month', 'Top Performer Award', 'Innovation Excellence Award', 'Best Team Player', 'Customer Delight Award', 'Perfect Attendance Award', 'Rising Star Award', 'Leadership Excellence Award']

def get_skills(emp_id, department):
    pool = SKILLS_POOL.get(department, SKILLS_POOL['Engineering'])
    r = _seeded_random(emp_id + '-skills')
    count = min(r.randint(3, 5), len(pool))
    chosen = r.sample(pool, count)
    levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    proficiency_map = {'Beginner': 30, 'Intermediate': 55, 'Advanced': 78, 'Expert': 95}
    skills = []
    for name in chosen:
        level = r.choices(levels, weights=[0.1, 0.3, 0.4, 0.2])[0]
        skills.append({'name': name, 'level': level, 'proficiency': proficiency_map[level]})
    return skills

def get_certifications(emp_id, department, experience):
    pool = CERTIFICATIONS_POOL.get(department, CERTIFICATIONS_POOL['Engineering'])
    r = _seeded_random(emp_id + '-certs')
    count = min(r.randint(1, 3), len(pool))
    chosen = r.sample(pool, count)
    certs = []
    for name in chosen:
        years_ago = r.randint(0, max(1, min(int(experience or 1), 5)))
        certs.append({'name': name, 'year': 2026 - years_ago})
    return sorted(certs, key=lambda c: c['year'], reverse=True)

def get_achievements(emp_id, score, experience):
    r = _seeded_random(emp_id + '-achievements')
    base_count = 3 if score >= 90 else 2 if score >= 75 else 1
    if (experience or 0) >= 5:
        base_count += 1
    count = min(base_count, len(ACHIEVEMENT_POOL))
    chosen = r.sample(ACHIEVEMENT_POOL, count)
    achievements = []
    for name in chosen:
        years_ago = r.randint(0, max(1, min(int(experience or 1), 4)))
        achievements.append({'title': name, 'year': 2026 - years_ago})
    return sorted(achievements, key=lambda a: a['year'], reverse=True)

POSITIVE_FEEDBACK = [
    'Consistently delivers high-quality work and meets deadlines reliably.',
    'Shows strong ownership and proactively solves problems before they escalate.',
    'A dependable team player who elevates those around them.',
    'Demonstrates excellent communication and stakeholder management.',
]
NEUTRAL_FEEDBACK = [
    'Meets expectations consistently; could take on more stretch assignments.',
    'Solid contributor with room to grow in prioritization.',
    'Reliable on core tasks; encouraged to take more initiative on cross-team work.',
]
IMPROVEMENT_FEEDBACK = [
    'Needs to improve consistency in meeting deadlines.',
    'Would benefit from closer check-ins and clearer goal-setting.',
    'Attendance and follow-through need attention going forward.',
]
REVIEWERS = ['Reporting Manager', 'Peer - Team Member', 'Skip-level Manager', 'Cross-functional Partner']

def get_feedback(emp_id, score, experience):
    r = _seeded_random(emp_id + '-feedback')
    if score >= 85:
        pool, rating_range = POSITIVE_FEEDBACK, (4, 5)
    elif score >= 70:
        pool, rating_range = NEUTRAL_FEEDBACK, (3, 4)
    else:
        pool, rating_range = IMPROVEMENT_FEEDBACK, (2, 3)
    count = min(r.randint(2, 3), len(pool))
    comments = r.sample(pool, count)
    reviewers = r.sample(REVIEWERS, count)
    feedback = []
    for comment, reviewer in zip(comments, reviewers):
        feedback.append({
            'reviewer': reviewer,
            'comment': comment,
            'rating': r.randint(*rating_range),
            'monthsAgo': r.randint(1, 10),
        })
    return sorted(feedback, key=lambda f: f['monthsAgo'])

LAPTOP_MODELS = ['Dell Latitude 5440', 'MacBook Pro 14"', 'Lenovo ThinkPad T14', 'HP EliteBook 840', 'Dell XPS 15']
OPTIONAL_ASSETS = ['External Monitor', 'Wireless Mouse & Keyboard', 'Noise-cancelling Headset', 'Company Mobile Phone']

def get_assets(emp_id):
    r = _seeded_random(emp_id + '-assets')
    assets = [
        {'name': 'ID Card', 'tag': f'IDC-{emp_id}', 'status': 'Active'},
        {'name': 'Access Card', 'tag': f'ACS-{emp_id}', 'status': 'Active'},
        {'name': 'Laptop', 'tag': f'LAP-{r.randint(1000, 9999)}', 'detail': r.choice(LAPTOP_MODELS), 'status': 'Active'},
    ]
    extra_count = r.randint(0, 2)
    for name in r.sample(OPTIONAL_ASSETS, extra_count):
        assets.append({'name': name, 'tag': f'AST-{r.randint(1000, 9999)}', 'status': 'Active'})
    return assets

def get_documents(emp_id, doj):
    r = _seeded_random(emp_id + '-documents')
    date = doj or '—'
    docs = [
        {'name': 'Resume.pdf', 'type': 'Resume', 'uploaded': True, 'date': date},
        {'name': 'Offer Letter.pdf', 'type': 'Offer Letter', 'uploaded': True, 'date': date},
    ]
    cert_count = r.randint(0, 3)
    if cert_count > 0:
        docs.append({'name': f'Certificates ({cert_count} file{"s" if cert_count > 1 else ""})', 'type': 'Certificates', 'uploaded': True, 'date': date})
    else:
        docs.append({'name': 'Certificates', 'type': 'Certificates', 'uploaded': False, 'date': None})
    return docs

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

NEW_COLUMNS = {
    'Age': 'INTEGER',
    'BloodGroup': 'TEXT',
    'EmergencyContactName': 'TEXT',
    'EmergencyContactPhone': 'TEXT',
    'DateOfJoining': 'TEXT',
    'Photo': 'TEXT',
    'Aadhaar': 'TEXT',
    'PAN': 'TEXT',
    'Passport': 'TEXT',
    'DrivingLicence': 'TEXT',
    'LeaveData': 'TEXT',
}

def migrate_db(conn):
    """Add any new columns that don't exist yet, so existing DBs upgrade in place."""
    c = conn.cursor()
    existing = {row['name'] for row in c.execute('PRAGMA table_info(employees)').fetchall()}
    for col, coltype in NEW_COLUMNS.items():
        if col not in existing:
            c.execute(f'ALTER TABLE employees ADD COLUMN {col} {coltype}')
    conn.commit()

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            EmployeeID TEXT PRIMARY KEY,
            Name TEXT NOT NULL,
            Department TEXT NOT NULL,
            Designation TEXT NOT NULL,
            Experience INTEGER NOT NULL,
            Attendance REAL NOT NULL,
            TasksAssigned INTEGER NOT NULL,
            TasksCompleted INTEGER NOT NULL,
            DeadlineAdherence REAL NOT NULL,
            PerformanceScore REAL NOT NULL,
            Age INTEGER,
            BloodGroup TEXT,
            EmergencyContactName TEXT,
            EmergencyContactPhone TEXT,
            DateOfJoining TEXT,
            Photo TEXT
        )
    ''')
    migrate_db(conn)
    # Seed data if empty
    c.execute('SELECT COUNT(*) FROM employees')
    if c.fetchone()[0] == 0:
        employees = [
            ('E001','Arun Kumar','Engineering','Software Engineer',3,92,20,18,88,85),
            ('E002','Priya Sharma','Human Resources','HR Manager',6,78,15,11,72,70),
            ('E003','Ravi Mehta','Sales','Sales Executive',2,65,25,14,60,58),
            ('E004','Sneha Iyer','Engineering','Senior Engineer',5,95,22,21,94,91),
            ('E005','Karthik Raj','Finance','Financial Analyst',4,88,18,16,82,80),
            ('E006','Divya Nair','Marketing','Marketing Lead',7,74,20,14,68,65),
            ('E007','Ajay Patel','Engineering','Junior Engineer',1,80,15,12,75,72),
            ('E008','Meena Reddy','Human Resources','Recruiter',3,91,12,11,89,84),
            ('E009','Suresh Babu','Sales','Sales Manager',8,69,30,19,63,62),
            ('E010','Anitha Joseph','Finance','Senior Analyst',6,96,20,20,97,95),
            ('E011','Vijay Kumar','Marketing','SEO Specialist',2,83,18,15,78,74),
            ('E012','Lakshmi Devi','Engineering','Software Engineer',4,87,22,19,85,82),
            ('E013','Rahul Gupta','Sales','Sales Executive',1,55,25,12,50,48),
            ('E014','Nisha Pillai','Human Resources','HR Executive',2,90,14,13,86,83),
            ('E015','Manoj Singh','Finance','Chief Financial Officer',12,93,10,10,95,96),
            ('E016','Pooja Verma','Marketing','Content Writer',3,77,20,15,72,68),
            ('E017','Sanjay Rao','Engineering','Tech Lead',9,89,18,17,88,87),
            ('E018','Rekha Menon','Human Resources','HR Manager',5,82,15,13,79,76),
            ('E019','Anil Sharma','Sales','Sales Executive',2,61,28,15,55,54),
            ('E020','Deepa Nair','Engineering','QA Engineer',4,94,16,15,91,88),
        ]
        c.executemany('''INSERT INTO employees
            (EmployeeID,Name,Department,Designation,Experience,Attendance,
             TasksAssigned,TasksCompleted,DeadlineAdherence,PerformanceScore)
            VALUES (?,?,?,?,?,?,?,?,?,?)''', employees)
        conn.commit()
    conn.close()

def mask_aadhaar(value):
    if not value:
        return None
    digits = ''.join(ch for ch in value if ch.isalnum())
    if len(digits) < 4:
        return 'XXXX-XXXX-XXXX'
    return f'XXXX-XXXX-{digits[-4:]}'

def mask_pan(value):
    if not value:
        return None
    v = value.strip()
    if len(v) < 4:
        return 'X' * len(v)
    return 'X' * (len(v) - 4) + v[-4:]

def get_leave_data(d):
    raw = d.get('LeaveData')
    taken = {}
    if raw:
        try:
            taken = json.loads(raw)
        except (ValueError, TypeError):
            taken = {}
    attendance = d.get('Attendance') or 90
    experience = d.get('Experience') or 1
    defaults = {
        'Sick': round((100 - attendance) * 0.15),
        'Casual': round((100 - attendance) * 0.2),
        'Earned': round(experience * 1.3),
    }
    result = {}
    for leave_type, total in LEAVE_TOTALS.items():
        used = taken.get(leave_type, defaults[leave_type])
        used = max(0, min(total, int(used)))
        result[leave_type] = {'total': total, 'taken': used, 'remaining': total - used}
    return result

def process_row(row):
    d = dict(row)
    # Added safe check to prevent division by zero
    assigned = d.get('TasksAssigned', 0)
    d['TaskCompletionRate'] = round((d['TasksCompleted'] / assigned) * 100, 1) if assigned > 0 else 0.0
    
    score = d['PerformanceScore']
    d['PerformanceGrade'] = 'Excellent' if score >= 90 else 'Good' if score >= 75 else 'Average' if score >= 60 else 'Poor'
    att = d['Attendance']
    d['AttendanceStatus'] = 'Good' if att >= 85 else 'Average' if att >= 70 else 'Poor'
    d['AadhaarMasked'] = mask_aadhaar(d.get('Aadhaar'))
    d['PANMasked'] = mask_pan(d.get('PAN'))
    d['Leave'] = get_leave_data(d)

    # Performance & Tasks (deeper)
    d['QualityIndex'] = round(0.4 * score + 0.3 * d['DeadlineAdherence'] + 0.3 * d['TaskCompletionRate'], 1)
    d['AvgTasksPerMonth'] = round((d.get('TasksAssigned') or 0) / 12, 1)
    d['TaskPriority'] = get_task_priority(d['EmployeeID'])

    # Projects
    d['Projects'] = get_projects(d['EmployeeID'], d.get('Department', 'Engineering'))

    # Skills & Certifications
    d['Skills'] = get_skills(d['EmployeeID'], d.get('Department', 'Engineering'))
    d['Certifications'] = get_certifications(d['EmployeeID'], d.get('Department', 'Engineering'), d.get('Experience'))

    # Achievements & Awards
    d['Achievements'] = get_achievements(d['EmployeeID'], score, d.get('Experience'))

    # Feedback
    d['Feedback'] = get_feedback(d['EmployeeID'], score, d.get('Experience'))

    # Assets Assigned
    d['Assets'] = get_assets(d['EmployeeID'])

    # Documents
    d['Documents'] = get_documents(d['EmployeeID'], d.get('DateOfJoining'))
    return d

init_db()

@app.route('/')
def home():
    return jsonify({'message': 'VergeX API is running!', 'db': 'SQLite'})

@app.route('/api/employees', methods=['GET'])
def get_employees():
    conn = get_db()
    rows = conn.execute('SELECT * FROM employees ORDER BY PerformanceScore DESC').fetchall()
    conn.close()
    return jsonify([process_row(r) for r in rows])

@app.route('/api/employee/<emp_id>', methods=['GET'])
def get_employee(emp_id):
    conn = get_db()
    row = conn.execute('SELECT * FROM employees WHERE EmployeeID = ?', (emp_id.upper(),)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Employee not found'}), 404
    return jsonify(process_row(row))

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.get_json()
    try:
        conn = get_db()
        conn.execute('''INSERT INTO employees
            (EmployeeID,Name,Department,Designation,Experience,Attendance,
             TasksAssigned,TasksCompleted,DeadlineAdherence,PerformanceScore,
             Age,BloodGroup,EmergencyContactName,EmergencyContactPhone,DateOfJoining,Photo,
             Aadhaar,PAN,Passport,DrivingLicence,LeaveData)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (
            data['EmployeeID'].upper(), data['Name'], data['Department'],
            data['Designation'], int(data['Experience']), float(data['Attendance']),
            int(data['TasksAssigned']), int(data['TasksCompleted']),
            float(data['DeadlineAdherence']), float(data['PerformanceScore']),
            int(data['Age']) if data.get('Age') else None,
            data.get('BloodGroup') or None,
            data.get('EmergencyContactName') or None,
            data.get('EmergencyContactPhone') or None,
            data.get('DateOfJoining') or None,
            data.get('Photo') or None,
            data.get('Aadhaar') or None,
            data.get('PAN') or None,
            data.get('Passport') or None,
            data.get('DrivingLicence') or None,
            json.dumps({
                'Sick': int(data.get('SickLeaveTaken') or 0),
                'Casual': int(data.get('CasualLeaveTaken') or 0),
                'Earned': int(data.get('EarnedLeaveTaken') or 0),
            })
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Employee added successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Employee ID already exists'}), 409

@app.route('/api/employees/<emp_id>', methods=['PUT'])
def update_employee(emp_id):
    data = request.get_json()
    try:
        conn = get_db()
        conn.execute('''UPDATE employees SET
            Name=?, Department=?, Designation=?, Experience=?,
            Attendance=?, TasksAssigned=?, TasksCompleted=?,
            DeadlineAdherence=?, PerformanceScore=?,
            Age=?, BloodGroup=?, EmergencyContactName=?,
            EmergencyContactPhone=?, DateOfJoining=?, Photo=?,
            Aadhaar=?, PAN=?, Passport=?, DrivingLicence=?, LeaveData=?
            WHERE EmployeeID=?''', (
            data['Name'], data['Department'], data['Designation'],
            int(data['Experience']), float(data['Attendance']),
            int(data['TasksAssigned']), int(data['TasksCompleted']),
            float(data['DeadlineAdherence']), float(data['PerformanceScore']),
            int(data['Age']) if data.get('Age') else None,
            data.get('BloodGroup') or None,
            data.get('EmergencyContactName') or None,
            data.get('EmergencyContactPhone') or None,
            data.get('DateOfJoining') or None,
            data.get('Photo') or None,
            data.get('Aadhaar') or None,
            data.get('PAN') or None,
            data.get('Passport') or None,
            data.get('DrivingLicence') or None,
            json.dumps({
                'Sick': int(data.get('SickLeaveTaken') or 0),
                'Casual': int(data.get('CasualLeaveTaken') or 0),
                'Earned': int(data.get('EarnedLeaveTaken') or 0),
            }),
            emp_id.upper()
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Employee updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    conn = get_db()
    conn.execute('DELETE FROM employees WHERE EmployeeID = ?', (emp_id.upper(),))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Employee deleted successfully'})

@app.route('/api/summary')
def get_summary():
    conn = get_db()
    rows = [process_row(r) for r in conn.execute('SELECT * FROM employees').fetchall()]
    conn.close()
    total = len(rows)
    if total == 0:
        return jsonify({'totalEmployees': 0})
    return jsonify({
        'totalEmployees': total,
        'avgPerformanceScore': round(sum(r['PerformanceScore'] for r in rows) / total, 1),
        'avgAttendance': round(sum(r['Attendance'] for r in rows) / total, 1),
        'avgTaskCompletion': round(sum(r['TaskCompletionRate'] for r in rows) / total, 1),
        'excellentCount': sum(1 for r in rows if r['PerformanceGrade'] == 'Excellent'),
        'goodCount': sum(1 for r in rows if r['PerformanceGrade'] == 'Good'),
        'averageCount': sum(1 for r in rows if r['PerformanceGrade'] == 'Average'),
        'poorCount': sum(1 for r in rows if r['PerformanceGrade'] == 'Poor'),
    })

@app.route('/api/departments')
def get_departments():
    conn = get_db()
    rows = [process_row(r) for r in conn.execute('SELECT * FROM employees').fetchall()]
    conn.close()
    depts = {}
    for r in rows:
        d = r['Department']
        if d not in depts:
            depts[d] = {'Department': d, 'scores': [], 'att': [], 'tasks': [], 'count': 0}
        depts[d]['scores'].append(r['PerformanceScore'])
        depts[d]['att'].append(r['Attendance'])
        depts[d]['tasks'].append(r['TaskCompletionRate'])
        depts[d]['count'] += 1
    result = []
    for d, v in depts.items():
        result.append({
            'Department': d,
            'avgPerformance': round(sum(v['scores']) / v['count'], 1),
            'avgAttendance': round(sum(v['att']) / v['count'], 1),
            'avgTaskCompletion': round(sum(v['tasks']) / v['count'], 1),
            'employeeCount': v['count']
        })
    return jsonify(result)

@app.route('/api/top-performers')
def get_top_performers():
    conn = get_db()
    rows = conn.execute('SELECT * FROM employees ORDER BY PerformanceScore DESC LIMIT 5').fetchall()
    conn.close()
    return jsonify([process_row(r) for r in rows])

@app.route('/api/low-performers')
def get_low_performers():
    conn = get_db()
    rows = conn.execute('SELECT * FROM employees ORDER BY PerformanceScore ASC LIMIT 5').fetchall()
    conn.close()
    return jsonify([process_row(r) for r in rows])

@app.route('/api/attendance')
def get_attendance():
    conn = get_db()
    rows = [process_row(r) for r in conn.execute('SELECT * FROM employees').fetchall()]
    conn.close()
    return jsonify({
        'Good': sum(1 for r in rows if r['AttendanceStatus'] == 'Good'),
        'Average': sum(1 for r in rows if r['AttendanceStatus'] == 'Average'),
        'Poor': sum(1 for r in rows if r['AttendanceStatus'] == 'Poor'),
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    emp_id = data.get('empId', '').upper()
    password = data.get('password', '')
    if emp_id == 'ADMIN' and password == 'admin123':
        return jsonify({'role': 'admin', 'name': 'Manager', 'empId': 'ADMIN'})
    conn = get_db()
    row = conn.execute('SELECT * FROM employees WHERE EmployeeID = ?', (emp_id,)).fetchone()
    conn.close()
    if row and password == 'emp123':
        emp = process_row(row)
        return jsonify({'role': 'employee', 'name': emp['Name'], 'empId': emp_id, 'data': emp})
    return jsonify({'error': 'Invalid credentials'}), 401

if __name__ == '__main__':
    app.run(debug=True)
