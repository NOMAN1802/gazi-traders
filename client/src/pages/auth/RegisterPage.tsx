import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Phone, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '@/services/authApi';

type TUserRole = 'admin' | 'manager' | 'staff';

type TRegisterUser = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  role: TUserRole;
};

const RegisterPage = () => {
  const [formState, setFormState] = useState<TRegisterUser>({
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    role: 'staff'
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  const handleSubmit = async () => {
    setError(null);
    try {
      await register(formState).unwrap();
      navigate('/', { replace: true });
    } catch (err) {
      const apiError =
        (err as { data?: { message?: string } })?.data?.message ??
        (err as Error)?.message ??
        'Unable to register. Please try again.';
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
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-sm flex items-center justify-center border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9" />
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9" />
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">মেসার্স গাজী ট্রেডার্স</span>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Icon Placeholder */}
            <div className="w-48 h-48 mx-auto">
              <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-sm border border-white/10 flex items-center justify-center">
                <svg className="w-32 h-32 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold leading-tight">
                Join Our Growing
                <br />
                Community
              </h1>
              <p className="mt-4 text-indigo-200 text-sm leading-relaxed">
                Create your account and start managing
                <br />
                your business more efficiently today.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-indigo-300">
            &copy; Copyright 2021 - 2025 মেসার্স গাজী ট্রেডার্স. All Rights Reserved
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <div className="text-right mb-6">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <span
                className="text-sm font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700"
                onClick={() => navigate('/login')}
              >
                LOGIN NOW
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              CREATE YOUR ACCOUNT
            </h2>
            <p className="text-sm text-gray-500 text-center uppercase tracking-wider">
              Fill in your details to get started
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Full Name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="example@email.com"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Mobile Number Input */}
            <div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Mobile Number"
                  value={formState.mobileNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, mobileNumber: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, password: event.target.value }))
                  }
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

            {/* Role Select */}
            <div>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none bg-white cursor-pointer"
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, role: event.target.value as TUserRole }))
                  }
                  required
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
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
              className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-medium py-3.5 rounded-sm transition flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
            >
              <span>{isLoading ? 'Creating Account...' : 'Register'}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Help Link */}
          <div className="mt-8 text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center mx-auto transition">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Need help?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;