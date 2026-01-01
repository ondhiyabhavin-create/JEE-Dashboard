# Frontend - JEE Dashboard

Next.js frontend application for the JEE Student Performance Tracking System.

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Pages

- `/` - Home page
- `/students` - List all students with search and pagination
- `/students/[id]` - Student detail page with tabs (User, Tests, Visits, Backlog)
- `/admin` - Admin page for creating tests and uploading Excel files

## Components

- `UserTab` - Student profile editing
- `TestsTab` - List of test results
- `TestDetailModal` - Detailed test result with editable topic/subtopic
- `VisitsTab` - Visit tracking
- `BacklogTab` - Syllabus backlog management

