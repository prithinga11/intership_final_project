import os
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'vergex.db')

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

def process_row(row):
    d = dict(row)
    d['TaskCompletionRate'] = round((d['TasksCompleted'] / d['TasksAssigned']) * 100, 1)
    score = d['PerformanceScore']
    d['PerformanceGrade'] = 'Excellent' if score >= 90 else 'Good' if score >= 75 else 'Average' if score >= 60 else 'Poor'
    att = d['Attendance']
    d['AttendanceStatus'] = 'Good' if att >= 85 else 'Average' if att >= 70 else 'Poor'
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
    required = ['EmployeeID','Name','Department','Designation','Experience','Attendance','TasksAssigned','TasksCompleted','DeadlineAdherence','PerformanceScore']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    try:
        conn = get_db()
        conn.execute('''INSERT INTO employees
            (EmployeeID,Name,Department,Designation,Experience,Attendance,
             TasksAssigned,TasksCompleted,DeadlineAdherence,PerformanceScore,
             Age,BloodGroup,EmergencyContactName,EmergencyContactPhone,DateOfJoining,Photo)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (
            data['EmployeeID'].upper(), data['Name'], data['Department'],
            data['Designation'], int(data['Experience']), float(data['Attendance']),
            int(data['TasksAssigned']), int(data['TasksCompleted']),
            float(data['DeadlineAdherence']), float(data['PerformanceScore']),
            int(data['Age']) if data.get('Age') else None,
            data.get('BloodGroup') or None,
            data.get('EmergencyContactName') or None,
            data.get('EmergencyContactPhone') or None,
            data.get('DateOfJoining') or None,
            data.get('Photo') or None
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
            EmergencyContactPhone=?, DateOfJoining=?, Photo=?
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