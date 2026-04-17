// Curated list of major Indian cities for autocomplete during ProfileSetup.
// Each entry maps to a state_code that exists in src/lib/india-states.ts.
// Sorted roughly by tier so the most common matches surface first.

export interface IndiaCity {
  name: string;
  state: string;     // state_code, e.g. "MH"
  stateName: string; // human-readable, e.g. "Maharashtra"
  tier: 1 | 2 | 3;
}

export const INDIA_CITIES: IndiaCity[] = [
  // Tier 1
  { name: "Mumbai", state: "MH", stateName: "Maharashtra", tier: 1 },
  { name: "Delhi", state: "DL", stateName: "Delhi", tier: 1 },
  { name: "Bengaluru", state: "KA", stateName: "Karnataka", tier: 1 },
  { name: "Hyderabad", state: "TS", stateName: "Telangana", tier: 1 },
  { name: "Chennai", state: "TN", stateName: "Tamil Nadu", tier: 1 },
  { name: "Kolkata", state: "WB", stateName: "West Bengal", tier: 1 },
  { name: "Pune", state: "MH", stateName: "Maharashtra", tier: 1 },
  { name: "Ahmedabad", state: "GJ", stateName: "Gujarat", tier: 1 },
  { name: "Gurugram", state: "HR", stateName: "Haryana", tier: 1 },
  { name: "Noida", state: "UP", stateName: "Uttar Pradesh", tier: 1 },

  // Tier 2
  { name: "Jaipur", state: "RJ", stateName: "Rajasthan", tier: 2 },
  { name: "Lucknow", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Surat", state: "GJ", stateName: "Gujarat", tier: 2 },
  { name: "Nagpur", state: "MH", stateName: "Maharashtra", tier: 2 },
  { name: "Indore", state: "MP", stateName: "Madhya Pradesh", tier: 2 },
  { name: "Bhopal", state: "MP", stateName: "Madhya Pradesh", tier: 2 },
  { name: "Patna", state: "BR", stateName: "Bihar", tier: 2 },
  { name: "Vadodara", state: "GJ", stateName: "Gujarat", tier: 2 },
  { name: "Coimbatore", state: "TN", stateName: "Tamil Nadu", tier: 2 },
  { name: "Kochi", state: "KL", stateName: "Kerala", tier: 2 },
  { name: "Visakhapatnam", state: "AP", stateName: "Andhra Pradesh", tier: 2 },
  { name: "Chandigarh", state: "CH", stateName: "Chandigarh", tier: 2 },
  { name: "Ludhiana", state: "PB", stateName: "Punjab", tier: 2 },
  { name: "Agra", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Nashik", state: "MH", stateName: "Maharashtra", tier: 2 },
  { name: "Faridabad", state: "HR", stateName: "Haryana", tier: 2 },
  { name: "Ghaziabad", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Rajkot", state: "GJ", stateName: "Gujarat", tier: 2 },
  { name: "Meerut", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Varanasi", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Amritsar", state: "PB", stateName: "Punjab", tier: 2 },
  { name: "Allahabad", state: "UP", stateName: "Uttar Pradesh", tier: 2 },
  { name: "Howrah", state: "WB", stateName: "West Bengal", tier: 2 },
  { name: "Jodhpur", state: "RJ", stateName: "Rajasthan", tier: 2 },
  { name: "Madurai", state: "TN", stateName: "Tamil Nadu", tier: 2 },
  { name: "Thane", state: "MH", stateName: "Maharashtra", tier: 2 },
  { name: "Navi Mumbai", state: "MH", stateName: "Maharashtra", tier: 2 },

  // Tier 3
  { name: "Mysuru", state: "KA", stateName: "Karnataka", tier: 3 },
  { name: "Mangaluru", state: "KA", stateName: "Karnataka", tier: 3 },
  { name: "Hubballi", state: "KA", stateName: "Karnataka", tier: 3 },
  { name: "Guwahati", state: "AS", stateName: "Assam", tier: 3 },
  { name: "Shimla", state: "HP", stateName: "Himachal Pradesh", tier: 3 },
  { name: "Dehradun", state: "UK", stateName: "Uttarakhand", tier: 3 },
  { name: "Ranchi", state: "JH", stateName: "Jharkhand", tier: 3 },
  { name: "Jamshedpur", state: "JH", stateName: "Jharkhand", tier: 3 },
  { name: "Raipur", state: "CG", stateName: "Chhattisgarh", tier: 3 },
  { name: "Bhubaneswar", state: "OD", stateName: "Odisha", tier: 3 },
  { name: "Cuttack", state: "OD", stateName: "Odisha", tier: 3 },
  { name: "Thiruvananthapuram", state: "KL", stateName: "Kerala", tier: 3 },
  { name: "Kozhikode", state: "KL", stateName: "Kerala", tier: 3 },
  { name: "Vijayawada", state: "AP", stateName: "Andhra Pradesh", tier: 3 },
  { name: "Tiruchirappalli", state: "TN", stateName: "Tamil Nadu", tier: 3 },
  { name: "Salem", state: "TN", stateName: "Tamil Nadu", tier: 3 },
  { name: "Goa", state: "GA", stateName: "Goa", tier: 3 },
  { name: "Panaji", state: "GA", stateName: "Goa", tier: 3 },
  { name: "Aurangabad", state: "MH", stateName: "Maharashtra", tier: 3 },
  { name: "Solapur", state: "MH", stateName: "Maharashtra", tier: 3 },
  { name: "Udaipur", state: "RJ", stateName: "Rajasthan", tier: 3 },
  { name: "Kota", state: "RJ", stateName: "Rajasthan", tier: 3 },
  { name: "Ajmer", state: "RJ", stateName: "Rajasthan", tier: 3 },
  { name: "Kanpur", state: "UP", stateName: "Uttar Pradesh", tier: 3 },
  { name: "Bareilly", state: "UP", stateName: "Uttar Pradesh", tier: 3 },
  { name: "Aligarh", state: "UP", stateName: "Uttar Pradesh", tier: 3 },
  { name: "Gwalior", state: "MP", stateName: "Madhya Pradesh", tier: 3 },
  { name: "Jabalpur", state: "MP", stateName: "Madhya Pradesh", tier: 3 },
  { name: "Jammu", state: "JK", stateName: "Jammu & Kashmir", tier: 3 },
  { name: "Srinagar", state: "JK", stateName: "Jammu & Kashmir", tier: 3 },
  { name: "Imphal", state: "MN", stateName: "Manipur", tier: 3 },
  { name: "Shillong", state: "ML", stateName: "Meghalaya", tier: 3 },
  { name: "Aizawl", state: "MZ", stateName: "Mizoram", tier: 3 },
  { name: "Kohima", state: "NL", stateName: "Nagaland", tier: 3 },
  { name: "Itanagar", state: "AR", stateName: "Arunachal Pradesh", tier: 3 },
  { name: "Agartala", state: "TR", stateName: "Tripura", tier: 3 },
  { name: "Gangtok", state: "SK", stateName: "Sikkim", tier: 3 },
  { name: "Puducherry", state: "PY", stateName: "Puducherry", tier: 3 },
  { name: "Port Blair", state: "AN", stateName: "Andaman & Nicobar", tier: 3 },
  { name: "Bhavnagar", state: "GJ", stateName: "Gujarat", tier: 3 },
  { name: "Jamnagar", state: "GJ", stateName: "Gujarat", tier: 3 },
  { name: "Tirupati", state: "AP", stateName: "Andhra Pradesh", tier: 3 },
  { name: "Warangal", state: "TS", stateName: "Telangana", tier: 3 },
  { name: "Siliguri", state: "WB", stateName: "West Bengal", tier: 3 },
  { name: "Asansol", state: "WB", stateName: "West Bengal", tier: 3 },
  { name: "Durgapur", state: "WB", stateName: "West Bengal", tier: 3 },
];

export const ALL_STATE_OPTIONS: Array<{ code: string; name: string }> = (() => {
  const m = new Map<string, string>();
  for (const c of INDIA_CITIES) m.set(c.state, c.stateName);
  // Add a few states that have no city in the list above (rare, but keep complete)
  const extras = [
    ["LD", "Lakshadweep"],
    ["DN", "Dadra & Nagar Haveli"],
    ["DD", "Daman & Diu"],
  ] as const;
  for (const [code, name] of extras) if (!m.has(code)) m.set(code, name);
  return Array.from(m.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

export function searchCities(query: string, limit = 8): IndiaCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: IndiaCity[] = [];
  const contains: IndiaCity[] = [];
  for (const c of INDIA_CITIES) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q) || c.stateName.toLowerCase().includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
