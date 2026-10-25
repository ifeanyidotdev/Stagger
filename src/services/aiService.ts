import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { GlobalSettings } from '../types/settings';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

export const GEMINI_MODELS: AIModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fastest, intelligent, low latency', recommended: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning, complex coding' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-generation multimodal model' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Efficient, high-throughput' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Deep reasoning, large context' },
];

export const OPENAI_MODELS: AIModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable flagship omnimodel', recommended: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable, fast, lightweight' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High precision and instruction following' },
  { id: 'o1', name: 'o1', description: 'Advanced reasoning and mathematical logic' },
  { id: 'o3-mini', name: 'o3-mini', description: 'Fast reasoning model' },
];

export function getAIModel(settings: GlobalSettings) {
  const provider = settings.ai_provider || 'gemini';

  if (provider === 'openai') {
    const apiKey = settings.openai_api_key?.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is missing. Please provide your API key in Settings.');
    }
    const openai = createOpenAI({
      apiKey,
      baseURL: settings.openai_base_url?.trim() || undefined,
    });
    return openai(settings.openai_model?.trim() || 'gpt-4o');
  }

  // Default to Gemini
  const apiKey = settings.gemini_api_key?.trim();
  if (!apiKey) {
    throw new Error('Google Gemini API key is missing. Please provide your API key in Settings.');
  }
  const google = createGoogleGenerativeAI({
    apiKey,
  });
  return google(settings.gemini_model?.trim() || 'gemini-2.5-flash');
}

export async function testAIConnection(settings: GlobalSettings): Promise<{ success: boolean; message: string; response?: string }> {
  try {
    const model = getAIModel(settings);
    const result = await generateText({
      model,
      prompt: 'Respond with the single word "Connected".',
    });
    const text = result.text.trim();
    return {
      success: true,
      message: `Successfully connected to ${settings.ai_provider === 'openai' ? 'OpenAI' : 'Google Gemini'}!`,
      response: text,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return {
      success: false,
      message: msg,
    };
  }
}

export async function generatePullRequestContent(
  settings: GlobalSettings,
  params: {
    baseBranch: string;
    headBranch: string;
    commits: { shortId: string; message: string; author: string }[];
    diffStat?: string;
    term?: 'Pull Request' | 'Merge Request';
  }
): Promise<{ title: string; body: string }> {
  const model = getAIModel(settings);
  const commitLines =
    params.commits.length > 0
      ? params.commits.map(c => `- [${c.shortId}] ${c.message} (${c.author})`).join('\n')
      : '(No commit log available)';

  const prompt = `You are an expert software engineer writing a clear, concise ${params.term || 'Pull Request'} to merge branch "${params.headBranch}" into "${params.baseBranch}".

Commits in this branch:
${commitLines}

${params.diffStat ? `Changed files / diff summary:\n${params.diffStat}\n` : ''}

Return your response in the following exact format (first line starting with TITLE:, followed by BODY:):
TITLE: <concise, descriptive title under 72 characters>
BODY:
## Summary
<1-3 sentences explaining the purpose and impact of these changes>

## Key Changes
<bulleted list of main technical changes>
`;

  const result = await generateText({
    model,
    prompt,
  });

  const raw = result.text.trim();
  const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
  const bodyMatch = raw.match(/BODY:\s*([\s\S]+)$/m);

  if (titleMatch && bodyMatch) {
    return {
      title: titleMatch[1].trim().replace(/^["']|["']$/g, ''),
      body: bodyMatch[1].trim(),
    };
  }

  const lines = raw.split('\n');
  const firstLine = (lines[0] || '').replace(/^#+\s*/, '').replace(/^TITLE:\s*/i, '').trim();
  const rest = lines.slice(1).join('\n').replace(/^BODY:\s*/i, '').trim();

  return {
    title: firstLine || `Merge ${params.headBranch} into ${params.baseBranch}`,
    body: rest || raw,
  };
}
