# Future Integration Specification

## 1. Context & Scope Isolation
This pre-registration campaign functions as a decoupled feeder system. It does **not** connect directly to An-Najah National University's core hospital or future production blood bank system.

## 2. Invariant Rules for Future Migration
1. **Never match on full name alone**: Arabic names frequently share exact orthography across different individuals. Migration must use `university_id` as the primary deduplication anchor.
2. **Explicit Verification Status**: All records extracted from this campaign carry `blood_type_verification = 'SELF_REPORTED'`. The receiving main platform must not mark these donors as medically verified until an actual blood bank laboratory test is conducted.
3. **Consent Preservation**: Any automated migration must carry the corresponding `consent_records` reference to maintain compliance and traceability.

## 3. Data Transfer Contract (JSON Schema v1.0)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NajahBloodDonorMigrationPackage",
  "type": "object",
  "properties": {
    "source": { "type": "string", "enum": ["QR_CAMPAIGN_2026"] },
    "exportedAt": { "type": "string", "format": "date-time" },
    "donors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "fullName", "universityId", "campus", "phoneNumber", "age", "gender", "bloodType", "availabilityStatus"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "fullName": { "type": "string" },
          "universityId": { "type": "string" },
          "campus": { "type": "string" },
          "phoneNumber": { "type": "string" },
          "age": { "type": "integer" },
          "gender": { "type": "string" },
          "bloodType": { "type": "string" },
          "bloodTypeVerification": { "type": "string", "enum": ["SELF_REPORTED"] },
          "governorate": { "type": "string" },
          "cityOrVillage": { "type": "string" },
          "availabilityStatus": { "type": "string" },
          "lastDonationDate": { "type": ["string", "null"] },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

## 4. Suggested Migration Steps
1. Execute administrative export:
   ```bash
   curl -H "Authorization: Bearer <ADMIN_SECRET_KEY>" "https://<app-domain>/api/admin/export" -o campaign_feed.json
   ```
2. Run staging dry-run import in the main blood management system.
3. Reconcile existing donors: if a student is already registered in the core hospital system, update contact availability only if authorized by the university medical officer.
4. Flag imported records with status `MIGRATED`.
