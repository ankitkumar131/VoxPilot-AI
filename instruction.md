# Project: VoxPilot AI

Build a modern AI-powered call answering and telephone interaction application called **VoxPilot AI**.

The core idea is:

> VoxPilot AI allows a user to configure an AI agent that can answer telephone calls, conduct conversations according to a user-defined script, ask questions, listen to the caller's answers, record and transcribe the conversation, generate structured notes, and allow the user to review the complete call later.

The application should support use cases such as:

- AI-powered telephonic interviews
- HR candidate screening
- Customer complaint collection
- Customer surveys
- Lead qualification
- Appointment and enquiry calls
- AI receptionist
- Feedback collection
- Customer support
- General information collection

---

# 1. IMPORTANT PRODUCT CONCEPT

The user creates an AI agent.

For example:

Agent Name:
"Frontend Developer Interviewer"

The user then creates a script such as:

1. Introduce yourself.
2. Tell me about your experience with Angular.
3. What is a component?
4. What are Angular Signals?
5. Explain lazy loading.
6. How many years of experience do you have?
7. Is there anything else you would like to add?

When a call is received and this agent is enabled:

1. The system answers the call.
2. The AI greets the caller.
3. The AI asks the configured questions.
4. The AI listens to the caller's response.
5. The response is converted to text.
6. The AI decides whether the answer is sufficient.
7. The AI may ask a follow-up question when allowed.
8. The system saves the response.
9. The system moves to the next configured question.
10. The call eventually ends according to the configured workflow.
11. The system generates a transcript.
12. The system generates notes and a summary.
13. The user can later view the call.
14. The user can listen to recordings and individual audio clips.

---

# 2. EXAMPLE USER EXPERIENCE

A user opens VoxPilot AI and sees:

Dashboard
- AI enabled/disabled
- Active calls
- Recent calls
- Total calls
- Agents
- Recordings

The user creates an agent:

"Customer Complaint Agent"

Then creates a script:

Greeting:
"Hello, you are speaking with VoxPilot AI. How may I help you?"

Question 1:
"Please describe your complaint."

Question 2:
"When did this issue start?"

Question 3:
"Have you already contacted support?"

Question 4:
"Would you like a callback?"

The AI should conduct the conversation naturally while still following the configured workflow.

---

# 3. CORE FEATURES

Implement the following major capabilities.

## AI Agent Management

Users should be able to:

- create agents
- edit agents
- delete agents
- enable/disable agents
- choose language
- configure personality
- configure speaking style
- configure greeting
- configure call behavior
- configure recording behavior
- attach scripts
- choose AI provider
- choose AI model

---

# 4. SCRIPT BUILDER

Provide a visual/script-based workflow where users can create questions.

Each question should support properties such as:

- question text
- question type
- required/optional
- retry limit
- timeout
- follow-up enabled/disabled
- validation
- expected answer
- next question
- conditional branching

Support question types such as:

- open ended
- yes/no
- multiple choice
- number
- rating
- date
- email
- phone number
- confirmation
- custom

The script should not simply be a list of text strings.

Design it so the workflow can eventually support:

Question A
→ if answer is X
→ Question B

Question A
→ if answer is Y
→ Question C

---

# 5. AI CONVERSATION

The AI should sound natural and conversational rather than robotic.

It should:

- speak naturally
- ask one question at a time
- listen before responding
- understand different ways of answering the same question
- ask clarification when necessary
- ask follow-up questions when configured
- avoid repeating completed questions
- stay within the configured script
- avoid inventing questions unless follow-ups are explicitly allowed
- end the conversation when the workflow is completed

Do not let the LLM independently control the complete workflow.

Use a deterministic conversation/state engine for:

- current question
- completed questions
- retries
- transitions
- required questions
- termination
- timeouts

Use the LLM for:

- language understanding
- natural responses
- answer interpretation
- clarification
- allowed follow-up questions
- summarization
- structured extraction

---

# 6. REAL-TIME VOICE

The application should support a real-time voice conversation.

The conceptual pipeline is:

