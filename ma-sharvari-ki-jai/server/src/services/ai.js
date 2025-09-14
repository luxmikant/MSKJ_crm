const logger = require('../utils/logger');

async function suggestWithGemini(prompt, opts) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // last fallback if user set wrong var
    if (!apiKey) return null;
    // Lazy require to avoid crash if not installed
    let genAI;
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      genAI = new GoogleGenerativeAI(apiKey);
    } catch (e) {
      logger.warn('Gemini SDK not installed, falling back to simple suggestions');
      return null;
    }
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const res = await model.generateContent(prompt);
    const text = res?.response?.text?.();
    if (!text) return null;
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^[-*\d+.\)\s]+/, '').trim())
      .filter((l) => l.length > 0);
    const unique = Array.from(new Set(lines));
    // Return first 3 reasonable-length lines
    const variants = unique.filter((l) => l.length >= 20 && l.length <= 240).slice(0, 3);
    return variants.length ? variants : unique.slice(0, 3);
  } catch (err) {
    logger.error('Gemini suggest error', { err });
    return null;
  }
}

function fallbackSuggestions(goal, { brand, tone = 'friendly', channel = 'EMAIL' } = {}) {
  const brandName = brand || 'our brand';
  const tones = {
    friendly: ['Hi', 'Hello', 'Hey'],
    formal: ['Dear Customer', 'Greetings', 'Hello'],
    excited: ['Great news!', 'Big update!', 'Exciting offer!'],
  };
  const greet = tones[tone]?.[0] || 'Hello';
  const cta = channel === 'SMS' ? 'Reply YES to claim.' : 'Click to learn more.';
  const base = `${greet}! ${goal} — from ${brandName}.`;
  return [
    `${base} We thought you’d love this. ${cta}`,
    `${greet}! Quick note: ${goal}. Don’t miss out with ${brandName}. ${cta}`,
    `${greet}! ${brandName} can help you ${goal.toLowerCase()}. ${cta}`,
  ];
}

function buildPrompt({ goal, brand, tone, channel, segmentSummary, variables }) {
  const v = (variables || []).map((x) => `{{${x}}}`).join(', ');
  return [
    'You are a marketing copywriter. Suggest 3 short message variants.',
    `Goal: ${goal}.`,
    brand ? `Brand: ${brand}.` : '',
    tone ? `Tone: ${tone}.` : '',
    channel ? `Channel: ${channel}.` : '',
    segmentSummary ? `Audience: ${segmentSummary}.` : '',
    variables?.length ? `Available variables: ${v}.` : '',
    'Keep each suggestion under 240 characters. No numbering, just lines.',
  ]
    .filter(Boolean)
    .join('\n');
}

exports.suggestMessage = async function suggestMessage({ goal, brand, tone, channel, segmentSummary, variables }) {
  if (!goal || typeof goal !== 'string') throw new Error('goal is required');
  const prompt = buildPrompt({ goal, brand, tone, channel, segmentSummary, variables });
  const aiVariants = await suggestWithGemini(prompt, { brand, tone, channel });
  if (aiVariants && aiVariants.length) return aiVariants;
  return fallbackSuggestions(goal, { brand, tone, channel });
};

// Generate a full email (subject, preheader, content) from a scenario description
exports.generateEmail = async function generateEmail({ scenario, brand, tone = 'friendly', channel = 'EMAIL', variables = [], length = 'medium' }) {
  if (!scenario || typeof scenario !== 'string') throw new Error('scenario is required');
  const lenHint = length === 'short' ? 'around 80-120 words' : length === 'long' ? 'around 200-300 words' : 'around 120-180 words';
  const varsHint = variables && variables.length ? `Use placeholders: ${variables.map((v) => `{{${v}}}`).join(', ')}.` : '';
  const prompt = [
    'You are a marketing copywriter. Write an email with:',
    '- A compelling subject line (under 80 chars)',
    '- A short preheader (under 120 chars)',
    `- Body ${lenHint} with a clear CTA`,
    `Scenario: ${scenario}`,
    brand ? `Brand: ${brand}` : '',
    `Tone: ${tone}`,
    `Channel: ${channel}`,
    varsHint,
    'Return in JSON with keys: subject, preheader, content. No extra text.'
  ].filter(Boolean).join('\n');

  // Try Gemini to get structured content
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      // Lazy require
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
      const res = await model.generateContent(prompt);
      const text = res?.response?.text?.();
      if (text) {
        // Try to extract JSON from the response
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const json = JSON.parse(match[0]);
            if (json.subject && json.content) {
              return {
                subject: String(json.subject).slice(0, 120),
                preheader: (json.preheader ? String(json.preheader) : '').slice(0, 200),
                content: String(json.content)
              };
            }
          } catch (_) { /* fall through to fallback */ }
        }
      }
    }
  } catch (err) {
    logger.warn('AI generateEmail fell back', { err });
  }

  // Fallback generation
  const subject = `${brand ? brand + ': ' : ''}${scenario}`.slice(0, 78);
  const preheader = `Quick update: ${scenario}`.slice(0, 118);
  const greeting = tone === 'formal' ? 'Dear Customer,' : tone === 'excited' ? 'Hey there!' : 'Hi there,';
  const cta = channel === 'SMS' ? 'Reply YES to claim.' : 'Click the button to get started.';
  const placeholders = variables && variables.length ? `\n\nPersonalize with: ${variables.map((v) => `{{${v}}}`).join(', ')}.` : '';
  const content = [
    greeting,
    '',
    scenario,
    '',
    `We thought this would be valuable to you${brand ? ' from ' + brand : ''}.`,
    '',
    `• What to do next: ${cta}`,
    placeholders,
    '',
    'Best regards,',
    brand || 'Your Team'
  ].filter(Boolean).join('\n');

  return { subject, preheader, content };
};
