import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import DarkModeToggle from './components/DarkModeToggle';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import Profile from './pages/Profile';
import HomePage from './pages/HomePage';
import Watchlist from './pages/Watchlist';
import MainLayout from './components/MainLayout';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setIsLoggedIn(!!token);
    setUser(storedUser);
  }, []);

  // Close profile menu when changing routes
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Add click outside listener to close profile menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    // Add event listener if menu is open
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const toggleProfileMenu = () => setProfileMenuOpen(!profileMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    setProfileMenuOpen(false);
  };

  const ProtectedRoute = ({ children }) => {
    return isLoggedIn ? children : <Navigate to="/login" />;
  };

  return (
    <div className="dark:bg-darkBackground bg-lightBackground min-h-screen">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-5 text-white dark:bg-gray-900 bg-blue-600 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-semibold flex items-center">
  
  <Link to="/" className="hover:text-blue-200 transition-colors duration-200">EquityEdge</Link>
</div>

          <div className="flex items-center space-x-6">
            {isLoggedIn && (
              <Link to="/watchlist" className="text-white text-base hover:text-blue-200 transition-colors duration-200">
                Watchlist
              </Link>
            )}

            <DarkModeToggle />

            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={toggleProfileMenu}
                  className="px-4 py-2 rounded-full bg-blue-700 hover:bg-blue-800 font-medium text-base transition-colors duration-200"
                >
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 shadow-lg rounded-md z-50 dark:bg-gray-800 bg-white text-gray-900 dark:text-white">
                    <p className="px-4 py-2 border-b dark:border-gray-700 text-base">Hi, {user?.name || 'User'}</p>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-base transition-colors duration-200"
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-base transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/signup" className="px-5 py-2 rounded-lg bg-white text-gray-900 hover:bg-green-500 hover:text-black text-base transition-colors duration-200">Sign Up</Link>
                <Link to="/login" className="px-5 py-2 rounded-lg bg-white text-gray-900 hover:bg-yellow-500 hover:text-black text-base transition-colors duration-200">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>



      {/* Profile Modal - Always rendered but conditionally visible */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${showProfileModal ? '' : 'hidden'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-xl w-full max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">Edit Profile</h2>
            <button
              onClick={closeProfileModal}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="dark:text-white">
            <Profile onUpdate={closeProfileModal} />
          </div>
        </div>
      </div>

      {/* Main content area with padding for fixed navbar */}
      <div className="pt-20 pb-8 px-4 container mx-auto h-screen">
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setUser={setUser} />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/watchlist" element={
            <ProtectedRoute>
              <MainLayout>
                <Watchlist />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout>
                <HomePage />
              </MainLayout>
            </ProtectedRoute>
          } />
          {/* Fallback route for any unmatched routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;