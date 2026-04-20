import { Schema, model } from 'mongoose';

const questionSchema = new Schema({
  normId: { type: String, required: true },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  difficulty: { type: String, enum: ['basic', 'intermediate', 'advanced'], default: 'basic' },
});

export const QuestionModel = model('Question', questionSchema);
