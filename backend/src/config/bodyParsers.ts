import { Request, Response, NextFunction } from 'express';

/**
 * Middleware per parsare il body RAW come buffer
 * Necessario per il callback iOS che invia un plist XML
 * 
 * NOTA: Express di default parsa il body come JSON.
 * Per il callback /udid/callback, iOS invia un plist XML firmato.
 * Questo middleware intercetta le richieste con Content-Type specifici
 * e salva il body raw in req.body come Buffer.
 */
export function rawBodyParser(req: Request, res: Response, next: NextFunction): void {
  // Content-Type tipici inviati da iOS per il profile service callback
  const rawContentTypes = [
    'application/x-apple-aspen-mdm',
    'application/pkcs7-signature',
    'application/x-www-form-urlencoded', // A volte iOS usa questo
    'text/xml',
    'application/xml',
  ];

  const contentType = req.headers['content-type'] || '';
  
  // Controlla se è un content-type che richiede raw parsing
  const needsRawParsing = rawContentTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (needsRawParsing) {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });

    req.on('error', (err) => {
      next(err);
    });
  } else {
    next();
  }
}

/**
 * Estrae il body raw dalla request
 * Da usare nei controller che necessitano del body non parsato
 */
export function getRawBody(req: Request): Buffer | undefined {
  return (req as any).rawBody;
}

