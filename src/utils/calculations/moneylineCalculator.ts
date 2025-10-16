/**
 * Moneyline bet calculations
 */
import { Pick } from '../../types/index';
import { ATSResult } from './types';

/**
 * Calculate Moneyline result
 * Simply returns the stored result from the pick
 */
export const calculateMoneylineResult = (pick: Pick): ATSResult => {
  return {
    type: 'moneyline',
    result: (pick.result || 'pending') as 'win' | 'loss' | 'push' | 'pending'
  };
};
