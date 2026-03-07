'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully!');
      router.push('/auth/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Property Owner';
      case 'CUSTOMER':
        return 'Customer';
      case 'ADMIN':
        return 'Administrator';
      default:
        return role;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Fabrix</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Logout
            </button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome, {user?.name}!
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-lg font-semibold text-gray-900">
                  {getRoleLabel(user?.role || '')}
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-900">
                ✅ Authentication is working! You are successfully logged in.
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}