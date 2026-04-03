<script setup lang="ts">
import { ref, computed, watch } from "vue";

// === Mortgage Calculator ===
const purchasePrice = ref(8000000);
const downPaymentPct = ref(30);
const interestRate = ref(2.875);
const loanTermYears = ref(30);

const downPayment = computed(() => purchasePrice.value * (downPaymentPct.value / 100));
const loanAmount = computed(() => purchasePrice.value - downPayment.value);
const monthlyRate = computed(() => interestRate.value / 100 / 12);
const totalPayments = computed(() => loanTermYears.value * 12);

const monthlyPayment = computed(() => {
  const r = monthlyRate.value;
  const n = totalPayments.value;
  const p = loanAmount.value;
  if (r === 0) return p / n;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
});
const totalInterest = computed(() => monthlyPayment.value * totalPayments.value - loanAmount.value);
const totalCost = computed(() => purchasePrice.value + totalInterest.value);

// === Rental Yield Calculator ===
const propValue = ref(8000000);
const monthlyRent = ref(22000);
const annualCosts = ref(24000);

const grossYield = computed(() => ((monthlyRent.value * 12) / propValue.value) * 100);
const netYield = computed(() => (((monthlyRent.value * 12) - annualCosts.value) / propValue.value) * 100);
const paybackYears = computed(() => propValue.value / (monthlyRent.value * 12 - annualCosts.value));

// === Stamp Duty Calculator ===
// All cooling measures (BSD, SSD, NRSD) abolished Feb 28, 2024
// Scale 2 AVD now applies universally to all buyers
// 2025-26 Budget: properties >$100M face 6.5% (raised from 4.25%)
const stampDutyPrice = ref(8000000);

const stampDuty = computed(() => {
  return computeScale2(stampDutyPrice.value);
});

function computeScale2(price: number): number {
  // AVD Scale 2 rates (post Feb 2025 budget - $4M threshold)
  if (price <= 4000000) return price * 0.015;
  if (price <= 4428570) return price * 0.015 + (price - 4000000) * 0.005;
  if (price <= 6000000) return price * 0.0225;
  if (price <= 6642860) return price * 0.0225 + (price - 6000000) * 0.005;
  if (price <= 9000000) return price * 0.03;
  if (price <= 10080000) return price * 0.03 + (price - 9000000) * 0.005;
  if (price <= 20000000) return price * 0.0375;
  if (price <= 21739120) return price * 0.0375 + (price - 20000000) * 0.005;
  if (price <= 100000000) return price * 0.0425;
  return price * 0.065; // >$100M: 6.5% (2025-26 Budget)
}

const stampDutyPct = computed(() => ((stampDuty.value / stampDutyPrice.value) * 100).toFixed(2));

