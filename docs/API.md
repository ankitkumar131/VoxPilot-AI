# VoxPilot AI — API reference

Base URL: `/api`. Auth: `Authorization: Bearer <access>` (15 min) + `POST /api/auth/refresh`.

## Auth
- `POST /auth/register {name,email,password}` → `{access,refresh,user}`
- `POST /auth/login {email,password}` → same
- `POST /auth/refresh {refresh}` → `{access}`
- `GET /auth/me` → user
- `POST /auth/logout {refresh?}`

## Agents — `/agents`
`GET ?q&enabled` · `POST` · `GET/:id` · `PATCH/:id` · `POST/:id/toggle` · `DELETE/:id`

## Scripts — `/scripts`
`GET` · `POST {name,mode,description,questions[]}` · `GET/:id` · `PUT/:id` · `DELETE/:id`
Question: `{text,type,required,retryLimit,timeoutSec,followUpEnabled,maxFollowUps,validation,expectedAnswer,options[],min,max,nextQuestionId,branches[{match,matchMode,nextQuestionId}],endAfter}`

## Providers — `/providers` (keys write-only, never returned)
`GET` (sanitized) · `POST {name,kind,baseUrl,apiKey,model,temperature,maxTokens,isDefault}` ·
`PATCH/:id` · `DELETE/:id` · `POST/:id/test` → `{ok,message,latencyMs}`

## Calls — `/calls`
- `GET ?q&status&agentId&limit` (enriched with agentName)
- `POST /simulate {agentId,callerName?,callerPhone?}` → `{session,greeting,firstQuestion}`
- `GET /:id` → `{call,turns,notes,clips,summary,agent,script}`
- `POST /:id/answer` (JSON `{text,audioBase64?,audioMime?,bargeIn?}` or multipart `audio`+`text`) → `{callerTurn,aiTurns,session,done}`
- `POST /:id/pause|resume|hangup`, `POST /:id/takeover {mode: human|ai}`

## Dashboard / settings / recordings / webhooks
- `GET /dashboard/stats`
- `GET|PATCH /settings`
- `GET /recordings/:clipId/stream` (owner-only, Range support)
- `POST /webhooks/telephony/:provider` (signed, deduped)

## WebSocket `/socket.io` (auth: `{token}`)
Client → `join-call|leave-call`, `barge-in(callId)`.
Server → `call-status, transcript-turn, current-question, notes-updated, summary-ready, call-started, call-ended, barge-in`.
