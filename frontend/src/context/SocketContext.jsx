import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API from '../services/api';
import { setCachedData, getCachedData } from '../services/offlineSync';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      if (navigator.onLine) {
        const res = await API.get('/notifications');
        if (res.data.success) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(res.data.unreadCount || 0);
          await setCachedData(`notifications_${user._id}`, {
            notifications: res.data.notifications || [],
            unreadCount: res.data.unreadCount || 0
          });
        }
      } else {
        const cached = await getCachedData(`notifications_${user._id}`);
        if (cached) {
          setNotifications(cached.notifications || []);
          setUnreadCount(cached.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      if (user) {
        const cached = await getCachedData(`notifications_${user._id}`);
        if (cached) {
          setNotifications(cached.notifications || []);
          setUnreadCount(cached.unreadCount || 0);
        }
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const handleOnline = () => {
        fetchNotifications();
      };
      window.addEventListener('online', handleOnline);

      const getSocketURL = () => {
        let url = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
        if (url) {
          url = url.trim().replace(/\/$/, '');
          if (url.endsWith('/api')) {
            url = url.slice(0, -4);
          }
          return url;
        }
        if (import.meta.env.PROD) {
          return 'https://raktsaarthi-1.onrender.com';
        }
        return 'http://localhost:5000';
      };

      const newSocket = io(getSocketURL(), {
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        newSocket.emit('join_user', { userId: user._id, role: user.role });
      });

      newSocket.on('new_blood_request', (data) => {
        fetchNotifications();
      });

      newSocket.on('request_status_changed', (data) => {
        fetchNotifications();
      });

      newSocket.on('system_notification', (data) => {
        fetchNotifications();
      });

      newSocket.on('donor_notification', (data) => {
        fetchNotifications();
      });

      setSocket(newSocket);

      return () => {
        window.removeEventListener('online', handleOnline);
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      if (navigator.onLine) {
        await API.put('/notifications/read-all');
      }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (user) {
        await setCachedData(`notifications_${user._id}`, {
          notifications: notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      unreadCount,
      fetchNotifications,
      markAllRead
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

