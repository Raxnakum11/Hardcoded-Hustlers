import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';

const QuestionDetail = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestion();
    // eslint-disable-next-line
  }, [id]);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/questions/${id}`);
      setQuestion(res.data.question);
    } catch (err) {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!answerContent || answerContent.replace(/<[^>]+>/g, '').trim().length < 20) {
      setError('Answer must be at least 20 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/answers', {
        content: answerContent,
        questionId: id
      });
      setAnswerContent('');
      fetchQuestion(); // Refresh answers
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to submit answer.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96 text-gray-500">Loading...</div>;
  }
  if (!question) {
    return <div className="flex items-center justify-center min-h-96 text-red-500">Question not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Question */}
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{question.title}</h1>
        <div className="mb-4 text-gray-700" dangerouslySetInnerHTML={{ __html: question.description }} />
        <div className="flex flex-wrap gap-2 mb-2">
          {question.tags?.map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs text-primary-700 border border-primary-200">{tag}</span>
          ))}
        </div>
        <div className="text-sm text-gray-500">Asked by {question.author?.username}</div>
      </div>

      {/* Answers */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Answers ({question.answers?.length || 0})</h2>
        {question.answers && question.answers.length > 0 ? (
          <div className="space-y-6">
            {question.answers.map((ans) => (
              <div key={ans._id} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="mb-2 text-gray-800" dangerouslySetInnerHTML={{ __html: ans.content }} />
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>By {ans.author?.username}</span>
                  <span>•</span>
                  <span>{new Date(ans.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No answers yet. Be the first to answer!</div>
        )}
      </div>

      {/* Answer Form */}
      {isAuthenticated ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Answer</h2>
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <ReactQuill
              value={answerContent}
              onChange={setAnswerContent}
              modules={{ toolbar: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
              ] }}
              formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link', 'image']}
              placeholder="Write your answer..."
            />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Post Answer'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card text-center text-gray-600">
          <span>You must be logged in to post an answer.</span>
          <button className="btn-primary ml-2" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail; 