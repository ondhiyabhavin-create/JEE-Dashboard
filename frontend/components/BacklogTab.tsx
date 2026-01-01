'use client';

import { useState, useEffect } from 'react';
import { backlogApi } from '@/lib/api';

interface BacklogTabProps {
  studentId: string;
}

export default function BacklogTab({ studentId }: BacklogTabProps) {
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [syllabusRes, backlogRes] = await Promise.all([
        backlogApi.getSyllabus(),
        backlogApi.getByStudent(studentId),
      ]);
      setSyllabus(syllabusRes.data);
      setBacklogItems(backlogRes.data);
      setInitialized(backlogRes.data.length > 0);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch backlog data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      await backlogApi.initialize(studentId);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize backlog');
    }
  };

  const handleUpdate = async (item: any, field: string, value: any) => {
    try {
      const updatedItem = { ...item, [field]: value };
      await backlogApi.update(item._id, updatedItem);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update backlog item');
    }
  };

  const getItemForTopic = (topic: string, subtopic: string) => {
    return backlogItems.find(
      (item) => item.topic === topic && item.subtopic === subtopic
    );
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!initialized) {
    return (
      <div>
        <p>Backlog not initialized for this student.</p>
        <button className="btn btn-primary" onClick={handleInitialize}>
          Initialize Backlog
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {syllabus.map((subject) => (
        <div key={subject.topic} className="card" style={{ marginBottom: '20px' }}>
          <h2>{subject.topic}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Subtopic</th>
                <th>Strong</th>
                <th>Weak</th>
                <th>Concept Clear</th>
                <th>Solving Done</th>
                <th>Backlog</th>
              </tr>
            </thead>
            <tbody>
              {subject.subtopics.map((subtopic: string) => {
                const item = getItemForTopic(subject.topic, subtopic);
                if (!item) return null;
                return (
                  <tr key={subtopic}>
                    <td>{subtopic}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isStrong || false}
                        onChange={(e) => handleUpdate(item, 'isStrong', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isWeak || false}
                        onChange={(e) => handleUpdate(item, 'isWeak', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.conceptClear || false}
                        onChange={(e) => handleUpdate(item, 'conceptClear', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.solvingDone || false}
                        onChange={(e) => handleUpdate(item, 'solvingDone', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isBacklog || false}
                        onChange={(e) => handleUpdate(item, 'isBacklog', e.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

