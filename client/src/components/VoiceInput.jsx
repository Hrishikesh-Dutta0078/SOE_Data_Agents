import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import useVoiceToken from '../hooks/useVoiceToken';
import { normalizeTranscript, MAX_RECORDING_MS, RECOGNITION_LANGUAGE } from '../utils/voiceConfig';

const VOICE_STATES = { IDLE: 'idle', AWAITING_TOKEN: 'awaiting_token', LISTENING: 'listening' };

let speechModulesPromise = null;
function loadSpeechModules() {
  if (!speechModulesPromise) {
    speechModulesPromise = Promise.all([
      import('react-speech-recognition'),
      import('web-speech-cognitive-services'),
    ]).then(([speechRecModule, azureModule]) => ({
      SpeechRecognition: speechRecModule.default,
      useSpeechRecognition: speechRecModule.useSpeechRecognition,
      createSpeechServicesPonyfill: azureModule.createSpeechServicesPonyfill || azureModule.default?.createSpeechServicesPonyfill || azureModule.default,
    }));
  }
  return speechModulesPromise;
}

function VoiceTranscriptBridge({ speechModules, onInterimTranscript, onFinalTranscript }) {
  const { transcript, resetTranscript, listening } = speechModules.useSpeechRecognition();
  const prevListeningRef = useRef(listening);

  useEffect(() => {
    if (listening && transcript) {
      onInterimTranscript?.(transcript);
    }
  }, [transcript, listening, onInterimTranscript]);

  useEffect(() => {
    if (prevListeningRef.current && !listening && transcript) {
      const normalized = normalizeTranscript(transcript);
      onFinalTranscript?.(normalized);
      resetTranscript();
    }
    prevListeningRef.current = listening;
  }, [listening, transcript, onFinalTranscript, resetTranscript]);

  return null;
}

export default function VoiceInput({ onInterimTranscript, onFinalTranscript, onError, onListeningChange, stopRef, disabled = false }) {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [micHidden, setMicHidden] = useState(false);
  const [speechModules, setSpeechModules] = useState(null);
  const { getToken } = useVoiceToken();
  const maxDurationTimer = useRef(null);
  const polyfillApplied = useRef(false);

  const startListening = useCallback(async () => {
    console.log('[VoiceInput] startListening called, state:', voiceState, 'disabled:', disabled);
    if (voiceState !== VOICE_STATES.IDLE || disabled) return;

    setVoiceState(VOICE_STATES.AWAITING_TOKEN);

    try {
      console.log('[VoiceInput] Loading speech modules + fetching token...');
      let modules, tokenData;
      try {
        modules = await loadSpeechModules();
        console.log('[VoiceInput] Speech modules loaded OK');
      } catch (modErr) {
        console.error('[VoiceInput] Speech module load FAILED:', modErr);
        throw modErr;
      }
      try {
        tokenData = await getToken();
        console.log('[VoiceInput] Token received OK, region:', tokenData.region);
      } catch (tokErr) {
        console.error('[VoiceInput] Token fetch FAILED:', tokErr);
        throw tokErr;
      }

      if (!speechModules) setSpeechModules(modules);

      if (!polyfillApplied.current) {
        const { SpeechRecognition, createSpeechServicesPonyfill } = modules;
        const { SpeechRecognition: AzureSpeechRecognition } = createSpeechServicesPonyfill({
          credentials: {
            region: tokenData.region,
            authorizationToken: tokenData.token,
          },
        });
        SpeechRecognition.applyPolyfill(AzureSpeechRecognition);
        polyfillApplied.current = true;
      }

      const { SpeechRecognition } = modules;
      await SpeechRecognition.startListening({
        continuous: true,
        language: RECOGNITION_LANGUAGE,
      });

      setVoiceState(VOICE_STATES.LISTENING);
      onListeningChange?.(true);

      maxDurationTimer.current = setTimeout(() => {
        stopListening(modules);
      }, MAX_RECORDING_MS);
    } catch (err) {
      console.error('[VoiceInput] startListening error:', err);
      setVoiceState(VOICE_STATES.IDLE);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('microphone')) {
        setMicHidden(true);
        onError?.('Microphone access required for voice input');
      } else {
        onError?.('Voice unavailable, please type your question');
      }
    }
  }, [voiceState, disabled, getToken, speechModules, onError]);

  const stopListening = useCallback((modules) => {
    if (maxDurationTimer.current) {
      clearTimeout(maxDurationTimer.current);
      maxDurationTimer.current = null;
    }
    const mods = modules || speechModules;
    if (mods) {
      mods.SpeechRecognition.abortListening();
    }
    setVoiceState(VOICE_STATES.IDLE);
    onListeningChange?.(false);
  }, [speechModules, onListeningChange]);

  // Expose stop function to parent via ref
  useEffect(() => {
    if (stopRef) stopRef.current = stopListening;
  }, [stopRef, stopListening]);

  const toggleListening = useCallback(() => {
    if (voiceState === VOICE_STATES.LISTENING) {
      stopListening();
    } else if (voiceState === VOICE_STATES.IDLE) {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleListening]);

  useEffect(() => {
    return () => {
      if (maxDurationTimer.current) clearTimeout(maxDurationTimer.current);
    };
  }, []);

  if (micHidden) return null;

  const isListening = voiceState === VOICE_STATES.LISTENING;
  const isLoading = voiceState === VOICE_STATES.AWAITING_TOKEN;

  return (
    <>
      {speechModules && (
        <VoiceTranscriptBridge
          speechModules={speechModules}
          onInterimTranscript={onInterimTranscript}
          onFinalTranscript={onFinalTranscript}
        />
      )}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || isLoading}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={isListening}
        className={`
          w-10 h-10 flex items-center justify-center rounded-[8px] shrink-0 transition-all
          focus:outline-none focus:ring-2 focus:ring-indigo-500/30
          ${isListening
            ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer animate-pulse'
            : isLoading
              ? 'bg-stone-100 text-stone-400 cursor-wait'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 cursor-pointer'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isListening ? 'Stop listening (Ctrl+Shift+M)' : 'Voice input (Ctrl+Shift+M)'}
      >
        {isLoading ? (
          <Loader2 size={18} strokeWidth={2} className="animate-spin" />
        ) : isListening ? (
          <Square size={16} strokeWidth={2.5} />
        ) : (
          <Mic size={18} strokeWidth={2} />
        )}
      </button>
    </>
  );
}
