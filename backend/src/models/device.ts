import { v4 as uuidv4 } from 'uuid';

/**
 * Modello Device
 * Rappresenta un dispositivo iOS registrato
 */
export interface Device {
  id: string;
  udid: string;
  product?: string;      // es. "iPhone14,2" (iPhone 13 Pro)
  iosVersion?: string;   // es. "17.1"
  createdAt: Date;
}

/**
 * Input per creare un nuovo Device
 */
export interface CreateDeviceInput {
  udid: string;
  product?: string;
  iosVersion?: string;
}

// ============================================
// IN-MEMORY STORAGE
// TODO: Sostituire con un database reale (es. PostgreSQL + Prisma)
// Esempio con Prisma:
//   const device = await prisma.device.create({ data: { udid, product, iosVersion } });
// ============================================
const devicesMap = new Map<string, Device>();

/**
 * Repository Device (in memoria)
 */
export const DeviceRepository = {
  /**
   * Crea un nuovo device
   */
  create(input: CreateDeviceInput): Device {
    // Controlla se esiste già un device con lo stesso UDID
    const existing = DeviceRepository.findByUdid(input.udid);
    if (existing) {
      return existing;
    }

    const device: Device = {
      id: uuidv4(),
      udid: input.udid,
      product: input.product,
      iosVersion: input.iosVersion,
      createdAt: new Date(),
    };
    devicesMap.set(device.id, device);
    return device;
  },

  /**
   * Trova un device per ID
   */
  findById(id: string): Device | undefined {
    return devicesMap.get(id);
  },

  /**
   * Trova un device per UDID
   */
  findByUdid(udid: string): Device | undefined {
    return Array.from(devicesMap.values()).find(d => d.udid === udid);
  },

  /**
   * Restituisce tutti i device
   */
  findAll(): Device[] {
    return Array.from(devicesMap.values());
  },

  /**
   * Elimina un device
   */
  delete(id: string): boolean {
    return devicesMap.delete(id);
  },

  /**
   * Pulisce tutti i dati (utile per test)
   */
  clear(): void {
    devicesMap.clear();
  },
};

