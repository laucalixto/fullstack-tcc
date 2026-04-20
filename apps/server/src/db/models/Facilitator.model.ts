import { Schema, model } from 'mongoose';

// id não é declarado explicitamente — Mongoose gera _id automaticamente
// e expõe via getter virtual .id como string
const facilitatorSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:         { type: String, required: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

export const FacilitatorModel = model('Facilitator', facilitatorSchema);
