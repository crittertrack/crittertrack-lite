import React, { useState } from 'react';
import { Loader2, LogIn, Mail, Eye, EyeOff, Heart } from 'lucide-react';
import logo from '../assets/lite-logo.png';
import { openExternalLink } from '../utils/externalLink';

const Login = ({ onLogin, onShowRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await onLogin(email, password);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <button
                    type="button"
                    onClick={() => openExternalLink('https://ko-fi.com/crittertrack')}
                    className="w-full mb-4 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-sm"
                >
                    <Heart size={16} className="fill-current" />
                    Support CritterTrack
                </button>

                <div className="text-center mb-8">
                    <img src={logo} alt="CritterTrack Lite" className="w-28 h-28 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-gray-800">CritterTrack Lite</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in with your CritterTrack account</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                        <div className="mt-1 relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                        <div className="mt-1 relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
                <button onClick={onShowRegister} className="w-full text-center text-sm text-accent font-semibold mt-4">
                    Create Account
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">Uses the same account as the full CritterTrack app</p>
            </div>
        </div>
    );
};

export default Login;
