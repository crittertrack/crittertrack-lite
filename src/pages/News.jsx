import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import TopBar from '../components/TopBar';
import { renderRichText } from '../utils/richText';
import { Rss, BarChart2, Info, Gem, Flame, Loader2 } from 'lucide-react';

// Dedicated news/updates page — the destination for NewsTickerBanner item clicks. Lite has no
// Community/Supporters pages like the full site, so broadcasts and supporter shoutouts are
// combined into this one always-reachable screen instead.
const News = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState([]);
    const [supporters, setSupporters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [notifRes, supportersRes] = await Promise.all([
                    apiClient.get('/notifications'),
                    apiClient.get('/kofi/supporters'),
                ]);
                const allNotifications = Array.isArray(notifRes.data) ? notifRes.data : notifRes.data?.notifications || [];
                const publicBroadcasts = allNotifications.filter(n => {
                    const isPublicType = ['announcement', 'poll', 'info', 'broadcast'].includes(n.type);
                    const isNotUrgent = n.broadcastType !== 'warning' && n.broadcastType !== 'alert';
                    return isPublicType && isNotUrgent;
                });
                setNews(publicBroadcasts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
                setSupporters(Array.isArray(supportersRes.data) ? supportersRes.data : []);
            } catch (err) {
                console.error('Failed to load news:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getBroadcastIcon = (item) => {
        const isPoll = item.broadcastType === 'poll' || item.type === 'poll';
        const isAnnouncement = item.broadcastType === 'announcement' || item.type === 'announcement';
        if (isPoll) return <BarChart2 size={18} className="text-cyan-500 flex-shrink-0" />;
        if (isAnnouncement) return <Rss size={18} className="text-purple-500 flex-shrink-0" />;
        return <Info size={18} className="text-blue-500 flex-shrink-0" />;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            <TopBar title="News & Updates" onBack={() => navigate(-1)} safeAreaTop={false} />
            <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
                ) : (
                    <>
                        <section>
                            <h2 className="text-sm font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide mb-2">Announcements</h2>
                            {news.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-dark-text-muted">No news right now — check back later!</p>
                            ) : (
                                <div className="space-y-2">
                                    {news.map((item) => (
                                        <div key={item._id} className="bg-white dark:bg-dark-card-bg rounded-lg shadow-sm p-3 flex items-start gap-2">
                                            {getBroadcastIcon(item)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 dark:text-dark-text">{renderRichText(item.pollQuestion || item.title)}</p>
                                                {item.message && <p className="text-sm text-gray-600 dark:text-dark-text-muted mt-0.5">{renderRichText(item.message)}</p>}
                                                {item.createdAt && <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <h2 className="text-sm font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide mb-2">Recent Supporters</h2>
                            {supporters.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-dark-text-muted">No supporters to show yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {supporters.map((supporter, index) => (
                                        <div key={`supporter-${index}`} className="bg-white dark:bg-dark-card-bg rounded-lg shadow-sm p-3 flex items-center gap-2">
                                            {supporter.isSubscription ? <Gem size={18} className="text-cyan-500 flex-shrink-0" /> : <Flame size={18} className="text-orange-500 flex-shrink-0" />}
                                            <p className="text-sm text-gray-700 dark:text-dark-text">
                                                Thank you, <span className="font-semibold">{supporter.name}</span>, for {supporter.isSubscription ? `being a ${supporter.tierName || 'Monthly Supporter'}` : 'supporting CritterTrack'}!
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <a
                            href="https://ko-fi.com/crittertrack"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-center text-sm font-medium text-primary hover:underline pt-2"
                        >
                            Support CritterTrack on Ko-fi!
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};

export default News;
