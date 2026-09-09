import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function economics(input) {
  const keys = ['completions', 'price', 'incentive', 'directCostPerCompletion', 'founderHours', 'hourlyCost', 'acquisitionCost', 'riskReserve', 'targetMargin'];
  for (const key of keys) if (!Number.isFinite(input[key]) || input[key] < 0) throw new Error(`Supply a nonnegative number for ${key}.`);
  if (!Number.isInteger(input.completions) || input.completions < 1 || input.targetMargin >= 1) throw new Error('Use positive whole completions and a margin below 1.');
  const revenue = input.completions * input.price;
  const incentiveFunding = input.completions * input.incentive;
  const cashCost = incentiveFunding + input.completions * input.directCostPerCompletion + input.acquisitionCost + input.riskReserve;
  const laborCost = input.founderHours * input.hourlyCost;
  const contribution = revenue - cashCost - laborCost;
  return { revenue, incentiveFunding, cashCost, laborCost, cashContribution: revenue - cashCost,
    laborAdjustedContribution: contribution, laborAdjustedMargin: revenue ? contribution / revenue : null,
    priceFloor: (cashCost + laborCost) / input.completions / (1 - input.targetMargin),
    decision: revenue > 0 && contribution / revenue >= input.targetMargin ? 'PASS economics; still requires feasibility, scope and funding' : 'REQUOTE or record a capped, deliberate pilot exception' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node operations/quote-economics.mjs quote-input.json');
    console.log(JSON.stringify(economics(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
