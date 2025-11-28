# 📱 iOS Ad-Hoc Distribution System

Sistema completo per distribuire IPA iOS ad-hoc a tester esterni, **senza TestFlight** e **senza Apple Enterprise**.

## 🎯 Come Funziona

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                FLUSSO COMPLETO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REGISTRAZIONE                                                           │
│     Tester inserisce email ──► Backend crea record ──► Restituisce link     │
│                                                                             │
│  2. RACCOLTA UDID                                                           │
│     Tester apre link da Safari ──► Scarica .mobileconfig ──► Installa       │
│                                                                             │
│  3. CALLBACK iOS                                                            │
│     iOS invia UDID al backend ──► Backend salva device + tester             │
│                                                                             │
│  4. REGISTRAZIONE APPLE                                                     │
│     Backend chiama App Store Connect API ──► Registra device su Apple       │
│                                                                             │
│  5. BUILD CI/CD                                                             │
│     Backend triggera GitHub Actions ──► Fastlane compila IPA ad-hoc         │
│                                                                             │
│  6. NOTIFICA                                                                │
│     CI notifica backend ──► Backend invia email con link download           │
│                                                                             │
│  7. INSTALLAZIONE                                                           │
│     Tester riceve email ──► Clicca link ──► Installa app ✅                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisiti

- **Apple Developer Account** (standard, $99/anno)
- **App Store Connect API Key** (Issuer ID, Key ID, file `.p8`)
- **Progetto iOS** esistente con Xcode
- **Repository GitHub** per CI/CD
- **Server** per hostare il backend (es. VPS, Heroku, Railway)
- **Account SMTP** per invio email (es. Gmail, SendGrid)

## 🗂 Struttura Progetto

```
.
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entrypoint Express
│   │   ├── routes.ts             # Definizione route
│   │   ├── config/
│   │   │   ├── env.ts            # Variabili d'ambiente
│   │   │   └── bodyParsers.ts    # Parser per plist
│   │   ├── controllers/
│   │   │   ├── testerController.ts
│   │   │   ├── udidController.ts
│   │   │   └── buildController.ts
│   │   ├── services/
│   │   │   ├── appStoreConnectService.ts
│   │   │   ├── ciService.ts
│   │   │   └── emailService.ts
│   │   └── models/
│   │       ├── tester.ts
│   │       ├── device.ts
│   │       └── build.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── env.example.txt           # Template variabili d'ambiente
│
├── ios/
│   ├── Gemfile
│   └── fastlane/
│       └── Fastfile
│
├── .github/
│   └── workflows/
│       └── build-adhoc.yml
│
└── README.md
```

## 🚀 Setup

### 1. Creare App Store Connect API Key

1. Vai su [App Store Connect](https://appstoreconnect.apple.com/access/api)
2. Clicca "Generate API Key"
3. Seleziona ruolo "Admin" o "App Manager"
4. Scarica il file `.p8` (SALVALO, puoi scaricarlo solo una volta!)
5. Annota:
   - **Issuer ID** (in alto nella pagina)
   - **Key ID** (nella tabella delle chiavi)

### 2. Setup Backend

```bash
cd backend
npm install
```

Crea il file `.env` copiando da `env.example.txt`:

```bash
cp env.example.txt .env
```

Compila le variabili:

```env
# Server
PORT=3000
PUBLIC_BASE_URL=https://tuo-dominio.com

# App Store Connect
ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ASC_KEY_ID=XXXXXXXXXX
ASC_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# GitHub
GITHUB_OWNER=tuo-username
GITHUB_REPO=tuo-repo
GITHUB_WORKFLOW_ID=build-adhoc.yml
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=app-password
EMAIL_FROM="My App <no-reply@tuo-dominio.com>"
```

**NOTA sulla Private Key**: Copia tutto il contenuto del file `.p8`, sostituendo i newline con `\n`.

Avvia il backend:

```bash
npm run dev
```

### 3. Setup Fastlane

```bash
cd ios
bundle install
```

Modifica `fastlane/Fastfile` e personalizza:

```ruby
# TODO: Sostituisci con i tuoi valori
app_id = "com.tuo-dominio.tua-app"
scheme_name = "TuaApp"
```

### 4. Setup GitHub Actions

Vai su **Settings → Secrets and variables → Actions** del tuo repo.

Aggiungi questi secrets:

| Secret | Valore |
|--------|--------|
| `ASC_ISSUER_ID` | Il tuo Issuer ID |
| `ASC_KEY_ID` | Il tuo Key ID |
| `ASC_PRIVATE_KEY` | Contenuto del file .p8 (con newline reali) |
| `PUBLIC_BASE_URL` | URL del tuo backend (es. `https://api.tuo-dominio.com`) |

### 5. Hosting IPA

⚠️ **IMPORTANTE**: Devi configurare dove hostare le IPA compilate.

Opzioni:
- **GitHub Releases** (gratuito, ma i link cambiano ogni release)
- **AWS S3** (con CloudFront per HTTPS)
- **Firebase App Distribution**
- **Il tuo server** (con HTTPS obbligatorio!)

Modifica `.github/workflows/build-adhoc.yml` nella sezione "Get artifact URL" per generare l'URL corretto.

## 📡 API Endpoints

### `POST /register`

Registra un nuovo tester.

**Request:**
```json
{
  "email": "tester@example.com"
}
```

**Response:**
```json
{
  "testerId": "uuid",
  "nextUrl": "https://tuo-dominio.com/get-udid?testerId=uuid",
  "message": "..."
}
```

### `GET /get-udid?testerId=uuid`

Scarica il file `.mobileconfig` personalizzato.

**Response:** File `.mobileconfig` (Content-Type: `application/x-apple-aspen-config`)

### `POST /udid/callback?testerId=uuid`

Callback chiamato automaticamente da iOS.

**Request:** Raw XML plist con info device

**Response:** Pagina HTML di conferma

### `POST /build-completed`

Callback dal CI quando la build è pronta.

**Request:**
```json
{
  "buildId": "uuid",
  "downloadUrl": "https://...",
  "testerId": "uuid"
}
```

### `GET /builds`

Lista tutte le build.

### `GET /builds/:id`

Dettaglio singola build.

### `GET /health`

Health check.

## 🔧 TODO per Produzione

- [ ] Sostituire il DB in memoria con PostgreSQL/MySQL
- [ ] Aggiungere autenticazione admin per gli endpoint
- [ ] Configurare hosting IPA reale
- [ ] Aggiungere rate limiting
- [ ] Configurare HTTPS
- [ ] Aggiungere logging strutturato
- [ ] Configurare monitoring/alerting
- [ ] Firmare il .mobileconfig con un certificato SSL

## ❓ Troubleshooting

### Il .mobileconfig non si installa

- Assicurati di aprire il link **da Safari** (non Chrome, non Gmail)
- Verifica che `PUBLIC_BASE_URL` sia corretto e raggiungibile
- Controlla che il server risponda con `Content-Type: application/x-apple-aspen-config`

### L'UDID non viene ricevuto

- Verifica i log del backend per errori di parsing
- iOS potrebbe inviare il plist firmato - controlla il Content-Type

### La build fallisce

- Controlla i log di GitHub Actions
- Verifica che le API key siano corrette
- Assicurati che il provisioning profile includa il nuovo device

### L'email non arriva

- Verifica le credenziali SMTP
- Controlla la cartella spam
- Se usi Gmail, devi creare una "App Password" (non la password normale)

## 📄 Licenza

MIT

