import { Request, Response } from 'express';
import { TesterRepository } from '../models/tester';
import { env } from '../config/env';

/**
 * Tester Controller
 * Gestisce la registrazione iniziale dei tester (solo email)
 */

/**
 * POST /register
 * 
 * Registra un nuovo tester con la sua email.
 * Restituisce l'URL per il passo successivo (download mobileconfig).
 * 
 * Body:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "testerId": "<uuid>",
 *   "nextUrl": "<PUBLIC_BASE_URL>/get-udid?testerId=<uuid>"
 * }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    // Validazione base
    if (!email || typeof email !== 'string') {
      res.status(400).json({ 
        error: 'Email obbligatoria',
        code: 'MISSING_EMAIL' 
      });
      return;
    }

    // Validazione formato email (base)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        error: 'Formato email non valido',
        code: 'INVALID_EMAIL' 
      });
      return;
    }

    // Controlla se esiste già un tester con questa email
    const existing = TesterRepository.findByEmail(email);
    if (existing) {
      // Restituisci il tester esistente (permetti re-registrazione)
      console.log(`ℹ️  Tester esistente trovato: ${existing.id}`);
      
      const nextUrl = `${env.PUBLIC_BASE_URL}/get-udid?testerId=${existing.id}`;
      
      res.json({
        testerId: existing.id,
        nextUrl: nextUrl,
        message: 'Tester già registrato. Procedi al passo successivo.',
      });
      return;
    }

    // Crea nuovo tester
    const tester = TesterRepository.create({ email });
    console.log(`✅ Nuovo tester registrato: ${tester.id} (${email})`);

    const nextUrl = `${env.PUBLIC_BASE_URL}/get-udid?testerId=${tester.id}`;

    res.status(201).json({
      testerId: tester.id,
      nextUrl: nextUrl,
      message: 'Registrazione completata. Procedi al passo successivo per registrare il tuo dispositivo.',
    });

  } catch (error) {
    console.error('❌ Errore in register:', error);
    res.status(500).json({ 
      error: 'Errore interno del server',
      code: 'INTERNAL_ERROR' 
    });
  }
}

/**
 * GET /testers
 * 
 * Lista tutti i tester (per debug/admin)
 */
export async function listTesters(req: Request, res: Response): Promise<void> {
  try {
    const testers = TesterRepository.findAll();
    res.json({ testers });
  } catch (error) {
    console.error('❌ Errore in listTesters:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * GET /testers/:id
 * 
 * Dettaglio singolo tester
 */
export async function getTester(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tester = TesterRepository.findById(id);

    if (!tester) {
      res.status(404).json({ 
        error: 'Tester non trovato',
        code: 'TESTER_NOT_FOUND' 
      });
      return;
    }

    res.json({ tester });
  } catch (error) {
    console.error('❌ Errore in getTester:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

