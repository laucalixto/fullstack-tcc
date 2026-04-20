import { connectDB, disconnectDB } from '../db/connection.js';
import { FacilitatorModel } from '../db/models/Facilitator.model.js';
import { AuthService } from '../auth/AuthService.js';

const EMAIL = process.env.FACILITATOR_EMAIL;
const NAME = process.env.FACILITATOR_NAME;
const PASSWORD = process.env.FACILITATOR_PASSWORD;

if (!EMAIL || !NAME || !PASSWORD) {
  console.error(
    '[seed-facilitator] Defina FACILITATOR_EMAIL, FACILITATOR_NAME e FACILITATOR_PASSWORD nas variáveis de ambiente.',
  );
  process.exit(1);
}

async function seedFacilitator(): Promise<void> {
  await connectDB();

  const existing = await FacilitatorModel.findOne({ email: EMAIL!.toLowerCase() });
  if (existing) {
    console.log(`[seed-facilitator] Facilitador ${EMAIL} já existe — nenhuma ação.`);
    await disconnectDB();
    return;
  }

  const passwordHash = await AuthService.hashPassword(PASSWORD!);
  await FacilitatorModel.create({
    email: EMAIL!.toLowerCase(),
    name: NAME!,
    passwordHash,
  });

  console.log(`[seed-facilitator] Facilitador "${NAME}" (${EMAIL}) criado com sucesso.`);
  await disconnectDB();
}

seedFacilitator().catch((err) => {
  console.error('[seed-facilitator] falhou:', err);
  process.exit(1);
});
