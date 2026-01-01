'use client';

import { useState, useEffect } from 'react';
import { testsApi } from '@/lib/api';

export default function AdminPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    testName: '',
    testDate: new Date().toISOString().split('T')[0],
    maxMarks: 300,
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await testsApi.getAll();
      setTests(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await testsApi.create(formData);
      setShowForm(false);
      setFormData({
        testName: '',
        testDate: new Date().toISOString().split('T')[0],
        maxMarks: 300,
      });
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create test');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTest) return;

    try {
      setUploading(true);
      setUploadResult(null);
      const response = await testsApi.uploadExcel(selectedTest, file);
      setUploadResult(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload Excel file');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Admin - Test Management</h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Tests</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Create New Test'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: '20px', background: '#f8f9fa' }}>
            <h3>Create New Test</h3>
            <form onSubmit={handleCreateTest}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Test Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.testName}
                  onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Test Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.testDate}
                  onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Max Marks</label>
                <input
                  type="number"
                  className="input"
                  value={formData.maxMarks}
                  onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) || 300 })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Create Test
              </button>
            </form>
          </div>
        )}

        {tests.length === 0 ? (
          <p>No tests created yet</p>
        ) : (
          <div>
            {tests.map((test) => (
              <div key={test._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3>{test.testName}</h3>
                    <p>
                      Date: {new Date(test.testDate).toLocaleDateString()} | 
                      Max Marks: {test.maxMarks}
                    </p>
                  </div>
                  <div>
                    <label className="btn btn-primary" style={{ cursor: 'pointer', marginRight: '10px' }}>
                      {uploading && selectedTest === test._id ? 'Uploading...' : 'Upload Excel'}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        onClick={() => setSelectedTest(test._id)}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                {selectedTest === test._id && uploadResult && (
                  <div className={uploadResult.results?.errors?.length > 0 ? 'error' : 'success'} style={{ marginTop: '15px' }}>
                    <strong>Upload Results:</strong>
                    <p>Processed: {uploadResult.results?.processed || 0}</p>
                    <p>Skipped: {uploadResult.results?.skipped || 0}</p>
                    {uploadResult.results?.errors?.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <strong>Errors:</strong>
                        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                          {uploadResult.results.errors.slice(0, 10).map((err: string, idx: number) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                        {uploadResult.results.errors.length > 10 && (
                          <p>... and {uploadResult.results.errors.length - 10} more errors</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

