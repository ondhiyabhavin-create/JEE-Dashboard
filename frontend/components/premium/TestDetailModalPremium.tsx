'use client';

import { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, XCircle, Minus, FileText, Edit2, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import CountUp from '@/components/CountUp';
import { formatDate, formatPercentage } from '@/lib/utils';
import { resultsApi, syllabusApi } from '@/lib/api';
import SubtopicSelector from '@/components/SubtopicSelector';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';

interface TestDetailModalPremiumProps {
  result: any;
  student?: any;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function TestDetailModalPremium({ result, student, onClose, onUpdate }: TestDetailModalPremiumProps) {
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarks, setRemarks] = useState(result.remarks || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savingButton, setSavingButton] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ type: string; subject: string; index: number } | null>(null);
  const [questionData, setQuestionData] = useState({ questionNumber: '', subtopic: '' });
  const [currentResult, setCurrentResult] = useState(result);
  const { toasts, success, removeToast } = useToast();
  const [groupedSubtopics, setGroupedSubtopics] = useState<{
    Physics: Array<{ topicName: string; subtopicName: string; _id: string }>;
    Chemistry: Array<{ topicName: string; subtopicName: string; _id: string }>;
    Mathematics: Array<{ topicName: string; subtopicName: string; _id: string }>;
  }>({ Physics: [], Chemistry: [], Mathematics: [] });

  // Update local state when result prop changes
  useEffect(() => {
    setCurrentResult(result);
    setRemarks(result.remarks || '');
  }, [result]);

  // Fetch subtopics on mount
  useEffect(() => {
    const fetchSubtopics = async () => {
      try {
        const response = await syllabusApi.getGroupedSubtopics();
        if (response.data.success) {
          setGroupedSubtopics(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch subtopics:', error);
      }
    };
    fetchSubtopics();
  }, []);

  const subjects = [
    { name: 'Physics', key: 'physics', data: currentResult.physics, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/20', borderColor: 'border-blue-200 dark:border-blue-800' },
    { name: 'Chemistry', key: 'chemistry', data: currentResult.chemistry, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/20', borderColor: 'border-green-200 dark:border-green-800' },
    { name: 'Mathematics', key: 'maths', data: currentResult.maths, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/20', borderColor: 'border-purple-200 dark:border-purple-800' },
  ];

  // Calculate totals from Excel data
  const totalAttempted = (currentResult.totals?.totalCorrect || 0) + (currentResult.totals?.totalWrong || 0);
  const totalUnattempted = currentResult.totals?.totalUnattempted || 0;
  const totalNegative = currentResult.totals?.totalWrong || 0;

  const handleSaveRemarks = async () => {
    setIsSaving(true);
    try {
      const response = await resultsApi.update(currentResult._id, { remarks });
      // Refetch to get the complete updated result
      const updatedResult = await resultsApi.getById(currentResult._id);
      setCurrentResult(updatedResult.data);
      setIsEditingRemarks(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Failed to update remarks:', error);
      alert('Failed to update remarks: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async (type: 'unattempted' | 'negative', subject: string) => {
    if (!questionData.questionNumber || questionData.questionNumber.trim() === '') {
      alert('Please enter a question number');
      return;
    }
    
    if (!questionData.subtopic || questionData.subtopic.trim() === '') {
      alert('Please select a subtopic from the dropdown');
      return;
    }

    // Create unique key for this button
    const buttonKey = `${type}-${subject}`;
    setSavingButton(buttonKey);
    setIsSaving(true);
    
    try {
      const subjectKey = subject.toLowerCase() as 'physics' | 'chemistry' | 'maths';
      const currentData = currentResult[subjectKey] || {};
      const questions = currentData[`${type}Questions`] || [];
      
      const updatedQuestions = [...questions, {
        questionNumber: parseInt(questionData.questionNumber),
        subtopic: questionData.subtopic
      }];

      const updateData = {
        [subjectKey]: {
          ...currentData,
          [`${type}Questions`]: updatedQuestions
        }
      };

      const response = await resultsApi.update(currentResult._id, updateData);
      // Refetch to get the complete updated result
      const updatedResult = await resultsApi.getById(currentResult._id);
      setCurrentResult(updatedResult.data);
      setEditingQuestion(null);
      setQuestionData({ questionNumber: '', subtopic: '' });
      
      // Show success notification
      success('Question added successfully!');
      
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Failed to add question:', error);
      alert('Failed to add question: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
      setSavingButton(null);
    }
  };

  const handleDeleteQuestion = async (type: 'unattempted' | 'negative', subject: string, index: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setIsSaving(true);
    try {
      const subjectKey = subject.toLowerCase() as 'physics' | 'chemistry' | 'maths';
      const currentData = currentResult[subjectKey] || {};
      const questions = currentData[`${type}Questions`] || [];
      
      const updatedQuestions = questions.filter((_: any, i: number) => i !== index);

      const updateData = {
        [subjectKey]: {
          ...currentData,
          [`${type}Questions`]: updatedQuestions
        }
      };

      const response = await resultsApi.update(currentResult._id, updateData);
      // Refetch to get the complete updated result
      const updatedResult = await resultsApi.getById(currentResult._id);
      setCurrentResult(updatedResult.data);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
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
                    Test Date: {currentResult.testId?.testDate ? formatDate(currentResult.testId.testDate) : 'N/A'}
                  </p>
                  {student && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Student Name: <span className="font-medium text-foreground">{student.name || 'N/A'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Batch: <span className="font-medium text-foreground">{student.batch || 'N/A'}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-muted transition-colors ml-4"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Overall Stats Box */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Overall Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">Total Score</p>
                    <p className="text-3xl font-bold text-primary">
                      <CountUp value={currentResult.totals?.totalScore || 0} decimals={0} />
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Total Attempted</p>
                    <p className="text-3xl font-bold">
                      <CountUp value={totalAttempted} decimals={0} />
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-muted-foreground mb-2">Total Negative</p>
                    <p className="text-3xl font-bold text-red-600">
                      <CountUp value={totalNegative} decimals={0} />
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-muted-foreground mb-2">Total Unattempted</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      <CountUp value={totalUnattempted} decimals={0} />
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
                <Card key={subject.name} className={`border-2 ${subject.borderColor}`}>
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
                              onChange={(value) => setQuestionData({ ...questionData, subtopic: value })}
                              options={groupedSubtopics[subject.name as keyof typeof groupedSubtopics] || []}
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
                              onChange={(value) => setQuestionData({ ...questionData, subtopic: value })}
                              options={groupedSubtopics[subject.name as keyof typeof groupedSubtopics] || []}
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
                          setRemarks(currentResult.remarks || '');
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
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AnimatePresence>
  );
}