Caller
→ incoming call
→ voice stream
→ speech-to-text
→ AI orchestration
→ LLM
→ text-to-speech
→ caller

Use streaming wherever possible to reduce latency.

The AI should not wait unnecessarily for the entire call before processing responses.

---

# 7. BARGE-IN / INTERRUPTION

The system must support caller interruption.

Example:

AI:
"Can you explain your previous—"

Caller:
"Yes, I have two years of experience."

The AI should:

1. detect that the caller started speaking
2. stop the AI's speech
3. listen to the caller
4. process the response
5. continue the conversation

The system should feel like a real telephone conversation.

---

# 8. RECORDING

Recording is a core feature.

Support configurable recording modes:

- full call recording
- question audio
- caller answer audio
- transcript only
- notes only

For scripted calls, preferably store individual segments:

Call
├── Question 1
│   ├── AI question audio
│   └── Caller answer audio
│
├── Question 2
│   ├── AI question audio
│   └── Caller answer audio
│
└── Question 3
    ├── AI question audio
    └── Caller answer audio

The user should later be able to play each individual clip.

---

# 9. TRANSCRIPTION

Generate a transcript for every completed call where transcription is enabled.

Example:

AI:
"Tell me about your Angular experience."

Caller:
"I have around two years of Angular experience."

AI:
"What version of Angular have you worked with?"

Caller:
"I have worked with recent Angular versions..."

The transcript should preserve speaker identity:

AI:
...

Caller:
...

Store timestamps where practical.

---

# 10. AI NOTES

After each answer, generate structured notes.

Example:

Question:
"How many years of Angular experience do you have?"

Answer:
"I have around two years of experience."

Generated note:

{
  "experience": 2,
  "technology": "Angular",
  "summary": "Caller has approximately two years of Angular experience."
}

Notes should be searchable and viewable from the dashboard.

---

# 11. AI SUMMARY

After a call ends, generate:

- short summary
- important information
- extracted entities
- key answers
- action items
- overall observations

For interviews, optionally generate:

- strengths
- weaknesses
- technical observations
- communication observations
- overall assessment

Do not make the evaluation system an unexplained black box.

---

# 12. INTERVIEW MODE

Provide an interview-oriented agent mode.

Example:

Interview title:
"Frontend Developer Screening"

Candidate:
"Rahul"

Questions:
- Tell me about yourself.
- Explain Angular.
- Explain Signals.
- Explain RxJS.
- Explain lazy loading.

At the end show:

Candidate
Duration
Questions completed
Transcript
Answers
Audio
Summary
AI observations
Optional score

---

# 13. COMPLAINT MODE

Provide a complaint-collection agent template.

Example workflow:

Greeting
→ identify customer
→ ask complaint
→ identify category
→ determine severity
→ ask relevant follow-up
→ ask whether callback is required
→ summarize complaint
→ confirm
→ finish call

Produce structured information such as:

{
  "category": "...",
  "severity": "...",
  "summary": "...",
  "callbackRequired": true
}

---

# 14. AI PROVIDERS

A major feature of VoxPilot AI is that the user should be able to connect their own AI provider.

Do not hardcode one AI provider.

Create a provider abstraction.

Support:

- OpenRouter
- NVIDIA NIM
- generic OpenAI-compatible APIs
- custom/self-hosted AI endpoints

The user should be able to configure:

Provider
Base URL
API key
Model
Temperature
Other supported settings

Examples:

OpenRouter:
https://openrouter.ai/api/v1

NVIDIA NIM:
custom configurable endpoint

Custom:
user-defined OpenAI-compatible endpoint

The architecture must allow new providers to be added later without rewriting the core AI system.

---

# 15. API KEY SECURITY

Never expose provider API keys to the frontend after they are stored.

Never hardcode API keys.

Never commit keys to Git.

Store credentials securely and encrypted where appropriate.

Never log API keys.

---

# 16. PREFERRED TECHNOLOGY STACK

Use this stack unless there is a strong technical reason to change a specific component.

## Frontend

