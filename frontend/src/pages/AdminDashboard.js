import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ADMIN_EMAIL = 'parikhhet91@gmail.com';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchQuestions();
    }
    // eslint-disable-next-line
  }, [user]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/questions?admin=true');
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await axios.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      alert('Failed to delete question');
    }
  };
  const handleDeleteAnswer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this answer?')) return;
    try {
      await axios.delete(`/answers/${id}`);
      fetchQuestions();
    } catch (err) {
      alert('Failed to delete answer');
    }
  };
  const handleDeleteReply = (id) => {
    alert('Delete reply: ' + id);
  };

  if (!isAuthenticated || user?.email !== ADMIN_EMAIL) {
    return (
      <div className="card text-center py-16">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage <span className='font-semibold text-primary-600'>Questions</span>, <span className='font-semibold text-primary-600'>Answers</span>, and <span className='font-semibold text-primary-600'>Replies</span>.</p>
        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : questions.length === 0 ? (
          <div className="text-gray-400 text-center py-12">No questions found.</div>
        ) : (
          <div className="space-y-8">
            {questions.map((q) => (
              <div key={q._id} className="bg-gray-50 rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg text-primary-700 mb-1">{q.title}</div>
                    <div className="text-xs text-gray-500 mb-1">By {q.author?.username} &bull; {new Date(q.createdAt).toLocaleString()}</div>
                    <div className="text-sm text-gray-700 line-clamp-2 mb-2">{q.description?.replace(/<[^>]+>/g, '').slice(0, 120)}{q.description?.length > 120 ? '...' : ''}</div>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q._id)} className="px-4 py-1 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow transition">Delete Question</button>
                </div>
                {/* Answers */}
                {q.answers && q.answers.length > 0 && (
                  <div className="ml-2 mt-3">
                    <div className="font-semibold text-primary-600 mb-2">Answers</div>
                    <div className="divide-y divide-gray-200">
                      {q.answers.map((a) => (
                        <div key={a._id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-gray-800 text-sm mb-1">{a.content?.replace(/<[^>]+>/g, '').slice(0, 80)}{a.content?.length > 80 ? '...' : ''}</div>
                            <div className="text-xs text-gray-500">By {a.author?.username} &bull; {new Date(a.createdAt).toLocaleString()}</div>
                          </div>
                          <button onClick={() => handleDeleteAnswer(a._id)} className="px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition">Delete Answer</button>
                          {/* Replies/comments */}
                          {a.comments && a.comments.length > 0 && (
                            <div className="ml-4 w-full md:w-auto">
                              <div className="font-semibold text-primary-500 text-xs mb-1">Replies</div>
                              <div className="space-y-1">
                                {a.comments.map((c) => (
                                  <div key={c._id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded px-2 py-1">
                                    <span className="flex-1">{c.content?.slice(0, 40)}{c.content?.length > 40 ? '...' : ''}</span>
                                    <button onClick={() => handleDeleteReply(c._id)} className="px-2 py-0.5 rounded bg-red-400 text-white text-xs font-semibold hover:bg-red-500 transition">Delete Reply</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 