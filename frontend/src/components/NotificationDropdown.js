import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, ThumbsUp, User, X } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = ({ onClose, onRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/notifications?limit=10');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      if (onRead) onRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'answer':
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'comment':
        return <MessageSquare size={16} className="text-green-500" />;
      case 'vote':
        return <ThumbsUp size={16} className="text-orange-500" />;
      case 'accept':
        return <ThumbsUp size={16} className="text-green-600" />;
      case 'mention':
        return <User size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'answer':
        return `${notification.sender?.username} answered your question`;
      case 'comment':
        return `${notification.sender?.username} commented on your answer`;
      case 'vote':
        return `${notification.sender?.username} voted on your content`;
      case 'accept':
        return `${notification.sender?.username} accepted your answer`;
      case 'mention':
        return `${notification.sender?.username} mentioned you in a comment`;
      default:
        return notification.message;
    }
  };

  if (loading) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-4 z-50">
        <div className="px-4 py-2 text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <Bell size={24} className="mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                if (!notification.isRead) {
                  markAsRead(notification._id);
                }
                onClose();
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <Link
            to="/notifications"
            className="text-sm text-primary-600 hover:text-primary-700"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 