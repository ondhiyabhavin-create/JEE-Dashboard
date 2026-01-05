# Fix: Topic Count Not Showing in Unattempted/Negative Question Tab

## Problem
When saving negative or unattempted questions inside any exam (student test detail modal), the topic count increment was not getting displayed in the Unattempted/Negative question tab.

## Root Cause
The `updateSubtopicCounts` function in `/backend/routes/results.js` was reading from the old data structure (embedded arrays in `StudentTestResult` model like `physics.negativeQuestions` and `physics.unattemptedQuestions`), but the new system uses the `QuestionRecord` collection to store questions separately.

When questions were added via `questionRecordsApi.add()`, they were saved to the `QuestionRecord` collection, but the count refresh function was still looking at the old embedded arrays which were no longer being updated.

## Solution

### Backend Changes
**File: `/backend/routes/results.js`**

Updated the `updateSubtopicCounts` function to:
1. Read from the `QuestionRecord` collection instead of embedded arrays in `StudentTestResult`
2. Query all question records for a student using `QuestionRecord.find({ studentId })`
3. Count questions by iterating through the question records and checking their `type` field ('negative' or 'unattempted')
4. Update the `StudentTopicStatus` collection with the correct counts

**Key changes:**
- Removed the old logic that iterated through `StudentTestResult` documents and their embedded arrays
- Added `QuestionRecord` model import
- Changed the counting logic to iterate through `QuestionRecord` documents
- Simplified the code by removing the subject mapping (since QuestionRecord already uses proper subject names like 'Physics', 'Chemistry', 'Mathematics')

### Frontend Changes
**File: `/frontend/app/tests/[id]/page.tsx`**

Added `studentTopicStatusApi.refreshCounts()` calls in two places:
1. **After adding a question** (`handleAddQuestion` function) - Line ~433
2. **After deleting a question** (`confirmDeleteQuestion` function) - Line ~501

These calls ensure that when questions are saved or deleted from the test detail page, the counts are immediately refreshed in the background.

**Note:** The `TestDetailModalPremium.tsx` component already had these refresh calls, so no changes were needed there.

## How It Works Now

1. User opens a test detail modal and adds/deletes a negative or unattempted question
2. Question is saved to the `QuestionRecord` collection via `questionRecordsApi.add()` or deleted via `questionRecordsApi.delete()`
3. The frontend calls `studentTopicStatusApi.refreshCounts(studentId)` in the background
4. The backend's `updateSubtopicCounts` function:
   - Fetches all `QuestionRecord` documents for the student
   - Counts negative and unattempted questions per subtopic
   - Updates the `StudentTopicStatus` collection with the new counts
5. When the user navigates to the Negative/Unattempted tab, the `NegativeUnattemptedTab` component fetches the updated counts from `StudentTopicStatus` and displays them correctly

## Files Modified

1. `/backend/routes/results.js` - Updated `updateSubtopicCounts` function
2. `/frontend/app/tests/[id]/page.tsx` - Added `refreshCounts` calls after add/delete operations

## Testing Recommendations

1. Open a test detail page
2. Click "View" on any student
3. Add a negative question with a subtopic
4. Add an unattempted question with a subtopic
5. Close the modal and navigate to the student's detail page
6. Go to the "Negative/Unattempted" tab
7. Verify that the counts are displayed correctly for the subtopics
8. Delete a question and verify the count decreases
9. Test with multiple tests and verify counts aggregate correctly across all tests
