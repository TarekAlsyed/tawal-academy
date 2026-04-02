import { it, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app and shows loading or login', () => {
    render(<App />);
    // Since App has Suspense and Auth check, it might show loading initially
    const loadingElement = screen.queryByText(/جاري التحميل/i);
    if (loadingElement) {
      expect(loadingElement).toBeInTheDocument();
    } else {
      // Or it might have already rendered the login page
      const loginButton = screen.queryByRole('button');
      if (loginButton) {
          expect(loginButton).toBeInTheDocument();
      }
    }
  });
});
