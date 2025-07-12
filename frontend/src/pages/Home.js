// --- client/src/pages/Home.js ---
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, [pagination.current]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/questions?page=${pagination.current}`);
      setQuestions(response.data.questions);
      setPagination(response.data.pagination);
    } catch (error) {
      setQuestions([]);
      setPagination({ current: 1, total: 1 });
    } finally {
      setLoading(false);
    }
  };

  const handlePage = (page) => {
    setPagination((prev) => ({ ...prev, current: page }));
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 py-10 px-2">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        {/* Questions */}
        <div className="space-y-5">
          {loading ? (
            <div className="text-center text-blue-400 py-16 text-lg font-semibold animate-pulse">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center text-blue-400 py-16 text-lg font-semibold">No questions found.</div>
          ) : (
            questions.map((q) => (
              <Link
                key={q._id}
                to={`/questions/${q._id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-blue-50"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-blue-900 group-hover:text-blue-600">
                      {q.title}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {q.description?.replace(/<[^>]+>/g, '').slice(0, 120)}{q.description?.length > 120 ? '...' : ''}
                    </div>
                  </div>
                  <div className="ml-4 text-sm bg-blue-100 text-blue-700 rounded-full px-3 py-1 font-semibold">
                    {q.answerCount || 0} ans
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => handlePage(Math.max(1, pagination.current - 1))} disabled={pagination.current === 1} className="px-3 py-2 rounded-lg bg-gray-200 text-blue-500 hover:bg-blue-100 transition disabled:opacity-50">
              {'<'}
            </button>
            {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => handlePage(page)} className={`px-4 py-2 rounded-lg font-semibold ${pagination.current === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-blue-600 hover:bg-blue-100'}`}>
                {page}
              </button>
            ))}
            <button onClick={() => handlePage(Math.min(pagination.total, pagination.current + 1))} disabled={pagination.current === pagination.total} className="px-3 py-2 rounded-lg bg-gray-200 text-blue-500 hover:bg-blue-100 transition disabled:opacity-50">
              {'>'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
