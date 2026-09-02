import React, { useState } from 'react';
import apiClient from '../utils/apiClient';
import { Loader2, UserPlus, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import logo from '../assets/lite-logo.png';
import ThemeToggle from '../components/ThemeToggle';

// Mirrors crittertrack-frontend's AuthView two-step registration: request a verification
// code by email, then verify it to actually create the account and receive a token.
const Register = ({ onRegistered, onBack }) => {
    const [step, setStep] = useState('details'); // 'details' | 'verify'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [personalName, setPersonalName] = useState('');
    const [breederName, setBreederName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await apiClient.post('/auth/register-request', {
                email, password, personalName, breederName: breederName || undefined,
            });
            setInfo('Verification code sent — check your email.');
            setStep('verify');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await apiClient.post('/auth/verify-email', { email, code });
            onRegistered(res.data.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg flex flex-col items-center justify-center px-6">
            <div className="fixed top-4 right-4 z-30" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src={logo} alt="CritterTrack Lite" className="w-28 h-28 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Create Account</h1>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                        {step === 'details' ? 'Sign up for a new CritterTrack account' : 'Enter the code we emailed you'}
                    </p>
                </div>

                {step === 'details' ? (
                    <form onSubmit={handleRequestCode} className="bg-white dark:bg-dark-card-bg rounded-2xl shadow-sm p-5 space-y-4">
                        {error && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/60 rounded-lg px-3 py-2">{error}</div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Email</label>
                            <div className="mt-1 relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Personal Name</label>
                            <input
                                type="text"
                                required
                                value={personalName}
                                onChange={(e) => setPersonalName(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Breeder Name (optional)</label>
                            <input
                                type="text"
                                value={breederName}
                                onChange={(e) => setBreederName(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="Jane's Rattery"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Password</label>
                            <div className="mt-1 relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-accent dark:bg-dark-accent hover:bg-accent/90 dark:hover:bg-dark-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            {loading ? 'Sending code…' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="bg-white dark:bg-dark-card-bg rounded-2xl shadow-sm p-5 space-y-4">
                        {info && (
                            <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/60 rounded-lg px-3 py-2">{info}</div>
                        )}
                        {error && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/60 rounded-lg px-3 py-2">{error}</div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Verification Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm tracking-widest text-center"
                                placeholder="123456"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-accent dark:bg-dark-accent hover:bg-accent/90 dark:hover:bg-dark-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            {loading ? 'Verifying…' : 'Verify & Create Account'}
                        </button>
                        <button type="button" onClick={() => setStep('details')} className="w-full text-xs font-semibold text-gray-400 dark:text-dark-text-muted underline">
                            Back to details
                        </button>
                    </form>
                )}

                <button onClick={onBack} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-dark-text-muted font-semibold">
                    <ArrowLeft size={14} /> Back to Sign In
                </button>
            </div>
        </div>
    );
};

export default Register;
