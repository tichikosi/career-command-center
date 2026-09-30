'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconMicrophone as Mic,
  IconMicrophoneOff as MicOff,
  IconSquare as Square,
  IconPlay as Play,
  IconRotateCcw as RotateCcw,
  IconAlertTriangle as AlertCircle,
  IconClock as Clock,
  IconSparkles as Sparkles,
  IconVolume as Volume2,
  IconEdit3 as Edit3,
} from '@/components/icons';
import {
  VoiceDeliveryMetrics,
  TranscriptSource,
  InterviewerPersona,
} from '@/types/interview';
import {
  calculateDeliveryMetrics,
  combineTranscripts,
  cleanTranscriptDuplicates,
  detectLargeBlockDuplicate,
  RawPauseEvent,
} from '@/lib/voiceDeliveryEngine';

export interface VoiceAnswerCaptureProps {
  onTranscriptReady: (
    transcript: string,
    metrics: VoiceDeliveryMetrics,
    source: TranscriptSource
  ) => void;
  disabled?: boolean;
  timeLimitSeconds?: number;
  isTimedMode?: boolean;
  onTimeout?: () => void;
  persona?: InterviewerPersona;
  onCancel?: () => void;
  initialTranscript?: string;
}

type CaptureState =
  | 'idle'
  | 'requesting_permission'
  | 'ready'
  | 'recording'
  | 'reviewing'
  | 'permission_denied'
  | 'unsupported';

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface IWindowSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

