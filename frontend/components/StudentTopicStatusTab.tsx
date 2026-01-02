'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, BookOpen, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { syllabusApi, studentTopicStatusApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';

interface Topic {
  _id: string;
  name: string;
  subtopics: string[]; // Array of subtopic strings from Syllabus
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
  status: 'Good' | 'Medium' | 'Bad' | 'Conceptual Backlog' | 'Solving Backlog' | null;
  negativeCount: number;
  unattemptedCount?: number;
}

interface StudentTopicStatusTabProps {
  studentId: string;
}

const statusOptions = ['Good', 'Medium', 'Bad', 'Conceptual Backlog', 'Solving Backlog'] as const;

const statusColors = {
  'Good': 'bg-green-100 text-green-800 border-green-300',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Bad': 'bg-red-100 text-red-800 border-red-300',
  'Conceptual Backlog': 'bg-blue-100 text-blue-800 border-blue-300',
  'Solving Backlog': 'bg-purple-100 text-purple-800 border-purple-300',
};

const statusIcons = {
  'Good': CheckCircle2,
  'Medium': AlertCircle,
  'Bad': XCircle,
  'Conceptual Backlog': BookOpen,
  'Solving Backlog': TrendingDown,
};

export default function StudentTopicStatusTab({ studentId }: StudentTopicStatusTabProps) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [statuses, setStatuses] = useState<StudentTopicStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, error: showError, removeToast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [syllabusRes, statusesRes] = await Promise.all([
        syllabusApi.getAll(),
        studentTopicStatusApi.getByStudent(studentId),
      ]);
      // Handle response structure
      const syllabusData = Array.isArray(syllabusRes.data) ? syllabusRes.data : (syllabusRes.data?.data || []);
      const statusesData = Array.isArray(statusesRes.data) ? statusesRes.data : (statusesRes.data?.data || []);
      setSyllabus(syllabusData);
      setStatuses(statusesData);
    } catch (err: any) {
      console.error('Failed to fetch topic data:', err);
      showError('Failed to load topic status data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (subject: string, topicName: string, subtopicName: string, status: string | null) => {
    try {
      await studentTopicStatusApi.update(studentId, {
        subject,
        topicName,
        subtopicName,
        status: status || undefined,
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusForSubtopic = (subject: string, topicName: string, subtopicName: string): StudentTopicStatus | null => {
    return statuses.find(
      s => s.subject === subject && s.topicName === topicName && s.subtopicName === subtopicName
    ) || null;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(['Physics', 'Chemistry', 'Mathematics'] as const).map((subject) => {
        const subjectItem = syllabus.find(s => s.subject === subject);
        if (!subjectItem) return null;

        return (
          <Card key={subject}>
            <CardHeader>
              <CardTitle>{subject}</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectItem.topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics added yet</p>
              ) : (
                <div className="space-y-4">
                  {subjectItem.topics.map((topic) => (
                    <div key={topic._id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">{topic.name}</h4>
                      {topic.subtopics.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subtopics yet</p>
                      ) : (
                        <div className="space-y-2">
                          {topic.subtopics.map((subtopic, index) => {
                            const status = getStatusForSubtopic(subjectItem.subject, topic.name, subtopic);
                            const currentStatus = status?.status || null;
                            const negativeCount = status?.negativeCount || 0;
                            const unattemptedCount = status?.unattemptedCount || 0;
                            const totalCount = negativeCount + unattemptedCount;

                            return (
                              <div
                                key={`${topic._id}-${index}`}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">{subtopic}</span>
                                    {totalCount > 0 && (
                                      <div className="flex items-center gap-2">
                                        {negativeCount > 0 && (
                                          <Badge variant="destructive" className="text-xs">
                                            {negativeCount} negative
                                          </Badge>
                                        )}
                                        {unattemptedCount > 0 && (
                                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                            {unattemptedCount} unattempted
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {statusOptions.map((option) => {
                                    const Icon = statusIcons[option];
                                    const isSelected = currentStatus === option;
                                    return (
                                      <button
                                        key={option}
                                        onClick={() => handleStatusChange(
                                          subjectItem.subject,
                                          topic.name,
                                          subtopic,
                                          isSelected ? null : option
                                        )}
                                        className={`
                                          p-2 rounded-lg border-2 transition-all
                                          ${isSelected
                                            ? statusColors[option] + ' border-current'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                          }
                                        `}
                                        title={option}
                                      >
                                        <Icon className={`h-4 w-4 ${isSelected ? '' : 'text-slate-400'}`} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

