import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, UserPlus, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import logo from '../assets/lite-logo.png';
import { API_BASE_URL } from '../utils/apiConfig';

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
            await axios.post(`${API_BASE_URL}/auth/register-request`, {
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
            const res = await axios.post(`${API_BASE_URL}/auth/verify-email`, { email, code });
            onRegistered(res.data.token);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src={logo} alt="CritterTrack Lite" className="w-28 h-28 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {step === 'details' ? 'Sign up for a new CritterTrack account' : 'Enter the code we emailed you'}
                    </p>
                </div>

                {step === 'details' ? (
                    <form onSubmit={handleRequestCode} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
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
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Name</label>
                            <input
                                type="text"
                                required
                                value={personalName}
                                onChange={(e) => setPersonalName(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Breeder Name (optional)</label>
                            <input
                                type="text"
                                value={breederName}
                                onChange={(e) => setBreederName(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="Jane's Rattery"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                            <div className="mt-1 relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
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
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            {loading ? 'Sending code…' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                        {info && (
                            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{info}</div>
                        )}
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Verification Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm tracking-widest text-center"
                                placeholder="123456"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            {loading ? 'Verifying…' : 'Verify & Create Account'}
                        </button>
                        <button type="button" onClick={() => setStep('details')} className="w-full text-xs font-semibold text-gray-400 underline">
                            Back to details
                        </button>
                    </form>
                )}

                <button onClick={onBack} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 font-semibold">
                    <ArrowLeft size={14} /> Back to Sign In
                </button>
            </div>
        </div>
    );
};

export default Register;
