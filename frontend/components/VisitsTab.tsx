'use client';

import { useState, useEffect } from 'react';
import { visitsApi } from '@/lib/api';

interface VisitsTabProps {
  studentId: string;
}

export default function VisitsTab({ studentId }: VisitsTabProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    assignment: '',
    remarks: '',
  });

  useEffect(() => {
    fetchVisits();
  }, [studentId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await visitsApi.getByStudent(studentId);
      setVisits(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch visits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await visitsApi.create({
        studentId,
        ...formData,
      });
      setShowForm(false);
      setFormData({
        visitDate: new Date().toISOString().split('T')[0],
        assignment: '',
        remarks: '',
      });
      fetchVisits();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create visit');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) return;
    try {
      await visitsApi.delete(id);
      fetchVisits();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete visit');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Visits</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Visit'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Add New Visit</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Visit Date</label>
              <input
                type="date"
                className="input"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Assignment</label>
              <textarea
                className="input"
                value={formData.assignment}
                onChange={(e) => setFormData({ ...formData, assignment: e.target.value })}
                rows={3}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Remarks</label>
              <textarea
                className="input"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={4}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Save Visit
            </button>
          </form>
        </div>
      )}

      {visits.length === 0 ? (
        <p>No visits recorded</p>
      ) : (
        <div>
          {visits.map((visit) => (
            <div key={visit._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3>{new Date(visit.visitDate).toLocaleDateString()}</h3>
                  {visit.assignment && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Assignment:</strong>
                      <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{visit.assignment}</p>
                    </div>
                  )}
                  {visit.remarks && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Remarks:</strong>
                      <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{visit.remarks}</p>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => handleDelete(visit._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

