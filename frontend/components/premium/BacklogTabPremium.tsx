'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BookOpen, Loader2, AlertCircle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { syllabusApi, studentTopicStatusApi, studentsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';

interface Subtopic {
  _id?: string;
  name?: string;
}

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
  status: 'Good' | 'Medium' | 'Bad' | null;
  theoryCompleted?: boolean;
  solvingCompleted?: boolean;
  negativeCount: number;
  unattemptedCount?: number;
}

interface BacklogTabPremiumProps {
  studentId: string;
}

const statusOptions = ['Good', 'Medium', 'Bad'] as const;

const statusColors = {
  'Good': 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-700 shadow-lg shadow-green-500/30',
  'Medium': 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-yellow-700 shadow-lg shadow-yellow-500/30',
  'Bad': 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-700 shadow-lg shadow-red-500/30',
};

const statusColorsUnselected = {
  'Good': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 hover:shadow-md transition-all',
  'Medium': 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300 hover:shadow-md transition-all',
  'Bad': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 hover:shadow-md transition-all',
};

const statusIcons = {
  'Good': CheckCircle2,
  'Medium': AlertCircle,
  'Bad': XCircle,
};

export default function BacklogTabPremium({ studentId }: BacklogTabPremiumProps) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [statuses, setStatuses] = useState<StudentTopicStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'Good' | 'Medium' | 'Bad' | null>(null);
  const [updatingOverall, setUpdatingOverall] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set()); // Track expanded topics
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [syllabusRes, statusesRes, studentRes] = await Promise.all([
        syllabusApi.getAll(),
        studentTopicStatusApi.getByStudent(studentId),
        studentsApi.getById(studentId),
      ]);
      // Handle response structure
      const syllabusData = Array.isArray(syllabusRes.data) ? syllabusRes.data : (syllabusRes.data?.data || []);
      const statusesData = Array.isArray(statusesRes.data) ? statusesRes.data : (statusesRes.data?.data || []);
      setSyllabus(syllabusData);
      setStatuses(statusesData);
      setOverallStatus(studentRes.data?.overallStatus || null);
    } catch (err: any) {
      console.error('Failed to fetch syllabus data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    subject: string, 
    topicName: string, 
    subtopicName: string, 
    status: string | null,
    theoryCompleted?: boolean,
    solvingCompleted?: boolean
  ) => {
    const updateKey = `${subject}-${topicName}-${subtopicName}`;
    setUpdating(updateKey);
    try {
      await studentTopicStatusApi.update(studentId, {
        subject,
        topicName,
        subtopicName,
        status: status, // Send null to clear, or the status value
        theoryCompleted,
        solvingCompleted,
      });
      showSuccess('Status updated successfully');
      fetchData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusForSubtopic = (subject: string, topicName: string, subtopicName: string): StudentTopicStatus | null => {
    return statuses.find(
      s => s.subject === subject && 
           s.topicName === topicName && 
           s.subtopicName === subtopicName
    ) || null;
  };

  const getStatusForTopic = (subject: string, topicName: string): StudentTopicStatus | null => {
    return statuses.find(
      s => s.subject === subject && 
           s.topicName === topicName && 
           (!s.subtopicName || s.subtopicName === '')
    ) || null;
  };

  const toggleTopicExpansion = (subject: string, topicName: string) => {
    const topicKey = `${subject}-${topicName}`;
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicKey)) {
        newSet.delete(topicKey);
      } else {
        newSet.add(topicKey);
      }
      return newSet;
    });
  };

  const isTopicExpanded = (subject: string, topicName: string): boolean => {
    const topicKey = `${subject}-${topicName}`;
    return expandedTopics.has(topicKey);
  };

  const handleTopicStatusChange = async (
    subject: string, 
    topicName: string, 
    status: string | null,
    theoryCompleted?: boolean,
    solvingCompleted?: boolean
  ) => {
    const updateKey = `${subject}-${topicName}-topic`;
    setUpdating(updateKey);
    try {
      await studentTopicStatusApi.update(studentId, {
        subject,
        topicName,
        subtopicName: '', // Empty for topic-level
        status: status, // Send null to clear, or the status value
        theoryCompleted,
        solvingCompleted,
      });
      showSuccess('Topic status updated successfully');
      fetchData();
    } catch (err: any) {
      console.error('Failed to update topic status:', err);
      showError(err.response?.data?.error || 'Failed to update topic status');
    } finally {
      setUpdating(null);
    }
  };

  const handleOverallStatusChange = async (status: 'Good' | 'Medium' | 'Bad' | null) => {
    setUpdatingOverall(true);
    try {
      await studentsApi.update(studentId, { overallStatus: status });
      setOverallStatus(status);
      showSuccess(`Overall status updated to ${status || 'Not set'}`);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update overall status:', err);
      showError(err.response?.data?.error || 'Failed to update overall status');
    } finally {
      setUpdatingOverall(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Ensure syllabus is an array
  const syllabusArray = Array.isArray(syllabus) ? syllabus : [];

  return (
    <div className="space-y-6">
      {/* Student Overall Status */}
      <Card className="border-2 border-slate-200 shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl text-foreground font-bold">
            <User className="h-6 w-6" />
            Student Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Overall Status Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg text-foreground">Current Status:</span>
                {overallStatus ? (
                  <Badge className={`${statusColors[overallStatus]} font-semibold px-4 py-2 text-base`}>
                    {overallStatus}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg text-foreground">Select Status:</span>
                <div className="flex items-center gap-3">
                  {statusOptions.map((option) => {
                    const Icon = statusIcons[option];
                    const isSelected = overallStatus === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleOverallStatusChange(isSelected ? null : option)}
                        disabled={updatingOverall}
                        className={`
                          flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 transition-all duration-200 min-w-[120px]
                          ${isSelected
                            ? statusColors[option] + ' scale-105 transform'
                            : statusColorsUnselected[option]
                          }
                          ${updatingOverall ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                        `}
                        title={option}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : ''}`} />
                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                          {option}
                        </span>
                      </button>
                    );
                  })}
                  {updatingOverall && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Track topic and subtopic status for this student. Use the status buttons to mark progress.
            <br />
            <span className="text-xs">Manage syllabus structure from the <strong>Syllabus</strong> page in the navbar.</span>
          </p>
        </CardContent>
      </Card>

      {/* Subjects */}
      {syllabusArray.map((subjectItem, subjectIndex) => (
        <motion.div
          key={subjectItem._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: subjectIndex * 0.1 }}
        >
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-2 text-xl text-foreground font-bold">
                <BookOpen className="h-6 w-6" />
                {subjectItem.subject}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Topics */}
              {subjectItem.topics && subjectItem.topics.length > 0 ? (
                subjectItem.topics.map((topic, topicIndex) => (
                  <div key={topic._id || topicIndex} className={topicIndex > 0 ? 'border-t-2 border-slate-200' : ''}>
                    {/* Topic Header with Controls - Matching Subtopic Layout */}
                    <div className="bg-slate-50 border-b-2 border-slate-200">
                      {/* Topic Table Header - Same as Subtopic */}
                      <div className="grid grid-cols-12 gap-2 p-4 border-b-2 bg-white font-semibold text-sm rounded-t-lg">
                        <div className="col-span-3 text-foreground">Topic</div>
                        <div className="col-span-2 text-center text-foreground">Theory</div>
                        <div className="col-span-2 text-center text-foreground">Solving</div>
                        <div className="col-span-2 text-center text-foreground">Status</div>
                        <div className="col-span-3 text-center text-foreground">Actions</div>
                      </div>

                      {/* Topic Row - Matching Subtopic Layout */}
                      {(() => {
                        const topicStatus = getStatusForTopic(subjectItem.subject, topic.name);
                        const topicStatusValue = topicStatus?.status || null;
                        const theoryCompleted = topicStatus?.theoryCompleted || false;
                        const solvingCompleted = topicStatus?.solvingCompleted || false;
                        const updateKey = `${subjectItem.subject}-${topic.name}-topic`;
                        const isUpdating = updating === updateKey;
                        const isExpanded = isTopicExpanded(subjectItem.subject, topic.name);
                        const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                        
                        return (
                          <div className="grid grid-cols-12 gap-2 p-4 hover:bg-slate-50 transition-all duration-200 items-center border-b border-slate-100 bg-white">
                            {/* Topic Name with Expand/Collapse Button */}
                            <div className="col-span-3 font-medium flex items-center gap-2">
                              {hasSubtopics && (
                                <button
                                  onClick={() => toggleTopicExpansion(subjectItem.subject, topic.name)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  title={isExpanded ? 'Collapse subtopics' : 'Expand subtopics'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              )}
                              <span>{topic.name}</span>
                            </div>

                            {/* Theory Completed */}
                            <div className="col-span-2 flex justify-center">
                              <button
                                onClick={() => handleTopicStatusChange(
                                  subjectItem.subject,
                                  topic.name,
                                  topicStatusValue,
                                  !theoryCompleted,
                                  solvingCompleted
                                )}
                                disabled={isUpdating}
                                className={`
                                  px-3 py-2 rounded-lg border-2 transition-all font-semibold text-xs
                                  ${theoryCompleted
                                    ? 'bg-green-500 text-white border-green-600'
                                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                                  }
                                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                              >
                                {theoryCompleted ? '✓' : 'Theory'}
                              </button>
                            </div>

                            {/* Solving Completed */}
                            <div className="col-span-2 flex justify-center">
                              <button
                                onClick={() => handleTopicStatusChange(
                                  subjectItem.subject,
                                  topic.name,
                                  topicStatusValue,
                                  theoryCompleted,
                                  !solvingCompleted
                                )}
                                disabled={isUpdating}
                                className={`
                                  px-3 py-2 rounded-lg border-2 transition-all font-semibold text-xs
                                  ${solvingCompleted
                                    ? 'bg-blue-500 text-white border-blue-600'
                                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                  }
                                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                              >
                                {solvingCompleted ? '✓' : 'Solving'}
                              </button>
                            </div>

                            {/* Status Display */}
                            <div className="col-span-2 flex justify-center">
                              {topicStatusValue ? (
                                <Badge className={`${statusColors[topicStatusValue]} font-semibold px-3 py-1`}>
                                  {topicStatusValue}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Not set</span>
                              )}
                            </div>

                            {/* Status Buttons */}
                            <div className="col-span-3 flex items-center gap-2">
                              {statusOptions.map((option) => {
                                const Icon = statusIcons[option];
                                const isSelected = topicStatusValue === option;
                                return (
                                  <button
                                    key={option}
                                    onClick={() => handleTopicStatusChange(
                                      subjectItem.subject,
                                      topic.name,
                                      isSelected ? null : option,
                                      theoryCompleted,
                                      solvingCompleted
                                    )}
                                    disabled={isUpdating}
                                    className={`
                                      flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 min-w-[70px]
                                      ${isSelected
                                        ? statusColors[option] + ' scale-105 transform'
                                        : statusColorsUnselected[option]
                                      }
                                      ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                    `}
                                    title={option}
                                  >
                                    <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : ''}`} />
                                    <span className={`text-xs font-semibold ${isSelected ? 'text-white' : ''}`}>
                                      {option}
                                    </span>
                                  </button>
                                );
                              })}
                              {isUpdating && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Subtopic Section - Only show when expanded */}
                    {isTopicExpanded(subjectItem.subject, topic.name) && (
                      <>
                        {/* Subtopic Table Header */}
                        <div className="grid grid-cols-12 gap-2 p-4 border-b-2 bg-slate-50 font-semibold text-sm rounded-t-lg">
                          <div className="col-span-3 text-foreground">Subtopic</div>
                          <div className="col-span-2 text-center text-foreground">Theory</div>
                          <div className="col-span-2 text-center text-foreground">Solving</div>
                          <div className="col-span-2 text-center text-foreground">Status</div>
                          <div className="col-span-3 text-center text-foreground">Actions</div>
              </div>

                        {/* Subtopics */}
              <div className="divide-y">
                          {topic.subtopics && topic.subtopics.length > 0 ? (
                        topic.subtopics.map((subtopic, subtopicIndex) => {
                          const status = getStatusForSubtopic(subjectItem.subject, topic.name, subtopic);
                          const currentStatus = status?.status || null;
                          const theoryCompleted = status?.theoryCompleted || false;
                          const solvingCompleted = status?.solvingCompleted || false;
                          const negativeCount = status?.negativeCount || 0;
                          const unattemptedCount = status?.unattemptedCount || 0;
                          const totalCount = negativeCount + unattemptedCount;
                          const updateKey = `${subjectItem.subject}-${topic.name}-${subtopic}`;
                          const isUpdating = updating === updateKey;

                  return (
                    <motion.div
                              key={subtopicIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subtopicIndex * 0.03 }}
                              className="grid grid-cols-12 gap-2 p-4 hover:bg-slate-50 transition-all duration-200 items-center border-b border-slate-100 last:border-b-0"
                    >
                      {/* Subtopic Name */}
                      <div className="col-span-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{subtopic}</span>
                          {totalCount > 0 && (
                            <div className="flex items-center gap-1">
                              {negativeCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {negativeCount}N
                                </Badge>
                              )}
                              {unattemptedCount > 0 && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                  {unattemptedCount}U
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                              {/* Theory Completed */}
                              <div className="col-span-2 flex justify-center">
                        <button
                                  onClick={() => handleStatusChange(
                                    subjectItem.subject,
                                    topic.name,
                                    subtopic,
                                    currentStatus,
                                    !theoryCompleted,
                                    solvingCompleted
                                  )}
                          disabled={isUpdating}
                                  className={`
                                    px-3 py-2 rounded-lg border-2 transition-all font-semibold text-xs
                                    ${theoryCompleted
                                      ? 'bg-green-500 text-white border-green-600'
                                      : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                                    }
                                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  `}
                                >
                                  {theoryCompleted ? '✓' : 'Theory'}
                        </button>
                      </div>

                              {/* Solving Completed */}
                              <div className="col-span-2 flex justify-center">
                        <button
                                  onClick={() => handleStatusChange(
                                    subjectItem.subject,
                                    topic.name,
                                    subtopic,
                                    currentStatus,
                                    theoryCompleted,
                                    !solvingCompleted
                                  )}
                          disabled={isUpdating}
                                  className={`
                                    px-3 py-2 rounded-lg border-2 transition-all font-semibold text-xs
                                    ${solvingCompleted
                                      ? 'bg-blue-500 text-white border-blue-600'
                                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                    }
                                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  `}
                                >
                                  {solvingCompleted ? '✓' : 'Solving'}
                        </button>
                      </div>

                              {/* Status Display */}
                              <div className="col-span-2 flex justify-center">
                                {currentStatus ? (
                                  <Badge className={`${statusColors[currentStatus]} font-semibold px-3 py-1`}>
                                    {currentStatus}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground italic">Not set</span>
                                )}
                      </div>

                              {/* Status Buttons */}
                              <div className="col-span-3 flex items-center gap-2">
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
                                        isSelected ? null : option,
                                        theoryCompleted,
                                        solvingCompleted
                                      )}
                          disabled={isUpdating}
                                      className={`
                                        flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 min-w-[70px]
                                        ${isSelected
                                          ? statusColors[option] + ' scale-105 transform'
                                          : statusColorsUnselected[option]
                                        }
                                        ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                      `}
                                      title={option}
                                    >
                                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : ''}`} />
                                      <span className={`text-xs font-semibold ${isSelected ? 'text-white' : ''}`}>
                                        {option}
                                      </span>
                                    </button>
                                  );
                                })}
                                {isUpdating && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
                                )}
                            </div>
                            </motion.div>
                          );
                        })
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No subtopics yet
                            </div>
                          )}
                      </div>
                      </>
                        )}
                      </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No topics yet for this subject
              </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {syllabusArray.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No syllabus data available. Please add topics and subtopics.</p>
        </CardContent>
      </Card>
      )}


    </div>
  );
}