Angular
TypeScript
SCSS
RxJS
Signals
Reactive Forms
Angular Router
HTTP Client
WebSocket

Build a responsive professional SaaS interface.

---

## Mobile

Use:

Capacitor
+
Android native Kotlin functionality when required

The goal is to reuse the Angular application where practical while using native Android functionality for phone/device-specific features.

Create a clean bridge between Angular/Capacitor and native Android functionality.

Do not assume browser APIs can perform native telephony operations.

---

## Backend

Use the MEAN stack:

MongoDB
Express.js
Angular
Node.js

Use Node.js and Express for:

- REST APIs
- authentication
- agent management
- scripts
- calls
- recordings
- provider configuration
- WebSockets
- orchestration

---

## Additional backend infrastructure

Use Redis where beneficial for:

- active call state
- temporary session state
- caching
- rate limiting
- job processing
- real-time coordination

Use S3-compatible storage for recordings.

Support MinIO for local development.

---

# 17. TELEPHONY ARCHITECTURE

Keep telephony provider-specific implementation behind an abstraction.

The core system should conceptually support:

Telephone network
→ telephony provider / SIP
→ real-time media stream
→ VoxPilot voice system
→ AI
→ voice response
→ telephony provider
→ caller

The application must not assume that a normal third-party Android application has unrestricted access to both sides of an ordinary cellular call.

For Android carrier-call functionality, use supported Android Telecom APIs and native capabilities where available.

If a particular feature cannot be implemented reliably due to Android or carrier restrictions, do not fake it.

Instead:

- document the limitation
- keep the architecture modular
- use the supported telephony/SIP/cloud-call architecture for production functionality

---

# 18. ANDROID APPLICATION

The Android application should provide:

- dashboard
- AI on/off control
- agents
- scripts
- call history
- call details
- transcript
- recordings
- audio playback
- notes
- settings
- provider configuration
- notifications
- active call state

Where native Android functionality is necessary, create a Capacitor plugin/native module using Kotlin.

Keep Angular UI logic separate from native Android logic.

---

# 19. LIVE CALL UI

During a call show:

Caller
Agent
Current question
Call duration
Recording status
Current state
Live transcript

Buttons:

- Pause AI
- Resume AI
- Take Over
- End Call

The human takeover feature is important.

---

# 20. HUMAN TAKEOVER

At any time, the user should be able to take control of a call when supported by the telephony architecture.

When human takeover occurs:

AI stops generating speech
AI stops automatic conversation
call state becomes HUMAN_TAKEOVER
human continues the call

The system may continue transcription/notes depending on configuration.

---

# 21. CALL HISTORY

Show:

Caller
Agent
Date/time
Duration
Status
Call type

Possible statuses:

- ringing
- active
- completed
- failed
- terminated
- human takeover

Allow searching and filtering.

---

# 22. CALL DETAILS

A call detail page should contain:

Overview
Transcript
Questions
Recordings
Notes
Summary
Evaluation

Example:

Question 1
"Tell me about yourself."

Answer:
"I am a software developer..."

Transcript:
...

Audio:
▶ Play question

▶ Play answer

Question 2
...

---

# 23. USER SETTINGS

Provide:

AI provider settings
telephony settings
language
voice
recording mode
retention period
automatic deletion
notification preferences
privacy settings

---

# 24. SECURITY

Implement:

- authentication
- authorization
- JWT
- refresh tokens
- encrypted secrets
- HTTPS/WSS
- rate limiting
- input validation
- secure file access
- signed webhooks
- audit logging

Users must only be able to access their own agents, calls, transcripts and recordings unless explicitly authorized.

---

# 25. DATABASE DESIGN

Create a clean MongoDB schema/model structure for:

users
agents
scripts
questions
providers
calls
call_sessions
call_turns
transcripts
recordings
recording_clips
notes
evaluations
webhooks
audit_logs

Avoid storing large binary audio files directly inside MongoDB.

---

# 26. AUDIO STORAGE

Store audio in:

S3
or
Cloudflare R2
or
MinIO during development.

MongoDB should store metadata and references.

Support secure access to recordings.

