import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Users, 
  Tag, 
  TrendingUp, 
  ArrowRight,
  Search,
  Plus
} from 'lucide-react';
import axios from 'axios';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    totalUsers: 0,
    totalTags: 0
  });
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const [questionsRes, tagsRes] = await Promise.all([
        axios.get('/questions?limit=5'),
        axios.get('/questions/tags/popular')
      ]);

      setRecentQuestions(questionsRes.data.questions);
      setPopularTags(tagsRes.data.tags.slice(0, 10));
      
      // Mock stats for now - in real app, you'd have a stats endpoint
      setStats({
        totalQuestions: 1250,
        totalAnswers: 3400,
        totalUsers: 850,
        totalTags: 120
      });
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg text-white">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to StackIt
        </h1>
        <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
          A collaborative Q&A platform where developers share knowledge, ask questions, and build a stronger community.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/ask" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
              <Plus size={20} className="mr-2" />
              Ask a Question
            </Link>
          ) : (
            <Link to="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
              Join the Community
            </Link>
          )}
          <Link to="/questions" className="btn-outline border-white text-white hover:bg-white hover:text-primary-600">
            <Search size={20} className="mr-2" />
            Browse Questions
          </Link>
        </div>
      </div>

      {/* Recent Questions Only */}
      <div className="card max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Questions</h2>
          <Link to="/questions" className="text-primary-600 hover:text-primary-700 text-sm flex items-center">
            View all
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="space-y-4">
          {recentQuestions.map((question) => (
            <div key={question._id} className="border-b border-gray-100 pb-4 last:border-b-0">
              <Link 
                to={`/questions/${question._id}`}
                className="block hover:text-primary-600 transition-colors"
              >
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {question.title}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{question.author?.username}</span>
                  <div className="flex items-center space-x-4">
                    <span>{question.answerCount || 0} answers</span>
                    <span>{question.voteCount || 0} votes</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      {!isAuthenticated && (
        <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to join the community?
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sign up to ask questions, provide answers, and connect with other developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary">
                Create Account
              </Link>
              <Link to="/login" className="btn-outline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 