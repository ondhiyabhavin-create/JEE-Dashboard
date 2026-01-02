'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Award, Calendar, X, FileText, Edit2, Save, Trash2, Plus, XCircle, Search, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { testsApi, resultsApi, syllabusApi, studentTopicStatusApi } from '@/lib/api';
import SubtopicSelector from '@/components/SubtopicSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatPercentage } from '@/lib/utils';
import CountUp from '@/components/CountUp';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function TestDetailPage() {
  const params = useParams();
  const testId = params.id as string;
  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]); // Store all results for filtering
  const [filteredResults, setFilteredResults] = useState<any[]>([]); // Filtered results for display
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savingButton, setSavingButton] = useState<string | null>(null); // Track which button is saving
  const [editingQuestion, setEditingQuestion] = useState<{ type: string; subject: string; index: number } | null>(null);
  const [questionData, setQuestionData] = useState({ questionNumber: '', subtopic: '' });
  const { toasts, success, error: showError, warning: showWarning, removeToast } = useToast();
  const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState<{ type: string; subject: string; index: number } | null>(null);
  const [groupedSubtopics, setGroupedSubtopics] = useState<{
    Physics: Array<{ topicName: string; subtopicName: string; _id: string }>;
    Chemistry: Array<{ topicName: string; subtopicName: string; _id: string }>;
    Mathematics: Array<{ topicName: string; subtopicName: string; _id: string }>;
  }>({ Physics: [], Chemistry: [], Mathematics: [] });
  const [subtopicCounts, setSubtopicCounts] = useState<{
    [subject: string]: {
      [topicName: string]: {
        [subtopicName: string]: {
          negative: number;
          unattempted: number;
        };
      };
    };
  }>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchData(abortController.signal),
          fetchSubtopics(abortController.signal)
        ]);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load data:', error);
          showError('Failed to load test data. Please try again.');
        }
      }
    };
    
    loadData();
    
    return () => {
      abortController.abort(); // Cancel requests when component unmounts or testId changes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const fetchSubtopics = async (signal?: AbortSignal) => {
    try {
      const response = await syllabusApi.getGroupedSubtopics();
      console.log('🔍 Full API response:', response);
      console.log('🔍 Response.data:', response.data);
      
      // Axios wraps the response, so response.data is the actual response body
      // Backend returns: { success: true, data: { Physics: [], Chemistry: [], Mathematics: [] } }
      let data = null;
      
      if (response.data) {
        // Check if it's the wrapped structure
        if (response.data.success === true && response.data.data) {
          data = response.data.data;
          console.log('✅ Found data in response.data.data');
        } 
        // Check if it's direct structure (shouldn't happen but just in case)
        else if (response.data.Physics || response.data.Chemistry || response.data.Mathematics) {
          data = response.data;
          console.log('✅ Found data directly in response.data');
        }
      }
      
      if (data) {
        console.log('📊 Setting grouped subtopics:', {
          Physics: data.Physics?.length || 0,
          Chemistry: data.Chemistry?.length || 0,
          Mathematics: data.Mathematics?.length || 0,
          fullData: data
        });
        setGroupedSubtopics(data);
      } else {
        console.error('❌ No valid data found. Response structure:', JSON.stringify(response.data, null, 2));
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch subtopics:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
    }
  };

  const fetchSubtopicCounts = useCallback(async () => {
    if (!selectedResult?.studentId) return;
    
    try {
      setLoadingCounts(true);
      const studentId = typeof selectedResult.studentId === 'string' 
        ? selectedResult.studentId 
        : selectedResult.studentId._id || selectedResult.studentId.toString();
      
      const response = await studentTopicStatusApi.getSubtopicCounts(studentId);
      if (response.data?.success && response.data.data) {
        setSubtopicCounts(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch subtopic counts:', error);
      // Don't show error to user - counts are optional
    } finally {
      setLoadingCounts(false);
    }
  }, [selectedResult?.studentId]);

  useEffect(() => {
    if (selectedResult) {
      setRemarks(selectedResult.remarks || '');
      // Fetch subtopic counts for this student
      fetchSubtopicCounts();
    } else {
      setSubtopicCounts({});
    }
  }, [selectedResult, fetchSubtopicCounts]);

  const fetchData = async (signal?: AbortSignal, pageNum: number = 1) => {
    try {
      setLoading(true);
      // Fetch test and page of results
      const [testRes, resultsRes] = await Promise.all([
        testsApi.getById(testId),
        resultsApi.getByTest(testId, pageNum, 50), // Fetch specific page
      ]);
      
      // Check if request was aborted
      if (signal?.aborted) return;
      
      setTest(testRes.data);
      setAllResults(resultsRes.data.results); // Store for search
      setResults(resultsRes.data.results);
      setPagination(resultsRes.data.pagination);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      console.error('Failed to fetch test data:', err);
      if (err.response?.status === 404) {
        showError('Test not found');
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network')) {
        showError('Database connection failed. Please check your connection and try again.');
      } else {
        showError('Failed to load test data. Please try again.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };
  
  // Fetch page of results
  const fetchPage = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const resultsRes = await resultsApi.getByTest(testId, pageNum, 50);
      setResults(resultsRes.data.results);
      setPagination(resultsRes.data.pagination);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch page:', err);
      showError('Failed to load results. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [testId, showError]);
  
  // Fetch all results for search (only when needed)
  const fetchAllResultsForSearch = useCallback(async (signal?: AbortSignal) => {
    try {
      const resultsRes = await resultsApi.getByTest(testId, 1, 10000);
      if (signal?.aborted) return;
      setAllResults(resultsRes.data.results);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch all results for search:', err);
    }
  }, [testId]);

  // Fetch all results when search is used (lazy loading)
  useEffect(() => {
    if (search.trim() && allResults.length < 100) {
      // Only fetch all if we have less than 100 results and user is searching
      fetchAllResultsForSearch();
    }
  }, [search, allResults.length, fetchAllResultsForSearch]);
  
  // Update paginated results when page changes (only when not searching)
  useEffect(() => {
    if (!search.trim() && page > 1) {
      // Fetch new page from server when not searching and page > 1
      fetchPage(page);
    }
  }, [page, search, fetchPage]);

  // Filter results based on search query
  useEffect(() => {
    if (!search.trim()) {
      setFilteredResults([]);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = allResults.filter((result: any) => {
      const studentName = result.studentId?.name?.toLowerCase() || '';
      const rollNumber = result.studentId?.rollNumber?.toLowerCase() || '';
      return studentName.includes(searchLower) || rollNumber.includes(searchLower);
    });

    setFilteredResults(filtered);
  }, [search, allResults]);

  const handleSaveRemarks = async () => {
    if (!selectedResult) return;
    setIsSaving(true);
    try {
      const response = await resultsApi.update(selectedResult._id, { remarks });
      const updatedResultData = response.data;
      
      // Update selected result
      setSelectedResult(updatedResultData);
      
      // Update the result in the results list without refetching all data
      setResults(prevResults => 
        prevResults.map(r => 
          r._id === selectedResult._id ? updatedResultData : r
        )
      );
      setAllResults(prevAllResults => 
        prevAllResults.map(r => 
          r._id === selectedResult._id ? updatedResultData : r
        )
      );
      
      setIsEditingRemarks(false);
      success('Remarks saved successfully!');
    } catch (error: any) {
      console.error('Failed to update remarks:', error);
      showError('Failed to update remarks: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async (type: 'unattempted' | 'negative', subject: string) => {
    console.log('🔍 handleAddQuestion called:', { type, subject, questionData });
    
    if (!selectedResult) {
      showWarning('Please select a student result first');
      return;
    }
    
    if (!questionData.questionNumber || questionData.questionNumber.trim() === '') {
      showWarning('Please enter a question number');
      return;
    }
    
    if (!questionData.subtopic || questionData.subtopic.trim() === '') {
      showWarning('Please select a subtopic from the dropdown');
      return;
    }

    // Create unique key for this button
    const buttonKey = `${type}-${subject}`;
    setSavingButton(buttonKey);
    setIsSaving(true);
    
    try {
      const subjectKey = subject.toLowerCase() as 'physics' | 'chemistry' | 'maths';
      const currentData = selectedResult[subjectKey] || {};
      const questions = currentData[`${type}Questions`] || [];
      
      // Check for duplicate question
      const questionNum = parseInt(questionData.questionNumber);
      const isDuplicate = questions.some((q: any) => 
        q.questionNumber === questionNum && q.subtopic === questionData.subtopic
      );
      
      if (isDuplicate) {
        setSavingButton(null);
        setIsSaving(false);
        showWarning('This question is already added');
        return;
      }
      
      const updatedQuestions = [...questions, {
        questionNumber: questionNum,
        subtopic: questionData.subtopic.trim()
      }];

      const updateData = {
        [subjectKey]: {
          ...currentData,
          [`${type}Questions`]: updatedQuestions
        }
      };

      console.log('📤 Sending update data:', {
        subjectKey,
        updateData,
        questionNumber: questionNum,
        subtopic: questionData.subtopic
      });

      const response = await resultsApi.update(selectedResult._id, updateData);
      
      console.log('✅ Update response:', response);
      console.log('✅ Update response.data:', response.data);
      
      // Handle response - axios wraps it, so response.data is the actual result
      const updatedResultData = response.data;
      
      // Ensure we have the updated data with populated fields
      if (!updatedResultData) {
        throw new Error('No data returned from server');
      }
      
      console.log('✅ Updated result data:', updatedResultData);
      console.log('✅ Physics negativeQuestions:', updatedResultData.physics?.negativeQuestions);
      
      // Update selected result - force a new object reference for React to detect change
      setSelectedResult({ ...updatedResultData });
      
      // Update the result in the results list without refetching all data
      setResults(prevResults => 
        prevResults.map(r => 
          r._id === selectedResult._id ? { ...updatedResultData } : r
        )
      );
      setAllResults(prevAllResults => 
        prevAllResults.map(r => 
          r._id === selectedResult._id ? { ...updatedResultData } : r
        )
      );
      
      setEditingQuestion(null);
      setQuestionData({ questionNumber: '', subtopic: '' });
      
      // Show success notification immediately
      success('Question added successfully!');
      
      // Refresh counts and update UI in background
      if (updatedResultData.studentId) {
        // Get the actual studentId - could be string or object
        const studentId = typeof updatedResultData.studentId === 'string' 
          ? updatedResultData.studentId 
          : updatedResultData.studentId._id || updatedResultData.studentId.toString();
        
        if (studentId) {
          // Refresh counts and update UI
          studentTopicStatusApi.refreshCounts(studentId)
            .then((countResponse) => {
              // Update counts in UI immediately
              if (countResponse.data?.success && countResponse.data.data) {
                // Convert array to grouped format
                const grouped: typeof subtopicCounts = {};
                countResponse.data.data.forEach((status: any) => {
                  if (!grouped[status.subject]) grouped[status.subject] = {};
                  if (!grouped[status.subject][status.topicName]) grouped[status.subject][status.topicName] = {};
                  grouped[status.subject][status.topicName][status.subtopicName] = {
                    negative: status.negativeCount || 0,
                    unattempted: status.unattemptedCount || 0
                  };
                });
                setSubtopicCounts(grouped);
              }
            })
            .catch((err: any) => {
              console.error('Failed to refresh counts:', err);
              // Don't show error - counts will update eventually
            });
        }
      }
    } catch (error: any) {
      console.error('Failed to add question:', error);
      showError('Failed to add question: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
      setSavingButton(null);
    }
  };

  const handleDeleteQuestion = async (type: 'unattempted' | 'negative', subject: string, index: number) => {
    if (!selectedResult) return;
    setDeleteQuestionConfirm({ type, subject, index });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionConfirm || !selectedResult) return;
    const { type, subject, index } = deleteQuestionConfirm;
    setDeleteQuestionConfirm(null);

    setIsSaving(true);
    try {
      const subjectKey = subject.toLowerCase() as 'physics' | 'chemistry' | 'maths';
      const currentData = selectedResult[subjectKey] || {};
      const questions = currentData[`${type}Questions`] || [];
      
      const updatedQuestions = questions.filter((_: any, i: number) => i !== index);

      const updateData = {
        [subjectKey]: {
          ...currentData,
          [`${type}Questions`]: updatedQuestions
        }
      };

      const response = await resultsApi.update(selectedResult._id, updateData);
      const updatedResultData = response.data;
      
      console.log('✅ Delete response:', updatedResultData);
      console.log('✅ Physics negativeQuestions after delete:', updatedResultData.physics?.negativeQuestions);
      
      // Update selected result - force a new object reference for React to detect change
      setSelectedResult({ ...updatedResultData });
      
      // Update the result in the results list without refetching all data
      setResults(prevResults => 
        prevResults.map(r => 
          r._id === selectedResult._id ? { ...updatedResultData } : r
        )
      );
      setAllResults(prevAllResults => 
        prevAllResults.map(r => 
          r._id === selectedResult._id ? { ...updatedResultData } : r
        )
      );
      
      // Show success notification immediately
      success('Question deleted successfully!');
      
      // Refresh counts and update UI in background
      if (updatedResultData.studentId) {
        // Get the actual studentId - could be string or object
        const studentId = typeof updatedResultData.studentId === 'string' 
          ? updatedResultData.studentId 
          : updatedResultData.studentId._id || updatedResultData.studentId.toString();
        
        if (studentId) {
          // Refresh counts and update UI
          studentTopicStatusApi.refreshCounts(studentId)
            .then((countResponse) => {
              // Update counts in UI immediately
              if (countResponse.data?.success && countResponse.data.data) {
                // Convert array to grouped format
                const grouped: typeof subtopicCounts = {};
                countResponse.data.data.forEach((status: any) => {
                  if (!grouped[status.subject]) grouped[status.subject] = {};
                  if (!grouped[status.subject][status.topicName]) grouped[status.subject][status.topicName] = {};
                  grouped[status.subject][status.topicName][status.subtopicName] = {
                    negative: status.negativeCount || 0,
                    unattempted: status.unattemptedCount || 0
                  };
                });
                setSubtopicCounts(grouped);
              }
            })
            .catch((err: any) => {
              console.error('Failed to refresh counts:', err);
              // Don't show error - counts will update eventually
            });
        }
      }
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      showError('Failed to delete question: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading test details...</p>
        </div>
      </div>
    );
  }

  // Debug: Log when selectedResult changes (must be before early returns)
  useEffect(() => {
    if (selectedResult) {
      console.log('🔄 selectedResult updated:', {
        physicsNegative: selectedResult.physics?.negativeQuestions,
        physicsUnattempted: selectedResult.physics?.unattemptedQuestions,
        chemistryNegative: selectedResult.chemistry?.negativeQuestions,
        chemistryUnattempted: selectedResult.chemistry?.unattemptedQuestions,
        mathsNegative: selectedResult.maths?.negativeQuestions,
        mathsUnattempted: selectedResult.maths?.unattemptedQuestions,
      });
    }
  }, [selectedResult]);

  if (!test) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Test not found</p>
            <Link href="/tests">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Memoize subjects to ensure it updates when selectedResult changes
  const subjects = [
    { name: 'Physics', key: 'physics', data: selectedResult?.physics, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/20', borderColor: 'border-blue-200 dark:border-blue-800' },
    { name: 'Chemistry', key: 'chemistry', data: selectedResult?.chemistry, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/20', borderColor: 'border-green-200 dark:border-green-800' },
    { name: 'Mathematics', key: 'maths', data: selectedResult?.maths, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/20', borderColor: 'border-purple-200 dark:border-purple-800' },
  ];

  return (
    <>
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <Link href="/tests">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-foreground">{test.testName}</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(test.testDate)} • Max Marks: {test.maxMarks}
              </p>
            </div>
          </motion.div>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Results</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or roll number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {search && (
                <p className="text-sm text-muted-foreground mb-4">
                  Found {filteredResults.length} result(s) matching &quot;{search}&quot;
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Rank</th>
                      <th className="text-left p-3 font-semibold">Student</th>
                      <th className="text-left p-3 font-semibold">Roll Number</th>
                      <th className="text-right p-3 font-semibold">Score</th>
                      <th className="text-right p-3 font-semibold">Percentage</th>
                      <th className="text-right p-3 font-semibold">Physics</th>
                      <th className="text-right p-3 font-semibold">Chemistry</th>
                      <th className="text-right p-3 font-semibold">Maths</th>
                      <th className="text-center p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(search ? filteredResults : results).map((result, index) => (
                      <motion.tr
                        key={result._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          {result.totals?.rank ? (
                            <Badge variant="default">
                              <CountUp value={result.totals.rank} decimals={0} />
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {result.studentId?.name || 'N/A'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {result.studentId?.rollNumber || 'N/A'}
                        </td>
                        <td className="p-3 text-right font-semibold text-primary">
                          <CountUp value={result.totals?.totalScore || 0} decimals={0} />
                        </td>
                        <td className="p-3 text-right">
                          {formatPercentage(result.totals?.percentage || 0)}
                        </td>
                        <td className="p-3 text-right">
                          <CountUp value={result.physics?.score || 0} decimals={0} />
                        </td>
                        <td className="p-3 text-right">
                          <CountUp value={result.chemistry?.score || 0} decimals={0} />
                        </td>
                        <td className="p-3 text-right">
                          <CountUp value={result.maths?.score || 0} decimals={0} />
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              try {
                                // Fetch full result with populated data
                                const res = await resultsApi.getById(result._id);
                                setSelectedResult(res.data);
                              } catch (error: any) {
                                showError('Failed to load student details: ' + (error.response?.data?.error || error.message));
                              }
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {search && filteredResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No results found matching &quot;{search}&quot;
                </div>
              )}

              {/* Pagination - Only show when not searching */}
              {!search && pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Performance Modal */}
      {selectedResult && (
        <AnimatePresence>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedResult(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-background border-b p-6 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">Test Pattern - JEE MAINS</h2>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Test Date: {selectedResult.testId?.testDate ? formatDate(selectedResult.testId.testDate) : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Student Name: <span className="font-medium text-foreground">{selectedResult.studentId?.name || 'N/A'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Batch: <span className="font-medium text-foreground">{selectedResult.studentId?.batch || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="rounded-lg p-2 hover:bg-muted transition-colors ml-4"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Subtopic Counts Summary */}
                {selectedResult?.studentId && (
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Subtopic Question Counts</CardTitle>
                        {loadingCounts && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total questions by subtopic across all tests for this student
                      </p>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(subtopicCounts).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['Physics', 'Chemistry', 'Mathematics'] as const).map((subject) => {
                            const subjectCounts = subtopicCounts[subject] || {};
                            let totalNegative = 0;
                            let totalUnattempted = 0;
                            
                            Object.values(subjectCounts).forEach((topicCounts) => {
                              Object.values(topicCounts).forEach((counts) => {
                                totalNegative += counts.negative || 0;
                                totalUnattempted += counts.unattempted || 0;
                              });
                            });
                            
                            if (totalNegative === 0 && totalUnattempted === 0) return null;
                            
                            return (
                              <div key={subject} className="p-4 bg-muted rounded-lg border">
                                <h4 className="font-semibold mb-2">{subject}</h4>
                                <div className="space-y-1">
                                  {totalNegative > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {totalNegative} Negative
                                      </Badge>
                                    </div>
                                  )}
                                  {totalUnattempted > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {totalUnattempted} Unattempted
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {loadingCounts ? 'Loading counts...' : 'No question counts available yet'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Overall Performance */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Overall Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-2">Total Score</p>
                        <p className="text-3xl font-bold text-primary">
                          <CountUp value={selectedResult.totals?.totalScore || 0} decimals={0} />
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-2">Total Attempted</p>
                        <p className="text-3xl font-bold">
                          <CountUp value={(selectedResult.totals?.totalCorrect || 0) + (selectedResult.totals?.totalWrong || 0)} decimals={0} />
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-muted-foreground mb-2">Total Negative</p>
                        <p className="text-3xl font-bold text-red-600">
                          <CountUp value={selectedResult.totals?.totalWrong || 0} decimals={0} />
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-muted-foreground mb-2">Total Unattempted</p>
                        <p className="text-3xl font-bold text-yellow-600">
                          <CountUp value={selectedResult.totals?.totalUnattempted || 0} decimals={0} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Subject Breakdown */}
                {subjects.map((subject) => {
                  const subjectData = subject.data || {};
                  const attempted = (subjectData.right || 0) + (subjectData.wrong || 0);
                  const unattempted = subjectData.unattempted || 0;
                  const negative = subjectData.wrong || 0;
                  
                  return (
                    <Card key={`${subject.name}-${selectedResult?._id || 'none'}`} className={`border-2 ${subject.borderColor}`}>
                      <CardHeader className={subject.bgColor}>
                        <CardTitle className={`text-xl ${subject.color}`}>{subject.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-6">
                        {/* Subject Stats Box */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <p className="text-sm text-muted-foreground mb-2">Score</p>
                            <p className="text-2xl font-bold text-primary">
                              <CountUp value={subjectData.score || 0} decimals={0} />
                            </p>
                          </div>
                          <div className="p-4 bg-muted rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-2">Attempted</p>
                            <p className="text-2xl font-bold">
                              <CountUp value={attempted} decimals={0} />
                            </p>
                          </div>
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-muted-foreground mb-2">Unattempted</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              <CountUp value={unattempted} decimals={0} />
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm text-muted-foreground mb-2">Negative</p>
                            <p className="text-2xl font-bold text-red-600">
                              <CountUp value={negative} decimals={0} />
                            </p>
                          </div>
                        </div>

                        {/* Unattempted Questions Box */}
                        <div className="border-2 rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-yellow-600" />
                              <h3 className="font-semibold text-lg">Unattempted Questions</h3>
                              <span className="text-sm text-muted-foreground">(Question Number & Subtopic)</span>
                            </div>
                            {editingQuestion?.type === 'unattempted' && editingQuestion.subject === subject.name ? (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Q No."
                                  value={questionData.questionNumber}
                                  onChange={(e) => setQuestionData({ ...questionData, questionNumber: e.target.value })}
                                  className="w-24"
                                />
                                <SubtopicSelector
                                  subject={subject.name as 'Physics' | 'Chemistry' | 'Mathematics'}
                                  value={questionData.subtopic}
                                  onChange={(value) => {
                                    console.log('📝 Subtopic changed:', value);
                                    setQuestionData({ ...questionData, subtopic: value });
                                  }}
                                  options={(() => {
                                    const subjectKey = subject.name as keyof typeof groupedSubtopics;
                                    const opts = groupedSubtopics[subjectKey] || [];
                                    if (opts.length === 0) {
                                      console.warn(`⚠️ No subtopics found for ${subject.name}. Available subjects:`, Object.keys(groupedSubtopics));
                                    }
                                    return opts;
                                  })()}
                                  subtopicCounts={subtopicCounts[subject.name] || {}}
                                  className="w-64"
                                />
                                <Button
                                  onClick={() => handleAddQuestion('unattempted', subject.name)}
                                  size="sm"
                                  disabled={isSaving}
                                >
                                  {savingButton === `unattempted-${subject.name}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingQuestion(null);
                                    setQuestionData({ questionNumber: '', subtopic: '' });
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setEditingQuestion({ type: 'unattempted', subject: subject.name, index: -1 })}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Question
                              </Button>
                            )}
                          </div>
                          {subjectData.unattemptedQuestions?.length > 0 ? (
                            <div className="space-y-2">
                              {subjectData.unattemptedQuestions.map((q: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-yellow-200 dark:border-yellow-800"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono">
                                      Q{q.questionNumber}
                                    </Badge>
                                    <span className="font-medium">{q.subtopic}</span>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteQuestion('unattempted', subject.name, idx)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No unattempted questions recorded</p>
                          )}
                        </div>

                        {/* Negative Questions Box */}
                        <div className="border-2 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <h3 className="font-semibold text-lg">Negative Questions</h3>
                              <span className="text-sm text-muted-foreground">(Question Number & Subtopic)</span>
                            </div>
                            {editingQuestion?.type === 'negative' && editingQuestion.subject === subject.name ? (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Q No."
                                  value={questionData.questionNumber}
                                  onChange={(e) => setQuestionData({ ...questionData, questionNumber: e.target.value })}
                                  className="w-24"
                                />
                                <SubtopicSelector
                                  subject={subject.name as 'Physics' | 'Chemistry' | 'Mathematics'}
                                  value={questionData.subtopic}
                                  onChange={(value) => {
                                    console.log('📝 Subtopic changed:', value);
                                    setQuestionData({ ...questionData, subtopic: value });
                                  }}
                                  options={(() => {
                                    const subjectKey = subject.name as keyof typeof groupedSubtopics;
                                    const opts = groupedSubtopics[subjectKey] || [];
                                    console.log(`🔍 SubtopicSelector options for ${subject.name} (negative):`, {
                                      subjectKey,
                                      optionsCount: opts.length,
                                      availableKeys: Object.keys(groupedSubtopics),
                                      groupedSubtopicsCounts: {
                                        Physics: groupedSubtopics.Physics?.length || 0,
                                        Chemistry: groupedSubtopics.Chemistry?.length || 0,
                                        Mathematics: groupedSubtopics.Mathematics?.length || 0
                                      }
                                    });
                                    if (opts.length === 0) {
                                      console.warn(`⚠️ No subtopics found for ${subject.name}. Available subjects:`, Object.keys(groupedSubtopics));
                                    }
                                    return opts;
                                  })()}
                                  className="w-64"
                                />
                                <Button
                                  onClick={() => handleAddQuestion('negative', subject.name)}
                                  size="sm"
                                  disabled={isSaving}
                                >
                                  {savingButton === `negative-${subject.name}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingQuestion(null);
                                    setQuestionData({ questionNumber: '', subtopic: '' });
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setEditingQuestion({ type: 'negative', subject: subject.name, index: -1 })}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Question
                              </Button>
                            )}
                          </div>
                          {subjectData.negativeQuestions?.length > 0 ? (
                            <div className="space-y-2">
                              {subjectData.negativeQuestions.map((q: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge variant="destructive" className="font-mono">
                                      Q{q.questionNumber}
                                    </Badge>
                                    <span className="font-medium">{q.subtopic}</span>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteQuestion('negative', subject.name, idx)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No negative questions recorded</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Remarks Section */}
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Remarks
                      </CardTitle>
                      {!isEditingRemarks ? (
                        <Button onClick={() => setIsEditingRemarks(true)} variant="outline" size="sm">
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveRemarks} size="sm" disabled={isSaving}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditingRemarks(false);
                              setRemarks(selectedResult.remarks || '');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingRemarks ? (
                      <Textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter remarks about this test for this student..."
                        rows={6}
                        className="w-full"
                      />
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {remarks || 'No remarks added yet. Click Edit to add remarks.'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Delete Question Confirmation Dialog */}
      <ConfirmDialog
        open={deleteQuestionConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteQuestionConfirm(null);
        }}
        onConfirm={confirmDeleteQuestion}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}
