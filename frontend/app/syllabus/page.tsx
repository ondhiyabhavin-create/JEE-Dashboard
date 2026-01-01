'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { syllabusApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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

export default function SyllabusPage() {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  
  // New subject/topic/subtopic form states
  const [newSubject, setNewSubject] = useState({ subject: 'Physics' });
  const [newTopic, setNewTopic] = useState<{ [subjectId: string]: string }>({});
  const [newSubtopic, setNewSubtopic] = useState<{ [subjectId: string]: { [topicId: string]: string } }>({});
  
  // Confirmation dialog states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  
  // Delete confirmation dialogs
  const [deleteSubtopicConfirm, setDeleteSubtopicConfirm] = useState<{ open: boolean; subjectId?: string; topicId?: string; subtopic?: string }>({ open: false });
  const [deleteTopicConfirm, setDeleteTopicConfirm] = useState<{ open: boolean; subjectId?: string; topicId?: string }>({ open: false });
  
  // Toast notifications
  const { toasts, success, error, removeToast } = useToast();

  useEffect(() => {
    fetchSyllabus();
  }, []);

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const response = await syllabusApi.getAll();
      const syllabusData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSyllabus(syllabusData);
      // Expand all subjects by default
      setExpandedSubjects(new Set(syllabusData.map((s: SyllabusItem) => s._id)));
    } catch (err: any) {
      console.error('Failed to fetch syllabus:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    // Check if subject already exists
    const exists = syllabus.find(s => s.subject === newSubject.subject);
    if (exists) {
      error('This subject already exists');
      return;
    }

    try {
      const subjectName = newSubject.subject;
      const response = await syllabusApi.create({
        subject: subjectName,
        topics: [],
        order: syllabus.length
      });
      
      // Get the created subject with its ID from the response
      const createdSubject = response.data;
      setNewSubject({ subject: 'Physics' });
      
      // Refresh the syllabus list to get the updated data
      await fetchSyllabus();
      
      // Expand the newly created subject using the ID from response
      if (createdSubject && createdSubject._id) {
        setExpandedSubjects(prev => new Set([...Array.from(prev), createdSubject._id]));
      }
      
      success(`${subjectName} subject created successfully`);
    } catch (err: any) {
      console.error('Failed to create subject:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create subject';
      error(errorMsg);
    }
  };

  const handleAddTopic = async (subjectId: string) => {
    if (!subjectId) {
      error('Subject ID is missing. Please refresh the page.');
      return;
    }

    const topicName = newTopic[subjectId]?.trim();
    if (!topicName) {
      error('Please enter a topic name');
      return;
    }

    try {
      await syllabusApi.addTopic(subjectId, { name: topicName, subtopics: [] });
      setNewTopic(prev => ({ ...prev, [subjectId]: '' }));
      await fetchSyllabus();
      success(`Topic "${topicName}" added successfully`);
    } catch (err: any) {
      console.error('Failed to add topic:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to add topic';
      error(errorMsg);
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
      await fetchSyllabus();
      success(`Subtopic "${subtopicName}" added successfully`);
    } catch (err: any) {
      console.error('Failed to add subtopic:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to add subtopic';
      error(errorMsg);
    }
  };

  const handleDeleteSubtopic = (subjectId: string, topicId: string, subtopic: string) => {
    setDeleteSubtopicConfirm({ open: true, subjectId, topicId, subtopic });
  };

  const confirmDeleteSubtopic = async () => {
    if (!deleteSubtopicConfirm.subjectId || !deleteSubtopicConfirm.topicId || !deleteSubtopicConfirm.subtopic) return;

    try {
      await syllabusApi.removeSubtopic(deleteSubtopicConfirm.subjectId, deleteSubtopicConfirm.topicId, deleteSubtopicConfirm.subtopic);
      await fetchSyllabus();
      success('Subtopic deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete subtopic:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete subtopic';
      error(errorMsg);
    } finally {
      setDeleteSubtopicConfirm({ open: false });
    }
  };

  const handleDeleteTopic = (subjectId: string, topicId: string) => {
    setDeleteTopicConfirm({ open: true, subjectId, topicId });
  };

  const confirmDeleteTopic = async () => {
    if (!deleteTopicConfirm.subjectId || !deleteTopicConfirm.topicId) return;

    try {
      await syllabusApi.deleteTopic(deleteTopicConfirm.subjectId, deleteTopicConfirm.topicId);
      await fetchSyllabus();
      success('Topic deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete topic:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete topic';
      error(errorMsg);
    } finally {
      setDeleteTopicConfirm({ open: false });
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handleFirstConfirm = () => {
    setShowClearConfirm(false);
    setShowFinalConfirm(true);
  };

  const handleFinalConfirm = async () => {
    setShowFinalConfirm(false);
    setLoading(true);
    try {
      // Delete all syllabus data at once using the deleteAll endpoint
      await syllabusApi.deleteAll();
      // Refresh the syllabus list
      await fetchSyllabus();
      success('All syllabus data cleared successfully');
    } catch (err: any) {
      console.error('Failed to clear all data:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to clear all data';
      error(errorMsg);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Syllabus Management</h1>
            <p className="text-muted-foreground">
              Design and manage your syllabus structure. This will be used for all students&apos; backlog tracking.
            </p>
          </div>
          {syllabus.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Clear All Data
            </Button>
          )}
        </motion.div>

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
                              e.stopPropagation();
                              if (subjectItem._id) {
                                handleAddTopic(subjectItem._id);
                              } else {
                                error('Subject ID is missing. Please refresh the page.');
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (subjectItem._id) {
                              handleAddTopic(subjectItem._id);
                            } else {
                              error('Subject ID is missing. Please refresh the page.');
                            }
                          }}
                          size="sm"
                          disabled={loading || !subjectItem._id}
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

      {/* Clear All Confirmation Dialogs */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="⚠️ Warning"
        message="This will delete ALL syllabus data (all subjects, topics, and subtopics). This action cannot be undone. Are you absolutely sure?"
        confirmText="Yes, Continue"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleFirstConfirm}
      />

      <ConfirmDialog
        open={showFinalConfirm}
        onOpenChange={setShowFinalConfirm}
        title="⚠️ Final Confirmation"
        message="This is your last chance. Delete all syllabus data?"
        confirmText="Yes, Delete All"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleFinalConfirm}
      />

      {/* Delete Subtopic Confirmation */}
      <ConfirmDialog
        open={deleteSubtopicConfirm.open}
        onOpenChange={(open) => setDeleteSubtopicConfirm({ open, subjectId: undefined, topicId: undefined, subtopic: undefined })}
        title="Delete Subtopic"
        message={`Are you sure you want to delete the subtopic "${deleteSubtopicConfirm.subtopic}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteSubtopic}
      />

      {/* Delete Topic Confirmation */}
      <ConfirmDialog
        open={deleteTopicConfirm.open}
        onOpenChange={(open) => setDeleteTopicConfirm({ open, subjectId: undefined, topicId: undefined })}
        title="Delete Topic"
        message="Are you sure you want to delete this topic? All subtopics will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteTopic}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
