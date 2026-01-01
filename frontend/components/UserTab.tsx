'use client';

import { useState } from 'react';
import { studentsApi } from '@/lib/api';

interface UserTabProps {
  student: any;
  onUpdate: () => void;
}

export default function UserTab({ student, onUpdate }: UserTabProps) {
  const [formData, setFormData] = useState({
    name: student.name || '',
    batch: student.batch || '',
    parentName: student.parentName || '',
    parentOccupation: student.parentOccupation || '',
    address: student.address || '',
    contactNumber: student.contactNumber || '',
    generalRemark: student.generalRemark || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await studentsApi.update(student._id, formData);
      setMessage({ type: 'success', text: 'Student updated successfully' });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update student' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Name</label>
          <input
            type="text"
            name="name"
            className="input"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Batch</label>
          <input
            type="text"
            name="batch"
            className="input"
            value={formData.batch}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Parent Name</label>
          <input
            type="text"
            name="parentName"
            className="input"
            value={formData.parentName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Parent Occupation</label>
          <input
            type="text"
            name="parentOccupation"
            className="input"
            value={formData.parentOccupation}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Contact Number</label>
          <input
            type="text"
            name="contactNumber"
            className="input"
            value={formData.contactNumber}
            onChange={handleChange}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Address</label>
        <textarea
          name="address"
          className="input"
          value={formData.address}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>General Remark</label>
        <textarea
          name="generalRemark"
          className="input"
          value={formData.generalRemark}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

