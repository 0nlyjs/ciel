"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCielStore } from "@/store/useCielStore";

// web speech api type overrides
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onnomatch: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// speech-to-text hook with volume monitoring
export function useSpeechToText(onTranscriptComplete?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const setCielStatus = useCielStore((s) => s.setCielStatus);
  const setCurrentVolume = useCielStore((s) => s.setCurrentVolume);

  // shut down mic analysis
  const stopMicrophoneAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setCurrentVolume(0);
  }, [setCurrentVolume]);

  // analyze mic volume to drive 3D orb wobbling
  const startMicrophoneAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // calculate average volume (approx RMS)
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const normalizedVolume = Math.min(average / 128, 1); // scale to [0, 1]
        setCurrentVolume(normalizedVolume);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("Microphone access denied or failed", err);
    }
  }, [setCurrentVolume]);

  // configure speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setCielStatus("listening");
      };

      recognition.onend = () => {
        setIsListening(false);
        setCielStatus("idle");
        stopMicrophoneAnalysis();
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech Recognition Error", event.error);
        setIsListening(false);
        setCielStatus("error");
        setTimeout(() => setCielStatus("idle"), 2000);
        stopMicrophoneAnalysis();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcriptText = event.results[0][0].transcript;
        if (onTranscriptComplete && transcriptText.trim()) {
          onTranscriptComplete(transcriptText);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscriptComplete, setCielStatus, stopMicrophoneAnalysis]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        startMicrophoneAnalysis();
      } catch (e) {
        console.error("Failed to start SpeechRecognition", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      stopMicrophoneAnalysis();
    }
  };

  // clean up timers on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    supported,
  };
}

// text-to-speech hook for ciel's voice replies
// Uses browser SpeechSynthesis (local TTS only)
export function useTextToSpeech() {
  const setCielStatus = useCielStore((s) => s.setCielStatus);
  const setCurrentVolume = useCielStore((s) => s.setCurrentVolume);
  const ttsVoice = useCielStore((s) => s.ttsVoice);
  const ttsSpeed = useCielStore((s) => s.ttsSpeed);
  const animationFrameRef = useRef<number | null>(null);

  // Stop TTS when the hook/component unmounts (e.g. changing tabs)
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Strip markdown/html for clean speech text
  const stripFormatting = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[^a-zA-Z0-9\s.,;:!?'"()\-/]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Get available browser voices with gender hints
  // Filtered exclusively to Google UK English Female (default) and UK English Male
  const getAvailableVoices = (): Array<{
    name: string;
    lang: string;
    gender: string;
  }> => {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    
    const voices = window.speechSynthesis.getVoices();
    
    // Find Google UK English Female or fallback to any en-GB female voice
    const femaleVoice = 
      voices.find((v) => v.name === "Google UK English Female") ||
      voices.find((v) => v.lang === "en-GB" && (v.name.toLowerCase().includes("female") || ["Serena", "Kate", "Susan", "Hazel", "Victoria"].some(h => v.name.includes(h)))) ||
      voices.find((v) => v.lang === "en-GB");

    // Find Google UK English Male or fallback to any en-GB male voice
    const maleVoice = 
      voices.find((v) => v.name === "Google UK English Male") ||
      voices.find((v) => v.lang === "en-GB" && v !== femaleVoice && (v.name.toLowerCase().includes("male") || ["Daniel", "George", "Oliver", "James"].some(h => v.name.includes(h)))) ||
      voices.find((v) => v.lang === "en-GB" && v !== femaleVoice);

    const result: Array<{ name: string; lang: string; gender: string }> = [];
    if (femaleVoice) {
      result.push({ name: femaleVoice.name, lang: femaleVoice.lang, gender: "female" });
    }
    if (maleVoice) {
      result.push({ name: maleVoice.name, lang: maleVoice.lang, gender: "male" });
    }
    return result;
  };

  // Preview a voice with a short test sentence
  const previewVoice = (voiceName: string) => {
    stop();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(
      "Hello, this is a calm and pleasant voice.",
    );
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
    
    // Apply speed settings from the store
    const speedVal = parseFloat(ttsSpeed);
    utterance.rate = isNaN(speedVal) ? 1.0 : speedVal;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setCielStatus("speaking");
      simulateSpeakingPulses();
    };
    utterance.onend = () => {
      setCielStatus("idle");
      stopSpeechSimulation();
    };
    utterance.onerror = () => {
      setCielStatus("error");
      stopSpeechSimulation();
      setTimeout(() => setCielStatus("idle"), 2000);
    };
    window.speechSynthesis.speak(utterance);
  };

  // Browser SpeechSynthesis (local TTS)
  // Default voice: Google UK English Female
  const speakBrowser = (text: string, voiceName?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();

    // Resolve the voice to use
    let selectedVoice: SpeechSynthesisVoice | null = null;
    const resolvedVoiceName = voiceName || ttsVoice;

    if (resolvedVoiceName && resolvedVoiceName.trim()) {
      // Use the explicitly requested voice or saved preferred voice
      selectedVoice = voices.find((v) => v.name === resolvedVoiceName.trim()) || null;
    }

    // Strict voice selection fallback (prefers Google UK English Female as default)
    if (!selectedVoice) {
      const isMaleRequest = resolvedVoiceName?.toLowerCase().includes("male") || false;
      if (isMaleRequest) {
        selectedVoice =
          voices.find((v) => v.name === "Google UK English Male") ||
          voices.find((v) => v.lang === "en-GB" && v.name.toLowerCase().includes("male")) ||
          voices.find((v) => v.lang === "en-GB") ||
          null;
      } else {
        selectedVoice =
          voices.find((v) => v.name === "Google UK English Female") ||
          voices.find((v) => v.lang === "en-GB" && v.name.toLowerCase().includes("female")) ||
          voices.find((v) => v.lang === "en-GB") ||
          null;
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Calm voice settings
    const speedVal = parseFloat(ttsSpeed);
    utterance.rate = isNaN(speedVal) ? 1.0 : speedVal;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setCielStatus("speaking");
      simulateSpeakingPulses();
    };

    utterance.onend = () => {
      setCielStatus("idle");
      stopSpeechSimulation();
    };

    utterance.onerror = () => {
      setCielStatus("error");
      stopSpeechSimulation();
      setTimeout(() => setCielStatus("idle"), 2000);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Main speak function
  const speak = (text: string, voiceName?: string) => {
    // Stop any existing speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopSpeechSimulation();

    const clean = stripFormatting(text);
    if (!clean) return;

    speakBrowser(clean, voiceName);
  };

  // fake voice volume pulses so the R3F visual orb animates during speech
  const simulateSpeakingPulses = () => {
    const speakLoop = () => {
      // pattern mimicking verbal cadence
      const pulse =
        0.3 +
        Math.sin(Date.now() * 0.012) * 0.2 +
        Math.cos(Date.now() * 0.03) * 0.15;
      // random gaps to simulate spacing between words
      const wordGap = Math.random() > 0.85 ? 0 : pulse;
      setCurrentVolume(wordGap);
      animationFrameRef.current = requestAnimationFrame(speakLoop);
    };
    speakLoop();
  };

  const stopSpeechSimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCurrentVolume(0);
  };

  const stop = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCielStatus("idle");
    stopSpeechSimulation();
  };

  return { speak, stop, getAvailableVoices, previewVoice };
}
