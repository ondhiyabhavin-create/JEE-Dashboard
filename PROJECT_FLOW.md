# JEE Student Performance Tracking System - Complete Project Flow

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [User Flow & Authentication](#user-flow--authentication)
4. [Core Features & Workflows](#core-features--workflows)
5. [Data Models & Relationships](#data-models--relationships)
6. [API Endpoints](#api-endpoints)
7. [Excel Upload Process](#excel-upload-process)
8. [Student Management Flow](#student-management-flow)
9. [Test Management Flow](#test-management-flow)
10. [Performance Tracking Features](#performance-tracking-features)
11. [Advanced Features](#advanced-features)

---

## 🎯 Project Overview

**JEE Student Performance Tracking System** is a comprehensive full-stack application designed for offline coaching institutes to track and manage JEE student performance, test results, visits, and syllabus backlog.

### Purpose
- Track 300-400+ students' test performance
- Manage test results from Excel uploads
- Monitor student visits and assignments
- Track syllabus completion and backlog
- Analyze subject-wise performance (Physics, Chemistry, Mathematics)
- Record unattempted and negative questions with subtopics

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **File Processing**: Multer, xlsx
- **Deployment**: Vercel (Frontend), Railway (Backend)

---

## 🏗️ System Architecture

### Frontend Structure
```
frontend/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard with stats
│   ├── students/          # Student list & detail pages
│   ├── tests/             # Test list & detail pages
│   ├── upload/            # Excel file upload page
│   ├── syllabus/          # Syllabus management
│   ├── backlog/           # Backlog management
│   ├── admin/             # Admin panel
│   └── login/             # Authentication
├── components/
│   ├── premium/           # Premium UI components
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components
└── lib/                   # API utilities & helpers
```

### Backend Structure
```
backend/
├── models/                # Mongoose schemas
├── routes/                # Express route handlers
├── controllers/           # Business logic (Excel upload)
├── services/              # Background services
├── utils/                 # Utilities (Email, WhatsApp)
└── scripts/               # Database scripts
```

---

## 🔐 User Flow & Authentication

### Authentication Flow
1. **Login Page** (`/login`)
   - Username/password authentication
   - JWT token stored in localStorage
   - Redirects to dashboard on success

2. **Protected Routes**
   - All pages except `/login`, `/forgot-password`, `/reset-password` require authentication
   - `RouteProtection` component checks auth status
   - Auto-redirects to login if not authenticated

3. **Password Management**
   - Forgot password with OTP via email
   - Reset password with OTP verification
   - Change password (authenticated users)

4. **Session Management**
   - Token verification on each API call
   - Auto-logout on 401 errors
   - Persistent login via localStorage

---

## 🎨 Core Features & Workflows

### 1. Dashboard (`/dashboard`)

**Purpose**: Overview of system statistics and quick access

**Features**:
- **Statistics Cards**:
  - Total Students count
  - Total Tests count
  - Total Test Results count
  - Average Score across tests
- **Recent Tests**: Last 3 tests with dates
- **Quick Actions**: Links to upload and student management

**Data Flow**:
1. Fetches student count (with pagination)
2. Fetches all tests
3. Calculates results and average scores
4. Displays with animated counters (CountUp component)

---

### 2. Student Management (`/students`)

#### Student List Page

**Features**:
- **Grid/Card View**: Responsive card layout showing student info
- **Search Functionality**: Search by name, roll number, or email
- **Batch Filtering**: Filter students by batch
- **Pagination**: Handles 300-400+ students efficiently
- **Student Cards Display**:
  - Name, Roll Number, Batch
  - Latest test score and rank
  - Source type (Manual/Excel)
  - Overall status badge (Good/Medium/Bad)

**Data Flow**:
1. Load students with pagination (20 per page)
2. Apply search/filter if provided
3. Fetch latest test result for each student
4. Display with staggered animations

#### Student Detail Page (`/students/[id]`)

**Tabbed Interface** with 5 tabs:

##### Tab 1: Overview (User Tab)
- **Student Profile Information**:
  - Basic info (Name, Roll Number, Batch)
  - Parent details (Name, Occupation)
  - Contact information (Phone, Email, Address)
  - General remarks
- **Editable Fields**: All profile fields can be edited
- **Status Management**: Overall status (Good/Medium/Bad)
- **Remarks History**: Timeline of remarks with dates

##### Tab 2: Tests Tab
- **Test Results List**: All tests taken by student
- **Test Cards Display**:
  - Test number (chronological)
  - Test date
  - Total score
  - Rank (if available)
- **Test Detail Modal**: Click any test to view details
  - Overall performance metrics
  - Subject-wise breakdown (Physics, Chemistry, Mathematics)
  - Unattempted questions (with question number & subtopic)
  - Negative questions (with question number & subtopic)
  - Add/Delete questions functionality
  - Remarks section

##### Tab 3: Visits Tab
- **Visit Tracking**: Record counseling sessions
- **Visit Cards**: Each visit shows:
  - Visit date
  - Assignment given
  - Remarks/Notes
- **Add/Edit/Delete**: Full CRUD operations
- **Chronological Order**: Most recent first

##### Tab 4: Backlog Tab
- **Syllabus Structure**: Fixed syllabus for all students
- **Topic/Subtopic Tracking**:
  - Strong/Weak status
  - Concept Clear/Not Clear
  - Solving Done/Not Done
  - Backlog Yes/No
- **Bulk Updates**: Update multiple items at once
- **Visual Indicators**: Color-coded status badges

##### Tab 5: Negative/Unattempted Tab
- **Aggregated View**: All negative and unattempted questions across all tests
- **Grouped by Subtopic**: Shows count per subtopic
- **Question Details**: Lists all questions with test names
- **Filter Options**: View all, negative only, or unattempted only

---

### 3. Test Management (`/tests`)

#### Test List Page

**Features**:
- **Test Cards**: List of all tests
- **Test Information**:
  - Test name
  - Test date
  - Max marks
- **Quick Access**: Click to view test details

#### Test Detail Page (`/tests/[id]`)

**Features**:
- **Test Header**: Test name, date, max marks
- **Student Results Table**:
  - Rank, Student name, Roll number
  - Total score, Percentage
  - Subject-wise scores (Physics, Chemistry, Mathematics)
  - Search functionality
  - Pagination (50 per page)
- **Student Detail Modal**: Click "View" on any student
  - Same detailed view as in student page
  - Add/Delete unattempted and negative questions
  - Edit remarks
  - Real-time updates with optimistic UI

**Key Functionality**:
- **Question Management**:
  - Add questions with question number and subtopic
  - Delete questions
  - Instant UI updates (optimistic updates)
  - Syncs with `questionRecordsApi` for consistency
- **Subtopic Counts**: Shows aggregated counts per subtopic across all tests

---

### 4. Excel Upload (`/upload`)

**Purpose**: Bulk upload test results from Excel files

**Features**:
- **Drag & Drop Upload**: Modern file upload interface
- **File Validation**: Checks file format
- **Progress Indicator**: Shows upload progress
- **Error Handling**: Displays validation errors

**Excel Format Requirements**:

**Student Information**:
- `StuID` - Student roll number (used for matching)
- `Name` - Student name
- `Batch` - Student batch

**Physics Scores**:
- `Phy-R` - Right answers
- `Phy-W` - Wrong answers
- `Phy-U` - Unattempted
- `Phy-T` - Total marks

**Chemistry Scores**:
- `Chem-R`, `Chem-W`, `Chem-U`, `Chem-T`

**Mathematics Scores**:
- `Math-R`, `Math-W`, `Math-U`, `Math-T`

**Totals**:
- `Total-R` - Total right
- `Total-W` - Total wrong
- `Total-U` - Total unattempted
- `Total-S` - Total score
- `%age` - Percentage
- `Rank` - Student rank

**Upload Process Flow**:
1. User selects/creates test
2. Uploads Excel file
3. Backend processes file:
   - Parses Excel using `xlsx` library
   - Validates column names
   - Matches students by `StuID` (rollNumber)
   - Creates/updates test results
   - Skips rows for non-existent students
4. Returns success/error status
5. File is deleted after processing

---

### 5. Syllabus Management (`/syllabus`)

**Purpose**: Manage the fixed syllabus structure

**Features**:
- **Subject-wise Organization**: Physics, Chemistry, Mathematics
- **Topic Management**: Add/Edit/Delete topics
- **Subtopic Management**: Add/Edit/Delete subtopics under topics
- **Hierarchical Structure**: Topics → Subtopics
- **Used by**: Backlog tracking and question categorization

---

### 6. Admin Panel (`/admin`)

**Features**:
- **Test Creation**: Create new tests with name, date, max marks
- **Test Management**: View, edit, delete tests
- **User Management**: (If implemented)
- **System Settings**: Header name customization

---

## 📊 Data Models & Relationships

### Student Model
```javascript
{
  rollNumber: String (unique, indexed),
  name: String,
  batch: String,
  parentName: String,
  parentOccupation: String,
  address: String,
  contactNumber: String,
  email: String,
  generalRemark: String,
  remarks: [{ remark: String, date: Date }],
  sourceType: 'manual' | 'excel',
  overallStatus: 'Good' | 'Medium' | 'Bad' | null
}
```

### Test Model
```javascript
{
  testName: String,
  testDate: Date,
  maxMarks: Number (default: 300)
}
```

### StudentTestResult Model
```javascript
{
  studentId: ObjectId (ref: Student),
  testId: ObjectId (ref: Test),
  totals: {
    totalCorrect: Number,
    totalWrong: Number,
    totalUnattempted: Number,
    totalScore: Number,
    percentage: Number,
    rank: Number
  },
  physics: {
    right: Number,
    wrong: Number,
    unattempted: Number,
    score: Number,
    unattemptedQuestions: [],
    negativeQuestions: []
  },
  chemistry: { /* same structure */ },
  maths: { /* same structure */ },
  remarks: String
}
// Unique index on (studentId, testId)
```

### QuestionRecord Model (New - Simple Table)
```javascript
{
  studentId: ObjectId (ref: Student),
  testId: ObjectId (ref: Test),
  subject: 'Physics' | 'Chemistry' | 'Mathematics',
  type: 'negative' | 'unattempted',
  questionNumber: Number,
  subtopic: String
}
// Used for tracking questions separately from result document
```

### Visit Model
```javascript
{
  studentId: ObjectId (ref: Student),
  visitDate: Date,
  assignment: String,
  remarks: String
}
```

### Backlog Model
```javascript
{
  studentId: ObjectId (ref: Student),
  subject: 'Physics' | 'Chemistry' | 'Mathematics',
  topic: String,
  subtopic: String,
  isStrong: Boolean,
  isWeak: Boolean,
  conceptClear: Boolean,
  solvingDone: Boolean,
  isBacklog: Boolean
}
```

### StudentTopicStatus Model
```javascript
{
  studentId: ObjectId (ref: Student),
  subject: String,
  topicName: String,
  subtopicName: String,
  status: 'Good' | 'Medium' | 'Bad' | null,
  theoryCompleted: Boolean,
  solvingCompleted: Boolean,
  negativeCount: Number,
  unattemptedCount: Number
}
```

### Syllabus Model
```javascript
{
  subject: 'Physics' | 'Chemistry' | 'Mathematics',
  topics: [{
    name: String,
    subtopics: [String]
  }],
  order: Number
}
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password with OTP

### Students
- `GET /api/students` - Get all students (pagination, search, filter)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/batch-delete` - Delete multiple students

### Tests
- `GET /api/tests` - Get all tests (pagination)
- `GET /api/tests/:id` - Get test by ID
- `POST /api/tests` - Create test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test
- `POST /api/tests/upload` - Upload Excel (creates test + processes)
- `POST /api/tests/:id/upload` - Upload Excel for existing test

### Results
- `GET /api/results/student/:studentId` - Get all results for student
- `GET /api/results/test/:testId` - Get results for test (pagination)
- `GET /api/results/:id` - Get result by ID
- `PUT /api/results/:id` - Update result (remarks, questions)

### Question Records (New API)
- `POST /api/question-records` - Add question record
- `DELETE /api/question-records/:id` - Delete question record
- `GET /api/question-records/student/:studentId` - Get all questions for student
- `GET /api/question-records/result/:resultId` - Get questions for test result

### Visits
- `GET /api/visits/student/:studentId` - Get all visits for student
- `GET /api/visits/:id` - Get visit by ID
- `POST /api/visits` - Create visit
- `PUT /api/visits/:id` - Update visit
- `DELETE /api/visits/:id` - Delete visit

### Backlog
- `GET /api/backlog/syllabus` - Get syllabus structure
- `GET /api/backlog/student/:studentId` - Get backlog items for student
- `POST /api/backlog/student/:studentId/initialize` - Initialize backlog
- `GET /api/backlog/student/:studentId/item` - Get specific backlog item
- `PUT /api/backlog/:id` - Update backlog item
- `PUT /api/backlog/student/:studentId/bulk` - Bulk update backlog items

### Syllabus
- `GET /api/syllabus` - Get all syllabus items
- `GET /api/syllabus/subject/:subject` - Get syllabus for subject
- `GET /api/syllabus/subtopics/grouped` - Get grouped subtopics
- `POST /api/syllabus` - Create syllabus item
- `PUT /api/syllabus/:id` - Update syllabus
- `POST /api/syllabus/:id/topics` - Add topic
- `POST /api/syllabus/:id/topics/:topicId/subtopics` - Add subtopic
- `DELETE /api/syllabus/:id/topics/:topicId/subtopics/:subtopic` - Remove subtopic

### Student Topic Status
- `GET /api/student-topic-status/student/:studentId` - Get statuses for student
- `GET /api/student-topic-status/student/:studentId/counts` - Get subtopic counts
- `POST /api/student-topic-status/student/:studentId` - Update status
- `POST /api/student-topic-status/student/:studentId/refresh-counts` - Refresh counts from question records

---

## 📤 Excel Upload Process

### Step-by-Step Flow

1. **User Action**: Admin navigates to `/upload` page

2. **Test Selection/Creation**:
   - Select existing test OR
   - Create new test (name, date, max marks)

3. **File Upload**:
   - Drag & drop or select Excel file
   - File validation (format check)

4. **Backend Processing** (`controllers/excelUpload.js`):
   ```javascript
   a. Parse Excel file using xlsx library
   b. Extract headers and validate column names
   c. For each row:
      - Extract StuID (rollNumber)
      - Find student in database by rollNumber
      - If student exists:
         * Extract all scores (Physics, Chemistry, Maths)
         * Calculate/Extract totals
         * Create/Update StudentTestResult
         * Link to Test and Student
      - If student doesn't exist: Skip row (safe handling)
   d. Return success with count of processed results
   e. Delete uploaded file
   ```

5. **Result**:
   - Success message with number of results created
   - Test results now visible in test detail page
   - Students can see results in their profile

### Excel Matching Logic
- Uses `StuID` column to match with `Student.rollNumber`
- Case-insensitive matching
- Trims whitespace
- Creates result only if student exists
- Updates existing result if test already has result for student

---

## 👥 Student Management Flow

### Creating a Student

1. **Manual Creation**:
   - Navigate to `/students`
   - Click "Add Student"
   - Fill form:
     - Roll Number (unique, required)
     - Name (required)
     - Batch (required)
     - Optional: Parent info, contact, address, email
   - Save → Creates student with `sourceType: 'manual'`

2. **Excel Import**:
   - Upload Excel file with test results
   - Students are created automatically if they don't exist
   - `sourceType: 'excel'`

### Viewing Student Details

1. Click on student card in `/students`
2. Navigate to `/students/[id]`
3. View 5 tabs:
   - **Overview**: Edit profile, view remarks
   - **Tests**: View all test results, click to see details
   - **Visits**: Manage counseling sessions
   - **Backlog**: Track syllabus completion
   - **Negative/Unattempted**: Aggregated question analysis

### Editing Student Information

1. Go to Overview tab
2. Click "Edit" on any field
3. Update information
4. Save → Updates database immediately
5. UI updates with success toast

---

## 📝 Test Management Flow

### Creating a Test

1. Navigate to `/admin` or `/upload`
2. Click "Create Test"
3. Fill form:
   - Test Name
   - Test Date
   - Max Marks (default: 300)
4. Save → Test created

### Uploading Test Results

1. Create or select test
2. Upload Excel file
3. System processes and creates results
4. Results appear in:
   - Test detail page (`/tests/[id]`)
   - Student test tabs

### Viewing Test Results

1. Navigate to `/tests`
2. Click on test card
3. View `/tests/[id]`:
   - Test information header
   - Student results table with:
     - Rank, Name, Roll Number
     - Scores (Total, Percentage)
     - Subject scores
   - Search functionality
   - Pagination

4. **Click "View" on any student**:
   - Opens modal with detailed view
   - Subject-wise breakdown
   - Add/Delete questions
   - Edit remarks

---

## 📈 Performance Tracking Features

### 1. Question Tracking System

**Purpose**: Track specific unattempted and negative questions with subtopics

**Implementation**:
- Uses `QuestionRecord` model (separate collection)
- Stores: studentId, testId, subject, type, questionNumber, subtopic
- Allows multiple questions per test per student

**Workflow**:
1. Open test detail (from test page or student page)
2. Click on student result
3. For each subject (Physics, Chemistry, Mathematics):
   - **Unattempted Questions Section**:
     - Click "Add Question"
     - Enter question number
     - Select subtopic from dropdown
     - Save → Question added instantly
   - **Negative Questions Section**:
     - Same process as unattempted
   - Questions appear with badge and subtopic
   - Delete button for each question

**Features**:
- **Optimistic Updates**: UI updates immediately
- **Real-time Sync**: Background sync with server
- **Subtopic Integration**: Uses syllabus subtopics
- **Aggregated View**: Shows counts per subtopic

### 2. Subtopic Count Aggregation

**Purpose**: Show total negative/unattempted questions per subtopic

**Implementation**:
- `StudentTopicStatus` model tracks counts
- `refreshCounts` API endpoint recalculates from question records
- Shows in test detail modal

**Display**:
- Card showing subtopic counts
- Grouped by subject
- Total negative and unattempted per subtopic

### 3. Negative/Unattempted Tab

**Purpose**: View all questions across all tests for a student

**Features**:
- Aggregates all question records for student
- Groups by subject → topic → subtopic
- Shows question numbers with test names
- Filter by type (all, negative, unattempted)
- Summary statistics

---

## 🚀 Advanced Features

### 1. Visit Notification Service

**Purpose**: Automated reminders for student visits

**Implementation**:
- Background service (`services/visitNotificationService.js`)
- Lambda cron job (`lambda-cron.js`)
- Checks for students without recent visits
- Sends email/WhatsApp notifications

### 2. Email Service

**Features**:
- Password reset emails with OTP
- Visit reminders
- Configurable SMTP settings

### 3. WhatsApp Integration

**Features**:
- Send visit reminders via WhatsApp
- Configurable provider (Twilio, etc.)
- Test message functionality

### 4. Search & Filter

**Student Search**:
- Search by name, roll number, email
- Real-time filtering
- Batch filter dropdown

**Test Search**:
- Search students within test results
- Filter by name or roll number

### 5. Pagination

**Implementation**:
- Server-side pagination for performance
- 20 students per page (list)
- 50 results per page (test results)
- Efficient database queries with indexes

### 6. Real-time Updates

**Optimistic UI Updates**:
- Questions added/deleted update instantly
- Background sync ensures consistency
- Toast notifications for feedback
- No page refresh needed

### 7. Responsive Design

**Breakpoints**:
- Mobile: Single column layouts
- Tablet: 2-column grids
- Desktop: 3-4 column grids
- Touch-friendly interactions

### 8. Animations

**Framer Motion**:
- Staggered card entries
- Smooth page transitions
- Modal animations
- Hover effects
- Count-up number animations

---

## 🔄 Complete User Journey Example

### Scenario: Admin uploads test results and reviews student performance

1. **Login** (`/login`)
   - Admin enters credentials
   - Redirected to dashboard

2. **Dashboard** (`/dashboard`)
   - Views statistics
   - Sees recent tests
   - Clicks "Upload Test Results"

3. **Upload Test** (`/upload`)
   - Creates new test: "JEE Mains Mock Test 1"
   - Sets date: 2024-01-15
   - Uploads Excel file with 200 student results
   - System processes and creates results
   - Success message: "200 results created"

4. **View Test** (`/tests/[testId]`)
   - Sees all 200 students with scores
   - Searches for specific student
   - Clicks "View" on student

5. **Student Test Detail** (Modal)
   - Views overall performance
   - Sees subject-wise breakdown
   - Adds 3 unattempted questions for Physics
   - Adds 2 negative questions for Mathematics
   - Adds remark: "Needs improvement in calculus"
   - All updates save instantly

6. **Student Profile** (`/students/[studentId]`)
   - Clicks on student from list
   - Views Overview tab: Updates contact info
   - Views Tests tab: Sees all test results
   - Views Visits tab: Adds new visit record
   - Views Backlog tab: Updates topic statuses
   - Views Negative/Unattempted tab: Sees aggregated questions

7. **Syllabus Management** (`/syllabus`)
   - Adds new topic: "Electrostatics"
   - Adds subtopics: "Coulomb's Law", "Electric Field"
   - These appear in question subtopic dropdowns

---

## 🎯 Key Design Decisions

### 1. Question Records Separate Collection
- **Why**: Better performance, easier querying
- **Benefit**: Can aggregate across all tests easily
- **Trade-off**: Two sources of truth (result document + question records)

### 2. Optimistic UI Updates
- **Why**: Better user experience
- **Benefit**: Instant feedback, no waiting
- **Implementation**: Update UI first, sync with server in background

### 3. Fixed Syllabus Structure
- **Why**: Consistency across all students
- **Benefit**: Standardized tracking
- **Management**: Admin manages syllabus, students track completion

### 4. Excel-Based Test Results
- **Why**: Existing workflow uses Excel
- **Benefit**: No manual data entry
- **Process**: Excel → Parse → Database

### 5. Tabbed Student Interface
- **Why**: Organize large amount of information
- **Benefit**: Clean, focused views
- **Tabs**: Overview, Tests, Visits, Backlog, Negative/Unattempted

---

## 📱 Pages & Routes Summary

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/` | Home/Redirect | Redirects to dashboard |
| `/login` | Authentication | Login form |
| `/dashboard` | Overview | Statistics, recent tests |
| `/students` | Student list | Search, filter, pagination |
| `/students/[id]` | Student detail | 5 tabs with full info |
| `/tests` | Test list | All tests |
| `/tests/[id]` | Test detail | Results table, student modals |
| `/upload` | Excel upload | File upload, test creation |
| `/syllabus` | Syllabus management | Topics & subtopics |
| `/backlog` | Backlog view | (If standalone page) |
| `/admin` | Admin panel | Test management |
| `/forgot-password` | Password reset | OTP flow |
| `/reset-password` | Password reset | OTP verification |

---

## 🔧 Technical Implementation Details

### State Management
- React hooks (useState, useEffect)
- Context API for authentication
- Local component state for UI

### API Communication
- Axios for HTTP requests
- Centralized API utilities (`lib/api.ts`)
- Request/response interceptors
- Error handling & retry logic

### Database Indexes
- Student: rollNumber (unique), name, batch, text search
- Result: (studentId, testId) unique compound index
- QuestionRecord: studentId, testId, subject indexes

### Performance Optimizations
- Pagination for large datasets
- Lazy loading of components
- Memoization with useMemo
- Efficient database queries
- Optimistic UI updates

### Error Handling
- Try-catch blocks
- User-friendly error messages
- Toast notifications
- Graceful degradation

---

## 🎓 Use Cases

### Use Case 1: Upload Test Results
**Actor**: Admin
**Steps**:
1. Create test
2. Upload Excel
3. System processes
4. Results available

### Use Case 2: Track Student Questions
**Actor**: Counselor
**Steps**:
1. Open test result
2. View student performance
3. Add unattempted/negative questions
4. System tracks by subtopic

### Use Case 3: Monitor Student Progress
**Actor**: Counselor
**Steps**:
1. View student profile
2. Check all test results
3. Review backlog status
4. Add visit record

### Use Case 4: Analyze Performance
**Actor**: Admin/Counselor
**Steps**:
1. View test results
2. See rankings
3. Identify weak areas
4. Review question patterns

---

## 📚 Additional Resources

- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`
- **Deployment Guide**: `backend/DEPLOYMENT.md`
- **Premium UI Guide**: `frontend/PREMIUM_UI_GUIDE.md`
- **Email Setup**: `backend/EMAIL_SETUP.md`
- **Lambda Functions**: `backend/README_LAMBDA.md`

---

## 🎉 Summary

This system provides a comprehensive solution for tracking JEE student performance with:
- ✅ Student management (300-400+ students)
- ✅ Test result tracking from Excel
- ✅ Question-level tracking with subtopics
- ✅ Visit and assignment management
- ✅ Syllabus backlog tracking
- ✅ Performance analytics
- ✅ Modern, responsive UI
- ✅ Real-time updates
- ✅ Secure authentication

The system is designed to handle the scale of a coaching institute while providing detailed insights into student performance at both macro (test scores) and micro (individual questions) levels.

