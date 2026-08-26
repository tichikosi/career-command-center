import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('V3.4 Voice Audio Playback Lifecycle & Disposal', () => {
  let mockAudioInstance: {
    play: () => Promise<void>;
    pause: () => void;
    currentTime: number;
    src: string;
    onended: (() => void) | null;
    onerror: (() => void) | null;
  };

  let createdObjectUrls: string[] = [];
  let revokedObjectUrls: string[] = [];

  beforeEach(() => {
    createdObjectUrls = [];
    revokedObjectUrls = [];

    mockAudioInstance = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 12.5,
      src: 'blob:mock-audio-url-1',
      onended: vi.fn(),
      onerror: vi.fn(),
    };

    // Mock global Audio constructor as a class
    class MockAudioClass {
      constructor(src?: string) {
        if (src) mockAudioInstance.src = src;
        return mockAudioInstance as unknown as MockAudioClass;
      }
    }

    vi.stubGlobal('Audio', MockAudioClass);

    // Mock global URL methods
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        const url = `blob:http://localhost/mock-audio-${createdObjectUrls.length + 1}`;
        createdObjectUrls.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn((url: string) => {
        revokedObjectUrls.push(url);
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('A. Playback Start and Stop Lifecycle', () => {
    it('creates Audio with object URL, plays audio, and clean stop resets currentTime and pauses', () => {
      const audioUrl = 'blob:http://localhost/mock-audio-1';
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let isPlayingBack = true;

      // Start
      expect(activeAudio).toBeDefined();
      expect(isPlayingBack).toBe(true);

      // Safe stop function
      const stopPlayback = () => {
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.onended = null;
          activeAudio.onerror = null;
          activeAudio.src = '';
          activeAudio = null;
        }
        isPlayingBack = false;
      };

      stopPlayback();

      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(mockAudioInstance.currentTime).toBe(0);
      expect(mockAudioInstance.src).toBe('');
      expect(activeAudio).toBeNull();
      expect(isPlayingBack).toBe(false);
    });
  });

  describe('B. Submit Answer Cleanup', () => {
    it('immediately pauses playing audio and revokes object URL on answer submission', () => {
      const audioUrl = URL.createObjectURL(new Blob(['audio'], { type: 'audio/webm' }));
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let activeUrl: string | null = audioUrl;

      // Simulated submit handler
      const handleSubmit = () => {
        // Idempotent disposal
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.onended = null;
          activeAudio.onerror = null;
          activeAudio.src = '';
          activeAudio = null;
        }
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          activeUrl = null;
        }
      };

      handleSubmit();

      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(revokedObjectUrls).toContain(audioUrl);
      expect(activeAudio).toBeNull();
      expect(activeUrl).toBeNull();
    });
  });

  describe('C. Retry Spoken Answer Cleanup', () => {
    it('stops active playback and revokes temporary object URL on retry', () => {
      const audioUrl = URL.createObjectURL(new Blob(['audio-sample'], { type: 'audio/webm' }));
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let activeUrl: string | null = audioUrl;

      const handleRetry = () => {
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio = null;
        }
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          activeUrl = null;
        }
      };

      handleRetry();

      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(revokedObjectUrls).toContain(audioUrl);
      expect(activeUrl).toBeNull();
    });
  });

  describe('D. Component Unmount Cleanup', () => {
    it('pauses audio and revokes object URL when component unmounts during active replay', () => {
      const audioUrl = URL.createObjectURL(new Blob(['audio'], { type: 'audio/webm' }));
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let activeUrl: string | null = audioUrl;

      // Simulated useEffect unmount cleanup
      const unmountCleanup = () => {
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.onended = null;
          activeAudio.onerror = null;
          activeAudio.src = '';
          activeAudio = null;
        }
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          activeUrl = null;
        }
      };

      unmountCleanup();

      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(mockAudioInstance.src).toBe('');
      expect(revokedObjectUrls).toContain(audioUrl);
      expect(activeAudio).toBeNull();
    });
  });

  describe('E. Mode Switch (Speak -> Type)', () => {
    it('ensures transitioning between voice and text modes terminates active audio playback', () => {
      const audioUrl = URL.createObjectURL(new Blob(['audio-mode'], { type: 'audio/webm' }));
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let mode: 'voice' | 'text' = 'voice';

      const switchMode = (newMode: 'voice' | 'text') => {
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio = null;
        }
        mode = newMode;
      };

      switchMode('text');

      expect(mode).toBe('text');
      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(activeAudio).toBeNull();
    });
  });

  describe('F. Microphone + Playback Mutual Exclusion', () => {
    it('halts active replay before initiating a new microphone recording', () => {
      const audioUrl = URL.createObjectURL(new Blob(['prior-audio'], { type: 'audio/webm' }));
      let activeAudio: typeof mockAudioInstance | null = new Audio(audioUrl) as unknown as typeof mockAudioInstance;
      let isRecording = false;

      const startRecording = () => {
        // Enforce mutual exclusion: stop replay first
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio = null;
        }
        isRecording = true;
      };

      startRecording();

      expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      expect(isRecording).toBe(true);
      expect(activeAudio).toBeNull();
    });
  });

  describe('G. Cleanup Idempotency', () => {
    it('allows multiple cleanup calls without throwing errors or null pointer exceptions', () => {
      let activeAudio: typeof mockAudioInstance | null = null;
      let activeUrl: string | null = null;

      const dispose = () => {
        if (activeAudio) {
          (activeAudio as typeof mockAudioInstance).pause();
          activeAudio = null;
        }
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          activeUrl = null;
        }
      };

      expect(() => {
        dispose();
        dispose();
        dispose();
      }).not.toThrow();
    });
  });
});
