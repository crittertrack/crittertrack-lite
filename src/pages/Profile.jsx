import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Camera, Check, KeyRound, Eye, EyeOff, LogOut, Bell } from 'lucide-react';
import TopBar from '../components/TopBar';
import { API_BASE_URL } from '../utils/apiConfig';

// Mirrors the relevant parts of crittertrack-frontend's ProfileEditForm (basic info, privacy
// toggles, profile image, change password) — no bio/social links/breeder-info page yet.
const Profile = ({ authToken, userProfile, onProfileUpdated, onLogout }) => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [personalName, setPersonalName] = useState(userProfile?.personalName || '');
    const [breederName, setBreederName] = useState(userProfile?.breederName || '');
    const [showPersonalName, setShowPersonalName] = useState(userProfile?.showPersonalName ?? true);
    const [showBreederName, setShowBreederName] = useState(userProfile?.showBreederName ?? false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(userProfile?.profileImage || null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [pushCategories, setPushCategories] = useState([]);
    const [pushPreferences, setPushPreferences] = useState({});

    useEffect(() => {
        axios.get(`${API_BASE_URL}/push/preferences`, { headers: { Authorization: `Bearer ${authToken}` } })
            .then((r) => {
                setPushCategories(r.data?.categories || []);
                setPushPreferences(r.data?.preferences || {});
            })
            .catch(() => {});
    }, [authToken]);

    const handleTogglePushCategory = async (categoryId, value) => {
        setPushPreferences((prev) => ({ ...prev, [categoryId]: value }));
        try {
            await axios.put(`${API_BASE_URL}/push/preferences`, { [categoryId]: value }, { headers: { Authorization: `Bearer ${authToken}` } });
        } catch {
            setPushPreferences((prev) => ({ ...prev, [categoryId]: !value }));
        }
    };

    const handleImagePick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaveMessage('');
        setSaveError('');
        setSaving(true);
        try {
            const payload = { personalName, breederName: breederName || null, showPersonalName, showBreederName };
            if (imageFile) {
                const fd = new FormData();
                fd.append('file', imageFile);
                fd.append('type', 'profile');
                const uploadRes = await axios.post(`${API_BASE_URL}/upload`, fd, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                const url = uploadRes.data?.url || uploadRes.data?.path;
                if (url) payload.profileImage = url;
            }
            await axios.put(`${API_BASE_URL}/users/profile`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setImageFile(null);
            setSaveMessage('Profile updated successfully.');
            onProfileUpdated?.();
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage('');
        setPasswordError('');
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError('All password fields are required.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordError('New password and confirmation do not match.');
            return;
        }
        setPasswordSaving(true);
        try {
            await axios.put(`${API_BASE_URL}/auth/change-password`, { currentPassword, newPassword }, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setPasswordMessage('Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Failed to change password. Check your current password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg">
            <TopBar title="Profile" onBack={() => navigate(-1)} />
            <div className="p-4 space-y-4 max-w-md mx-auto">
                <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200"
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={36} className="text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                <Camera size={20} className="text-white" />
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                        <p className="text-xs text-gray-400">Tap to change photo</p>
                    </div>

                    {saveMessage && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{saveMessage}</div>}
                    {saveError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}

                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Name</label>
                        <input
                            type="text"
                            required
                            value={personalName}
                            onChange={(e) => setPersonalName(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                            <input type="checkbox" checked={showPersonalName} onChange={(e) => setShowPersonalName(e.target.checked)} className="accent-accent" />
                            Show personal name on public profile
                        </label>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Breeder Name</label>
                        <input
                            type="text"
                            value={breederName}
                            onChange={(e) => setBreederName(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                            placeholder="Jane's Rattery"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                            <input type="checkbox" checked={showBreederName} onChange={(e) => setShowBreederName(e.target.checked)} className="accent-accent" />
                            Show breeder name on public profile
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>

                {pushCategories.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Bell size={16} /> Push Notifications</h2>
                        <p className="text-xs text-gray-500">Choose what you want to be notified about:</p>
                        <div className="space-y-2 pl-1">
                            {pushCategories.map((cat) => (
                                <label key={cat.id} className="flex items-center gap-2 text-xs text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={pushPreferences[cat.id] !== false}
                                        onChange={(e) => handleTogglePushCategory(cat.id, e.target.checked)}
                                        className="accent-accent"
                                    />
                                    {cat.label}{cat.description ? ` — ${cat.description}` : ''}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><KeyRound size={16} /> Change Password</h2>
                    {passwordMessage && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{passwordMessage}</div>}
                    {passwordError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{passwordError}</div>}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm New Password</label>
                        <div className="mt-1 relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                minLength={8}
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={passwordSaving}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                    >
                        {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        {passwordSaving ? 'Changing…' : 'Change Password'}
                    </button>
                </form>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 font-semibold py-2.5 rounded-lg shadow-sm"
                >
                    <LogOut size={16} /> Log Out
                </button>
            </div>
        </div>
    );
};

export default Profile;
