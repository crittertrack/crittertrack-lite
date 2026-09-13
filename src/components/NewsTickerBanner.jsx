import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { Rss, BarChart2, Info, Heart, Gem, Flame } from 'lucide-react';
import './NewsTickerBanner.css';

// Scrolling ticker banner, mirroring crittertrack-frontend's NewsTickerBanner — same Ko-fi
// support link, broadcast/announcement news, and recent supporters. Trimmed of the full
// site's Report-a-Bug/Resources/beta-survey links and Community/Supporters page links, since
// Lite doesn't have those pages — news/supporter items are shown as plain text here instead.
const NewsTickerBanner = ({ authToken }) => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [supporters, setSupporters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      if (!authToken) { setLoading(false); return; }
      try {
        const response = await apiClient.get(`/notifications`);
        const allNotifications = Array.isArray(response.data) ? response.data : response.data?.notifications || [];
        const dismissedBroadcasts = JSON.parse(localStorage.getItem('dismissedBroadcasts') || '[]');
        const publicBroadcasts = allNotifications.filter(n => {
          const isPublicType = ['announcement', 'poll', 'info', 'broadcast'].includes(n.type);
          const isNotUrgent = n.broadcastType !== 'warning' && n.broadcastType !== 'alert';
          const isNotDismissed = !dismissedBroadcasts.includes(n._id);
          return isPublicType && isNotUrgent && isNotDismissed;
        });
        const sortedItems = publicBroadcasts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNews(sortedItems.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch news for ticker:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [authToken]);

  useEffect(() => {
    const fetchSupporters = async () => {
      try {
        const response = await apiClient.get(`/kofi/supporters`);
        const list = Array.isArray(response.data) ? response.data : [];
        setSupporters(list.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch supporters for ticker:', err);
      }
    };
    fetchSupporters();
  }, []);

  if (loading) return null;

  const getBroadcastIcon = (item) => {
    const isPoll = item.broadcastType === 'poll' || item.type === 'poll';
    const isAnnouncement = item.broadcastType === 'announcement' || item.type === 'announcement';
    if (isPoll) return <BarChart2 size={14} className="inline-block mr-1.5 text-cyan-300 flex-shrink-0" />;
    if (isAnnouncement) return <Rss size={14} className="inline-block mr-1.5 text-purple-300 flex-shrink-0" />;
    return <Info size={14} className="inline-block mr-1.5 text-blue-300 flex-shrink-0" />;
  };

  const animationDuration = (news.length + supporters.length + 1) * 20;

  return (
    <div className="mx-3 mt-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white text-sm py-1 overflow-hidden relative rounded-lg">
      <div className="news-ticker-container whitespace-nowrap" style={{ animationDuration: `${animationDuration}s` }}>
        <span className="inline-flex items-center px-4 font-semibold">
          <a href="https://ko-fi.com/crittertrack" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
            <Heart size={14} className="inline-block mr-1.5 text-pink-400 fill-current" />
            Support CritterTrack on Ko-fi!
          </a>
          <span className="mx-4">|</span>
        </span>
        {news.map((item, index) => (
          <span key={item._id} className="inline-flex items-center px-4 font-semibold">
            <button onClick={() => navigate('/news')} className="hover:underline bg-transparent border-none text-white p-0 cursor-pointer flex items-center">
              {getBroadcastIcon(item)}
              {item.pollQuestion || item.title}
            </button>
            {(index < news.length - 1 || supporters.length > 0) && <span className="mx-4">|</span>}
          </span>
        ))}
        {supporters.map((supporter, index) => (
          <span key={`supporter-${index}`} className="inline-flex items-center px-4 font-semibold">
            <button onClick={() => navigate('/news')} className="hover:underline bg-transparent border-none text-white p-0 cursor-pointer flex items-center">
              {supporter.isSubscription ? (
                <>
                  <Gem size={14} className="inline-block mr-1.5 text-cyan-300 flex-shrink-0" />
                  Thank you, {supporter.name}, for being a {supporter.tierName || 'Monthly Supporter'}!
                </>
              ) : (
                <>
                  <Flame size={14} className="inline-block mr-1.5 text-orange-300 flex-shrink-0" />
                  Thank you, {supporter.name}, for supporting CritterTrack!
                </>
              )}
            </button>
            {index < supporters.length - 1 && <span className="mx-4">|</span>}
          </span>
        ))}
        <span className="inline-flex items-center px-4 font-semibold">
          <button onClick={() => navigate('/news')} className="hover:underline bg-transparent border-none text-white p-0 cursor-pointer flex items-center">
            <Info size={14} className="inline-block mr-1.5 text-blue-200 flex-shrink-0" />
            See All News
          </button>
        </span>
      </div>
    </div>
  );
};

export default NewsTickerBanner;
