<script setup lang="ts">
import { ref, computed } from "vue";

const purchasePrice = ref(8000000);
const downPct = ref(30);
const rate = ref(2.875);
const term = ref(30);

const loan = computed(() => purchasePrice.value * (1 - downPct.value / 100));
const mRate = computed(() => rate.value / 100 / 12);
const nPay = computed(() => term.value * 12);
const monthly = computed(() => { const r = mRate.value, n = nPay.value, p = loan.value; return r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); });
const totalInt = computed(() => monthly.value * nPay.value - loan.value);

const propVal = ref(8000000);
const rent = ref(22000);
const costs = ref(24000);
const grossY = computed(() => ((rent.value * 12) / propVal.value) * 100);
const netY = computed(() => (((rent.value * 12) - costs.value) / propVal.value) * 100);

const sdPrice = ref(8000000);
const sd = computed(() => {
  const p = sdPrice.value;
  if (p <= 4000000) return p * 0.015;
  if (p <= 4428570) return p * 0.015 + (p - 4000000) * 0.005;
  if (p <= 6000000) return p * 0.0225;
  if (p <= 6642860) return p * 0.0225 + (p - 6000000) * 0.005;
  if (p <= 9000000) return p * 0.03;
  if (p <= 10080000) return p * 0.03 + (p - 9000000) * 0.005;
  if (p <= 20000000) return p * 0.0375;
  if (p <= 21739120) return p * 0.0375 + (p - 20000000) * 0.005;
  if (p <= 100000000) return p * 0.0425;
  return p * 0.065;
});

function fmt(n: number) { return n >= 1e6 ? `HK$${(n / 1e6).toFixed(2)}M` : `HK$${Math.round(n).toLocaleString()}`; }
</script>

<template>
  <div class="px-5 py-5 max-w-[1400px]">
    <h1 class="page-title mb-5">Tools</h1>

    <div class="grid grid-cols-2 gap-4">
      <!-- Mortgage -->
      <div class="card">
        <div class="section-title mb-3">Mortgage Calculator</div>
        <div class="space-y-2">
          <div><div class="label mb-1">Purchase Price</div><input v-model.number="purchasePrice" type="range" min="1000000" max="100000000" step="100000" class="w-full" /><div class="text-[13px] font-medium">{{ fmt(purchasePrice) }}</div></div>
          <div class="grid grid-cols-3 gap-2">
            <div><div class="label mb-1">Down %</div><select v-model.number="downPct" class="select"><option v-for="v in [10,20,30,40,50]" :value="v">{{ v }}%</option></select></div>
            <div><div class="label mb-1">Rate %</div><input v-model.number="rate" type="number" step="0.125" class="input" /></div>
            <div><div class="label mb-1">Years</div><select v-model.number="term" class="select"><option v-for="v in [10,15,20,25,30]" :value="v">{{ v }}</option></select></div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-[#e5e7eb] space-y-1 text-[13px]">
          <div class="flex justify-between"><span class="text-[#6b7280]">Loan</span><span class="font-medium">{{ fmt(loan) }}</span></div>
          <div class="flex justify-between"><span class="text-[#6b7280]">Monthly</span><span class="text-[18px] font-semibold text-[#2563eb]">{{ fmt(monthly) }}</span></div>
          <div class="flex justify-between"><span class="text-[#6b7280]">Total Interest</span><span class="font-medium text-[#dc2626]">{{ fmt(totalInt) }}</span></div>
        </div>
      </div>

      <!-- Yield -->
      <div class="card">
        <div class="section-title mb-3">Rental Yield</div>
        <div class="space-y-2">
          <div><div class="label mb-1">Property Value</div><input v-model.number="propVal" type="range" min="1000000" max="100000000" step="100000" class="w-full" /><div class="text-[13px] font-medium">{{ fmt(propVal) }}</div></div>
          <div class="grid grid-cols-2 gap-2">
            <div><div class="label mb-1">Monthly Rent</div><input v-model.number="rent" type="number" step="500" class="input" /></div>
            <div><div class="label mb-1">Annual Costs</div><input v-model.number="costs" type="number" step="1000" class="input" /></div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-[#e5e7eb] grid grid-cols-2 gap-4 text-center">
          <div><div class="text-[22px] font-semibold text-[#059669]">{{ grossY.toFixed(2) }}%</div><div class="label">Gross</div></div>
          <div><div class="text-[22px] font-semibold" :style="{color:netY>2?'#059669':netY>1?'#d97706':'#dc2626'}">{{ netY.toFixed(2) }}%</div><div class="label">Net</div></div>
        </div>
        <div class="mt-2 text-[11px] text-[#9ca3af]">HK avg gross: 3.5-3.9% (2025). {{ grossY > 3.5 ? 'Above average.' : 'Below average.' }}</div>
      </div>

      <!-- Stamp Duty -->
      <div class="card">
        <div class="section-title mb-3">Stamp Duty (AVD Scale 2)</div>
        <div class="p-2 rounded-md bg-[#ecfdf5] text-[11px] text-[#059669] mb-3">All cooling measures (BSD/SSD/NRSD) abolished Feb 2024. Scale 2 applies to all buyers.</div>
        <div><div class="label mb-1">Property Price</div><input v-model.number="sdPrice" type="range" min="1000000" max="100000000" step="100000" class="w-full" /><div class="text-[13px] font-medium">{{ fmt(sdPrice) }}</div></div>
        <div class="mt-3 pt-3 border-t border-[#e5e7eb] flex justify-between items-end">
          <div><div class="label">Stamp Duty</div><div class="text-[22px] font-semibold text-[#d97706]">{{ fmt(sd) }}</div></div>
          <div class="text-[14px] font-medium text-[#6b7280]">{{ ((sd / sdPrice) * 100).toFixed(2) }}%</div>
        </div>
      </div>

      <!-- Reference -->
      <div class="card">
        <div class="section-title mb-3">Quick Reference</div>
        <div class="space-y-2 text-[12px]">
          <div class="p-2.5 rounded-md bg-[#f9fafb]"><div class="font-medium text-[#374151] mb-0.5">Mortgage Rates (2025-26)</div><div class="text-[#6b7280]">P-Plan ~2.75-3.0% &middot; H-Plan ~4.6% &middot; Stress test suspended</div></div>
          <div class="p-2.5 rounded-md bg-[#f9fafb]"><div class="font-medium text-[#374151] mb-0.5">LTV Ratios</div><div class="text-[#6b7280]">70% standard &middot; 90% self-use &le;$10M (HKMC) &middot; 80% $10-15M</div></div>
          <div class="p-2.5 rounded-md bg-[#f9fafb]"><div class="font-medium text-[#374151] mb-0.5">Transaction Costs</div><div class="text-[#6b7280]">Agent 1% &middot; Legal $10-30K &middot; AVD Scale 2 &middot; &gt;$100M: 6.5%</div></div>
        </div>
      </div>
    </div>
  </div>
</template>
