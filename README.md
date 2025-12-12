# Playwright + TypeScript E2E · Guía Base

Documentación de referencia para montar, escribir y ejecutar **pruebas E2E** con **Playwright + TypeScript**. Incluye configuración real de **ESLint**, **Playwright**, estructura de carpetas, patrones recomendados (**POM**, **helpers**) y comandos básicos.

---

## Tabla de Contenidos

- [Playwright + TypeScript E2E · Guía Base](#playwright--typescript-e2e--guía-base)
  - [Tabla de Contenidos](#tabla-de-contenidos)
  - [1) Requisitos](#1-requisitos)
  - [2) Estructura del Proyecto (carpetas raíz)](#2-estructura-del-proyecto-carpetas-raíz)
  - [3) ESLint (flat config)](#3-eslint-flat-config)
  - [4) Configuración Playwright](#4-configuración-playwright)
  - [5) Helpers (definición + estructura sugerida)](#5-helpers-definición--estructura-sugerida)
    - [5.1 Logger](#51-logger)
    - [5.2 Esperas explícitas](#52-esperas-explícitas)
    - [5.3 Sesiones](#53-sesiones)
    - [5.4 Time](#54-time)
    - [5.5 Usuario](#55-usuario)
  - [6) POM (Page Object Model)](#6-pom-page-object-model)
  - [7) Data (data-driven)](#7-data-data-driven)
  - [8) Devices personalizados (opcional)](#8-devices-personalizados-opcional)
  - [9) Comandos útiles](#9-comandos-útiles)
  - [10) Recomendaciones de organización](#10-recomendaciones-de-organización)
  - [11) CI/CD (mínimo viable, GitHub Actions)](#11-cicd-mínimo-viable-github-actions)
  - [12) TSDoc mínimo](#12-tsdoc-mínimo)
  - [13) Solución a errores frecuentes](#13-solución-a-errores-frecuentes)
  - [14) Cierre](#14-cierre)

---

## 1) Requisitos

- **Node.js** 20.x
- **@playwright/test** 1.56.1
- **TypeScript** 5.x
- VS Code
- JavaScript (Básico)
- Git (Básico)

---

## 2) Estructura del Proyecto (carpetas raíz)

> Mantén la estructura simple a nivel de raíz. Dentro, organiza según necesidad (POMs, helpers, data, etc.).

```
project-root/
├─ .github/workflows/         # Pipelines de CI/CD (GitHub Actions)
├─ data/                      # data-driven, casos, devices/custom, etc.
├─ helpers/                   # helpers reutilizables (utils / acciones / datos)
├─ pages/                     # Page Objects (POM)
├─ playwright-report/         # reportes HTML (salida dinámica por fecha)
├─ playwright-result/         # resultados JSON de pruebas
├─ tests/                     # suites y casos de prueba
├─ eslint.config.mjs          # ESLint (flat config)
├─ playwright.config.ts       # Configuración Playwright
├─ tsconfig.json              # TypeScript
└─ package.json               # scripts y dependencias
```

**Sugerencia para subcarpetas internas (opcional):**
- `helpers/utils/` → `log.helper.ts`, `wait.helper.ts`, `session.helper.ts`, `time.helper.ts`, `user.helper.ts`
- `helpers/actions/` → acciones UI de alto nivel si las necesitas
- `helpers/data/` → generadores de data o factories
- `data/CustomDevice.ts` → definición de devices custom
- `pages/AE/*.page.ts` → POMs por módulo/sitio (ej. AutomationExercise)

---

## 3) ESLint (flat config)

`eslint.config.mjs`

```js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "reports/**",
      "artifacts/**",
      "playwright-report/**",
      "test-results/**",
      "eslint.config.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintConfigPrettier,
]);
```

---

## 4) Configuración Playwright

`playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";
import { CustomDevice, CustomDeviceName } from "./data/CustomDevice";
import { DateFormatter } from "./helpers/utils/time.helper";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ["list", { printSteps: true }],
    [
      "html",
      { open: "never", outputFolder: `playwright-report/report-${DateFormatter(new Date())}` },
    ],
    ["json", { outputFile: `playwright-result/result-${DateFormatter(new Date())}.json` }],
  ],
  outputDir: "artifacts/run",
  use: {
    launchOptions: { slowMo: process.env.CI ? 0 : 10 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // ==== móviles emulados (opcional) ====
    // { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    // { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
    // ==== device custom (opcional) ====
    // { name: CustomDeviceName.CustomIphone, use: { ...CustomDevice[CustomDeviceName.CustomIphone] } },
  ],
});
```

**Notas:**
- Reporte **HTML** se genera en `playwright-report/report-YYYYMMDD_HHMMSS`.
- Resultado **JSON** en `playwright-result/result-YYYYMMDD_HHMMSS.json`.
- Artefactos por corrida en `artifacts/run`.
- Puedes anular reporteros por CLI: `--reporter=list` para evitar HTML en una ejecución puntual.

---

## 5) Helpers (definición + estructura sugerida)

### 5.1 Logger

`helpers/utils/log.helper.ts`

```ts
type LogLevel = "START" | "INFO" | "STEP" | "WARN" | "ERROR" | "DEBUG" | "END";

export class Logger {
  static log(level: LogLevel, message: string, extra?: unknown) {
    const timestamp = new Date().toISOString();
    const prefix = `[${level}]`;
    console.log(`${timestamp} ${prefix} ${message}`);
    if (extra !== undefined) console.log(" ->", JSON.stringify(extra, null, 2));
  }
  static start() { this.log("START", "====INICIO DEL TEST===="); }
  static info(msg: string) { this.log("INFO", msg); }
  static step(msg: string) { this.log("STEP", msg); }
  static warn(msg: string) { this.log("WARN", msg); }
  static error(msg: string, extra?: unknown) { this.log("ERROR", msg, extra); }
  static debug(msg: string, extra?: unknown) { this.log("DEBUG", msg, extra); }
  static end(msg?: string) { this.log("END", msg ?? "====FIN DEL TEST===="); }
}
```

### 5.2 Esperas explícitas

`helpers/utils/wait.helper.ts`

```ts
import type { Page } from "@playwright/test";

export async function waitPageStable(page: Page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
}

export async function waitVisible(page: Page, selectorOrText: string | RegExp) {
  if (typeof selectorOrText === "string") {
    await page.waitForSelector(selectorOrText, { state: "visible", timeout: 30_000 });
  } else {
    await page.getByText(selectorOrText).waitFor({ state: "visible", timeout: 30_000 });
  }
}
```

### 5.3 Sesiones

`helpers/utils/session.helper.ts`

```ts
import { Page } from "@playwright/test";
import { Logger } from "./log.helper";

const DEFAULT_SESSION_PATH = "auth/suite2.session.json";
/**
 * Guarda el estado actual (cookies, localStorage, sessionStorage) en un archivo JSON
 * @param page - Instancia del test (navegador)
 * @param filePath - Ruta de almacenamiento en string
 */
export async function saveSession(page: Page, filePath = DEFAULT_SESSION_PATH): Promise<void> {
  Logger.step(`Guardando sesión en ${filePath}`);
  await page.context().storageState({ path: filePath });
}
```

### 5.4 Time

`helpers/utils/time.helper.ts`

```ts
export function DateFormatter(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
```

### 5.5 Usuario

`helpers/utils/user.helper.ts`

```ts
export type AEUser = {
  name: string; email: string; password: string;
  day: string; month: string; year: string;
  firstName: string; lastName: string;
  address: string; country: string; state: string; city: string; zipcode: string; mobile: string;
};

export function makeUser(userName: string): AEUser {
  return {
    name: `dev_${userName}`,
    email: `dev_${userName}@pw.com`,
    password: "12345678",
    day: "10", month: "10", year: "1990",
    firstName: `${userName}`, lastName: "N.A.",
    address: "N.A.",
    country: "United States", state: "QC", city: "Montreal", zipcode: "H2X 1Y4", mobile: "123456",
  };
}

export function getAuth(userName: string) {
  return { email: `dev_${userName}@pw.com`, password: "12345678" };
}
```

---

## 6) POM (Page Object Model)

`pages/AE/Home.page.ts`

```ts
import type { Page } from "@playwright/test";
import { waitPageStable } from "../../helpers/utils/wait.helper";

export class HomePage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto("https://automationexercise.com/");
    await waitPageStable(this.page);
  }

  async gotoSignupLogin() {
    await this.page.getByRole("link", { name: /signup \/ login/i }).click();
  }
}
```

`pages/AE/Auth.page.ts`

```ts
import type { Page, Locator } from "@playwright/test";
import { AEUser } from "../../helpers/utils/user.helper";

export class AuthPage {
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginButton: Locator;
  readonly loginError: Locator;

  readonly signupName: Locator;
  readonly signupEmail: Locator;
  readonly signupButton: Locator;

  constructor(private page: Page) {
    this.loginEmail = page.locator('[data-qa="login-email"]');
    this.loginPassword = page.locator('[data-qa="login-password"]');
    this.loginButton = page.locator('[data-qa="login-button"]');
    this.loginError = page.getByText(/incorrect email or password/i);

    this.signupName = page.locator('[data-qa="signup-name"]');
    this.signupEmail = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.locator('[data-qa="signup-button"]');
  }

  async login(email: string, password: string) {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginButton.click();
  }

  async startSignup(name: string, email: string) {
    await this.signupName.fill(name);
    await this.signupEmail.fill(email);
    await this.signupButton.click();
  }

  async completeAccountForm(_user: AEUser) {
    // ....
  }
}
```

`pages/AE/Account.page.ts`

```ts
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AccountPage {
  constructor(private page: Page) {}

  async assertLoggedIn() {
    await expect(this.page.getByText(/logged in as/i)).toBeVisible();
  }

  async logout() {
    await this.page.getByRole("link", { name: /logout/i }).click();
  }
}
```

---

## 7) Data (data-driven)

`data/InvalidAECases.ts`

```ts
export const InvalidLoginCases = Object.freeze([
  { name: "bad-user1", email: "bad1@mail.com", password: "wrong" },
  { name: "bad-user2", email: "bad2@mail.com", password: "wrong" },
]);
```

`data/InventoryCases.ts` (ejemplo)

```ts
export const InventoryCases = Object.freeze([
  { name: "HiLo_1-3-5", sort: "hilo" as const, pick: [0, 2, 4], expectedBadge: "3" },
  { name: "LoHi_2-4",  sort: "lohi" as const, pick: [1, 3],     expectedBadge: "2" },
  { name: "AZ_1-only", sort: "az"   as const, pick: [0],        expectedBadge: "1" },
]);
```

---

## 8) Devices personalizados (opcional)

`data/CustomDevice.ts`

```ts
export const CustomDeviceName = Object.freeze({
  CustomIphone: 'iPhone 16',
  Pixel10: 'Pixel 10'
})

export const CustomDevice = Object.freeze({
  [CustomDeviceName.CustomIphone]: {
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
    geolocation: { latitude: -12.04, longitude: -77.03 },
    permissions: ['geolocation']
  }

})
```

---

## 9) Comandos útiles

```bash
# instalar dependencias
npm ci

# instalar navegadores Playwright (y deps del SO)
npx playwright install --with-deps

# ejecutar todo (multi-proyecto)
npx playwright test

# ejecutar sólo chromium
npx playwright test --project=chromium

# un archivo específico
npx playwright test tests/taller4/suite1-login.spec.ts

# headed (ver navegador)
npx playwright test --headed

# reporter en terminal (sin HTML)
npx playwright test --reporter=list

# ver reporte HTML generado
npx playwright show-report
```

---

## 10) Recomendaciones de organización

1. **Tests**: cortos, independientes y con `test.step` para trazabilidad.
2. **POMs**: encapsulan selectores y acciones frecuentes; evita selectores frágiles.
3. **Helpers**: centraliza esperas, logs y sesiones. Reusa en todas las suites.
4. **Data-driven**: lista de casos en `data/*.ts`. Itera con `for (const c of Cases)`.
5. **Sesiones**: guarda y reutiliza `storageState` sólo cuando el flujo lo requiera.
6. **Reportes**: usa `list` en CI para ahorrar recursos; HTML sólo en ejecuciones clave.
7. **Paralelo y cross-browser**: evita compartir estado; separa suites en archivos si encadenan pasos.

---

## 11) CI/CD (mínimo viable, GitHub Actions)

`/.github/workflows/ci.yml` (ejemplo básico por rama)

```yml
name: CI

on:
  push:
    branches: ["alumno/cramirezh"] 

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install deps (lockfile)
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      # Ejecuta solo 1 test, 1 proyecto y sin reporte HTML
      - name: Run a single smoke test (Chromium only)
        run: npx playwright test tests/taller6 --project=chromium --reporter=list

      # Sube el reporte HTML si lo generaste en otra corrida o si más adelante decides habilitarlo
      - name: Upload artifacts (reports, screenshots)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: artifacts
          path: |
            playwright-report
            test-results
            artifacts
          retention-days: 1

```

**Notas de cuotas y seguridad (resumen):**
- Si tu cuota gratuita se agota, los jobs quedarán en **queued** o **skipped**; no se cobra a menos que habilites facturación.
- Usa `permissions` mínimos y secrets sólo cuando sea necesario (`secrets.MI_TOKEN`), referenciados en el YAML.

---

## 12) TSDoc mínimo

```ts
/**
 * Guarda el storageState actual en disco.
 * @param page Instancia de Playwright Page.
 * @param absPath Ruta absoluta al archivo .json
 * @example
 * await saveSession(page, path.join(process.cwd(), 'auth', 'suite2.session.json'));
 */
export async function saveSession(page: Page, absPath: string) { /* … */ }
```

---

## 13) Solución a errores frecuentes

- **`No tests found`**: revisa ruta o patrón. Usa `tests/**/*.spec.ts`.
- **`test.use` dentro de `describe`** con opciones que fuerzan nuevo worker (p.e. video, storageState): colócalo a **nivel de archivo** o en la **config**.
- **Timeouts**: ajusta `use.actionTimeout`, `use.navigationTimeout`, `expect: { timeout }` o `test.setTimeout(ms)`.
- **Screenshots enormes (iOS/WebKit)**: evita `fullPage: true` en páginas muy largas; captura elementos específicos.

---

## 14) Cierre

Con esta base tendrás un proyecto claro, modular y escalable para E2E:
- **Playwright + TS** con configuración reproducible.
- **POMs y helpers** como piezas reutilizables.
- **Data-driven y sesiones** cuando el flujo lo requiera.
- **Reportes y CI/CD** para integrar en equipos y pipelines.

