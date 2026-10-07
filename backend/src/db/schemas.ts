// Mongoose schemas (used when MONGODB_URI is configured; memory store otherwise).
import mongoose, { Schema } from 'mongoose';

const qSchema = new Schema({
  id: String, order: Number, text: String, type: String,
  required: Boolean, retryLimit: Number, timeoutSec: Number,
  followUpEnabled: Boolean, maxFollowUps: Number,
  validation: String, expectedAnswer: String, options: [String],
  min: Number, max: Number, nextQuestionId: String,
  branches: [{ match: String, matchMode: String, nextQuestionId: String, label: String }],
  endAfter: Boolean,
}, { _id: false });

export function registerModels() {
  if (mongoose.models.User) return mongoose.models as Record<string, mongoose.Model<any>>;
  const models: Record<string, mongoose.Model<any>> = {};
  models.User = mongoose.model('User', new Schema({
    email: { type: String, unique: true, index: true }, passwordHash: String, name: String,
    role: { type: String, default: 'owner' }, refreshTokens: [String],
  }, { timestamps: true }));
  models.Agent = mongoose.model('Agent', new Schema({
    userId: { type: String, index: true }, name: String, description: String, enabled: Boolean,
    language: String, voice: String, personality: String, speakingStyle: String, greeting: String,
    scriptId: String, providerId: String, modelOverride: String,
    maxCallMinutes: Number, silenceTimeoutSec: Number, maxRetries: Number,
    allowFollowUps: Boolean, allowBargeIn: Boolean,
    recordingMode: String, transcribe: Boolean, takeNotes: Boolean, endPhrase: String,
  }, { timestamps: true }));
  models.Script = mongoose.model('Script', new Schema({
    userId: { type: String, index: true }, name: String, description: String, mode: String,
    questions: [qSchema],
  }, { timestamps: true }));
  models.AiProvider = mongoose.model('AiProvider', new Schema({
    userId: { type: String, index: true }, name: String, kind: String,
    baseUrl: String, apiKeyEnc: String, model: String, temperature: Number, maxTokens: Number,
    extraHeaders: Schema.Types.Mixed, isDefault: Boolean, lastTestedAt: Date, lastTestOk: Boolean,
  }, { timestamps: true }));
  models.CallSession = mongoose.model('CallSession', new Schema({
    userId: { type: String, index: true }, agentId: String, scriptId: String,
    callerName: String, callerPhone: String, direction: String,
    status: String, mode: String, currentQuestionId: String,
    completedQuestionIds: [String], retriesUsed: Schema.Types.Mixed, followUpsUsed: Schema.Types.Mixed,
    startedAt: Date, endedAt: Date, durationSec: Number, paused: Boolean, aiEnabled: Boolean,
    telephony: Schema.Types.Mixed,
  }, { timestamps: true }));
  models.CallTurn = mongoose.model('CallTurn', new Schema({
    callId: { type: String, index: true }, userId: String, index: Number,
    speaker: String, kind: String, questionId: String, text: String,
    audioClipId: String, bargeIn: Boolean, timestamp: Date,
  }, { timestamps: true }));
  models.RecordingClip = mongoose.model('RecordingClip', new Schema({
    callId: { type: String, index: true }, userId: String, turnId: String, questionId: String,
    kind: String, storage: String, key: String, mime: String, bytes: Number, durationSec: Number,
  }, { timestamps: true }));
  models.Note = mongoose.model('Note', new Schema({
    callId: { type: String, index: true }, userId: String, questionId: String,
    data: Schema.Types.Mixed, text: String,
  }, { timestamps: true }));
  models.CallSummary = mongoose.model('CallSummary', new Schema({
    callId: { type: String, index: true }, userId: String,
    shortSummary: String, keyAnswers: Schema.Types.Mixed, entities: Schema.Types.Mixed,
    actionItems: [String], observations: [String], interview: Schema.Types.Mixed, complaint: Schema.Types.Mixed,
  }, { timestamps: true }));
  models.Webhook = mongoose.model('Webhook', new Schema({
    userId: String, url: String, events: [String], secretEnc: String, enabled: Boolean,
  }, { timestamps: true }));
  models.AuditLog = mongoose.model('AuditLog', new Schema({
    userId: String, action: String, entity: String, entityId: String, meta: Schema.Types.Mixed, ip: String,
  }, { timestamps: true }));
  models.UserSettings = mongoose.model('UserSettings', new Schema({
    userId: { type: String, unique: true }, aiEnabled: Boolean,
    telephonyProvider: String, telephonyConfig: Schema.Types.Mixed,
    language: String, voice: String, recordingMode: String,
    retentionDays: Number, autoDelete: Boolean,
    notifications: Schema.Types.Mixed, privacy: Schema.Types.Mixed,
  }, { timestamps: true }));
  return models;
}
