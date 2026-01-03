/**
 * Vercel AI SDK Provider Configuration
 *
 * This file configures AI providers (OpenAI, Anthropic, etc.) using the Vercel AI SDK.
 * The abstraction layer allows easy switching between providers without changing business logic.
 */

import { openai } from '@ai-sdk/openai';
// Uncomment when you want to add Anthropic support:
// import { anthropic } from '@ai-sdk/anthropic';

/**
 * Provider configuration based on environment variables
 */
export const providers = {
  openai: {
    isAvailable: !!process.env.OPENAI_API_KEY,
    // GPT-4 Turbo for complex tasks (highlight detection)
    gpt4Turbo: openai('gpt-4-turbo'),
    // GPT-4o for faster responses (caption generation)
    gpt4o: openai('gpt-4o'),
    // GPT-3.5 for simple tasks (if needed)
    gpt35: openai('gpt-3.5-turbo'),
  },
  // Uncomment to add Anthropic Claude support
  // anthropic: {
  //   isAvailable: !!process.env.ANTHROPIC_API_KEY,
  //   claude3Opus: anthropic('claude-3-opus-20240229'),
  //   claude3Sonnet: anthropic('claude-3-5-sonnet-20241022'),
  //   claude3Haiku: anthropic('claude-3-haiku-20240307'),
  // },
};

/**
 * Default model selection
 * Change these to switch providers globally
 */
export const defaultModels = {
  // For transcription analysis and highlight detection (using gpt-4o for better structured output support)
  highlightDetection: providers.openai.gpt4o,
  // For caption generation
  captionGeneration: providers.openai.gpt4o,
  // For general text processing
  textProcessing: providers.openai.gpt4o,
};

/**
 * Check if AI services are properly configured
 */
export function checkAIConfiguration() {
  if (!providers.openai.isAvailable) {
    throw new Error(
      'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
    );
  }
}
