// Ready-made script templates: interview, complaint, survey, receptionist, lead.
export const interviewTemplate = {
  name: 'Frontend Developer Screening', mode: 'interview',
  description: 'Phone screen for frontend developer candidates',
  questions: [
    { text: 'To start, please introduce yourself and give a brief overview of your background.', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 30, followUpEnabled: true, maxFollowUps: 1 } as any,
    { text: 'Tell me about your experience with Angular.', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 30, followUpEnabled: true, maxFollowUps: 2 } as any,
    { text: 'In your own words, what is a component in Angular?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 25, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What are Angular Signals, and when would you use them?', type: 'open_ended', required: false, retryLimit: 1, timeoutSec: 25, followUpEnabled: true, maxFollowUps: 1 } as any,
    { text: 'Can you explain lazy loading and why it matters?', type: 'open_ended', required: false, retryLimit: 1, timeoutSec: 25, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'How many years of professional experience do you have with frontend development?', type: 'number', required: true, retryLimit: 2, timeoutSec: 15, min: 0, max: 50, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'Is there anything else you would like to add before we finish?', type: 'open_ended', required: false, retryLimit: 0, timeoutSec: 25, followUpEnabled: false, maxFollowUps: 0, endAfter: true } as any,
  ],
};

export const complaintTemplate = {
  name: 'Customer Complaint Intake', mode: 'complaint',
  description: 'Empathetic complaint collection with severity triage and callback offer',
  questions: [
    { text: 'May I have your full name, please?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'Please describe your complaint in your own words.', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 45, followUpEnabled: true, maxFollowUps: 2 } as any,
    { text: 'When did this issue start?', type: 'open_ended', required: false, retryLimit: 1, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'Have you already contacted support about this issue?', type: 'yes_no', required: false, retryLimit: 1, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'On a scale of 1 to 5, how urgent is this for you?', type: 'rating', required: false, retryLimit: 1, timeoutSec: 15, min: 1, max: 5, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'Would you like us to call you back about this?', type: 'yes_no', required: true, retryLimit: 1, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 0, branches: [{ match: 'yes', matchMode: 'equals', nextQuestionId: 'NEED_PHONE', label: 'yes → ask phone' }] } as any,
    { id: 'NEED_PHONE', text: 'What is the best phone number to reach you on?', type: 'phone', required: true, retryLimit: 2, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0, endAfter: true } as any,
  ],
};

export const surveyTemplate = {
  name: 'Customer Satisfaction Survey', mode: 'survey',
  description: 'Quick CSAT survey after a support interaction',
  questions: [
    { text: 'On a scale of 1 to 5, how satisfied are you with our service today?', type: 'rating', required: true, retryLimit: 2, timeoutSec: 15, min: 1, max: 5, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What did we do well?', type: 'open_ended', required: false, retryLimit: 1, timeoutSec: 30, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What could we improve?', type: 'open_ended', required: false, retryLimit: 1, timeoutSec: 30, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'Would you recommend us to a friend or colleague?', type: 'yes_no', required: false, retryLimit: 1, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 0, endAfter: true } as any,
  ],
};

export const receptionistTemplate = {
  name: 'AI Receptionist', mode: 'receptionist',
  description: 'Greets callers, captures reason for calling and contact details',
  questions: [
    { text: 'Who am I speaking with?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What is the reason for your call today?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 30, followUpEnabled: true, maxFollowUps: 1 } as any,
    { text: 'Is this regarding an existing appointment or enquiry?', type: 'yes_no', required: false, retryLimit: 1, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What is the best number to reach you on?', type: 'phone', required: true, retryLimit: 2, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0, endAfter: true } as any,
  ],
};

export const leadTemplate = {
  name: 'Lead Qualification', mode: 'lead',
  description: 'BANT-style lead qualification call',
  questions: [
    { text: 'What is your name and which company are you with?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 25, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What problem are you hoping to solve?', type: 'open_ended', required: true, retryLimit: 2, timeoutSec: 35, followUpEnabled: true, maxFollowUps: 1 } as any,
    { text: 'Do you have a budget approved for this?', type: 'yes_no', required: false, retryLimit: 1, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 0 } as any,
    { text: 'What is your email address so we can follow up?', type: 'email', required: true, retryLimit: 2, timeoutSec: 20, followUpEnabled: false, maxFollowUps: 0, endAfter: true } as any,
  ],
};

export const TEMPLATES = { interviewTemplate, complaintTemplate, surveyTemplate, receptionistTemplate, leadTemplate };
