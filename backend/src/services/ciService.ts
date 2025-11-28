import fetch from 'node-fetch';
import { env } from '../config/env';

/**
 * CI Service
 * Gestisce il triggering dei workflow GitHub Actions
 */

/**
 * Triggera il workflow di build ad-hoc su GitHub Actions
 * 
 * @param buildId - ID della build (dal backend)
 * @param testerId - ID del tester (per notifica email finale)
 * 
 * @see https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
 */
export async function triggerBuild(buildId: string, testerId: string): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW_ID}/dispatches`;

  const requestBody = {
    ref: 'main', // TODO: Cambia se il branch principale è diverso (es. 'master')
    inputs: {
      buildId: buildId,
      testerId: testerId,
    },
  };

  console.log(`🚀 Triggering GitHub Actions workflow...`);
  console.log(`   Repository: ${env.GITHUB_OWNER}/${env.GITHUB_REPO}`);
  console.log(`   Workflow: ${env.GITHUB_WORKFLOW_ID}`);
  console.log(`   Build ID: ${buildId}`);
  console.log(`   Tester ID: ${testerId}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // workflow_dispatch restituisce 204 No Content in caso di successo
    if (response.status === 204) {
      console.log(`✅ Workflow triggerato con successo!`);
      return;
    }

    // Gestione errori
    const data = await response.text();
    
    if (response.status === 404) {
      throw new Error(
        `Workflow non trovato. Verifica:\n` +
        `- GITHUB_OWNER: ${env.GITHUB_OWNER}\n` +
        `- GITHUB_REPO: ${env.GITHUB_REPO}\n` +
        `- GITHUB_WORKFLOW_ID: ${env.GITHUB_WORKFLOW_ID}\n` +
        `- Il workflow esiste e ha il trigger workflow_dispatch`
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Errore di autorizzazione GitHub. Verifica:\n` +
        `- GITHUB_TOKEN ha i permessi 'actions:write' e 'repo'\n` +
        `- Il token non è scaduto`
      );
    }

    throw new Error(`Errore GitHub API (${response.status}): ${data}`);

  } catch (error) {
    console.error(`❌ Errore nel triggering del workflow:`, error);
    throw error;
  }
}

/**
 * Verifica lo stato di un workflow run (opzionale, per debug)
 * 
 * @param runId - ID del workflow run
 */
export async function getWorkflowRunStatus(runId: string): Promise<any> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/runs/${runId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Errore GitHub API: ${response.status}`);
  }

  return response.json();
}

