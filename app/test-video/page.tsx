'use client';

/**
 * TEST PAGE - Video Processing Without Auth
 *
 * Esta página te permite testear el sistema de procesamiento de videos
 * sin necesidad de autenticación, Stripe, ni setup complejo.
 *
 * Accede en: http://localhost:3000/test-video
 */

import { useState } from 'react';

export default function TestVideoPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testType, setTestType] = useState<'transcribe' | 'highlights' | 'full'>('transcribe');

  async function runTest() {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧪 Video Processing Test Lab
          </h1>
          <p className="text-gray-600">
            Testea el sistema de procesamiento de videos sin autenticación
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Selecciona un Test</h2>

          <div className="space-y-3 mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="testType"
                value="transcribe"
                checked={testType === 'transcribe'}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium">🎤 Transcripción</div>
                <div className="text-sm text-gray-600">
                  Testea la transcripción con Whisper (simulado)
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="testType"
                value="highlights"
                checked={testType === 'highlights'}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium">🎯 Detección de Highlights</div>
                <div className="text-sm text-gray-600">
                  Testea la detección de highlights con AI (simulado)
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="testType"
                value="full"
                checked={testType === 'full'}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium">🚀 Pipeline Completo</div>
                <div className="text-sm text-gray-600">
                  Testea todo el flujo: create video → transcribe → detect → clips
                </div>
              </div>
            </label>
          </div>

          <button
            onClick={runTest}
            disabled={testing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {testing ? '⏳ Ejecutando test...' : '▶️ Ejecutar Test'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <h3 className="text-lg font-semibold text-green-900 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Test Exitoso
              </h3>
            </div>

            <div className="p-6">
              <pre className="bg-gray-50 rounded p-4 overflow-x-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>

              {/* Specific result displays */}
              {result.transcription && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Transcripción:</h4>
                  <p className="text-gray-700">{result.transcription.text}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Segmentos: {result.transcription.segments?.length || 0}
                  </p>
                </div>
              )}

              {result.highlights && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Highlights Detectados:</h4>
                  {result.highlights.highlights?.map((h: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4 mb-3">
                      <div className="font-medium">{h.title}</div>
                      <div className="text-sm text-gray-600">{h.description}</div>
                      <div className="text-sm text-gray-500">
                        Score: {h.score}/100 | {h.startTime}s - {h.endTime}s
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.video && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Video Creado:</h4>
                  <p>ID: {result.video.id}</p>
                  <p>Título: {result.video.title}</p>
                  <p>Estado: {result.video.status}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Esta página está diseñada para testear sin autenticación</li>
            <li>• Usa datos simulados (no hace llamadas reales a OpenAI)</li>
            <li>• El usuario de prueba es: test@clipwise.com</li>
            <li>• Para tests reales, configura OPENAI_API_KEY en .env</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