function formatHKD(n: number): string {
  if (n >= 1000000) return `HK$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `HK$${(n / 1000).toFixed(0)}K`;
  return `HK$${Math.round(n).toLocaleString()}`;
}
</script>

<template>
  <div class="p-6 max-w-screen-xl mx-auto space-y-6">
    <div>
      <h1 class="page-title">Property Tools</h1>
      <p class="text-sm text-slate-500 mt-1">Calculators and analysis tools for Hong Kong property</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Mortgage Calculator -->
      <div class="stat-card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
          </div>
          <h2 class="section-title">Mortgage Calculator</h2>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-medium text-slate-400 uppercase">Purchase Price</label>
            <input v-model.number="purchasePrice" type="range" min="1000000" max="100000000" step="100000" class="w-full accent-indigo-600" />
            <div class="text-sm font-semibold text-slate-700">{{ formatHKD(purchasePrice) }}</div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-[10px] font-medium text-slate-400 uppercase">Down Payment</label>
              <select v-model.number="downPaymentPct" class="select">
                <option :value="10">10%</option>
                <option :value="20">20%</option>
                <option :value="30">30%</option>
                <option :value="40">40%</option>
                <option :value="50">50%</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-medium text-slate-400 uppercase">Interest Rate</label>
              <input v-model.number="interestRate" type="number" step="0.125" min="0" max="15" class="input" />
            </div>
            <div>
              <label class="text-[10px] font-medium text-slate-400 uppercase">Term (Years)</label>
              <select v-model.number="loanTermYears" class="select">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
                <option :value="25">25</option>
                <option :value="30">30</option>
              </select>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <div class="flex justify-between"><span class="text-sm text-slate-500">Loan Amount</span><span class="text-sm font-semibold">{{ formatHKD(loanAmount) }}</span></div>
          <div class="flex justify-between"><span class="text-sm text-slate-500">Monthly Payment</span><span class="text-lg font-bold text-indigo-600">{{ formatHKD(monthlyPayment) }}</span></div>
          <div class="flex justify-between"><span class="text-sm text-slate-500">Total Interest</span><span class="text-sm font-semibold text-rose-600">{{ formatHKD(totalInterest) }}</span></div>
          <div class="flex justify-between"><span class="text-sm text-slate-500">Total Cost</span><span class="text-sm font-semibold">{{ formatHKD(totalCost) }}</span></div>

          <div class="mt-3 h-3 rounded-full flex overflow-hidden">
            <div class="bg-indigo-500" :style="{ width: (purchasePrice / totalCost * 100) + '%' }"></div>
            <div class="bg-rose-400" :style="{ width: (totalInterest / totalCost * 100) + '%' }"></div>
          </div>
          <div class="flex gap-4 text-xs text-slate-400">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Principal</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-400"></span> Interest</span>
          </div>
        </div>
      </div>

      <!-- Rental Yield Calculator -->
      <div class="stat-card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20m5-17H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H7" /></svg>
          </div>
          <h2 class="section-title">Rental Yield Calculator</h2>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-medium text-slate-400 uppercase">Property Value</label>
            <input v-model.number="propValue" type="range" min="1000000" max="100000000" step="100000" class="w-full accent-emerald-600" />
            <div class="text-sm font-semibold text-slate-700">{{ formatHKD(propValue) }}</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-medium text-slate-400 uppercase">Monthly Rent</label>
              <input v-model.number="monthlyRent" type="number" step="500" class="input" />
            </div>
            <div>
              <label class="text-[10px] font-medium text-slate-400 uppercase">Annual Costs (mgmt/rates)</label>
              <input v-model.number="annualCosts" type="number" step="1000" class="input" />
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-emerald-600">{{ grossYield.toFixed(2) }}%</div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Gross Yield</div>
          </div>
          <div>
            <div class="text-2xl font-bold" :class="netYield > 2 ? 'text-emerald-600' : netYield > 1 ? 'text-amber-600' : 'text-rose-600'">{{ netYield.toFixed(2) }}%</div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Net Yield</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-700">{{ paybackYears.toFixed(1) }}</div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Years to Payback</div>
          </div>
        </div>

        <div class="mt-3 text-xs text-slate-400">
          HK average gross yield: 3.5-3.9% (2025, Class A domestic).
          <span :class="grossYield > 3.5 ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'">
            {{ grossYield > 3.5 ? 'Above average' : 'Below average' }}
          </span>
        </div>
      </div>

      <!-- Stamp Duty Calculator -->
      <div class="stat-card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <h2 class="section-title">Stamp Duty Calculator</h2>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-medium text-slate-400 uppercase">Property Price</label>
            <input v-model.number="stampDutyPrice" type="range" min="1000000" max="100000000" step="100000" class="w-full accent-amber-600" />
            <div class="text-sm font-semibold text-slate-700">{{ formatHKD(stampDutyPrice) }}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-50 text-xs text-emerald-700">
            All cooling measures (BSD, SSD, NRSD) abolished Feb 2024. Scale 2 AVD applies to all buyers.
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Stamp Duty Payable</div>
            <div class="text-2xl font-bold text-amber-600">{{ formatHKD(stampDuty) }}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-medium text-slate-400 uppercase">Rate</div>
            <div class="text-lg font-bold text-slate-700">{{ stampDutyPct }}%</div>
          </div>
        </div>

        <div class="mt-2 text-xs text-slate-400">
          AVD Scale 2 rates. Properties &gt;HK$100M: 6.5% (2025-26 Budget).
        </div>
      </div>

      <!-- Affordability -->
      <div class="stat-card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6m3-3h-6" /></svg>
          </div>
          <h2 class="section-title">Quick Reference</h2>
        </div>

        <div class="space-y-3 text-sm">
          <div class="p-3 rounded-xl bg-slate-50">
            <div class="font-medium text-slate-700 mb-1">Mortgage Rates (2025-26)</div>
            <div class="text-xs text-slate-500 space-y-0.5">
              <div>P-Plan: ~2.75-3.0% (Prime minus 2.5%)</div>
              <div>H-Plan: ~4.6% (HIBOR + 1.3%)</div>
              <div>HKMA stress test suspended since Feb 2024</div>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50">
            <div class="font-medium text-slate-700 mb-1">Max LTV Ratios (2025)</div>
            <div class="text-xs text-slate-500 space-y-0.5">
              <div>Standard: 70% LTV for all properties</div>
              <div>Self-use &le; HK$10M: Up to 90% with HKMC insurance</div>
              <div>Self-use HK$10M-15M: Up to 80% with MIP</div>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50">
            <div class="font-medium text-slate-700 mb-1">Transaction Costs</div>
            <div class="text-xs text-slate-500 space-y-0.5">
              <div>Agent commission: 1% (buyer + seller)</div>
              <div>Legal fees: HK$10,000 - 30,000</div>
              <div>Stamp duty: AVD Scale 2 (all buyers, cooling measures abolished)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