export const VoiceAnswerCapture: React.FC<VoiceAnswerCaptureProps> = ({
  onTranscriptReady,
  disabled = false,
  timeLimitSeconds,
  isTimedMode = false,
  onTimeout,
  persona,
  onCancel,
  initialTranscript = '',
}) => {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [interimText, setInterimText] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource>('browser_stt');
  const [isPlayingBack, setIsPlayingBack] = useState<boolean>(false);
  const [playbackAudioUrl, setPlaybackAudioUrl] = useState<string | null>(null);

  // References for hardware resources and playback lifecycle
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const pausesRef = useRef<RawPauseEvent[]>([]);
  const lastVoiceActivityTimeRef = useRef<number>(0);
  const currentPauseStartRef = useRef<number | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioUrlRef = useRef<string | null>(null);

  // Decoupled instance commit idempotency state
  const instanceGenRef = useRef<number>(0);
  const activeInstanceIdRef = useRef<number>(0);
  const committedInstancesRef = useRef<Set<number>>(new Set());
  const sessionCommittedTranscriptRef = useRef<string>('');
  const currentInstanceFinalRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);
  const initRecognitionRef = useRef<(() => IWindowSpeechRecognition | null) | null>(null);

  // Central idempotent audio playback teardown
  const stopPlayback = useCallback(() => {
    if (audioPlaybackRef.current) {
      try {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current.currentTime = 0;
        audioPlaybackRef.current.onended = null;
        audioPlaybackRef.current.onerror = null;
        audioPlaybackRef.current.src = '';
      } catch {
        // Safe ignore
      }
      audioPlaybackRef.current = null;
    }
    setIsPlayingBack(false);
  }, []);

  // Complete disposal of audio playback element and temporary Object URL
  const disposePlaybackAudio = useCallback(() => {
    stopPlayback();
    if (playbackAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(playbackAudioUrlRef.current);
      } catch {
        // Safe ignore
      }
      playbackAudioUrlRef.current = null;
      setPlaybackAudioUrl(null);
    }
  }, [stopPlayback]);

  // Full cleanup of all microphone and audio hardware resources
  const cleanupResources = useCallback(() => {
    isRecordingRef.current = false;

    // 1. Immediately pause and dispose any active playback
    disposePlaybackAudio();

    // 2. Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 3. Cancel animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 4. Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Safe ignore
      }
      recognitionRef.current = null;
    }

    // 5. Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Safe ignore
      }
      mediaRecorderRef.current = null;
    }

    // 6. Stop all MediaStream tracks (releases microphone indicator in browser)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 7. Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Safe ignore
      }
      audioContextRef.current = null;
    }
  }, [disposePlaybackAudio]);

  // Clean up on component unmount (route change, tab switch, mode switch)
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // Single authoritative instance commit helper guaranteeing exact-once commit
  const commitInstanceFinal = useCallback((instanceId: number, trailingInterim?: string) => {
    if (committedInstancesRef.current.has(instanceId)) {
      return;
    }
    committedInstancesRef.current.add(instanceId);

    const instanceText = currentInstanceFinalRef.current.trim();
    let textToCommit = instanceText;
    if (trailingInterim && trailingInterim.trim()) {
      textToCommit = combineTranscripts(textToCommit, trailingInterim.trim());
    }

    if (textToCommit) {
      sessionCommittedTranscriptRef.current = combineTranscripts(
        sessionCommittedTranscriptRef.current,
        textToCommit
      );
    }
    currentInstanceFinalRef.current = '';
  }, []);

  // Request user-initiated microphone access
  const requestMicrophoneAccess = async () => {
    setErrorMessage(null);
    setCaptureState('requesting_permission');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCaptureState('unsupported');
        setErrorMessage('Microphone access is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setCaptureState('ready');
    } catch (err: unknown) {
      console.warn('[VoiceAnswerCapture] Microphone permission denied or failed:', err);
      setCaptureState('permission_denied');
      setErrorMessage('Microphone permission was denied. Please allow microphone access to practice speaking.');
    }
  };

  // Helper to initialize and bind a SpeechRecognition instance with explicit instance ownership
  const initRecognition = useCallback(() => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => IWindowSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => IWindowSpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRec) return null;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const instanceId = ++instanceGenRef.current;
      activeInstanceIdRef.current = instanceId;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Drop any late onresult callbacks if recording stopped or instance already committed
        if (!isRecordingRef.current || committedInstancesRef.current.has(instanceId)) {
          return;
        }

        let instanceFinal = '';
        let instanceInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            instanceFinal += item[0].transcript + ' ';
          } else {
            instanceInterim += item[0].transcript;
          }
        }

        currentInstanceFinalRef.current = instanceFinal.trim();

        const combinedFinal = combineTranscripts(
          sessionCommittedTranscriptRef.current,
          currentInstanceFinalRef.current
        );

        setTranscript(combinedFinal);
        setInterimText(instanceInterim.trim());
      };

      recognition.onerror = (event: unknown) => {
        console.warn('[VoiceAnswerCapture] SpeechRecognition notice:', event);
      };

      recognition.onend = () => {
        // Continuous restart handling: commit current instance's final text before restarting
        if (isRecordingRef.current && !committedInstancesRef.current.has(instanceId)) {
          commitInstanceFinal(instanceId);
          setInterimText('');

          // Safely restart recognition instance with fresh instance ID
          try {
            const nextRec = initRecognitionRef.current ? initRecognitionRef.current() : null;
            if (nextRec) {
              nextRec.start();
              recognitionRef.current = nextRec;
            }
          } catch (e) {
            console.warn('[VoiceAnswerCapture] SpeechRecognition restart notice:', e);
          }
        }
      };

      return recognition;
    } catch (e) {
      console.warn('[VoiceAnswerCapture] Web Speech API initialization notice:', e);
      return null;
    }
  }, [commitInstanceFinal]);

  useEffect(() => {
    initRecognitionRef.current = initRecognition;
  }, [initRecognition]);

  // Start recording answer (enforces mutual exclusion and clean instance tracking)
  const startRecording = () => {
    // 0. Ensure all replay playback is stopped immediately
    disposePlaybackAudio();

    if (!streamRef.current) {
      requestMicrophoneAccess();
      return;
    }

    setTranscript('');
    setInterimText('');
    setElapsedSeconds(0);
    setTranscriptSource('browser_stt');
    audioChunksRef.current = [];
    pausesRef.current = [];
    lastVoiceActivityTimeRef.current = Date.now();
    currentPauseStartRef.current = null;
    recordingStartTimeRef.current = Date.now();

    // Reset decoupled instance commit tracking
    committedInstancesRef.current.clear();
    instanceGenRef.current = 0;
    activeInstanceIdRef.current = 0;
    sessionCommittedTranscriptRef.current = '';
    currentInstanceFinalRef.current = '';
    isRecordingRef.current = true;

    // 1. Setup AudioContext and Analyser for live volume meter & silence detection
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const sourceNode = audioCtx.createMediaStreamSource(streamRef.current);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, val) => acc + val, 0);
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioVolume(normalized);

          // Real-time pause & silence detection (> 0.4s silence)
          const now = Date.now();
          if (normalized < 8) {
            if (currentPauseStartRef.current === null) {
              currentPauseStartRef.current = now;
            }
          } else {
            if (currentPauseStartRef.current !== null) {
              const pauseDuration = (now - currentPauseStartRef.current) / 1000;
              if (pauseDuration >= 0.4) {
                const relativeStart = (currentPauseStartRef.current - recordingStartTimeRef.current) / 1000;
                pausesRef.current.push({
                  start: Math.round(relativeStart * 10) / 10,
                  duration: Math.round(pauseDuration * 10) / 10,
                });
              }
              currentPauseStartRef.current = null;
            }
            lastVoiceActivityTimeRef.current = now;
          }

          animFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        animFrameRef.current = requestAnimationFrame(updateAudioMeter);
      }
    } catch (e) {
      console.warn('[VoiceAnswerCapture] Web Audio API analyser setup error:', e);
    }

    // 2. Setup MediaRecorder for ephemeral audio duration & optional review
    try {
      const recorder = new MediaRecorder(streamRef.current);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('[VoiceAnswerCapture] MediaRecorder failed:', e);
    }

    // 3. Setup Web Speech Recognition
    const recognition = initRecognition();
    if (recognition) {
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('[VoiceAnswerCapture] Recognition start failed:', e);
      }
    }

    // 4. Start timer
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (timeLimitSeconds && next >= timeLimitSeconds) {
          if (onTimeout) onTimeout();
        }
        return next;
      });
    }, 1000);

    setCaptureState('recording');
  };

  // Stop recording and transition to review & edit mode with race-free exact-once commit
  const stopRecording = () => {
    isRecordingRef.current = false;

    // Check if a pause was active at the end
    if (currentPauseStartRef.current !== null) {
      const duration = (Date.now() - currentPauseStartRef.current) / 1000;
      if (duration >= 0.4) {
        const start = (currentPauseStartRef.current - recordingStartTimeRef.current) / 1000;
        pausesRef.current.push({
          start: Math.round(start * 10) / 10,
          duration: Math.round(duration * 10) / 10,
        });
      }
      currentPauseStartRef.current = null;
    }

    // 1. Immediately detach listeners and stop Speech Recognition to prevent late onresult/onend callbacks
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    // 2. Stop timer & animation
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioVolume(0);

    // 3. Stop MediaRecorder and build ephemeral in-memory playback URL
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          if (playbackAudioUrlRef.current) {
            try {
              URL.revokeObjectURL(playbackAudioUrlRef.current);
            } catch {
              // Safe ignore
            }
          }
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          playbackAudioUrlRef.current = url;
          setPlaybackAudioUrl(url);
        }
      };
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }

    // 4. Commit current recognition instance exactly once with any trailing interim
    commitInstanceFinal(activeInstanceIdRef.current, interimText);

    // 5. Final deterministic deduplication pass on the committed canonical session
    const finalCleaned = cleanTranscriptDuplicates(sessionCommittedTranscriptRef.current);
    sessionCommittedTranscriptRef.current = finalCleaned;
    setTranscript(finalCleaned);
    setInterimText('');

    setCaptureState('reviewing');
  };

  // User manual edits to transcript
  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setTranscript(nextVal);
    sessionCommittedTranscriptRef.current = nextVal;
    setTranscriptSource('manual_edit');
  };

  // Retry answer (stops audio, cleans up playback URL, and resets to ready)
  const handleRetry = () => {
    disposePlaybackAudio();
    committedInstancesRef.current.clear();
    instanceGenRef.current = 0;
    activeInstanceIdRef.current = 0;
    sessionCommittedTranscriptRef.current = '';
    currentInstanceFinalRef.current = '';
    isRecordingRef.current = false;
    setTranscript('');
    setInterimText('');
    setElapsedSeconds(0);
    setCaptureState('ready');
  };

  // In-memory ephemeral audio playback with explicit lifecycle management
  const togglePlayback = () => {
    const activeUrl = playbackAudioUrlRef.current || playbackAudioUrl;
    if (!activeUrl) return;

    if (isPlayingBack) {
      stopPlayback();
    } else {
      stopPlayback();
      try {
        const audio = new Audio(activeUrl);
        audioPlaybackRef.current = audio;
        audio.onended = () => {
          setIsPlayingBack(false);
          audioPlaybackRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingBack(false);
          audioPlaybackRef.current = null;
        };
        audio.play().catch(() => {
          setIsPlayingBack(false);
          audioPlaybackRef.current = null;
        });
        setIsPlayingBack(true);
      } catch {
        setIsPlayingBack(false);
        audioPlaybackRef.current = null;
      }
    }
  };

  // Submit canonical reviewed transcript for AI evaluation
  const handleSubmitAnswer = () => {
    const finalTranscript = cleanTranscriptDuplicates(transcript.trim());
    if (!finalTranscript) {
      setErrorMessage('Please provide a spoken or written response before submitting.');
      return;
    }

    const duplicationCheck = detectLargeBlockDuplicate(finalTranscript);
    if (duplicationCheck.isDuplicate) {
      setErrorMessage('Transcript duplication detected. Please review the transcript or retry your spoken answer before scoring.');
      return;
    }

    // Calculate deterministic metrics from final canonical transcript and actual elapsed duration
    const pauseData = pausesRef.current.length > 0 ? { pauses: pausesRef.current } : undefined;
    const metrics = calculateDeliveryMetrics(
      finalTranscript,
      Math.max(1, elapsedSeconds),
      pauseData
    );

    // Completely release and cleanup all audio tracks, active playback & ephemeral blobs
    cleanupResources();

    // Emit reviewed canonical transcript and recalculated metrics to parent
    onTranscriptReady(finalTranscript, metrics, transcriptSource);
  };

  // Live estimated word count and WPM derived from current canonical text
  const currentRenderedText = (transcript + (interimText ? (transcript ? ' ' : '') + interimText : '')).trim();
  const wordsCount = currentRenderedText.split(/\s+/).filter(Boolean).length;
  const liveWpm = elapsedSeconds > 0 ? Math.round((wordsCount / elapsedSeconds) * 60) : 0;
  const isPlausibilityViolation = liveWpm > 400;
  const duplicationCheck = detectLargeBlockDuplicate(currentRenderedText);
  const hasDuplicationIssue = duplicationCheck.isDuplicate;

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isOvertime = isTimedMode && timeLimitSeconds ? elapsedSeconds > timeLimitSeconds : false;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-5 shadow-lg space-y-4">
      {/* Header with Persona & Mode Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Voice Interview Practice
              {persona && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-indigo-300">
                  {persona.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              Audio is evaluated strictly in-memory. Raw audio is never persisted.
            </p>
          </div>
        </div>

        {/* Elapsed Timer & WPM Counter */}
        {(captureState === 'recording' || captureState === 'reviewing') && (
          <div className="flex items-center space-x-3 text-xs">
            <div className={`flex items-center space-x-1.5 font-mono font-medium ${isOvertime ? 'text-amber-400' : 'text-slate-300'}`}>
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(elapsedSeconds)}</span>
              {isTimedMode && timeLimitSeconds && (
                <span className="text-slate-500">/ {formatTime(timeLimitSeconds)}</span>
              )}
            </div>

            <div className={`rounded px-2 py-1 font-mono ${isPlausibilityViolation || hasDuplicationIssue ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'}`}>
              {liveWpm} <span className="text-slate-500">WPM</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Plausibility and Duplication Warning Banner */}
      {(isPlausibilityViolation || hasDuplicationIssue) && captureState === 'reviewing' && (
        <div className="flex items-start space-x-2 rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong>
              {hasDuplicationIssue ? 'Transcript Duplication Detected: ' : `Pacing Anomaly Detected (${liveWpm} WPM): `}
            </strong>
            <span>
              {hasDuplicationIssue
                ? 'Repeated answer blocks were detected in the speech transcript. Please review and edit your transcript below, or click "Retry Spoken Answer" before scoring.'
                : 'Speech metrics could not be calculated reliably for this answer. Please review and edit your transcript below, or click "Retry Spoken Answer" before submitting.'}
            </span>
          </div>
        </div>
      )}

      {/* State: Idle / Request Permission */}
      {captureState === 'idle' && (
        <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-400 ring-8 ring-indigo-500/5">
            <Mic className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">User-Initiated Microphone Access</p>
            <p className="max-w-md text-xs text-slate-400">
              Career Command Center analyzes speaking pace, concision, and filler words. Click below to begin voice capture.
            </p>
          </div>
          <button
            type="button"
            onClick={requestMicrophoneAccess}
            disabled={disabled}
            className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            <span>Enable Microphone & Practice</span>
          </button>
        </div>
      )}

      {/* State: Requesting Permission */}
      {captureState === 'requesting_permission' && (
        <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-slate-300">Requesting microphone access in browser...</p>
        </div>
      )}

      {/* State: Permission Denied */}
      {captureState === 'permission_denied' && (
        <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
          <MicOff className="h-8 w-8 text-amber-400" />
          <p className="text-xs text-slate-300">Microphone permission was not granted.</p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={requestMicrophoneAccess}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Retry Permission
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Switch to Text Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* State: Ready to Record */}
      {captureState === 'ready' && (
        <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-8 ring-emerald-500/5">
            <Mic className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">Microphone Ready</p>
            <p className="text-xs text-slate-400">
              When ready, press Start Answer and deliver your structured response.
            </p>
          </div>
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-all disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Start Answer</span>
          </button>
        </div>
      )}

      {/* State: Recording */}
      {captureState === 'recording' && (
        <div className="space-y-4">
          {/* Live Volume Meter & Speaking Visualizer */}
          <div className="flex items-center justify-center space-x-1.5 py-2">
            {[...Array(8)].map((_, i) => {
              const heightMultiplier = Math.max(0.2, (audioVolume / 100) * (1 + (i % 3) * 0.4));
              const heightPx = Math.min(32, Math.round(heightMultiplier * 28));
              return (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                  style={{ height: `${Math.max(6, heightPx)}px` }}
                />
              );
            })}
          </div>

          {/* Real-time Streaming Transcript Preview */}
          <div className="min-h-[100px] max-h-[180px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
            <div className="flex items-center justify-between pb-1.5 text-slate-400">
              <span className="flex items-center space-x-1 text-[11px] uppercase font-semibold tracking-wider">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-400" />
                <span>Live Speech Preview</span>
              </span>
              <span className="text-[11px] text-slate-500">{wordsCount} words</span>
            </div>
            <p className="text-slate-200 leading-relaxed font-sans">
              {transcript || interimText ? (
                <>
                  <span>{transcript}</span>
                  {interimText && (
                    <span className="text-indigo-300 italic">
                      {transcript ? ' ' : ''}
                      {interimText}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 italic">
                  Listening... Speak clearly into your microphone.
                </span>
              )}
            </p>
          </div>

          {/* Stop Answer Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center space-x-2 rounded-lg bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-red-500 transition-all"
            >
              <Square className="h-4 w-4 fill-current" />
              <span>Stop Answer & Review</span>
            </button>
          </div>
        </div>
      )}

      {/* State: Reviewing & Canonical Editable Transcript */}
      {captureState === 'reviewing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300">
              <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Review & Edit Canonical Transcript</span>
              {transcriptSource === 'manual_edit' && (
                <span className="rounded bg-indigo-950/80 px-1.5 py-0.5 text-[10px] text-indigo-300 border border-indigo-800/40">
                  Edited
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{wordsCount} words ({liveWpm} WPM)</span>
          </div>

          {/* Editable Textarea for Transcript Corrections */}
          <textarea
            value={transcript}
            onChange={handleTranscriptChange}
            placeholder="Review and edit your spoken answer before submitting..."
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          />

          {/* Review Actions: Listen, Retry, Submit */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center space-x-2">
              {playbackAudioUrl && (
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`inline-flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isPlayingBack
                      ? 'border-indigo-500 bg-indigo-950/80 text-indigo-200'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{isPlayingBack ? 'Stop Playback' : 'Listen Again'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Spoken Answer</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={disabled || !transcript.trim() || hasDuplicationIssue}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Submit Answer for AI Score</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
