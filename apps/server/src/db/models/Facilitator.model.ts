import { Schema, model } from 'mongoose';

const facilitatorSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
});

export const FacilitatorModel = model('Facilitator', facilitatorSchema);
