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
  // For reply and voting
  const [replyContent, setReplyContent] = useState({}); // { [answerId]: value }
  const [replySubmitting, setReplySubmitting] = useState({}); // { [answerId]: bool }
  const [voteSubmitting, setVoteSubmitting] = useState({}); // { [answerId]: bool }

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

  // Voting on an answer
  const handleVote = async (answerId, voteType) => {
    if (!isAuthenticated) return navigate('/login');
    setVoteSubmitting((prev) => ({ ...prev, [answerId]: true }));
    try {
      await axios.post(`/answers/${answerId}/vote`, { voteType });
      fetchQuestion();
    } catch (err) {
      // Optionally show error
    } finally {
      setVoteSubmitting((prev) => ({ ...prev, [answerId]: false }));
    }
  };

  // Add a reply (comment) to an answer
  const handleReplySubmit = async (e, answerId) => {
    e.preventDefault();
    if (!replyContent[answerId] || replyContent[answerId].trim().length < 1) return;
    setReplySubmitting((prev) => ({ ...prev, [answerId]: true }));
    try {
      await axios.post(`/answers/${answerId}/comments`, { content: replyContent[answerId] });
      setReplyContent((prev) => ({ ...prev, [answerId]: '' }));
      fetchQuestion();
    } catch (err) {
      // Optionally show error
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [answerId]: false }));
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
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span>By {ans.author?.username}</span>
                  <span>•</span>
                  <span>{new Date(ans.createdAt).toLocaleString()}</span>
                </div>
                {/* Like/Dislike */}
                <div className="flex items-center gap-4 mb-2">
                  <button
                    className={`px-2 py-1 rounded text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 font-semibold flex items-center gap-1 ${voteSubmitting[ans._id] ? 'opacity-50' : ''}`}
                    disabled={voteSubmitting[ans._id]}
                    onClick={() => handleVote(ans._id, 'upvote')}
                  >
                    👍 {ans.votes?.upvotes?.length || 0}
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 font-semibold flex items-center gap-1 ${voteSubmitting[ans._id] ? 'opacity-50' : ''}`}
                    disabled={voteSubmitting[ans._id]}
                    onClick={() => handleVote(ans._id, 'downvote')}
                  >
                    👎 {ans.votes?.downvotes?.length || 0}
                  </button>
                  {isAuthenticated && (
                    <button
                      className="px-2 py-1 rounded text-gray-500 border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold"
                      disabled={voteSubmitting[ans._id]}
                      onClick={() => handleVote(ans._id, 'remove')}
                    >
                      Remove Vote
                    </button>
                  )}
                </div>
                {/* Comments/Replies */}
                <div className="ml-2 mb-2">
                  <div className="text-xs text-gray-600 font-semibold mb-1">Replies:</div>
                  {ans.comments && ans.comments.length > 0 ? (
                    <div className="space-y-2">
                      {ans.comments.map((c) => (
                        <div key={c._id || c.createdAt} className="bg-gray-50 border border-gray-100 rounded px-3 py-2 text-xs text-gray-700">
                          <span className="font-semibold text-blue-700">{c.author?.username || 'User'}:</span> {c.content}
                          <span className="ml-2 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No replies yet.</div>
                  )}
                </div>
                {/* Reply Form */}
                {isAuthenticated && (
                  <form className="flex items-center gap-2 mt-2" onSubmit={e => handleReplySubmit(e, ans._id)}>
                    <input
                      type="text"
                      value={replyContent[ans._id] || ''}
                      onChange={e => setReplyContent(prev => ({ ...prev, [ans._id]: e.target.value }))}
                      placeholder="Write a reply..."
                      className="flex-1 px-2 py-1 rounded border border-gray-300 text-sm"
                      minLength={1}
                      maxLength={500}
                      required
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                      disabled={replySubmitting[ans._id]}
                    >
                      {replySubmitting[ans._id] ? 'Replying...' : 'Reply'}
                    </button>
                  </form>
                )}
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