Do not make recording files publicly accessible by default.

---

# 27. REAL-TIME COMMUNICATION

Use WebSockets where appropriate for:

- live call status
- live transcript
- active question
- call events
- dashboard updates

REST should handle normal CRUD operations.

WebSockets should handle real-time events.

---

# 28. ERROR HANDLING

The system must gracefully handle:

- AI provider failure
- STT failure
- TTS failure
- telephony failure
- network failure
- caller silence
- invalid responses
- unexpected responses
- duplicate webhook events
- recording failure

Never let a single provider failure crash the entire backend.

---

# 29. DEVELOPMENT APPROACH

Build incrementally.

Start with:

1. Project structure
2. Angular application
3. Express/Node backend
4. MongoDB
5. Authentication
6. Agent management
7. Script builder
8. AI provider abstraction
9. OpenRouter integration
10. NVIDIA NIM integration
11. Conversation engine
12. Mock voice conversation
13. STT integration
14. TTS integration
15. WebSocket real-time communication
16. Recording
17. Transcription
18. Notes
19. Evaluation
20. Telephony integration
21. Capacitor Android application
22. Native Android integrations
23. Security hardening
24. Testing
25. Deployment

Do not start by attempting to implement the entire system at once.

---

# 30. MVP

The MVP should prove this complete flow:

User
→ creates AI agent
→ adds script/questions
→ configures AI provider
→ starts a simulated call
→ AI asks questions
→ user/caller answers
→ AI understands answer
→ AI asks next question
→ transcript is generated
→ notes are generated
→ recordings are saved
→ user reviews the call

Once this works, integrate actual telephony.

---

# 31. ARCHITECTURE PRINCIPLE

Keep these components independent:

Telephony
STT
TTS
LLM
Script Engine
Conversation Engine
Recording
Storage
Database
Frontend
Android

A provider should be replaceable without rewriting the entire application.

For example:

OpenRouter
can be replaced with
NVIDIA NIM

without modifying:

- Angular
- call state machine
- database
- recording system
- script engine

---

# 32. UI/UX REQUIREMENTS

Create a modern SaaS-style interface.

Prioritize:

- clean navigation
- responsive layout
- readable tables
- search/filtering
- call status indicators
- audio waveform/player
- transcript timeline
- question-by-question navigation
- clear agent configuration
- easy script creation
- professional typography
- accessible controls

Do not create a generic demo dashboard.

The product should feel like a real commercial AI platform.

---

# 33. IMPORTANT ENGINEERING RULES

Do not:

- hardcode credentials
- hardcode provider-specific logic everywhere
- place business logic directly inside Angular components
- place business logic directly inside UI templates
- create giant backend files
- create giant Android classes
- assume unsupported native capabilities
- store recordings publicly
- make the LLM solely responsible for workflow control

Prefer:

- modular architecture
- service layers
- provider adapters
- typed models
- reusable components
- state machines
- dependency injection
- reusable interfaces
- proper error handling
- comprehensive testing

---

# 34. EXPECTED RESULT

The final product should allow a user to say:

"I want an AI interviewer."

The user creates:

AI Agent
+
Interview Script
+
Questions
+
AI Provider
+
Voice Configuration

Then VoxPilot AI handles the call and produces:

Call
+
Conversation
+
Transcript
+
Question/Answer recordings
+
Structured notes
+
Summary
+
Optional evaluation

The same architecture must also work for complaints, surveys, reception, lead qualification and other telephone workflows.

---

# 35. BEFORE CODING

Before implementing major functionality:

1. Analyze the requirements.
2. Propose the architecture.
3. Identify technical limitations.
4. Identify which features require native Android functionality.
5. Identify which features require telephony/SIP infrastructure.
6. Define the database models.
7. Define APIs.
8. Define folder structure.
9. Define development phases.

Then begin implementation incrementally.

When a technical limitation exists, explain it and implement the closest production-safe architecture rather than creating a fake or unreliable implementation.

The objective is to build **VoxPilot AI as a real, extensible product**, not merely a proof-of-concept UI.
