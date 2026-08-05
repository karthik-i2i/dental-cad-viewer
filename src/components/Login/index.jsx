import React, { useState } from 'react';
import styles from './Login.module.css';

export default function LoginStep({ onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Simulate authentication
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Demo: accept any valid email/password combination
      onLogin({ email, userName: email.split('@')[0] });
    }, 1000);
  };

  const handleRegister = () => {
    setError('');
    if (typeof onRegister === 'function') {
      onRegister();
      return;
    }

    setError('Registration flow is not configured yet. Please contact administrator.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img
              className={styles.logo}
              src="/logo-kallisio.svg"
              alt="Kallisio Stentra Design System"
            />
          </div>
          <p className={styles.subtitle}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button
          type="button"
          className={styles.demoBtn}
          onClick={handleRegister}
          disabled={isLoading}
        >
          Register
        </button>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Kallisio Inc. proprietary & confidential
          </p>
        </div>
      </div>
    </div>
  );
}
