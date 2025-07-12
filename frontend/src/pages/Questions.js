import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  Search,
  Plus,
  MessageSquare,
  User,
  Tag
} from 'lucide-react';
import axios from 'axios';

const FILTERS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Unanswered', value: 'unanswered' },
];

const MORE_FILTERS = [
  { label: 'Most Voted', value: 'votes' },
  { label: 'Most Viewed', value: 'views' },
];

const Questions = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 1 });
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'newest',
  });
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line
  }, [filters, pagination.current]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('page', pagination.current);
      const response = await axios.get(`/questions?${params.toString()}`);
      setQuestions(response.data.questions);
      setPagination(response.data.pagination);
    } catch (error) {
      setQuestions([]);
      setPagination({ current: 1, total: 1 });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (value) => {
    setFilters((prev) => ({ ...prev, sort: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
    setShowMore(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchQuestions();
  };

  const handlePage = (page) => {
    setPagination((prev) => ({ ...prev, current: page }));
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Filters Only (Removed Ask and Search) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-2 items-center">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`px-4 py-2 rounded border text-sm font-medium ${filters.sort === f.value ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-primary-700'}`}
              onClick={() => handleFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <div className="relative">
            <button
              className={`px-4 py-2 rounded border text-sm font-medium flex items-center gap-1 ${showMore ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-primary-700'}`}
              onClick={() => setShowMore((v) => !v)}
            >
              more <ChevronDown size={16} />
            </button>
            {showMore && (
              <div className="absolute z-10 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg">
                {MORE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-primary-50"
                    onClick={() => handleFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
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
          <button
            onClick={() => handlePage(Math.max(1, pagination.current - 1))}
            disabled={pagination.current === 1}
            className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-primary-700 disabled:opacity-50"
          >
            {'<'}
          </button>
          {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePage(page)}
              className={`px-3 py-1 rounded ${pagination.current === page ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-primary-700'}`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePage(Math.min(pagination.total, pagination.current + 1))}
            disabled={pagination.current === pagination.total}
            className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-primary-700 disabled:opacity-50"
          >
            {'>'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Questions; 