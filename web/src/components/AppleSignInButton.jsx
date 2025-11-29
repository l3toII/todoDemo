import { useDispatch, useSelector } from 'react-redux';
import { appleSignIn, selectAuthLoading } from '../features/auth/authSlice';

/**
 * AppleSignInButton component
 *
 * Implements Sign in with Apple for web.
 * Uses Apple's JS SDK to handle authentication flow.
 *
 * @returns {React.ReactNode}
 */
const AppleSignInButton = () => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);

  const handleAppleSignIn = async () => {
    try {
      // Load Apple's Sign In JS if not already loaded
      if (!window.AppleID) {
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Initialize Apple ID
      window.AppleID.auth.init({
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID || 'com.gtdapp.web',
        scope: 'name email',
        redirectURI: `${window.location.origin}/auth/apple/callback`,
        usePopup: true,
      });

      // Trigger Sign In
      const data = await window.AppleID.auth.signIn();

      // Extract tokens from response
      const { authorization } = data;
      const { id_token: identityToken, code: authorizationCode } = authorization;

      // Dispatch to Redux
      await dispatch(
        appleSignIn({
          identityToken,
          authorizationCode,
        })
      ).unwrap();
    } catch (error) {
      console.error('Apple Sign-In failed:', error);
      // Error is handled by Redux state
    }
  };

  return (
    <button
      type="button"
      onClick={handleAppleSignIn}
      disabled={isLoading}
      className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      {isLoading ? 'Signing in...' : 'Continue with Apple'}
    </button>
  );
};

export default AppleSignInButton;
