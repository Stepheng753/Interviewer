import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

vi.mock('../src/components/ui/ia-siri-chat', () => {
  return {
    VoiceChat: ({ statusText, onClick }: any) => (
      <button onClick={onClick} data-testid="mock-voice-chat">
        {statusText}
      </button>
    )
  };
});

describe('App Component Dashboard Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
    });

    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should render dashboard layout if token is in localStorage', async () => {
    localStorage.setItem('token', 'fake-token-123');
    
    const mockUser = { id: 1, name: 'Stephen Giang', email: 'sgiang@example.com' };
    let resolveHistoryPromise: any;
    const historyPromise = new Promise((resolve) => {
      resolveHistoryPromise = resolve;
    });
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        } as Response);
      }
      if (url.includes('/history')) {
        const response = Promise.resolve({
          ok: true,
          json: () => {
            resolveHistoryPromise();
            return Promise.resolve([]);
          },
        } as Response);
        return response;
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(<App />);

    // Renders header title
    const headerTitle = await screen.findByText('AIU');
    expect(headerTitle).toBeInTheDocument();

    // Renders the category selection grid on start
    expect(screen.getByText('Select Interview Track')).toBeInTheDocument();

    await act(async () => {
      await historyPromise;
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  });

  it('should open navigation menu when clicking hamburger button', async () => {
    localStorage.setItem('token', 'fake-token-123');
    
    const mockUser = { id: 1, name: 'Stephen Giang', email: 'sgiang@example.com' };
    let resolveHistoryPromise: any;
    const historyPromise = new Promise((resolve) => {
      resolveHistoryPromise = resolve;
    });
    
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        } as Response);
      }
      if (url.includes('/history')) {
        const response = Promise.resolve({
          ok: true,
          json: () => {
            resolveHistoryPromise();
            return Promise.resolve([]);
          },
        } as Response);
        return response;
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(<App />);

    // Wait for dashboard to load
    await screen.findByText('AIU');

    // Find hamburger menu button and click
    const menuBtn = screen.getByTitle('Open menu');
    fireEvent.click(menuBtn);

    // Verify nav menu items are displayed
    expect(screen.getByText('Current Convo')).toBeInTheDocument();
    expect(screen.getByText('Past Convos')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('User Settings')).toBeInTheDocument();
    
    // Toggler should now have close title
    expect(screen.getByTitle('Close menu')).toBeInTheDocument();

    await act(async () => {
      await historyPromise;
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  });
});
