// ALE Platform — Prisma Seed
// Run: npm run db:seed   (or: node prisma/seed.js)
// Creates: skill definitions, badge definitions, 3 real courses, an admin user.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ALE Platform...\n');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2024', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@ale.com' },
    update: {},
    create: { name: 'ALE Admin', email: 'admin@ale.com', passwordHash: adminHash, role: 'admin', isVerified: true },
  });
  await prisma.learnerProfile.upsert({
    where:  { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  console.log('✅ Admin user: admin@ale.com / Admin@2024');

  // ── Skill definitions ───────────────────────────────────────────────────────
  const skillDefs = [
    { name: 'Python',            category: 'technical',    icon: '🐍', description: 'Python programming for data science and automation' },
    { name: 'SQL',               category: 'technical',    icon: '🗄️', description: 'Structured Query Language for relational databases' },
    { name: 'Statistics',        category: 'technical',    icon: '📐', description: 'Statistical methods and probability theory' },
    { name: 'Machine Learning',  category: 'technical',    icon: '🤖', description: 'ML algorithms and model building' },
    { name: 'Data Visualization',category: 'technical',    icon: '📊', description: 'Charts, dashboards, and visual storytelling' },
    { name: 'Pandas',            category: 'technical',    icon: '🐼', description: 'Data manipulation with the Pandas library' },
    { name: 'Database Design',   category: 'technical',    icon: '🏗️', description: 'Schema design, normalisation, and indexing' },
    { name: 'Data Analysis',     category: 'technical',    icon: '🔍', description: 'Exploratory data analysis and insight generation' },
    { name: 'Problem Solving',   category: 'professional', icon: '💡', description: 'Structured problem decomposition and solution design' },
    { name: 'Communication',     category: 'professional', icon: '💬', description: 'Clear written and verbal communication of findings' },
  ];

  const skillMap = {};
  for (const s of skillDefs) {
    const skill = await prisma.skillDefinition.upsert({
      where:  { name: s.name },
      update: {},
      create: s,
    });
    skillMap[s.name] = skill.id;
  }
  console.log(`✅ ${skillDefs.length} skill definitions`);

  // ── Badge definitions ───────────────────────────────────────────────────────
  const badgeDefs = [
    { name: 'First Steps',    icon: '👣', description: 'Completed your very first lesson',       criteriaType: 'xp_threshold',   criteriaValue: { xp: 10 } },
    { name: 'Python Pro',     icon: '🐍', description: 'Completed Python for Data Science',      criteriaType: 'course_complete', criteriaValue: { courseSlug: 'python-for-data-science' } },
    { name: 'SQL Master',     icon: '🗄️', description: 'Completed SQL Mastery',                  criteriaType: 'course_complete', criteriaValue: { courseSlug: 'sql-mastery' } },
    { name: 'ML Pioneer',     icon: '🤖', description: 'Completed Machine Learning Basics',       criteriaType: 'course_complete', criteriaValue: { courseSlug: 'machine-learning-basics' } },
    { name: 'Week Warrior',   icon: '🔥', description: 'Maintained a 7-day learning streak',     criteriaType: 'streak',          criteriaValue: { days: 7 } },
    { name: 'Month Master',   icon: '📅', description: 'Maintained a 30-day learning streak',    criteriaType: 'streak',          criteriaValue: { days: 30 } },
    { name: 'High Scorer',    icon: '🏆', description: 'Scored 90% or above on any assessment',  criteriaType: 'score',           criteriaValue: { minScore: 90 } },
    { name: 'XP Milestone',   icon: '⚡', description: 'Earned 500 XP',                         criteriaType: 'xp_threshold',    criteriaValue: { xp: 500 } },
    { name: 'XP Legend',      icon: '💎', description: 'Earned 2000 XP',                        criteriaType: 'xp_threshold',    criteriaValue: { xp: 2000 } },
    { name: 'Quiz Champion',  icon: '📝', description: 'Scored 100% on any quiz',               criteriaType: 'score',           criteriaValue: { minScore: 100 } },
  ];

  for (const b of badgeDefs) {
    await prisma.badge.upsert({
      where:  { name: b.name },
      update: {},
      create: b,
    });
  }
  console.log(`✅ ${badgeDefs.length} badge definitions`);

  // ── COURSE 1: Python for Data Science ───────────────────────────────────────
  const python = await prisma.course.upsert({
    where:  { slug: 'python-for-data-science' },
    update: {},
    create: {
      slug: 'python-for-data-science', title: 'Python for Data Science',
      description: 'Master Python from the ground up — variables, control flow, functions, and the core data science libraries: NumPy, Pandas, and Matplotlib.',
      level: 'Beginner', estimatedHours: 18, status: 'published',
      tags: ['Python', 'Pandas', 'Data Analysis', 'Data Visualization'],
      displayOrder: 1, createdBy: admin.id, publishedAt: new Date(),
    },
  });

  const pyMod1 = await prisma.module.upsert({
    where: { id: (await prisma.module.findFirst({ where: { courseId: python.id, displayOrder: 1 } }))?.id ?? '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { courseId: python.id, title: 'Python Fundamentals', displayOrder: 1, estimatedMins: 120, isFreePreview: true },
  });

  const pyMod2 = await upsertModule(python.id, 2, 'Data Manipulation with Pandas', 150);
  const pyMod3 = await upsertModule(python.id, 3, 'Data Visualisation with Matplotlib', 120);

  // Module 1 lessons
  await upsertLesson(pyMod1.id, 1, 'What is Python?', 'text', 15, 10, `
## What is Python?

Python is a high-level, interpreted programming language known for its clean syntax and readability.
It was created by Guido van Rossum and first released in 1991.

### Why Python for Data Science?

- **Readability**: Code reads almost like English
- **Libraries**: NumPy, Pandas, Matplotlib, Scikit-learn are industry standard
- **Community**: Largest data science community worldwide
- **Versatility**: From web scraping to machine learning in the same language

### Your first Python program

\`\`\`python
# This is a comment
print("Hello, Data Science!")

# Variables — no type declarations needed
name = "Ramesh"
age = 28
is_student = True

print(f"My name is {name}, I am {age} years old.")
\`\`\`

### Key data types

| Type | Example | Use case |
|------|---------|----------|
| int | \`42\` | Whole numbers |
| float | \`3.14\` | Decimals |
| str | \`"hello"\` | Text |
| bool | \`True\` | Flags |
| list | \`[1, 2, 3]\` | Ordered collection |
| dict | \`{"key": "val"}\` | Key-value pairs |

> **Exercise**: Open a Python REPL (type \`python3\` in your terminal) and print your name and age.
  `);

  await upsertLesson(pyMod1.id, 2, 'Control Flow & Loops', 'text', 20, 10, `
## Control Flow & Loops

Control flow lets your program make decisions. Loops let it repeat actions.

### if / elif / else

\`\`\`python
score = 85

if score >= 90:
    print("A — Excellent!")
elif score >= 75:
    print("B — Good")
elif score >= 60:
    print("C — Pass")
else:
    print("F — Try again")
\`\`\`

### for loops

\`\`\`python
# Iterate over a list
courses = ["Python", "SQL", "Machine Learning"]
for course in courses:
    print(f"Studying: {course}")

# range() for numeric loops
for i in range(1, 6):
    print(i)  # prints 1 2 3 4 5

# List comprehension — Pythonic shorthand
squares = [x**2 for x in range(1, 11)]
print(squares)  # [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
\`\`\`

### while loops

\`\`\`python
count = 0
while count < 5:
    print(f"Count: {count}")
    count += 1
\`\`\`

> **Key insight**: In Python, indentation (4 spaces) defines code blocks — there are no curly braces.
  `);

  await upsertLesson(pyMod1.id, 3, 'Functions & Modules', 'text', 25, 10, `
## Functions & Modules

Functions are reusable blocks of code. Modules are files that group related functions.

### Defining functions

\`\`\`python
def greet(name, greeting="Hello"):
    """Return a greeting string."""     # docstring
    return f"{greeting}, {name}!"

print(greet("Ramesh"))          # Hello, Ramesh!
print(greet("Priya", "Hi"))     # Hi, Priya!
\`\`\`

### *args and **kwargs

\`\`\`python
def summarise(*numbers):
    """Accept any number of arguments."""
    return {
        "count": len(numbers),
        "sum":   sum(numbers),
        "mean":  sum(numbers) / len(numbers),
    }

print(summarise(10, 20, 30, 40))
\`\`\`

### Importing modules

\`\`\`python
import math
print(math.sqrt(144))   # 12.0
print(math.pi)          # 3.14159...

from datetime import datetime
print(datetime.now().strftime("%Y-%m-%d"))
\`\`\`

### Installing external packages

\`\`\`bash
pip install pandas numpy matplotlib
\`\`\`
  `);

  // Module 2 lessons
  await upsertLesson(pyMod2.id, 1, 'Introduction to Pandas', 'text', 30, 15, `
## Introduction to Pandas

Pandas is the cornerstone library for data manipulation in Python. It introduces two key structures: **Series** and **DataFrame**.

### Creating a DataFrame

\`\`\`python
import pandas as pd

# From a dictionary
data = {
    "name":   ["Alice", "Bob", "Carol", "Dave"],
    "age":    [25, 30, 27, 35],
    "salary": [70000, 85000, 90000, 72000],
    "dept":   ["Data", "Engineering", "Data", "Marketing"],
}
df = pd.DataFrame(data)
print(df)
\`\`\`

### Essential operations

\`\`\`python
df.head()          # first 5 rows
df.shape           # (rows, columns)
df.dtypes          # column data types
df.describe()      # statistical summary

# Select columns
df["name"]         # Series
df[["name","age"]] # DataFrame

# Filter rows
df[df["dept"] == "Data"]
df[df["salary"] > 80000]
\`\`\`

### Reading files

\`\`\`python
df = pd.read_csv("data.csv")
df = pd.read_excel("data.xlsx")
df.to_csv("output.csv", index=False)
\`\`\`
  `);

  await upsertLesson(pyMod2.id, 2, 'Cleaning & Transforming Data', 'text', 35, 15, `
## Cleaning & Transforming Data

Real-world data is messy. Pandas gives you the tools to fix it.

### Handling missing values

\`\`\`python
import pandas as pd
import numpy as np

df = pd.read_csv("sales.csv")

# Detect missing values
df.isnull().sum()          # count per column
df[df["price"].isnull()]   # rows where price is missing

# Fix missing values
df["price"].fillna(df["price"].median(), inplace=True)
df.dropna(subset=["customer_id"], inplace=True)
\`\`\`

### Renaming & type conversion

\`\`\`python
df.rename(columns={"qty": "quantity", "amt": "amount"}, inplace=True)
df["date"] = pd.to_datetime(df["date"])
df["revenue"] = df["quantity"] * df["amount"]
\`\`\`

### GroupBy & aggregation

\`\`\`python
# Total revenue by department
df.groupby("dept")["revenue"].sum()

# Multiple aggregations
df.groupby("dept").agg(
    total_revenue=("revenue", "sum"),
    avg_salary=("salary", "mean"),
    headcount=("name", "count"),
)
\`\`\`
  `);

  await upsertLesson(pyMod2.id, 3, 'Merging & Reshaping Data', 'text', 30, 15, `
## Merging & Reshaping Data

Combining datasets and pivoting tables are daily tasks in data science.

### Merging (like SQL JOINs)

\`\`\`python
employees = pd.read_csv("employees.csv")   # id, name, dept_id
departments = pd.read_csv("departments.csv") # id, dept_name

# INNER JOIN
merged = pd.merge(employees, departments,
                  left_on="dept_id", right_on="id",
                  how="inner")

# LEFT JOIN
merged = pd.merge(employees, departments,
                  left_on="dept_id", right_on="id",
                  how="left")
\`\`\`

### Pivot tables

\`\`\`python
pivot = df.pivot_table(
    values="revenue",
    index="region",
    columns="product_category",
    aggfunc="sum",
    fill_value=0,
)
\`\`\`

### Melting (wide → long format)

\`\`\`python
melted = df.melt(
    id_vars=["product"],
    value_vars=["Q1", "Q2", "Q3", "Q4"],
    var_name="quarter",
    value_name="sales",
)
\`\`\`
  `);

  // Module 3 lessons
  await upsertLesson(pyMod3.id, 1, 'Matplotlib & Seaborn Basics', 'text', 30, 10, `
## Matplotlib & Seaborn Basics

Visualisation turns raw numbers into insights. Matplotlib is the foundation; Seaborn makes it beautiful.

### Line chart

\`\`\`python
import matplotlib.pyplot as plt

months = ["Jan","Feb","Mar","Apr","May","Jun"]
revenue = [42000, 55000, 48000, 61000, 70000, 68000]

plt.figure(figsize=(10, 5))
plt.plot(months, revenue, marker="o", color="#4f46e5", linewidth=2)
plt.title("Monthly Revenue 2024", fontsize=16)
plt.xlabel("Month"); plt.ylabel("Revenue ($)")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
\`\`\`

### Bar chart with Seaborn

\`\`\`python
import seaborn as sns
import pandas as pd

df = pd.DataFrame({"department": ["Data","Eng","Marketing","Sales"],
                   "headcount":  [12, 25, 8, 18]})

sns.barplot(data=df, x="department", y="headcount", palette="viridis")
plt.title("Headcount by Department")
plt.show()
\`\`\`

### When to use which chart

| Chart type | Use when |
|-----------|----------|
| Line | Trends over time |
| Bar | Comparing categories |
| Scatter | Correlation between two variables |
| Histogram | Distribution of one variable |
| Heatmap | Correlation matrix |
  `);

  await upsertLesson(pyMod3.id, 2, 'Building an EDA Dashboard', 'project', 45, 20, `
## Project: Exploratory Data Analysis Dashboard

Apply everything you've learned to a real dataset.

### Dataset
Download the **Titanic survival dataset** from Kaggle or use this command:
\`\`\`bash
pip install seaborn
python -c "import seaborn as sns; sns.load_dataset('titanic').to_csv('titanic.csv')"
\`\`\`

### Tasks

**Task 1 — Load & inspect**
\`\`\`python
import pandas as pd
df = pd.read_csv("titanic.csv")
print(df.shape, df.dtypes, df.isnull().sum())
\`\`\`

**Task 2 — Clean**
- Fill missing \`age\` with median
- Drop rows where \`embarked\` is null
- Create \`fare_category\` (Low/Medium/High) using \`pd.cut()\`

**Task 3 — Analyse**
- Survival rate by gender
- Survival rate by passenger class
- Age distribution of survivors vs non-survivors

**Task 4 — Visualise**
Create a 2×2 subplot figure with:
1. Bar chart: survival rate by sex
2. Bar chart: survival rate by pclass
3. Histogram: age distribution
4. Heatmap: correlation matrix of numeric columns

**Deliverable**: A Python script or Jupyter notebook that produces all four charts.
  `);

  // ── Python questions ────────────────────────────────────────────────────────
  const pyQuestions = [
    { text: 'What is the output of `print(type(3.14))`?', opts: ['<class \'int\'>', '<class \'float\'>', '<class \'str\'>', '<class \'number\'>'], ans: '<class \'float\'>', skill: 'Python' },
    { text: 'Which Pandas method shows the first 5 rows of a DataFrame?', opts: ['df.top()', 'df.head()', 'df.first()', 'df.show()'], ans: 'df.head()', skill: 'Pandas' },
    { text: 'What does `df.shape` return?', opts: ['Number of rows only', 'Number of columns only', 'A tuple (rows, columns)', 'Total number of cells'], ans: 'A tuple (rows, columns)', skill: 'Pandas' },
    { text: 'Which operator is used for exponentiation in Python?', opts: ['^', '**', 'pow()', '//'], ans: '**', skill: 'Python' },
    { text: 'What is a list comprehension?', opts: ['A way to import lists', 'A compact way to create lists', 'A method to sort lists', 'A type of dictionary'], ans: 'A compact way to create lists', skill: 'Python' },
    { text: 'How do you select rows where column "age" > 30 in Pandas?', opts: ['df.filter(age > 30)', 'df[df["age"] > 30]', 'df.select(age=">30")', 'df.where("age", 30)'], ans: 'df[df["age"] > 30]', skill: 'Pandas' },
    { text: 'Which Pandas method fills missing values?', opts: ['fillna()', 'replace_null()', 'fill_missing()', 'impute()'], ans: 'fillna()', skill: 'Data Analysis' },
    { text: 'What does `groupby` do in Pandas?', opts: ['Sorts the DataFrame', 'Groups rows by column values for aggregation', 'Merges two DataFrames', 'Removes duplicate rows'], ans: 'Groups rows by column values for aggregation', skill: 'Pandas' },
    { text: 'Which chart type is best for showing correlation between two numeric variables?', opts: ['Bar chart', 'Pie chart', 'Scatter plot', 'Area chart'], ans: 'Scatter plot', skill: 'Data Visualization' },
    { text: 'What does the `merge()` function in Pandas correspond to in SQL?', opts: ['GROUP BY', 'ORDER BY', 'JOIN', 'UNION'], ans: 'JOIN', skill: 'Pandas' },
  ];
  await seedQuestions(python.id, pyQuestions);
  console.log(`✅ Course 1: Python for Data Science (3 modules, ${await lessonCount(python.id)} lessons, ${pyQuestions.length} questions)`);

  // ── COURSE 2: SQL Mastery ───────────────────────────────────────────────────
  const sql = await prisma.course.upsert({
    where:  { slug: 'sql-mastery' },
    update: {},
    create: {
      slug: 'sql-mastery', title: 'SQL Mastery',
      description: 'From SELECT to advanced window functions — learn the SQL skills every data professional needs.',
      level: 'Beginner', estimatedHours: 14, status: 'published',
      tags: ['SQL', 'Database Design', 'Data Analysis'],
      displayOrder: 2, createdBy: admin.id, publishedAt: new Date(),
    },
  });

  const sqlMod1 = await upsertModule(sql.id, 1, 'SQL Fundamentals',      120, true);
  const sqlMod2 = await upsertModule(sql.id, 2, 'Joins & Subqueries',    120);
  const sqlMod3 = await upsertModule(sql.id, 3, 'Database Design',       90);

  await upsertLesson(sqlMod1.id, 1, 'SELECT, WHERE & ORDER BY', 'text', 20, 10, `
## SELECT, WHERE & ORDER BY

SQL (Structured Query Language) is the universal language for working with relational databases.

### Your first query

\`\`\`sql
-- Retrieve all columns from a table
SELECT * FROM employees;

-- Select specific columns
SELECT first_name, last_name, salary
FROM employees;
\`\`\`

### Filtering with WHERE

\`\`\`sql
-- Single condition
SELECT * FROM employees WHERE department = 'Engineering';

-- Multiple conditions
SELECT * FROM employees
WHERE department = 'Engineering'
  AND salary > 80000;

-- IN operator
SELECT * FROM employees
WHERE department IN ('Data Science', 'Analytics', 'Engineering');

-- LIKE for pattern matching
SELECT * FROM employees
WHERE last_name LIKE 'S%';   -- starts with S
\`\`\`

### Sorting with ORDER BY

\`\`\`sql
SELECT first_name, salary
FROM employees
ORDER BY salary DESC;          -- highest first

-- Multiple sort columns
ORDER BY department ASC, salary DESC;
\`\`\`

> **Practice database**: Use [sqliteonline.com](https://sqliteonline.com) or install PostgreSQL locally.
  `);

  await upsertLesson(sqlMod1.id, 2, 'GROUP BY & Aggregate Functions', 'text', 25, 10, `
## GROUP BY & Aggregate Functions

Aggregation is one of the most powerful features of SQL.

### Core aggregate functions

\`\`\`sql
SELECT
    COUNT(*)            AS total_employees,
    AVG(salary)         AS avg_salary,
    MAX(salary)         AS max_salary,
    MIN(salary)         AS min_salary,
    SUM(salary)         AS payroll
FROM employees;
\`\`\`

### GROUP BY

\`\`\`sql
-- Revenue by department
SELECT
    department,
    COUNT(*) AS headcount,
    ROUND(AVG(salary), 0) AS avg_salary,
    SUM(salary) AS total_payroll
FROM employees
GROUP BY department
ORDER BY total_payroll DESC;
\`\`\`

### HAVING — filtering groups

\`\`\`sql
-- Only departments with more than 5 employees
SELECT department, COUNT(*) AS headcount
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;
\`\`\`

### WHERE vs HAVING

| | WHERE | HAVING |
|--|-------|--------|
| Filters | Individual rows | Aggregated groups |
| When | Before GROUP BY | After GROUP BY |
| Can use aggregates | No | Yes |
  `);

  await upsertLesson(sqlMod1.id, 3, 'CASE Statements & NULL Handling', 'text', 20, 10, `
## CASE Statements & NULL Handling

### CASE — conditional logic in SQL

\`\`\`sql
SELECT
    name,
    salary,
    CASE
        WHEN salary >= 100000 THEN 'Senior'
        WHEN salary >= 70000  THEN 'Mid-Level'
        ELSE                       'Junior'
    END AS seniority_band
FROM employees;
\`\`\`

### NULL handling

\`\`\`sql
-- Check for NULLs
SELECT * FROM employees WHERE manager_id IS NULL;
SELECT * FROM employees WHERE manager_id IS NOT NULL;

-- Replace NULL with a default
SELECT name, COALESCE(phone, 'Not provided') AS phone
FROM contacts;

-- NULL in aggregations — COUNT(*) counts all rows,
-- COUNT(column) skips NULLs
SELECT
    COUNT(*)           AS total_rows,
    COUNT(bonus)       AS rows_with_bonus
FROM employees;
\`\`\`

> **Key rule**: Any comparison with NULL using = or != returns NULL (unknown), not TRUE or FALSE. Always use IS NULL / IS NOT NULL.
  `);

  await upsertLesson(sqlMod2.id, 1, 'INNER, LEFT & RIGHT JOINs', 'text', 30, 15, `
## Joins — Combining Tables

JOINs are the most important concept in relational databases.

### INNER JOIN — only matching rows

\`\`\`sql
SELECT
    e.first_name,
    e.last_name,
    d.department_name,
    e.salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.id;
\`\`\`

### LEFT JOIN — all rows from left table

\`\`\`sql
-- All employees, even those without a department
SELECT e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;
-- department_name is NULL where no match exists
\`\`\`

### Multiple JOINs

\`\`\`sql
SELECT
    o.order_date,
    c.company_name,
    p.product_name,
    od.quantity,
    od.unit_price
FROM orders o
JOIN customers c   ON o.customer_id  = c.id
JOIN order_details od ON o.id        = od.order_id
JOIN products p    ON od.product_id  = p.id
WHERE o.order_date >= '2024-01-01';
\`\`\`

### Join decision guide
- Need only matching rows → **INNER JOIN**
- Keep all rows from first table → **LEFT JOIN**
- Keep all rows from both tables → **FULL OUTER JOIN**
  `);

  await upsertLesson(sqlMod2.id, 2, 'Subqueries & CTEs', 'text', 30, 15, `
## Subqueries & CTEs

### Subqueries — queries inside queries

\`\`\`sql
-- Employees earning above the company average
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Using IN with a subquery
SELECT name FROM employees
WHERE department_id IN (
    SELECT id FROM departments WHERE location = 'Mumbai'
);
\`\`\`

### CTEs (Common Table Expressions) — WITH clause

CTEs make complex queries readable by giving subqueries a name.

\`\`\`sql
WITH high_earners AS (
    SELECT department_id, AVG(salary) AS avg_sal
    FROM employees
    WHERE salary > 80000
    GROUP BY department_id
),
dept_info AS (
    SELECT d.department_name, h.avg_sal
    FROM departments d
    JOIN high_earners h ON d.id = h.department_id
)
SELECT * FROM dept_info ORDER BY avg_sal DESC;
\`\`\`

### Window functions — analytics without losing rows

\`\`\`sql
SELECT
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    salary - AVG(salary) OVER (PARTITION BY department) AS vs_dept_avg
FROM employees;
\`\`\`
  `);

  await upsertLesson(sqlMod3.id, 1, 'Database Design & Normalisation', 'text', 35, 15, `
## Database Design & Normalisation

Good schema design prevents data anomalies and makes queries fast.

### The three normal forms (simplified)

**1NF** — No repeating groups; each cell holds one value.
\`\`\`sql
-- BAD: tags column holds multiple values
products (id, name, tags)   -- tags = "python,data,ml"

-- GOOD: separate table
product_tags (product_id, tag)
\`\`\`

**2NF** — Every non-key column depends on the WHOLE primary key.

**3NF** — No transitive dependencies (non-key columns don't depend on other non-key columns).

### Primary & foreign keys

\`\`\`sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE enrolments (
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id  UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)  -- composite PK
);
\`\`\`

### Indexing for performance

\`\`\`sql
-- Index columns used in WHERE, JOIN, ORDER BY
CREATE INDEX idx_enrolments_user ON enrolments(user_id);
CREATE INDEX idx_lessons_module  ON lessons(module_id);
\`\`\`
  `);

  await upsertLesson(sqlMod3.id, 2, 'SQL Query Optimisation', 'text', 30, 15, `
## SQL Query Optimisation

Fast queries = happy users. Here's how to think about performance.

### EXPLAIN / EXPLAIN ANALYZE

\`\`\`sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(e.course_id) AS courses_enrolled
FROM users u
LEFT JOIN enrolments e ON u.id = e.user_id
GROUP BY u.id, u.name;
\`\`\`

Read the output: look for **Seq Scan** (slow on large tables) vs **Index Scan** (fast).

### Common optimisation techniques

\`\`\`sql
-- 1. Select only the columns you need (avoid SELECT *)
SELECT id, name FROM users;   -- not SELECT *

-- 2. Filter early with WHERE
SELECT * FROM orders
WHERE order_date >= NOW() - INTERVAL '30 days';

-- 3. Use EXISTS instead of IN for large subqueries
SELECT name FROM users u
WHERE EXISTS (
    SELECT 1 FROM enrolments e WHERE e.user_id = u.id
);

-- 4. Avoid functions on indexed columns in WHERE
-- BAD:  WHERE LOWER(email) = 'test@example.com'
-- GOOD: Create a functional index or store data normalised
\`\`\`

### Key rules
1. Index columns in JOIN ON, WHERE, ORDER BY
2. Avoid \`SELECT *\` in production
3. Use \`LIMIT\` during development
4. Run \`EXPLAIN ANALYZE\` on slow queries
  `);

  const sqlQuestions = [
    { text: 'Which SQL clause filters rows AFTER grouping?', opts: ['WHERE', 'HAVING', 'FILTER', 'CASE'], ans: 'HAVING', skill: 'SQL' },
    { text: 'What does an INNER JOIN return?', opts: ['All rows from both tables', 'All rows from the left table', 'Only rows with matching values in both tables', 'Only rows with no matches'], ans: 'Only rows with matching values in both tables', skill: 'SQL' },
    { text: 'Which aggregate function counts only non-NULL values?', opts: ['COUNT(*)', 'COUNT(column)', 'SUM(column)', 'COUNT_NULLS()'], ans: 'COUNT(column)', skill: 'SQL' },
    { text: 'What keyword is used to define a CTE?', opts: ['DEFINE', 'WITH', 'CREATE', 'AS'], ans: 'WITH', skill: 'SQL' },
    { text: 'Which normal form eliminates repeating groups?', opts: ['1NF', '2NF', '3NF', 'BCNF'], ans: '1NF', skill: 'Database Design' },
    { text: 'What does ON DELETE CASCADE mean on a foreign key?', opts: ['The parent row is locked', 'Child rows are deleted when the parent is deleted', 'The child row becomes NULL', 'An error is thrown'], ans: 'Child rows are deleted when the parent is deleted', skill: 'Database Design' },
    { text: 'Which window function assigns a rank with no gaps?', opts: ['RANK()', 'ROW_NUMBER()', 'DENSE_RANK()', 'NTILE()'], ans: 'DENSE_RANK()', skill: 'SQL' },
    { text: 'How do you check if a column value is NULL in SQL?', opts: ['column = NULL', 'column IS NULL', 'column == NULL', 'ISNULL(column) = true'], ans: 'column IS NULL', skill: 'SQL' },
    { text: 'Which SQL command retrieves unique values from a column?', opts: ['UNIQUE', 'DISTINCT', 'EXCLUSIVE', 'DIFFERENT'], ans: 'DISTINCT', skill: 'SQL' },
    { text: 'What is the purpose of an index in a database?', opts: ['To store backup data', 'To enforce unique constraints', 'To speed up data retrieval', 'To encrypt columns'], ans: 'To speed up data retrieval', skill: 'Database Design' },
  ];
  await seedQuestions(sql.id, sqlQuestions);
  console.log(`✅ Course 2: SQL Mastery (3 modules, ${await lessonCount(sql.id)} lessons, ${sqlQuestions.length} questions)`);

  // ── COURSE 3: Machine Learning Basics ───────────────────────────────────────
  const ml = await prisma.course.upsert({
    where:  { slug: 'machine-learning-basics' },
    update: {},
    create: {
      slug: 'machine-learning-basics', title: 'Machine Learning Basics',
      description: 'Understand the core algorithms behind ML — linear regression, decision trees, clustering — and build your first predictive models with Scikit-learn.',
      level: 'Intermediate', estimatedHours: 24, status: 'published',
      tags: ['Machine Learning', 'Python', 'Statistics', 'Data Analysis'],
      prerequisiteCourseIds: [python.id],
      displayOrder: 3, createdBy: admin.id, publishedAt: new Date(),
    },
  });

  const mlMod1 = await upsertModule(ml.id, 1, 'ML Foundations',        120, true);
  const mlMod2 = await upsertModule(ml.id, 2, 'Supervised Learning',   180);
  const mlMod3 = await upsertModule(ml.id, 3, 'Model Evaluation',      120);

  await upsertLesson(mlMod1.id, 1, 'What is Machine Learning?', 'text', 20, 10, `
## What is Machine Learning?

Machine Learning is the practice of teaching computers to learn patterns from data, rather than programming explicit rules.

### The three types of ML

**Supervised Learning** — learn from labelled examples
- Input: (features, correct answer) pairs
- Output: a model that predicts answers for new inputs
- Examples: spam detection, house price prediction, image classification

**Unsupervised Learning** — find hidden structure
- Input: features only (no labels)
- Output: groups, patterns, or compressed representations
- Examples: customer segmentation, anomaly detection

**Reinforcement Learning** — learn by reward and penalty
- Input: actions, environment, rewards
- Output: a policy (strategy) that maximises cumulative reward
- Examples: game-playing AI, robotics, recommendation systems

### The ML workflow

1. **Define the problem** — what are you predicting?
2. **Collect & clean data** — garbage in = garbage out
3. **Feature engineering** — create useful inputs for the model
4. **Choose & train a model** — fit the algorithm to training data
5. **Evaluate** — measure performance on held-out test data
6. **Deploy & monitor** — serve predictions in production

### Key terminology

| Term | Meaning |
|------|---------|
| Feature | An input variable (column) used to make predictions |
| Label / Target | The output we're predicting |
| Training set | Data used to fit the model |
| Test set | Data used to evaluate the model |
| Overfitting | Model memorises training data; fails on new data |
| Underfitting | Model is too simple to capture the pattern |
  `);

  await upsertLesson(mlMod1.id, 2, 'Key Statistics for ML', 'text', 25, 10, `
## Key Statistics for ML

You don't need a maths PhD for ML, but these concepts are essential.

### Distributions

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

# Generate normal distribution
data = np.random.normal(loc=0, scale=1, size=1000)

plt.hist(data, bins=50, edgecolor='black', color='#4f46e5', alpha=0.7)
plt.title("Normal Distribution (μ=0, σ=1)")
plt.xlabel("Value"); plt.ylabel("Frequency")
plt.show()
\`\`\`

### Correlation

\`\`\`python
import pandas as pd
df = pd.read_csv("house_prices.csv")

# Correlation matrix
corr = df.corr()

import seaborn as sns
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0)
\`\`\`

### Correlation ≠ Causation
Ice cream sales and drowning rates are correlated (both peak in summer) but one does **not** cause the other. Always think about confounding variables.

### The bias–variance trade-off

- **High bias** (underfitting): model is too simple — wrong on training AND test data
- **High variance** (overfitting): model is too complex — great on training, terrible on test
- **Goal**: find the sweet spot with low bias AND low variance
  `);

  await upsertLesson(mlMod1.id, 3, 'Your First ML Model with Scikit-learn', 'text', 30, 15, `
## Your First ML Model with Scikit-learn

Scikit-learn is the standard Python ML library — consistent API, great documentation.

\`\`\`bash
pip install scikit-learn pandas numpy
\`\`\`

### The Scikit-learn pattern (works for ALL algorithms)

\`\`\`python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
import pandas as pd

# 1. Load data
df = pd.read_csv("house_prices.csv")
X = df[["bedrooms","bathrooms","sqft","age"]]  # features
y = df["price"]                                 # target

# 2. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

# 3. Train
model = LinearRegression()
model.fit(X_train, y_train)

# 4. Predict
y_pred = model.predict(X_test)

# 5. Evaluate
print(f"MAE:  {mean_absolute_error(y_test, y_pred):,.0f}")
print(f"R²:   {r2_score(y_test, y_pred):.3f}")
\`\`\`

> The same 5-step pattern (import, split, fit, predict, evaluate) works for **every** algorithm in Scikit-learn. Change the model class; keep the rest.
  `);

  await upsertLesson(mlMod2.id, 1, 'Linear & Logistic Regression', 'text', 35, 15, `
## Linear & Logistic Regression

### Linear Regression — predict a continuous number

\`\`\`python
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import numpy as np

# Linear regression formula: y = w₁x₁ + w₂x₂ + ... + b
model = LinearRegression()
model.fit(X_train, y_train)

print("Coefficients:", model.coef_)    # feature weights
print("Intercept:",    model.intercept_)
\`\`\`

**When to use**: house prices, sales forecasting, any continuous target.

### Logistic Regression — predict a class (0 or 1)

Despite the name, it's a **classification** algorithm.

\`\`\`python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

print(f"Accuracy: {accuracy_score(y_test, y_pred):.2%}")
print(classification_report(y_test, y_pred))
\`\`\`

**When to use**: spam detection, churn prediction, medical diagnosis.

### Regularisation — preventing overfitting

\`\`\`python
from sklearn.linear_model import Ridge, Lasso

ridge = Ridge(alpha=1.0)   # L2 — penalise large weights
lasso = Lasso(alpha=0.1)   # L1 — drives some weights to zero (feature selection)
\`\`\`
  `);

  await upsertLesson(mlMod2.id, 2, 'Decision Trees & Random Forests', 'text', 35, 15, `
## Decision Trees & Random Forests

### Decision Trees — intuitive and interpretable

\`\`\`python
from sklearn.tree import DecisionTreeClassifier, plot_tree
import matplotlib.pyplot as plt

model = DecisionTreeClassifier(max_depth=4, random_state=42)
model.fit(X_train, y_train)

# Visualise the tree
plt.figure(figsize=(20, 8))
plot_tree(model, feature_names=X.columns, class_names=["No","Yes"],
          filled=True, rounded=True)
plt.show()
\`\`\`

**Pros**: Interpretable, no scaling needed, handles mixed types
**Cons**: Prone to overfitting — limit depth with \`max_depth\`

### Random Forest — an ensemble of trees

\`\`\`python
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    n_estimators=100,   # 100 trees
    max_depth=8,
    random_state=42,
    n_jobs=-1,          # use all CPU cores
)
rf.fit(X_train, y_train)
print(f"Test accuracy: {rf.score(X_test, y_test):.2%}")

# Feature importance
importances = pd.Series(rf.feature_importances_, index=X.columns)
importances.sort_values().plot(kind='barh', figsize=(8,5))
\`\`\`

**Why random forests beat single trees**: Each tree sees a random subset of data and features → lower variance → better generalisation.
  `);

  await upsertLesson(mlMod2.id, 3, 'Clustering with K-Means', 'text', 30, 15, `
## Clustering with K-Means

K-Means is the most popular **unsupervised** algorithm — it groups data into k clusters without labels.

### How it works
1. Randomly initialise k centroids
2. Assign each point to its nearest centroid
3. Recompute centroids as cluster means
4. Repeat 2–3 until convergence

\`\`\`python
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

# Scale features first (K-Means is distance-based)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Fit model
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
labels = kmeans.fit_predict(X_scaled)

# Visualise (for 2D data)
plt.scatter(X_scaled[:,0], X_scaled[:,1], c=labels, cmap='viridis', alpha=0.6)
plt.scatter(kmeans.cluster_centers_[:,0], kmeans.cluster_centers_[:,1],
            s=200, c='red', marker='X', label='Centroids')
plt.legend(); plt.title("K-Means Clusters"); plt.show()
\`\`\`

### Choosing k — the Elbow Method

\`\`\`python
inertias = []
for k in range(1, 11):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X_scaled)
    inertias.append(km.inertia_)

plt.plot(range(1,11), inertias, 'bo-')
plt.xlabel("k"); plt.ylabel("Inertia"); plt.title("Elbow Method")
\`\`\`
  `);

  await upsertLesson(mlMod3.id, 1, 'Model Evaluation Metrics', 'text', 30, 10, `
## Model Evaluation Metrics

Choosing the right metric is as important as choosing the right algorithm.

### Regression metrics

\`\`\`python
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)

print(f"MAE:  {mae:.2f}  (average error in original units)")
print(f"RMSE: {rmse:.2f} (penalises large errors more)")
print(f"R²:   {r2:.3f}  (1.0 = perfect, 0 = predicts mean)")
\`\`\`

### Classification metrics

\`\`\`python
from sklearn.metrics import (accuracy_score, precision_score,
                              recall_score, f1_score, confusion_matrix)

print(f"Accuracy:  {accuracy_score(y_test, y_pred):.2%}")
print(f"Precision: {precision_score(y_test, y_pred):.2%}")
print(f"Recall:    {recall_score(y_test, y_pred):.2%}")
print(f"F1 Score:  {f1_score(y_test, y_pred):.2%}")
\`\`\`

### When to use which metric
| Metric | Use when |
|--------|----------|
| Accuracy | Balanced classes |
| Precision | False positives are costly (spam filter) |
| Recall | False negatives are costly (cancer diagnosis) |
| F1 | You need a balance of both |
| R² | Regression — how much variance is explained |
  `);

  await upsertLesson(mlMod3.id, 2, 'Cross-Validation & Hyperparameter Tuning', 'text', 35, 15, `
## Cross-Validation & Hyperparameter Tuning

### Cross-validation — reliable model evaluation

A single train/test split can be misleading. Cross-validation uses ALL data for evaluation.

\`\`\`python
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier
import numpy as np

model = RandomForestClassifier(n_estimators=100, random_state=42)

# 5-fold cross-validation
scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
print(f"CV Accuracy: {scores.mean():.2%} ± {scores.std():.2%}")
\`\`\`

### GridSearchCV — find the best hyperparameters

\`\`\`python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth':    [4, 8, None],
    'min_samples_split': [2, 5, 10],
}

grid_search = GridSearchCV(
    RandomForestClassifier(random_state=42),
    param_grid,
    cv=5, scoring='accuracy', n_jobs=-1, verbose=1
)
grid_search.fit(X_train, y_train)

print("Best params:", grid_search.best_params_)
print("Best CV score:", grid_search.best_score_)
\`\`\`

### Pipelines — prevent data leakage

\`\`\`python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('model',  RandomForestClassifier(n_estimators=100)),
])

scores = cross_val_score(pipe, X, y, cv=5)
\`\`\`
  `);

  const mlQuestions = [
    { text: 'What type of problem is predicting house prices?', opts: ['Classification', 'Clustering', 'Regression', 'Reinforcement Learning'], ans: 'Regression', skill: 'Machine Learning' },
    { text: 'Which metric measures how much variance in y is explained by the model?', opts: ['MAE', 'RMSE', 'R²', 'F1 Score'], ans: 'R²', skill: 'Statistics' },
    { text: 'What does overfitting mean?', opts: ['The model is too simple', 'The model performs well on training but poorly on new data', 'The model has too few parameters', 'Training took too long'], ans: 'The model performs well on training but poorly on new data', skill: 'Machine Learning' },
    { text: 'What is the Scikit-learn method used to train a model?', opts: ['train()', 'fit()', 'run()', 'learn()'], ans: 'fit()', skill: 'Machine Learning' },
    { text: 'Which algorithm creates multiple trees and averages their predictions?', opts: ['Decision Tree', 'K-Means', 'Random Forest', 'Logistic Regression'], ans: 'Random Forest', skill: 'Machine Learning' },
    { text: 'What is cross-validation used for?', opts: ['To speed up training', 'To get a more reliable estimate of model performance', 'To reduce the dataset size', 'To tune learning rate'], ans: 'To get a more reliable estimate of model performance', skill: 'Statistics' },
    { text: 'K-Means clustering is an example of which type of learning?', opts: ['Supervised', 'Reinforcement', 'Unsupervised', 'Semi-supervised'], ans: 'Unsupervised', skill: 'Machine Learning' },
    { text: 'When should you use Recall as your primary metric?', opts: ['When false positives are costly', 'When false negatives are costly', 'When classes are balanced', 'When you have regression'], ans: 'When false negatives are costly', skill: 'Statistics' },
    { text: 'What does the train_test_split function do?', opts: ['Trains and tests the model', 'Splits data into training and test sets', 'Splits features from labels', 'Validates hyperparameters'], ans: 'Splits data into training and test sets', skill: 'Machine Learning' },
    { text: 'Which regularisation technique drives some feature weights to exactly zero?', opts: ['Ridge (L2)', 'Lasso (L1)', 'Dropout', 'Batch Norm'], ans: 'Lasso (L1)', skill: 'Machine Learning' },
  ];
  await seedQuestions(ml.id, mlQuestions);
  console.log(`✅ Course 3: Machine Learning Basics (3 modules, ${await lessonCount(ml.id)} lessons, ${mlQuestions.length} questions)`);

  console.log('\n✅ Seed complete!');
  console.log('   Admin login: admin@ale.com / Admin@2024');
  console.log('   Run `npm run dev` and POST to /api/v1/auth/login to get a token.\n');
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function upsertModule(courseId, order, title, estimatedMins = 60, isFreePreview = false) {
  const existing = await prisma.module.findFirst({
    where: { courseId, displayOrder: order },
  });
  if (existing) return existing;
  return prisma.module.create({
    data: { courseId, title, displayOrder: order, estimatedMins, isFreePreview },
  });
}

async function upsertLesson(moduleId, order, title, type, estimatedMins, xpReward, contentBody) {
  const existing = await prisma.lesson.findFirst({
    where: { moduleId, displayOrder: order },
  });
  if (existing) return existing;
  return prisma.lesson.create({
    data: { moduleId, title, type, displayOrder: order, estimatedMins, xpReward, contentBody },
  });
}

async function seedQuestions(courseId, questions) {
  for (const q of questions) {
    const exists = await prisma.question.findFirst({ where: { courseId, text: q.text } });
    if (exists) continue;
    const opts = q.opts.map((o, i) => ({ id: String.fromCharCode(97 + i), text: o }));
    await prisma.question.create({
      data: {
        courseId, text: q.text, type: 'mcq',
        options: opts,
        correctAnswer: [q.ans],
        difficulty: 'medium',
        skillTags: [q.skill],
        xpReward: 5,
      },
    });
  }
}

async function lessonCount(courseId) {
  return prisma.lesson.count({ where: { module: { courseId } } });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
