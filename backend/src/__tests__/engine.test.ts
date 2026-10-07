import { resolveTransition, nextSequential, orderedQuestions } from '../services/conversation/engine';
import { validateAnswer } from '../services/conversation/validators';

const script: any = {
  questions: [
    { id: 'q1', order: 0, text: 'Q1', type: 'yes_no', branches: [{ match: 'yes', matchMode: 'equals', nextQuestionId: 'q3' }] },
    { id: 'q2', order: 1, text: 'Q2', type: 'open_ended' },
    { id: 'q3', order: 2, text: 'Q3', type: 'open_ended', endAfter: true },
  ],
};

describe('conversation engine (deterministic)', () => {
  test('ordered + sequential', () => {
    expect(orderedQuestions(script).map(q => q.id)).toEqual(['q1', 'q2', 'q3']);
    expect(nextSequential(script, 'q1', ['q1'])?.id).toBe('q2');
  });
  test('branching yes → q3', () => {
    expect(resolveTransition(script, script.questions[0], 'yes', ['q1'])?.id).toBe('q3');
    expect(resolveTransition(script, script.questions[0], 'no', ['q1'])?.id).toBe('q2');
  });
  test('endAfter terminates', () => {
    expect(resolveTransition(script, script.questions[2], 'x', ['q1', 'q2', 'q3'])).toBeNull();
  });
});

describe('validators', () => {
  test('yes/no', () => {
    expect(validateAnswer({ type: 'yes_no' } as any, 'Yes, I have').valid).toBe(true);
    expect(validateAnswer({ type: 'yes_no' } as any, 'maybe later').valid).toBe(false);
  });
  test('number + rating + email + phone', () => {
    expect(validateAnswer({ type: 'number', min: 0, max: 50 } as any, 'I have 2 years').normalized).toBe('2');
    expect(validateAnswer({ type: 'rating', max: 5 } as any, '4').valid).toBe(true);
    expect(validateAnswer({ type: 'email' } as any, 'a@b.com').valid).toBe(true);
    expect(validateAnswer({ type: 'phone' } as any, '+1 555 123 4567').valid).toBe(true);
  });
});
