import { Request, Response } from 'express';
import { BuildRepository } from '../models/build';
import { TesterRepository } from '../models/tester';
import * as emailService from '../services/emailService';

/**
 * Build Controller
 * Gestisce le operazioni sulle build e il callback dal CI
 */

/**
 * POST /build-completed
 * 
 * Endpoint chiamato dal CI quando la build è completata.
 * Aggiorna la build e invia l'email al tester con il link download.
 * 
 * Body:
 * {
 *   "buildId": "uuid",
 *   "downloadUrl": "https://...",
 *   "testerId": "uuid"
 * }
 */
export async function buildCompleted(req: Request, res: Response): Promise<void> {
  try {
    const { buildId, downloadUrl, testerId } = req.body;

    // Validazione
    if (!buildId) {
      res.status(400).json({ 
        error: 'buildId obbligatorio',
        code: 'MISSING_BUILD_ID' 
      });
      return;
    }

    if (!downloadUrl) {
      res.status(400).json({ 
        error: 'downloadUrl obbligatorio',
        code: 'MISSING_DOWNLOAD_URL' 
      });
      return;
    }

    // Trova la build
    const build = BuildRepository.findById(buildId);
    if (!build) {
      res.status(404).json({ 
        error: 'Build non trovata',
        code: 'BUILD_NOT_FOUND' 
      });
      return;
    }

    // Aggiorna la build
    BuildRepository.update(buildId, {
      status: 'COMPLETED',
      downloadUrl,
      completedAt: new Date(),
    });

    console.log(`✅ Build completata: ${buildId}`);
    console.log(`   Download URL: ${downloadUrl}`);

    // Se è stato passato testerId, invia l'email
    if (testerId) {
      const tester = TesterRepository.findById(testerId);
      
      if (tester) {
        console.log(`📧 Invio email a ${tester.email}...`);
        
        try {
          // Invia email con link download
          await emailService.sendDownloadLinkEmail(
            tester.email,
            'App', // TODO: Puoi personalizzare con il nome dell'app
            downloadUrl
          );

          // Aggiorna status tester
          TesterRepository.update(testerId, { status: 'EMAIL_SENT' });
          
          console.log(`✅ Email inviata a ${tester.email}`);
        } catch (emailError) {
          console.error(`❌ Errore invio email:`, emailError);
          // Non blocchiamo la response, la build è comunque completata
        }
      } else {
        console.warn(`⚠️  Tester non trovato: ${testerId}`);
      }
    }

    res.json({
      success: true,
      message: 'Build completata e notifica inviata',
      build: BuildRepository.findById(buildId),
    });

  } catch (error) {
    console.error('❌ Errore in buildCompleted:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * GET /builds
 * 
 * Lista tutte le build
 */
export async function listBuilds(req: Request, res: Response): Promise<void> {
  try {
    const builds = BuildRepository.findAll();
    res.json({ builds });
  } catch (error) {
    console.error('❌ Errore in listBuilds:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * GET /builds/:id
 * 
 * Dettaglio singola build
 */
export async function getBuild(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const build = BuildRepository.findById(id);

    if (!build) {
      res.status(404).json({ 
        error: 'Build non trovata',
        code: 'BUILD_NOT_FOUND' 
      });
      return;
    }

    res.json({ build });
  } catch (error) {
    console.error('❌ Errore in getBuild:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

