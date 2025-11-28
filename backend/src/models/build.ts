import { v4 as uuidv4 } from 'uuid';

/**
 * Status della build
 */
export type BuildStatus = 
  | 'PENDING'      // In attesa di avvio
  | 'IN_PROGRESS'  // Build in corso
  | 'COMPLETED'    // Build completata con successo
  | 'FAILED';      // Build fallita

/**
 * Modello Build
 * Rappresenta una build IPA
 */
export interface Build {
  id: string;
  testerId: string;           // ID del tester che ha richiesto la build
  status: BuildStatus;
  devicesIncluded: string[];  // Array di UDID inclusi nella build
  downloadUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Input per creare una nuova Build
 */
export interface CreateBuildInput {
  testerId: string;
  devicesIncluded: string[];
}

/**
 * Input per aggiornare una Build
 */
export interface UpdateBuildInput {
  status?: BuildStatus;
  downloadUrl?: string;
  completedAt?: Date;
}

// ============================================
// IN-MEMORY STORAGE
// TODO: Sostituire con un database reale (es. PostgreSQL + Prisma)
// Esempio con Prisma:
//   const build = await prisma.build.create({ data: { appId, status: 'PENDING', devicesIncluded } });
// ============================================
const buildsMap = new Map<string, Build>();

/**
 * Repository Build (in memoria)
 */
export const BuildRepository = {
  /**
   * Crea una nuova build
   */
  create(input: CreateBuildInput): Build {
    const build: Build = {
      id: uuidv4(),
      testerId: input.testerId,
      status: 'PENDING',
      devicesIncluded: input.devicesIncluded,
      createdAt: new Date(),
    };
    buildsMap.set(build.id, build);
    return build;
  },

  /**
   * Trova una build per ID
   */
  findById(id: string): Build | undefined {
    return buildsMap.get(id);
  },

  /**
   * Trova tutte le build per testerId
   */
  findByTesterId(testerId: string): Build[] {
    return Array.from(buildsMap.values()).filter(b => b.testerId === testerId);
  },

  /**
   * Aggiorna una build
   */
  update(id: string, input: UpdateBuildInput): Build | undefined {
    const build = buildsMap.get(id);
    if (!build) return undefined;

    const updated: Build = {
      ...build,
      ...input,
    };
    buildsMap.set(id, updated);
    return updated;
  },

  /**
   * Restituisce tutte le build
   */
  findAll(): Build[] {
    return Array.from(buildsMap.values());
  },

  /**
   * Elimina una build
   */
  delete(id: string): boolean {
    return buildsMap.delete(id);
  },

  /**
   * Pulisce tutti i dati (utile per test)
   */
  clear(): void {
    buildsMap.clear();
  },
};

