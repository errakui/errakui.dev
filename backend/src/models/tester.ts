import { v4 as uuidv4 } from 'uuid';

/**
 * Status del tester nel flusso di registrazione
 */
export type TesterStatus = 
  | 'EMAIL_COLLECTED'    // Email inserita, in attesa di UDID
  | 'DEVICE_REGISTERED'  // UDID ricevuto e device registrato
  | 'BUILD_PENDING'      // Build in corso
  | 'BUILD_COMPLETED'    // Build completata
  | 'EMAIL_SENT';        // Email con link inviata

/**
 * Modello Tester
 */
export interface Tester {
  id: string;
  email: string;
  udid?: string;
  status: TesterStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input per creare un nuovo Tester
 */
export interface CreateTesterInput {
  email: string;
}

/**
 * Input per aggiornare un Tester
 */
export interface UpdateTesterInput {
  udid?: string;
  status?: TesterStatus;
}

// ============================================
// IN-MEMORY STORAGE
// TODO: Sostituire con un database reale (es. PostgreSQL + Prisma)
// Esempio con Prisma:
//   const tester = await prisma.tester.create({ data: { email, appId, status: 'EMAIL_COLLECTED' } });
// ============================================
const testersMap = new Map<string, Tester>();

/**
 * Repository Tester (in memoria)
 */
export const TesterRepository = {
  /**
   * Crea un nuovo tester
   */
  create(input: CreateTesterInput): Tester {
    const now = new Date();
    const tester: Tester = {
      id: uuidv4(),
      email: input.email,
      status: 'EMAIL_COLLECTED',
      createdAt: now,
      updatedAt: now,
    };
    testersMap.set(tester.id, tester);
    return tester;
  },

  /**
   * Trova un tester per ID
   */
  findById(id: string): Tester | undefined {
    return testersMap.get(id);
  },

  /**
   * Trova un tester per email
   */
  findByEmail(email: string): Tester | undefined {
    return Array.from(testersMap.values()).find(t => t.email === email);
  },

  /**
   * Aggiorna un tester
   */
  update(id: string, input: UpdateTesterInput): Tester | undefined {
    const tester = testersMap.get(id);
    if (!tester) return undefined;

    const updated: Tester = {
      ...tester,
      ...input,
      updatedAt: new Date(),
    };
    testersMap.set(id, updated);
    return updated;
  },

  /**
   * Elimina un tester
   */
  delete(id: string): boolean {
    return testersMap.delete(id);
  },

  /**
   * Restituisce tutti i tester
   */
  findAll(): Tester[] {
    return Array.from(testersMap.values());
  },

  /**
   * Pulisce tutti i dati (utile per test)
   */
  clear(): void {
    testersMap.clear();
  },
};

