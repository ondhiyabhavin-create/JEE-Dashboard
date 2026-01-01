'use client';

import { useState, useEffect } from 'react';
import { resultsApi } from '@/lib/api';

interface TestDetailModalProps {
  result: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TestDetailModal({ result, onClose, onUpdate }: TestDetailModalProps) {
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (result) {
      setFormData({
        physics: result.physics || {},
        chemistry: result.chemistry || {},
        maths: result.maths || {},
        remarks: result.remarks || '',
      });
    }
  }, [result]);

  if (!formData) {
    return null;
  }

  const handleSubjectChange = (subject: string, field: string, value: any) => {
    setFormData({
      ...formData,
      [subject]: {
        ...formData[subject],
        [field]: value,
      },
    });
  };

  const handleQuestionAdd = (subject: string, type: 'unattemptedQuestions' | 'negativeQuestions') => {
    const questions = formData[subject][type] || [];
    handleSubjectChange(subject, type, [
      ...questions,
      { questionNumber: 0, subtopic: '' },
    ]);
  };

  const handleQuestionUpdate = (
    subject: string,
    type: 'unattemptedQuestions' | 'negativeQuestions',
    index: number,
    field: string,
    value: any
  ) => {
    const questions = [...(formData[subject][type] || [])];
    questions[index] = { ...questions[index], [field]: value };
    handleSubjectChange(subject, type, questions);
  };

  const handleQuestionRemove = (
    subject: string,
    type: 'unattemptedQuestions' | 'negativeQuestions',
    index: number
  ) => {
    const questions = formData[subject][type] || [];
    handleSubjectChange(subject, type, questions.filter((_: any, i: number) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await resultsApi.update(result._id, formData);
      setMessage({ type: 'success', text: 'Test result updated successfully' });
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update result' });
    } finally {
      setLoading(false);
    }
  };

  const renderSubjectSection = (subject: string, label: string) => {
    const subjectData = formData[subject] || {};
    return (
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>{label}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Right</label>
            <input
              type="number"
              className="input"
              value={subjectData.right || 0}
              onChange={(e) => handleSubjectChange(subject, 'right', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Wrong</label>
            <input
              type="number"
              className="input"
              value={subjectData.wrong || 0}
              onChange={(e) => handleSubjectChange(subject, 'wrong', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Unattempted</label>
            <input
              type="number"
              className="input"
              value={subjectData.unattempted || 0}
              onChange={(e) => handleSubjectChange(subject, 'unattempted', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Score</label>
            <input
              type="number"
              className="input"
              value={subjectData.score || 0}
              onChange={(e) => handleSubjectChange(subject, 'score', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4>Unattempted Questions</h4>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => handleQuestionAdd(subject, 'unattemptedQuestions')}
            >
              Add Question
            </button>
          </div>
          {(subjectData.unattemptedQuestions || []).map((q: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="number"
                className="input"
                placeholder="Question Number"
                value={q.questionNumber || ''}
                onChange={(e) => handleQuestionUpdate(subject, 'unattemptedQuestions', idx, 'questionNumber', parseInt(e.target.value) || 0)}
                style={{ width: '150px' }}
              />
              <input
                type="text"
                className="input"
                placeholder="Subtopic"
                value={q.subtopic || ''}
                onChange={(e) => handleQuestionUpdate(subject, 'unattemptedQuestions', idx, 'subtopic', e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => handleQuestionRemove(subject, 'unattemptedQuestions', idx)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4>Negative Questions</h4>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => handleQuestionAdd(subject, 'negativeQuestions')}
            >
              Add Question
            </button>
          </div>
          {(subjectData.negativeQuestions || []).map((q: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="number"
                className="input"
                placeholder="Question Number"
                value={q.questionNumber || ''}
                onChange={(e) => handleQuestionUpdate(subject, 'negativeQuestions', idx, 'questionNumber', parseInt(e.target.value) || 0)}
                style={{ width: '150px' }}
              />
              <input
                type="text"
                className="input"
                placeholder="Subtopic"
                value={q.subtopic || ''}
                onChange={(e) => handleQuestionUpdate(subject, 'negativeQuestions', idx, 'subtopic', e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => handleQuestionRemove(subject, 'negativeQuestions', idx)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{result.testId?.testName || 'Test Details'}</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            Close
          </button>
        </div>

        {message && (
          <div className={message.type === 'success' ? 'success' : 'error'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {renderSubjectSection('physics', 'Physics')}
          {renderSubjectSection('chemistry', 'Chemistry')}
          {renderSubjectSection('maths', 'Mathematics')}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Remarks</label>
            <textarea
              className="input"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

