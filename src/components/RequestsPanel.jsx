import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { Loader2, CheckCircle, XCircle, Trash2, AlertTriangle, Baby, PawPrint, Shield } from 'lucide-react';

// "Requests" tab of the bell page — mirrors crittertrack-frontend's NotificationPanel.jsx, but
// as inline page content (Lite is page-based, not modal-based) and using Lite's card styling.
// Covers every Notification-model type: transfer requests/offers, breeder/parent/link requests,
// moderation notices, litter assignments, mating reminders, and everything else (history only).
const TYPE_STYLES = {
    content_edited: 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700/50',
    litter_assignment: 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700/50',
    mating_reminder: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-300 dark:border-indigo-700/50',
};

const RequestsPanel = ({ navigate }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await apiClient.get('/notifications');
            setNotifications(response.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
            window.dispatchEvent(new Event('notifications-changed'));
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const runAction = async (key, fn, { animalsChanged = false } = {}) => {
        setProcessing(key);
        try {
            await fn();
            await fetchNotifications();
            if (animalsChanged) window.dispatchEvent(new Event('animals-changed'));
        } catch (error) {
            console.error('Notification action failed:', error);
        } finally {
            setProcessing(null);
        }
    };

    const handleAcceptTransfer = (n) => runAction(n.transferId, () => apiClient.post(`/transfers/${n.transferId}/accept`, {}), { animalsChanged: true });
    const handleAcceptViewOnly = (n) => runAction(n.transferId, () => apiClient.post(`/transfers/${n.transferId}/accept-view-only`, {}), { animalsChanged: true });
    const handleDeclineTransfer = (n) => runAction(n.transferId, () => apiClient.post(`/transfers/${n.transferId}/decline`, {}), { animalsChanged: true });
    const handleApprove = (n) => runAction(n._id, () => apiClient.post(`/notifications/${n._id}/approve`, {}));
    const handleReject = (n) => runAction(n._id, () => apiClient.post(`/notifications/${n._id}/reject`, {}), { animalsChanged: true });
    const handleDelete = (n) => runAction(n._id, () => apiClient.delete(`/notifications/${n._id}`));

    const pending = notifications.filter((n) => n.status === 'pending' && n.type !== 'broadcast' && n.type !== 'announcement' && n.type !== 'moderator_message');
    const history = notifications.filter((n) => n.status !== 'pending' && n.type !== 'broadcast' && n.type !== 'announcement');

    if (loading) {
        return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>;
    }

    if (notifications.length === 0) {
        return <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">No requests or updates.</p>;
    }

    return (
        <div className="space-y-5">
            {pending.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase px-1">Pending</p>
                    {pending.map((n) => (
                        <div key={n._id} className={`border rounded-xl p-3 shadow-sm space-y-2 ${TYPE_STYLES[n.type] || 'bg-white dark:bg-dark-card-bg border-gray-100 dark:border-dark-border'}`}>
                            {n.type === 'content_edited' && (
                                <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 text-xs font-bold">
                                    <AlertTriangle size={14} /> Moderation Notice
                                </div>
                            )}
                            {n.type === 'litter_assignment' && (
                                <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs font-bold">
                                    <Baby size={14} /> Litter Assignment · {n.parentType === 'sire' ? 'Sire' : 'Dam'}
                                </div>
                            )}
                            {n.type === 'mating_reminder' && (
                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                    <PawPrint size={14} /> Planned Mating · Today!
                                </div>
                            )}
                            <div className="flex items-start gap-2.5">
                                {n.type === 'content_edited' ? (
                                    <div className="flex-shrink-0 w-12 h-12 bg-orange-200 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                                        <Shield size={22} className="text-orange-600 dark:text-orange-400" />
                                    </div>
                                ) : n.animalImageUrl ? (
                                    <button
                                        onClick={() => n.animalId_public && navigate(`/animals/${n.animalId_public}`)}
                                        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface"
                                    >
                                        <img src={n.animalImageUrl} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{n.message}</p>
                                    <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {n.type === 'transfer_request' && n.transferId && (
                                    <>
                                        <button onClick={() => handleAcceptTransfer(n)} disabled={processing === n.transferId} className="flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <CheckCircle size={13} /> Accept
                                        </button>
                                        <button onClick={() => handleDeclineTransfer(n)} disabled={processing === n.transferId} className="flex items-center gap-1 bg-red-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <XCircle size={13} /> Decline
                                        </button>
                                    </>
                                )}
                                {n.type === 'view_only_offer' && n.transferId && (
                                    <>
                                        <button onClick={() => handleAcceptViewOnly(n)} disabled={processing === n.transferId} className="flex items-center gap-1 bg-info-blue text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <CheckCircle size={13} /> Accept
                                        </button>
                                        <button onClick={() => handleDeclineTransfer(n)} disabled={processing === n.transferId} className="flex items-center gap-1 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <XCircle size={13} /> Decline
                                        </button>
                                    </>
                                )}
                                {n.type === 'link_request' && (
                                    <>
                                        <button onClick={() => handleReject(n)} disabled={processing === n._id} className="flex items-center gap-1 bg-accent text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <XCircle size={13} /> Reject
                                        </button>
                                        <button onClick={() => handleApprove(n)} disabled={processing === n._id} title="The link is already in effect — this just clears it from your pending list." className="flex items-center gap-1 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <CheckCircle size={13} /> Acknowledge
                                        </button>
                                    </>
                                )}
                                {(n.type === 'breeder_request' || n.type === 'parent_request') && (
                                    <>
                                        <button onClick={() => handleReject(n)} disabled={processing === n._id} className="flex items-center gap-1 bg-accent text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <XCircle size={13} /> Reject
                                        </button>
                                        <button onClick={() => handleApprove(n)} disabled={processing === n._id} title="The link is already in effect — this just clears it from your pending list." className="flex items-center gap-1 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                            <CheckCircle size={13} /> Acknowledge
                                        </button>
                                    </>
                                )}
                                {n.type === 'content_edited' && (
                                    <button onClick={() => handleApprove(n)} disabled={processing === n._id} className="flex items-center gap-1 bg-orange-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                        <CheckCircle size={13} /> Acknowledge
                                    </button>
                                )}
                                {!['link_request', 'breeder_request', 'parent_request', 'transfer_request', 'view_only_offer', 'content_edited'].includes(n.type) && (
                                    <button onClick={() => handleDelete(n)} className="flex items-center gap-1 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                                        <Trash2 size={13} /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {history.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase px-1">History</p>
                    {history.map((n) => (
                        <div key={n._id} className="border border-gray-100 dark:border-dark-border rounded-xl p-3 bg-gray-50 dark:bg-dark-surface flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{n.message}</p>
                                <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">
                                    {new Date(n.createdAt).toLocaleString()} · <span className={n.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{n.status}</span>
                                </p>
                            </div>
                            <button onClick={() => handleDelete(n)} className="text-gray-400 dark:text-dark-text-muted hover:text-red-600 flex-shrink-0">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RequestsPanel;
