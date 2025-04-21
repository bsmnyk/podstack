
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function AuthCallback() {
  const [location] = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      window.opener.postMessage({
        type: 'oauth_callback',
        code
      }, window.location.origin);
      window.close();
    }
  }, [location]);

  return <div>Processing authentication...</div>;
}
