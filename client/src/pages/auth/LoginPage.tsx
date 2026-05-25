import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '@/services/authApi';
import gaziLogo from '@/assets/gaziLogo.svg';

const LoginPage = () => {
    const [formState, setFormState] = useState({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [login, { isLoading }] = useLoginMutation();

    const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from
            ?.pathname ?? '/';

    const handleSubmit = async () => {
        setError(null);
        try {
            await login(formState).unwrap();
            navigate(redirectPath, { replace: true });
        } catch (err) {
            const apiError =
                (err as { data?: { message?: string } })?.data?.message ??
                (err as Error)?.message ??
                'Unable to login. Please check your credentials.';
            setError(apiError);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    {/* Logo */}
                    <div className="flex items-center space-x-3">
                        <img
                            src={gaziLogo}
                            alt="Gazi Traders Logo"
                            className="h-12 w-12 object-contain bg-white/10 backdrop-blur-sm rounded-sm p-2 border border-white/20"
                        />
                        <span className="text-2xl font-bold tracking-tight">মেসার্স গাজী ট্রেডার্স</span>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-8">
                        {/* Handshake Image Placeholder */}
                        <div className="w-48 h-48 mx-auto">
                            <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-sm border border-white/10 flex items-center justify-center">
                                <svg className="w-32 h-32 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold leading-tight">
                                Partnership for<br />Business Growth
                            </h1>
                            <p className="mt-4 text-indigo-200 text-sm leading-relaxed">
                                Accelerating the future <br />
                                Byte by Byte.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-xs text-indigo-300">
                        © Copyright 2025 মেসার্স গাজী ট্রেডার্স. All Rights Reserved
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex justify-center mb-4">
                            <img
                                src={gaziLogo}
                                alt="Gazi Traders Logo"
                                className="h-32 w-auto object-contain"
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                            LOGIN TO YOUR ACCOUNT
                        </h2>
                        <p className="text-sm text-gray-500 text-center uppercase tracking-wider">
                            Sign in and access the dashboard
                        </p>
                    </div>

                    {/* Form */}
                    <div className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="example@email.com"
                                    value={formState.email}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="••••••••"
                                    value={formState.password}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !isLoading) {
                                            handleSubmit();
                                        }
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-medium py-3.5 rounded-sm transition flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <span>{isLoading ? 'Signing In...' : 'Login'}</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>

                    {/* Help Link */}
                    <div className="mt-8 text-center">
                        <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center mx-auto transition">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Need help?
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;


