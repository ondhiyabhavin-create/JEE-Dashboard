'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XCircle, AlertCircle, BookOpen, TrendingDown } from 'lucide-react';
import { syllabusApi, studentTopicStatusApi, questionRecordsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';

interface Topic {
  _id: string;
  name: string;
  subtopics: string[];
}

interface SyllabusItem {
  _id: string;
  subject: string;
  topics: Topic[];
  order: number;
}

interface StudentTopicStatus {
  _id: string;
  subject: string;
  topicName: string;
  subtopicName: string;
  negativeCount: number;
  unattemptedCount?: number;
}

interface QuestionRecord {
  _id: string;
  studentId: string;
  testId: {
    _id: string;
    testName: string;
    testDate: string;
  };
  subject: string;
  type: 'negative' | 'unattempted';
  questionNumber: number;
  subtopic: string;
}

interface NegativeUnattemptedTabProps {
  studentId: string;
}

export default function NegativeUnattemptedTab({ studentId }: NegativeUnattemptedTabProps) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [statuses, setStatuses] = useState<StudentTopicStatus[]>([]);
  const [questionRecords, setQuestionRecords] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'negative' | 'unattempted' | 'all'>('all');
  const { toasts, error: showError, removeToast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [syllabusRes, statusesRes, questionsRes] = await Promise.all([
        syllabusApi.getAll(),
        studentTopicStatusApi.getByStudent(studentId),
        questionRecordsApi.getByStudent(studentId),
      ]);
      
      // Handle response structure
      const syllabusData = Array.isArray(syllabusRes.data) ? syllabusRes.data : (syllabusRes.data?.data || []);
      const statusesData = Array.isArray(statusesRes.data) ? statusesRes.data : (statusesRes.data?.data || []);
      const questionsData = questionsRes.data?.success ? (questionsRes.data.data || []) : [];
      
      setSyllabus(syllabusData);
      setStatuses(statusesData);
      setQuestionRecords(questionsData);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      showError('Failed to load negative/unattempted data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusForSubtopic = (subject: string, topicName: string, subtopicName: string): StudentTopicStatus | null => {
    return statuses.find(
      s => s.subject === subject && s.topicName === topicName && s.subtopicName === subtopicName
    ) || null;
  };

  const getQuestionsForSubtopic = (subject: string, subtopicName: string, type: 'negative' | 'unattempted') => {
    const questions: Array<{ testName: string; testDate: string; questionNumber: number }> = [];
    
    questionRecords.forEach(record => {
      if (record.subject === subject && 
          record.type === type && 
          record.subtopic && 
          record.subtopic.trim() === subtopicName.trim()) {
        const testId = record.testId;
        questions.push({
          testName: (typeof testId === 'object' && testId?.testName) ? testId.testName : 'Unknown Test',
          testDate: (typeof testId === 'object' && testId?.testDate) ? testId.testDate : '',
          questionNumber: record.questionNumber
        });
      }
    });
    
    return questions;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading negative and unattempted questions...</p>
      </div>
    );
  }

  // Filter statuses based on active view
  const filteredStatuses = statuses.filter(status => {
    if (activeView === 'negative') return status.negativeCount > 0;
    if (activeView === 'unattempted') return (status.unattemptedCount || 0) > 0;
    return (status.negativeCount > 0) || ((status.unattemptedCount || 0) > 0);
  });

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Negative & Unattempted Questions Backlog
            </CardTitle>
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'negative' | 'unattempted' | 'all')}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="negative">
                  <XCircle className="h-4 w-4 mr-1" />
                  Negative
                </TabsTrigger>
                <TabsTrigger value="unattempted">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Unattempted
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Negative</p>
                <p className="text-2xl font-bold text-red-600">
                  {statuses.reduce((sum, s) => sum + s.negativeCount, 0)}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Unattempted</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statuses.reduce((sum, s) => sum + (s.unattemptedCount || 0), 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subtopics</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredStatuses.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects */}
      {(['Physics', 'Chemistry', 'Mathematics'] as const).map((subject) => {
        const subjectItem = syllabus.find(s => s.subject === subject);
        if (!subjectItem) return null;

        // Get all subtopics with counts for this subject
        const subjectStatuses = filteredStatuses.filter(s => s.subject === subject);
        if (subjectStatuses.length === 0) return null;

        return (
          <Card key={subject}>
            <CardHeader>
              <CardTitle>{subject}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectItem.topics.map((topic) => {
                  // Get subtopics for this topic that have counts
                  const topicStatuses = subjectStatuses.filter(s => s.topicName === topic.name);
                  if (topicStatuses.length === 0) return null;

                  return (
                    <div key={topic._id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-lg">{topic.name}</h4>
                      <div className="space-y-3">
                        {topicStatuses.map((status) => {
                          const negativeQuestions = getQuestionsForSubtopic(subject, status.subtopicName, 'negative');
                          const unattemptedQuestions = getQuestionsForSubtopic(subject, status.subtopicName, 'unattempted');

                          return (
                            <motion.div
                              key={status._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h5 className="font-medium text-base mb-2">{status.subtopicName}</h5>
                                  <div className="flex items-center gap-3">
                                    {status.negativeCount > 0 && (
                                      <Badge variant="destructive" className="text-sm px-2 py-1">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {status.negativeCount} Negative
                                      </Badge>
                                    )}
                                    {(status.unattemptedCount || 0) > 0 && (
                                      <Badge variant="outline" className="text-sm px-2 py-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {status.unattemptedCount} Unattempted
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Show questions details */}
                              {(negativeQuestions.length > 0 || unattemptedQuestions.length > 0) && (
                                <div className="mt-3 space-y-2">
                                  {negativeQuestions.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-red-600 mb-1">Negative Questions:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {negativeQuestions.map((q, idx) => (
                                          <Badge key={idx} variant="destructive" className="text-xs">
                                            {q.testName} - Q{q.questionNumber}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {unattemptedQuestions.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-yellow-600 mb-1">Unattempted Questions:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {unattemptedQuestions.map((q, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                            {q.testName} - Q{q.questionNumber}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filteredStatuses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {activeView === 'all' 
                ? 'No negative or unattempted questions found'
                : activeView === 'negative'
                ? 'No negative questions found'
                : 'No unattempted questions found'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Questions will appear here once you mark them as negative or unattempted in test results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

