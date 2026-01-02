'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { syllabusApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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

interface TopicManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TopicManagementModal({ open, onOpenChange }: TopicManagementModalProps) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  
  // New subject/topic/subtopic form states
  const [newSubject, setNewSubject] = useState({ subject: 'Physics' });
  const [newTopic, setNewTopic] = useState<{ [subjectId: string]: string }>({});
  const [newSubtopic, setNewSubtopic] = useState<{ [subjectId: string]: { [topicId: string]: string } }>({});
  const { toasts, success: showSuccess, error: showError, warning: showWarning, removeToast } = useToast();
  const [deleteSubtopicConfirm, setDeleteSubtopicConfirm] = useState<{ subjectId: string; topicId: string; subtopic: string } | null>(null);
  const [deleteTopicConfirm, setDeleteTopicConfirm] = useState<{ subjectId: string; topicId: string } | null>(null);

  useEffect(() => {
    if (open) {
      fetchSyllabus();
      // Expand all subjects by default
      fetchSyllabus().then(() => {
        const allSubjectIds = syllabus.map(s => s._id);
        setExpandedSubjects(new Set(allSubjectIds));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const response = await syllabusApi.getAll();
      const syllabusData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSyllabus(syllabusData);
      return syllabusData;
    } catch (err: any) {
      console.error('Failed to fetch syllabus:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    // Check if subject already exists
    const exists = syllabus.find(s => s.subject === newSubject.subject);
    if (exists) {
      showWarning('This subject already exists');
      return;
    }

    try {
      await syllabusApi.create({
        subject: newSubject.subject,
        topics: [],
        order: syllabus.length
      });
      setNewSubject({ subject: 'Physics' });
      const updated = await fetchSyllabus();
      // Expand the newly created subject
      const newSubjectItem = updated.find((s: SyllabusItem) => s.subject === newSubject.subject);
      if (newSubjectItem) {
        setExpandedSubjects(prev => new Set([...Array.from(prev), newSubjectItem._id]));
      }
    } catch (err: any) {
      console.error('Failed to create subject:', err);
      showError(err.response?.data?.error || 'Failed to create subject');
    }
  };

  const handleAddTopic = async (subjectId: string) => {
    const topicName = newTopic[subjectId]?.trim();
    if (!topicName) return;

    try {
      await syllabusApi.addTopic(subjectId, { name: topicName, subtopics: [] });
      setNewTopic(prev => ({ ...prev, [subjectId]: '' }));
      fetchSyllabus();
    } catch (err: any) {
      console.error('Failed to add topic:', err);
      showError(err.response?.data?.error || 'Failed to add topic');
    }
  };

  const handleAddSubtopic = async (subjectId: string, topicId: string) => {
    const subtopicName = newSubtopic[subjectId]?.[topicId]?.trim();
    if (!subtopicName) return;

    try {
      await syllabusApi.addSubtopic(subjectId, topicId, subtopicName);
      setNewSubtopic(prev => ({
        ...prev,
        [subjectId]: { ...prev[subjectId], [topicId]: '' }
      }));
      fetchSyllabus();
    } catch (err: any) {
      console.error('Failed to add subtopic:', err);
      showError(err.response?.data?.error || 'Failed to add subtopic');
    }
  };

  const handleDeleteSubtopic = async (subjectId: string, topicId: string, subtopic: string) => {
    setDeleteSubtopicConfirm({ subjectId, topicId, subtopic });
  };

  const confirmDeleteSubtopic = async () => {
    if (!deleteSubtopicConfirm) return;
    const { subjectId, topicId, subtopic } = deleteSubtopicConfirm;
    setDeleteSubtopicConfirm(null);

    try {
      await syllabusApi.removeSubtopic(subjectId, topicId, subtopic);
      fetchSyllabus();
      showSuccess('Subtopic deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete subtopic:', err);
      showError(err.response?.data?.error || 'Failed to delete subtopic');
    }
  };

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    setDeleteTopicConfirm({ subjectId, topicId });
  };

  const confirmDeleteTopic = async () => {
    if (!deleteTopicConfirm) return;
    const { subjectId, topicId } = deleteTopicConfirm;
    setDeleteTopicConfirm(null);

    try {
      await syllabusApi.deleteTopic(subjectId, topicId);
      fetchSyllabus();
      showSuccess('Topic deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete topic:', err);
      showError(err.response?.data?.error || 'Failed to delete topic');
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const toggleTopic = (topicKey: string) => {
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

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold">Syllabus Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Design and manage your syllabus structure. This will be used for all students&apos; backlog tracking.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Add New Subject */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Subject</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <select
                        value={newSubject.subject}
                        onChange={(e) => setNewSubject({ subject: e.target.value })}
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm flex-1"
                      >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                      </select>
                      <Button onClick={handleCreateSubject}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Subject
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Subjects List */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syllabus.length === 0 ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No subjects added yet. Create your first subject above.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      syllabus.map((subjectItem) => (
                        <Card key={subjectItem._id} className="border-2">
                          <CardHeader className="bg-muted/50 pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleSubject(subjectItem._id)}
                                >
                                  {expandedSubjects.has(subjectItem._id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                <CardTitle className="text-xl">{subjectItem.subject}</CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          {expandedSubjects.has(subjectItem._id) && (
                            <CardContent className="pt-4 space-y-4">
                              {/* Add Topic */}
                              <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border">
                                <Input
                                  placeholder="Topic Name (e.g., Mechanics, Thermodynamics)"
                                  value={newTopic[subjectItem._id] || ''}
                                  onChange={(e) => setNewTopic(prev => ({ ...prev, [subjectItem._id]: e.target.value }))}
                                  className="flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddTopic(subjectItem._id);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  onClick={() => handleAddTopic(subjectItem._id)}
                                  size="sm"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Topic
                                </Button>
                              </div>

                              {/* Topics List */}
                              <div className="space-y-3">
                                {subjectItem.topics && subjectItem.topics.length > 0 ? (
                                  subjectItem.topics.map((topic) => {
                                    const topicKey = `${subjectItem._id}-${topic._id}`;
                                    return (
                                      <div key={topic._id} className="border rounded-lg p-4 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2 flex-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => toggleTopic(topicKey)}
                                            >
                                              {expandedTopics.has(topicKey) ? (
                                                <ChevronDown className="h-3 w-3" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3" />
                                              )}
                                            </Button>
                                            <span className="font-semibold text-base">{topic.name}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteTopic(subjectItem._id, topic._id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        {expandedTopics.has(topicKey) && (
                                          <div className="pl-7 space-y-3">
                                            {/* Add Subtopic */}
                                            <div className="flex gap-2">
                                              <Input
                                                placeholder="Subtopic Name (e.g., Laws of Motion, Work & Energy)"
                                                value={newSubtopic[subjectItem._id]?.[topic._id] || ''}
                                                onChange={(e) => setNewSubtopic(prev => ({
                                                  ...prev,
                                                  [subjectItem._id]: {
                                                    ...prev[subjectItem._id],
                                                    [topic._id]: e.target.value
                                                  }
                                                }))}
                                                className="flex-1"
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddSubtopic(subjectItem._id, topic._id);
                                                  }
                                                }}
                                              />
                                              <Button
                                                type="button"
                                                onClick={() => handleAddSubtopic(subjectItem._id, topic._id)}
                                                size="sm"
                                              >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Subtopic
                                              </Button>
                                            </div>

                                            {/* Subtopics List */}
                                            <div className="space-y-1">
                                              {topic.subtopics && topic.subtopics.length > 0 ? (
                                                topic.subtopics.map((subtopic, idx) => (
                                                  <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border"
                                                  >
                                                    <span className="text-sm">{subtopic}</span>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                      onClick={() => handleDeleteSubtopic(subjectItem._id, topic._id, subtopic)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-sm text-muted-foreground pl-2">No subtopics yet. Add one above.</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">No topics yet. Add a topic above.</p>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Delete Subtopic Confirmation Dialog */}
      <ConfirmDialog
        open={deleteSubtopicConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSubtopicConfirm(null);
        }}
        onConfirm={confirmDeleteSubtopic}
        title="Delete Subtopic"
        message={`Are you sure you want to delete the subtopic "${deleteSubtopicConfirm?.subtopic}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
      
      {/* Delete Topic Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTopicConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTopicConfirm(null);
        }}
        onConfirm={confirmDeleteTopic}
        title="Delete Topic"
        message="Are you sure you want to delete this topic? All subtopics will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </AnimatePresence>
  );
}
