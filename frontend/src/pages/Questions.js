import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Plus, 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  ThumbsDown,
  Clock,
  User,
  Tag
} from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const Questions = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'newest',
    tag: searchParams.get('tag') || ''
  });

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.tag) params.append('tag', filters.tag);
      params.append('page', searchParams.get('page') || '1');

      const response = await axios.get(`/questions?${params.toString()}`);
      setQuestions(response.data.questions);
      setPagination(response.data.pagination);
      
      // Update URL params
      const newParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) newParams.append(key, value);
      });
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleVote = async (questionId, voteType) => {
    if (!isAuthenticated) {
      alert('Please login to vote');
      return;
    }

    try {
      await axios.post(`/questions/${questionId}/vote`, { voteType });
      // Refresh questions to get updated vote counts
      fetchQuestions();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getSortOptions = () => [
    { value: 'newest', label: 'Newest' },
    { value: 'votes', label: 'Most Voted' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'unanswered', label: 'Unanswered' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-600 mt-1">
            {pagination.total ? `${pagination.total} questions` : 'No questions found'}
          </p>
        </div>
        {isAuthenticated && (
          <Link to="/ask" className="btn-primary flex items-center">
            <Plus size={20} className="mr-2" />
            Ask Question
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="input-field"
              >
                {getSortOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag filter
              </label>
              <input
                type="text"
                placeholder="Filter by tag..."
                value={filters.tag}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.tag 
                ? 'Try adjusting your search or filters'
                : 'Be the first to ask a question!'
              }
            </p>
            {isAuthenticated && (
              <Link to="/ask" className="btn-primary">
                Ask the First Question
              </Link>
            )}
          </div>
        ) : (
          questions.map((question) => (
            <div key={question._id} className="card hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Vote Stats */}
                <div className="flex flex-col items-center space-y-2 min-w-[80px]">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {question.voteCount || 0}
                    </div>
                    <div className="text-xs text-gray-500">votes</div>
                  </div>
                  
                  {isAuthenticated && (
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleVote(question._id, 'upvote')}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Upvote"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => handleVote(question._id, 'downvote')}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Downvote"
                      >
                        <ThumbsDown size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Question Content */}
                <div className="flex-1">
                  <Link 
                    to={`/questions/${question._id}`}
                    className="block hover:text-primary-600 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                      {question.title}
                    </h3>
                  </Link>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {question.tags?.map((tag) => (
                      <Link
                        key={tag}
                        to={`/questions?tag=${tag}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
                      >
                        <Tag size={12} className="mr-1" />
                        {tag}
                      </Link>
                    ))}
                  </div>

                  {/* Question Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <User size={14} />
                        <span>{question.author?.username}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <MessageSquare size={14} />
                        <span>{question.answerCount || 0} answers</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye size={14} />
                        <span>{question.views || 0} views</span>
                      </div>
                      {question.hasAcceptedAnswer && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <span className="text-xs">Solved</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('page', pagination.current - 1);
              setSearchParams(newParams);
            }}
            disabled={!pagination.hasPrev}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {pagination.current} of {pagination.total}
          </span>
          
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('page', pagination.current + 1);
              setSearchParams(newParams);
            }}
            disabled={!pagination.hasNext}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Questions; 