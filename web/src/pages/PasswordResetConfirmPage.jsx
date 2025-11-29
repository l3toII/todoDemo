import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword, clearError, selectAuth } from '../features/auth/authSlice';

const PasswordResetConfirmPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, error } = useSelector(selectAuth);

  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Redirect to request page if no token
  useEffect(() => {
    if (!token) {
      navigate('/password-reset', { replace: true });
    }
  }, [token, navigate]);

  const validateForm = () => {
    const errors = {};

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(
        resetPassword({
          token,
          newPassword: formData.password,
        })
      ).unwrap();

      // Redirect to login with success message
      navigate('/login', {
        state: {
          message: 'Password reset successful! You can now sign in with your new password.',
        },
      });
    } catch (err) {
      console.error('Password reset failed:', err);
    }
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.password
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md focus:outline-none focus:z-10 sm:text-sm`}
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
              />
              {validationErrors.password && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with 1 uppercase letter and 1 number
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.confirmPassword
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md focus:outline-none focus:z-10 sm:text-sm`}
                placeholder="Re-enter your new password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Resetting password...
                </span>
              ) : (
                'Reset password'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-sm text-blue-600 hover:text-blue-500"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetConfirmPage;
