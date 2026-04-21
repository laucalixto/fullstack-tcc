import mongoose, { Schema } from 'mongoose';

const normSchema = new Schema({
  normId: { type: String, required: true, unique: true },
  title:  { type: String, required: true },
});

export const NormModel = mongoose.model('Norm', normSchema);
