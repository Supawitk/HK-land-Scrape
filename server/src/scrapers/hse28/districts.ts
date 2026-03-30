// Mapping of 28hse district group pages to our 18 DC district codes
// 28hse uses area codes (a1=HK Island, a2=Kowloon, a3=New Territories)
// and district group codes (dg1, dg2, ...) within each area

export interface Hse28District {
  areaCode: string;
  dgCode: string;
  name: string;
  districtId: string; // our DC district code (A-T)
}

export const HSE28_DISTRICTS: Hse28District[] = [
  // Hong Kong Island (a1)
  { areaCode: "a1", dgCode: "dg1", name: "Sai Ying Pun/Shek Tong Tsui", districtId: "A" },
  { areaCode: "a1", dgCode: "dg2", name: "Sheung Wan/Central", districtId: "A" },
  { areaCode: "a1", dgCode: "dg3", name: "Mid-Levels/Peak", districtId: "A" },
  { areaCode: "a1", dgCode: "dg4", name: "Wan Chai/Causeway Bay", districtId: "B" },
  { areaCode: "a1", dgCode: "dg5", name: "Happy Valley/Mid-Levels East", districtId: "B" },
  { areaCode: "a1", dgCode: "dg6", name: "North Point/Fortress Hill", districtId: "C" },
  { areaCode: "a1", dgCode: "dg7", name: "Quarry Bay/Tai Koo", districtId: "C" },
  { areaCode: "a1", dgCode: "dg8", name: "Shau Kei Wan/Chai Wan", districtId: "C" },
  { areaCode: "a1", dgCode: "dg9", name: "Aberdeen/Ap Lei Chau", districtId: "D" },
  { areaCode: "a1", dgCode: "dg10", name: "Repulse Bay/Stanley", districtId: "D" },
  // Kowloon (a2)
  { areaCode: "a2", dgCode: "dg1", name: "Tsim Sha Tsui", districtId: "E" },
  { areaCode: "a2", dgCode: "dg2", name: "Yau Ma Tei/Jordan", districtId: "E" },
  { areaCode: "a2", dgCode: "dg3", name: "Mong Kok/Prince Edward", districtId: "E" },
  { areaCode: "a2", dgCode: "dg4", name: "Sham Shui Po/Cheung Sha Wan", districtId: "F" },
  { areaCode: "a2", dgCode: "dg5", name: "Lai Chi Kok/Mei Foo", districtId: "F" },
  { areaCode: "a2", dgCode: "dg6", name: "Ho Man Tin/To Kwa Wan", districtId: "G" },
  { areaCode: "a2", dgCode: "dg7", name: "Kowloon City/Kowloon Tong", districtId: "G" },
  { areaCode: "a2", dgCode: "dg8", name: "Wong Tai Sin/Diamond Hill", districtId: "H" },
  { areaCode: "a2", dgCode: "dg9", name: "Kwun Tong/Lam Tin", districtId: "J" },
  { areaCode: "a2", dgCode: "dg10", name: "Kowloon Bay/Ngau Tau Kok", districtId: "J" },
  // New Territories (a3)
  { areaCode: "a3", dgCode: "dg1", name: "Tsuen Wan", districtId: "K" },
  { areaCode: "a3", dgCode: "dg2", name: "Kwai Chung/Tsing Yi", districtId: "S" },
  { areaCode: "a3", dgCode: "dg3", name: "Tuen Mun", districtId: "L" },
  { areaCode: "a3", dgCode: "dg4", name: "Yuen Long", districtId: "M" },
  { areaCode: "a3", dgCode: "dg5", name: "Tin Shui Wai", districtId: "M" },
  { areaCode: "a3", dgCode: "dg6", name: "Tai Po", districtId: "P" },
  { areaCode: "a3", dgCode: "dg7", name: "North District", districtId: "N" },
  { areaCode: "a3", dgCode: "dg8", name: "Sha Tin", districtId: "R" },
  { areaCode: "a3", dgCode: "dg9", name: "Ma On Shan", districtId: "R" },
  { areaCode: "a3", dgCode: "dg10", name: "Tseung Kwan O", districtId: "Q" },
  { areaCode: "a3", dgCode: "dg11", name: "Sai Kung", districtId: "Q" },
  { areaCode: "a3", dgCode: "dg12", name: "Tung Chung/Islands", districtId: "T" },
];
