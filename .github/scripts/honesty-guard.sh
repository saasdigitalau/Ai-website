#!/usr/bin/env bash
# Honesty guard — fails CI when a claim family the team keeps regressing on comes back.
#
# Evidence base: /home/team/shared/HONESTY-AUDIT.md (row numbers below), which is a
# read-only audit of every customer-facing claim against what the code does.
#
# Run from the repo root: bash .github/scripts/honesty-guard.sh
# It is deliberately fail-closed: if a claim becomes true later (a payment provider is
# wired, a model is connected, hosting ships) delete the matching rule in the same PR
# that makes it true, so the wording and the guard change together.

set -u

fail=0

# fail_if_present <path> <ERE> <why>
fail_if_present() {
  local target="$1" pattern="$2" why="$3" hits
  hits=$(grep -rnE --include='*.ts' --include='*.tsx' -- "$pattern" "$target" 2>/dev/null)
  if [ -n "$hits" ]; then
    printf '%s\n' "$hits"
    echo "::error::$why (pattern: $pattern)"
    fail=1
  fi
}

# require_present <path> <ERE> <why>
require_present() {
  local target="$1" pattern="$2" why="$3"
  if ! grep -rqE -- "$pattern" "$target" 2>/dev/null; then
    echo "::error::$why (expected to find: $pattern in $target)"
    fail=1
  fi
}

# --- audit 5, 6, 7: the "get paid" cluster ---------------------------------
# No payment provider is connected, no fee schedule is known, and there is no PDF
# generator anywhere in the repo. Razorpay will charge a fee, so a 0% claim can
# never become true again.
fail_if_present app/page.tsx 'processing fee|0% processing|avg time to paid|PDF export|Instant PDF|send (it|them) as (a )?PDF' \
  'app/page.tsx claims a payment/fee/PDF capability the code does not have'

# --- audit 8: nothing can be bought or cancelled ---------------------------
fail_if_present app 'Cancel anytime|Cancel your subscription anytime' \
  'nothing can be bought or cancelled — no checkout is wired (audit row 8)'

# --- audit 9, 10, 19, 20: hosting, preview links, live presence ------------
# No hosting/deploy/DNS code exists, no Website row is ever created, and there is no
# viewer-presence counter. A preview link cannot be shared because it cannot exist.
fail_if_present app/page.tsx 'custom domains?|built-in hosting|hosting is built-in|unlimited revisions|live preview link|client viewing now|viewers|sitelaunch\.app/p/' \
  'app/page.tsx sells hosting / preview links / live viewer counts that do not exist (audit rows 9, 10, 19, 20)'

# --- audit 11, 26: generation is template-based, not model-based -----------
# If an LLM is connected (owner decision 5), re-word the copy and delete this rule.
fail_if_present app 'AI-Powered|AI-powered|AI-Generated|AI-generated|our AI (handles|understands)' \
  'AI wording while website generation is keyword-matched templates (audit rows 11, 26)'

# --- audit 16: the lead search API caps at 20 results per page -------------
fail_if_present app '50 results per search' \
  'the lead search API caps at 20 results per page (audit row 16)'

# --- audit 2, 4: no index, no enrichment ----------------------------------
fail_if_present app '200M\+|AI enrichment' \
  'the product holds no business index and runs no enrichment step (audit rows 2, 4)'

# --- audit 1: invented named testimonials on the landing page --------------
fail_if_present app/page.tsx 'Priya Anand|Sarah Chen|Jasmine Rivera|Lotus Linen|Real customers, real results' \
  'invented named testimonials — there are no customer records and no review system (audit row 1)'

# A quote card is only allowed on the landing page once reviews are real.
fail_if_present app/page.tsx '<blockquote|figcaption' \
  'landing page renders a testimonial/quote card — only acceptable with real, attributable reviews (audit row 1)'

# --- audit 15: generated sites must not ship invented business details -----
# These are rendered into the customer's own published site, so a fake phone,
# address, email or review reaches their clients.
fail_if_present app/lib/website-generator.ts '\(555\)|555-[0-9]|123 Culinary Lane|456 Powerhouse|789 Beauty|321 Health|555 Harmony|100 Business Park|@[A-Za-z0-9.-]+\.com|Sarah M\.|John D\.|Mike T\.|Jessica R\.|Annie K\.|Rachel P\.|Tom L\.|Maria G\.|Emily R\.|David K\.|Client A\.|Client B\.' \
  'app/lib/website-generator.ts ships invented phone/address/email/reviewer details into the customer site (audit row 15)'

# ...and the placeholders that replaced them must stay in every template.
require_present app/lib/website-generator.ts 'Sample review — replace with a real customer quote' \
  'generated sites must label sample reviews as placeholders (audit row 15)'
require_present app/lib/website-generator.ts '\[Your street address\]' 'generated sites must use an address placeholder (audit row 15)'
require_present app/lib/website-generator.ts '\[Your phone number\]' 'generated sites must use a phone placeholder (audit row 15)'
require_present app/lib/website-generator.ts '\[Your opening hours\]' 'generated sites must use an opening-hours placeholder (audit row 15)'

# --- audit 13: any visitor can mark an invoice paid via ?paid=true ---------
fail_if_present app/dashboard/invoices 'Payment received!|"paid"\) === "true"' \
  'an invoice must not be marked paid without a verified payment (audit row 13)'

if [ "$fail" -ne 0 ]; then
  echo "Honesty guard failed: see the ::error lines above and /home/team/shared/HONESTY-AUDIT.md."
  exit 1
fi
echo "Honesty guard passed."
