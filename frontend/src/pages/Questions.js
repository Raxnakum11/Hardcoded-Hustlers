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
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-2 items-center">
          {isAuthenticated && (
            <Link to="/ask" className="btn-primary text-sm font-semibold">
              <Plus size={16} className="inline mr-1" /> Ask New question
            </Link>
          )}
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
        <form onSubmit={handleSearch} className="flex items-center w-full md:w-auto">
          <input
            type="text"
            placeholder="Search"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="input-field w-full md:w-64 bg-gray-900 text-gray-100 border-gray-700"
          />
          <button type="submit" className="ml-2 p-2 rounded bg-primary-600 hover:bg-primary-700 text-white">
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No questions found.</div>
        ) : (
          questions.map((q) => (
            <div key={q._id} className="bg-gray-900 border border-gray-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <Link to={`/questions/${q._id}`} className="block text-lg font-semibold text-primary-400 hover:underline mb-1">
                  {q.title}
                </Link>
                <div className="flex flex-wrap gap-2 mb-2">
                  {q.tags?.map((tag) => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded bg-gray-800 text-xs text-primary-300 border border-primary-700">
                      <Tag size={12} className="mr-1" /> {tag}
                    </span>
                  ))}
                </div>
                <div className="text-gray-400 text-sm mb-1 line-clamp-2">
                  {q.description?.replace(/<[^>]+>/g, '').slice(0, 120)}{q.description?.length > 120 ? '...' : ''}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><User size={12} /> {q.author?.username || 'User'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 min-w-[60px]">
                <div className="bg-gray-800 text-primary-300 rounded px-3 py-1 text-sm font-bold flex items-center gap-1">
                  {q.answerCount || 0} <span className="text-xs">ans</span>
                </div>
              </div>
            </div>
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