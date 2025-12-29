# JEE Student Performance Tracking System

A comprehensive full-stack application for tracking JEE student performance in an offline coaching institute.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **File Upload**: Multer
- **Excel Parsing**: xlsx
- **Frontend Deploy**: Vercel
- **Backend Deploy**: Railway

## Project Structure

```
JEE-Dashboard/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── controllers/     # Business logic
│   ├── uploads/         # Excel file uploads (gitignored)
│   └── server.js        # Express server entry point
├── frontend/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/             # API utilities
│   └── public/          # Static assets
└── README.md
```

## Features

### Student Management
- List 300-400 students with search and pagination
- Student profile management
- View student test results, visits, and backlog

### Test Management
- Create tests with name, date, and max marks
- Upload Excel files with test results
- Automatic parsing and matching by StuID

### Test Results
- View all test results for a student
- Detailed subject-wise breakdown (Physics, Chemistry, Maths)
- Editable topic/subtopic entry for unattempted and negative questions
- Remarks section for counselor notes

### Visits Tracking
- Record multiple visits per student
- Assignment and remarks tracking

### Backlog Management
- Fixed syllabus structure for all students
- Track: Strong/Weak, Concept Clear/Not Clear, Solving Done/Not Done, Backlog Yes/No

## Excel Format

The Excel file must contain the following columns (exact names):

**Student Info:**
- StuID
- Name
- Batch

**Physics:**
- Phy-R (correct)
- Phy-W (wrong)
- Phy-U (unattempted)
- Phy-T (total marks)

**Chemistry:**
- Chem-R
- Chem-W
- Chem-U
- Chem-T

**Maths:**
- Math-R
- Math-W
- Math-U
- Math-T

**Totals:**
- Total-R
- Total-W
- Total-U
- Total-S
- %age
- Rank

**Important:** The Excel file already contains calculated marks. The system does NOT recalculate scores - it uses the values directly from Excel.

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
PORT=5001
MONGODB_URI=mongodb://localhost:27017/jee-dashboard
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Deployment

### Backend (Railway)

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variables:
   - `MONGODB_URI` (MongoDB connection string)
   - `PORT` (Railway will provide this)
   - `NODE_ENV=production`
5. Deploy

### Frontend (Vercel)

1. Import your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` (your Railway backend URL)
4. Deploy

## API Endpoints

### Students
- `GET /api/students` - Get all students (with pagination and search)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Tests
- `GET /api/tests` - Get all tests
- `GET /api/tests/:id` - Get test by ID
- `POST /api/tests` - Create test
- `POST /api/tests/:id/upload` - Upload Excel file for test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test

### Results
- `GET /api/results/student/:studentId` - Get all results for a student
- `GET /api/results/:id` - Get result by ID
- `PUT /api/results/:id` - Update result
- `GET /api/results/test/:testId` - Get results for a test

### Visits
- `GET /api/visits/student/:studentId` - Get all visits for a student
- `POST /api/visits` - Create visit
- `PUT /api/visits/:id` - Update visit
- `DELETE /api/visits/:id` - Delete visit

### Backlog
- `GET /api/backlog/syllabus` - Get syllabus structure
- `GET /api/backlog/student/:studentId` - Get backlog items for student
- `POST /api/backlog/student/:studentId/initialize` - Initialize backlog
- `PUT /api/backlog/:id` - Update backlog item
- `PUT /api/backlog/student/:studentId/bulk` - Bulk update backlog items

## Database Models

### Student
- rollNumber (StuID, unique)
- name
- batch
- parentName
- parentOccupation
- address
- contactNumber
- generalRemark

### Test
- testName
- testDate
- maxMarks (default: 300)

### StudentTestResult
- studentId (reference to Student)
- testId (reference to Test)
- totals (totalCorrect, totalWrong, totalUnattempted, totalScore, percentage, rank)
- physics, chemistry, maths (each with: right, wrong, unattempted, score, unattemptedQuestions[], negativeQuestions[])
- remarks

### Visit
- studentId
- visitDate
- assignment
- remarks

### Backlog
- studentId
- topic
- subtopic
- isStrong, isWeak, conceptClear, solvingDone, isBacklog (all boolean)

## Notes

- The system uses StuID (rollNumber) to match students from Excel files
- If a student doesn't exist in the database, that row is skipped safely
- Excel files are automatically deleted after processing
- All numeric values from Excel are parsed and stored as-is (no recalculation)

## License

ISC

# JEE-Studenta-Dashboard
