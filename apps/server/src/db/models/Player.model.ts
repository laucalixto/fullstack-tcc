import { Schema, model } from 'mongoose';

const playerSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  industrialUnit: { type: String, required: true },
  passwordHash: { type: String, required: true },
  totalScore: { type: Number, default: 0 },
});

export const PlayerModel = model('Player', playerSchema);
