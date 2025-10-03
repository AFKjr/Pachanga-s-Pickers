import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  warnings: string[];
  entropy: number;
}

const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  
  // Rate limiting
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const lastAttemptTime = useRef<number>(0);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { signUp, signIn, resetPassword } = useAuth();

  // Clear sensitive data on unmount
  useEffect(() => {
    return () => {
      setPassword('');
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // OWASP: Client-side rate limiting
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (now - lastAttemptTime.current > oneMinute) {
      setLoginAttempts(0);
      setIsRateLimited(false);
      lastAttemptTime.current = now;
      return true;
    }

    if (loginAttempts >= 5) {
      setIsRateLimited(true);
      const remainingTime = Math.ceil((oneMinute - (now - lastAttemptTime.current)) / 1000);
      setError(`Too many attempts. Please wait ${remainingTime} seconds.`);
      return false;
    }

    return true;
  };

  // OWASP: Calculate password entropy (better than complexity rules)
  const calculateEntropy = (pwd: string): number => {
    let charsetSize = 0;
    
    if (/[a-z]/.test(pwd)) charsetSize += 26;
    if (/[A-Z]/.test(pwd)) charsetSize += 26;
    if (/[0-9]/.test(pwd)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) charsetSize += 32;
    
    // Entropy = log2(charset^length)
    return Math.log2(Math.pow(charsetSize, pwd.length));
  };

  // OWASP-Compliant Password Validation
  const validatePassword = (pwd: string): PasswordValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // OWASP Rule 1: Minimum length of 8 characters
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters');
      return {
        isValid: false,
        strength: 'weak',
        errors,
        warnings,
        entropy: 0
      };
    }

    // OWASP Rule 2: Maximum length (bcrypt limit is 72)
    if (pwd.length > 72) {
      errors.push('Password must be 72 characters or less');
      return {
        isValid: false,
        strength: 'weak',
        errors,
        warnings,
        entropy: 0
      };
    }

    // Calculate entropy for strength assessment
    const entropy = calculateEntropy(pwd);

    // OWASP Rule 3: Check against common/breached passwords
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 
      '1234567', 'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
      'master', 'sunshine', 'ashley', 'bailey', 'shadow', 'superman',
      'qazwsx', '123123', 'batman', 'password1', 'welcome', 'admin',
      'hello', 'freedom', 'whatever', 'passw0rd', 'password123', 'Password1',
      'Password1!', 'Passw0rd', 'Qwerty123', '123456789', '12345', '1234',
      '111111', '123456a', 'a123456', '1234567890', 'qwertyuiop', 'monkey1'
    ];

    const lowerPwd = pwd.toLowerCase();
    const hasCommonPassword = commonPasswords.some(common => 
      lowerPwd === common.toLowerCase() || lowerPwd.includes(common.toLowerCase())
    );

    if (hasCommonPassword) {
      errors.push('This password is too common and easily guessed');
      return {
        isValid: false,
        strength: 'weak',
        errors,
        warnings,
        entropy
      };
    }

    // OWASP Rule 4: Check for sequential characters
    const hasSequential = /(.)\1{2,}/.test(pwd) || // aaa, 111
                          /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pwd) ||
                          /(012|123|234|345|456|567|678|789|890)/.test(pwd);
    
    if (hasSequential) {
      warnings.push('Avoid sequential or repeated characters for better security');
    }

    // OWASP Rule 5: Check for keyboard patterns
    const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '1qaz2wsx', 'qwertz'];
    const hasKeyboardPattern = keyboardPatterns.some(pattern => 
      lowerPwd.includes(pattern)
    );
    
    if (hasKeyboardPattern) {
      warnings.push('Avoid keyboard patterns for better security');
    }

    // OWASP Rule 6: Check if password contains username or email
    if (username && lowerPwd.includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username');
      return {
        isValid: false,
        strength: 'weak',
        errors,
        warnings,
        entropy
      };
    }
    
    if (email) {
      const emailLocal = email.split('@')[0].toLowerCase();
      if (lowerPwd.includes(emailLocal)) {
        errors.push('Password cannot contain your email address');
        return {
          isValid: false,
          strength: 'weak',
          errors,
          warnings,
          entropy
        };
      }
    }

    // OWASP: Determine strength based on entropy, not complexity rules
    if (entropy < 28) {
      strength = 'weak';
      warnings.push('Consider using a longer password or more varied characters');
    } else if (entropy < 60) {
      strength = 'medium';
      if (pwd.length < 12) {
        warnings.push('Consider using a longer password (12+ characters) for better security');
      }
    } else {
      strength = 'strong';
    }

    // OWASP: Encourage longer passwords over complex shorter ones
    if (pwd.length >= 15) {
      strength = 'strong';
    }

    return {
      isValid: errors.length === 0,
      strength,
      errors,
      warnings,
      entropy
    };
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    if (isSignUp && pwd) {
      const validation = validatePassword(pwd);
      setPasswordValidation(validation);
    }
  };

  const validateUsername = (user: string): string | null => {
    if (!user) return 'Username is required';
    if (user.length < 3) return 'Username must be at least 3 characters';
    if (user.length > 30) return 'Username must be less than 30 characters';
    
    // OWASP: Strict character whitelist
    if (!/^[a-zA-Z0-9_-]+$/.test(user)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    
    // Reserved usernames
    const reservedUsernames = [
      'admin', 'root', 'system', 'moderator', 'administrator',
      'support', 'help', 'api', 'null', 'undefined', 'superuser'
    ];
    
    if (reservedUsernames.includes(user.toLowerCase())) {
      return 'This username is reserved';
    }
    
    return null;
  };

  const validateEmail = (emailStr: string): string | null => {
    if (!emailStr) return 'Email is required';
    if (emailStr.length > 254) return 'Email address too long';
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(emailStr)) {
      return 'Please enter a valid email address';
    }
    
    if (emailStr.includes('..') || emailStr.startsWith('.') || emailStr.endsWith('.')) {
      return 'Invalid email format';
    }
    
    return null;
  };

  const sanitizeErrorMessage = (error: any): string => {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid email or password')) {
      return 'Invalid email or password';
    }
    
    if (errorMessage.includes('email not confirmed')) {
      return 'Please confirm your email address';
    }
    
    if (errorMessage.includes('user already registered') || 
        errorMessage.includes('duplicate')) {
      return 'An account with this email already exists';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your connection';
    }
    
    if (errorMessage.includes('rate limit')) {
      return 'Too many requests. Please try again later';
    }

    return 'An error occurred. Please try again';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!checkRateLimit()) {
      return;
    }
    
    setLoading(true);

    try {
      if (isForgotPassword) {
        const emailError = validateEmail(email);
        if (emailError) {
          setError(emailError);
          setLoading(false);
          return;
        }

        await resetPassword(email);
        setSuccess('If an account exists with this email, you will receive a password reset link.');
        
        successTimeoutRef.current = setTimeout(() => {
          setSuccess('');
        }, 5000);
        
      } else if (isSignUp) {
        const usernameError = validateUsername(username);
        if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
        }

        const emailError = validateEmail(email);
        if (emailError) {
          setError(emailError);
          setLoading(false);
          return;
        }

        const pwdValidation = validatePassword(password);
        if (!pwdValidation.isValid) {
          setError(pwdValidation.errors.join('. '));
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username);
        if (error) throw error;
        
        setSuccess('Account created! Check your email to confirm your account.');
        setPassword('');
        
        setTimeout(() => {
          onClose();
        }, 2000);
        
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          setLoginAttempts(prev => prev + 1);
          lastAttemptTime.current = Date.now();
          throw error;
        }
        
        setPassword('');
        setLoginAttempts(0);
        setIsRateLimited(false);
        onClose();
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err));
      console.error('Auth error:', {
        type: isSignUp ? 'signup' : 'signin',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setIsSignUp(false);
    setError('');
    setSuccess('');
    setPassword('');
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setIsSignUp(false);
    setError('');
    setSuccess('');
    setPassword('');
  };

  const handleModalClose = () => {
    setPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getStrengthWidth = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'w-1/3';
      case 'medium': return 'w-2/3';
      case 'strong': return 'w-full';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </h2>
          <button
            onClick={handleModalClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {isRateLimited && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-700 rounded p-3">
            <p className="text-yellow-300 text-sm">
              ⚠️ Too many attempts. Please wait before trying again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {isSignUp && !isForgotPassword && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username123"
                autoComplete="username"
                required
                maxLength={30}
                aria-describedby="username-help"
              />
              <p id="username-help" className="text-xs text-gray-400 mt-1">
                3-30 characters. Letters, numbers, hyphens, and underscores only.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={72}
                aria-describedby={isSignUp ? 'password-strength' : undefined}
              />
              
              {/* Password Strength Indicator */}
              {isSignUp && passwordValidation && password.length > 0 && (
                <div id="password-strength" className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">Password Strength:</span>
                    <span className={`font-medium ${
                      passwordValidation.strength === 'weak' ? 'text-red-400' :
                      passwordValidation.strength === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {passwordValidation.strength.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor(passwordValidation.strength)} ${getStrengthWidth(passwordValidation.strength)}`}
                    ></div>
                  </div>
                  
                  {/* Validation Errors */}
                  {passwordValidation.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordValidation.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-red-400 flex items-start">
                          <span className="mr-1">✗</span>
                          <span>{err}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Validation Warnings */}
                  {passwordValidation.warnings.length > 0 && passwordValidation.errors.length === 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordValidation.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-yellow-400 flex items-start">
                          <span className="mr-1">⚠</span>
                          <span>{warning}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Entropy Display for Strong Passwords */}
                  {passwordValidation.isValid && passwordValidation.strength === 'strong' && (
                    <p className="text-xs text-green-400 mt-2 flex items-start">
                      <span className="mr-1">✓</span>
                      <span>Strong password! ({Math.floor(passwordValidation.entropy)} bits of entropy)</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && passwordValidation !== null && !passwordValidation.isValid)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors"
          >
            {loading ? 'Loading...' : (isForgotPassword ? 'Send Reset Email' : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {isForgotPassword ? (
            <button
              onClick={handleBackToSignIn}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Back to Sign In
            </button>
          ) : !isSignUp ? (
            <>
              <button
                onClick={handleForgotPassword}
                className="text-blue-400 hover:text-blue-300 text-sm block w-full"
              >
                Forgot Password?
              </button>
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setSuccess('');
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Don't have an account? Sign Up
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setSuccess('');
                setPasswordValidation(null);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Already have an account? Sign In
            </button>
          )}
        </div>

        {/* OWASP Security Notice */}
        {isSignUp && (
          <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-4">
            <p className="mb-2">🔒 <strong>Security Notice:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Passwords are encrypted and securely stored</li>
              <li>We'll never share your data with third parties</li>
              <li>Use a unique password you don't use elsewhere</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;