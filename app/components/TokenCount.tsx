// Stateless TokenCount: derives and displays counts without mutating global atoms
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { memo, useMemo } from 'react';

import { modelAtom, systemMessageMaxTokens, tokensAtom } from '@/app/utils/atoms';
import { modelFromName } from '@/app/utils/models';
import { getTokenCount } from '@/app/utils/tokens';

interface TokenCountProps {
  input?: string;
  systemMessage: string;
  display?: 'input' | 'systemMessage';
  useLocalCalculation?: boolean;
}

export const TokenCount = memo(
  ({
    input = '',
    systemMessage,
    display = 'input',
    useLocalCalculation = false,
  }: TokenCountProps) => {
    const modelName = useAtomValue(modelAtom);
    const tokens = useAtomValue(tokensAtom); // Display precomputed values from App
    const model = modelFromName(modelName);
    const maxTokens = model?.maxInputTokens || 16384;

    // Local derived counts for display fallback if tokensAtom not yet populated
    const systemMessageCount = useMemo(
      () => (systemMessage ? getTokenCount(systemMessage) : 0),
      [systemMessage]
    );
    const inputCount = useMemo(() => (input ? getTokenCount(input) : 0), [input]);
    const remainingFallback = maxTokens - (systemMessageCount + inputCount);
    const systemRemainingFallback = systemMessageMaxTokens - systemMessageCount;

    return (
      <div
        className={clsx('text-xs text-muted-foreground uppercase', {
          '-mb-3': display === 'systemMessage',
          'mb-1': display !== 'systemMessage',
        })}
        key={`${display}-token-count`}
      >
        <strong>
          {useLocalCalculation
            ? display === 'systemMessage'
              ? systemMessageCount
              : inputCount
            : (tokens[display] ??
              (display === 'systemMessage' ? systemMessageCount : inputCount))}{' '}
          <span className='font-normal'>
            Token{(tokens.input ?? inputCount) === 1 ? '' : 's '}
          </span>{' '}
          /{' '}
          {useLocalCalculation
            ? display === 'systemMessage'
              ? systemRemainingFallback
              : remainingFallback
            : display === 'systemMessage'
              ? (tokens.systemMessageRemaining ?? systemRemainingFallback)
              : (tokens.remaining ?? remainingFallback)}{' '}
          <span className='font-normal'>Remaining</span>
        </strong>
      </div>
    );
  }
);

TokenCount.displayName = 'TokenCount';

export default TokenCount;
