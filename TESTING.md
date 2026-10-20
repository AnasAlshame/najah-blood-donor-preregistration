# Testing Strategy & Quality Gates

## 1. Automated Testing Pyramid

The project implements automated unit, integration, and build checks using Vitest, Testing Library, and TypeScript.

### Test Suites
Location: `src/tests/validation.test.ts`

1. **Palestinian Phone Normalization & Validation**:
   - Standard local Jawwal / Ooredoo (`059xxxxxxx`, `056xxxxxxx`).
   - International dialing codes (`+970`, `+972`, `00970`, `00972`).
   - Rejection of invalid prefixes or malformed lengths.
2. **Valid Registration Payload Parsing**:
   - Correct handling of full names, student IDs, campus enums, blood types, and cities.
3. **Consent Enforcement**:
   - Immediate rejection if explicit consent is not checked.
4. **Date Integrity**:
   - Rejection of impossible future donation dates.
5. **Bot Trap (Honeypot) Defense**:
   - Identification and rejection of automated bots filling invisible fields.

## 2. Execution Commands

```bash
# Run automated tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Execute full Next.js production build and TypeScript check
npm run build
```

## 3. Test Evidence Log
- `src/tests/validation.test.ts`: **5 PASSED** (Vitest).
- `npm run build`: **PASSED** (Compiled statically, optimized route endpoints verified).
