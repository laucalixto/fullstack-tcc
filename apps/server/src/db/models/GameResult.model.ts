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
  }],
  durationSeconds: { type: Number, required: true },
  playedAt: { type: Date, default: Date.now },
});

export const GameResultModel = model('GameResult', gameResultSchema);
