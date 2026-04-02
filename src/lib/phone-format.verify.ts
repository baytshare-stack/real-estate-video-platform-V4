/**
 * Run: npx tsx src/lib/phone-format.verify.ts
 * Verifies national trunk stripping and E.164 normalization for supported countries.
 */
import assert from "node:assert/strict";
import {
  buildFullPhoneNumber,
  normalizePlusE164,
  stripNationalTrunkZero,
} from "@/lib/countriesData";

function run() {
  assert.equal(stripNationalTrunkZero("01012345678"), "1012345678");
  assert.equal(stripNationalTrunkZero("1012345678"), "1012345678");

  // Egypt +20: national 01… → +20 10…
  assert.equal(buildFullPhoneNumber("EG", "01012345678"), "+201012345678");

  // Saudi +966: 05… → 5…
  assert.equal(buildFullPhoneNumber("SA", "0512345678"), "+966512345678");

  // UAE +971
  assert.equal(buildFullPhoneNumber("AE", "0501234567"), "+971501234567");

  // Duplicate country code in national field
  assert.equal(buildFullPhoneNumber("EG", "201012345678"), "+201012345678");

  // + with spurious 0 after country code
  assert.equal(normalizePlusE164("+20 010 12345678", "EG"), "+201012345678");
  assert.equal(normalizePlusE164("+966 05 12345678", "SA"), "+966512345678");

  // US
  assert.equal(buildFullPhoneNumber("US", "5551234567"), "+15551234567");

  console.log("phone-format.verify: OK");
}

run();
