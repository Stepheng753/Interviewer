import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

describe('App Component Unit Tests', () => {
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

    // Mock scrollTo and scrollIntoView
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should render the login card by default', () => {
    render(<App />);
    
    const logoHeaders = screen.getAllByText(/AIU/i);
    expect(logoHeaders.length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('you@domain.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });

  it('should switch to registration view when clicking register link', () => {
    render(<App />);
    
    const registerLink = screen.getByText('Register here');
    fireEvent.click(registerLink);
    
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register Account' })).toBeInTheDocument();
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

  it('should initialize WebSocket with correct category and token when category is selected', async () => {
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

    class MockWebSocket {
      url: string;
      readyState = 1; // OPEN
      static instances: MockWebSocket[] = [];
      constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
      }
      send = vi.fn();
      close = vi.fn();
    }
    MockWebSocket.instances = [];
    const originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as any;

    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }]
    };
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      },
      configurable: true
    });

    // Mock AudioContext
    class MockAudioContext {
      sampleRate = 16000;
      state = 'running';
      destination = {};
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
      createScriptProcessor() {
        return { connect: vi.fn(), onaudioprocess: null };
      }
      close() {
        return Promise.resolve();
      }
    }
    globalThis.AudioContext = MockAudioContext as any;

    render(<App />);

    // Wait for category screen
    await screen.findByText('Select Interview Track');

    // Click on career category
    const careerBtn = screen.getByText('Career & Ambition');
    fireEvent.click(careerBtn);

    // Verify WebSocket is created with isResume=false
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });
    const wsUrl = MockWebSocket.instances[0].url;
    expect(wsUrl).toContain('category=career');
    expect(wsUrl).toContain('isResume=false');
    expect(wsUrl).toContain('token=fake-token-123');

    // Clean up
    globalThis.WebSocket = originalWebSocket;
    await act(async () => {
      await historyPromise;
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  });
});

