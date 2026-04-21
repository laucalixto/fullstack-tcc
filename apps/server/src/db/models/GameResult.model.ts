import { Schema, model } from 'mongoose';

const gameResultSchema = new Schema({
  sessionId: { type: String, required: true },
  pin: { type: String, required: true },
  sessionName: { type: String, required: true },
  players: [{
    playerId: String,
    name: String,
    score: Number,
    rank: Number,
    finalPosition: Number,
    correctAnswers: Number,
    totalAnswers: Number,
    dropped: { type: Boolean, default: false },
  }],
  quizLog: [{
    playerId: String,
    playerName: String,
    questionId: String,
    questionText: String,
    selectedText: String,
    correctText: String,
    correct: Boolean,
    latencyMs: Number,
  }],
  tileLog: [{
    playerId: String,
    playerName: String,
    tileIndex: Number,
    effectTitle: String,
    effectType: String,
    deltaScore: Number,
    deltaPosition: Number,
  }],
  droppedPlayerIds: [String],
  durationSeconds: { type: Number, required: true },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  playedAt: { type: Date, default: Date.now },
});

export const GameResultModel = model('GameResult', gameResultSchema);
