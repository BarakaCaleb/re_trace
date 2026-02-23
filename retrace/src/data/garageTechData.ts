export type TechData = {
  key: string; // match key like "BMW 3 Series|2014|2.0L Diesel"
  torque: { label: string; value: string }[];
  fluids: { label: string; value: string }[];
  service: { label: string; value: string }[];
  wiring: { note: string };
};

export const TECH_DATA: TechData[] = [
  {
    key: "BMW 3 Series|2014|2.0L Diesel",
    torque: [
      { label: "Wheel bolts", value: "140 Nm" },
      { label: "Oil drain plug", value: "25 Nm" },
      { label: "Engine mount bolts", value: "55 Nm (check spec)" },
    ],
    fluids: [
      { label: "Engine oil", value: "5.2 L" },
      { label: "Coolant", value: "8.0 L" },
      { label: "Brake fluid", value: "DOT 4" },
    ],
    service: [
      { label: "Oil + filter", value: "10,000–15,000 km" },
      { label: "Fuel filter", value: "30,000 km" },
      { label: "Brake fluid", value: "Every 2 years" },
    ],
    wiring: { note: "Starter/alternator basics (MVP). Upgrade later to diagrams." },
  },
  {
    key: "BMW X5|2018|3.0L Diesel",
    torque: [
      { label: "Wheel bolts", value: "140 Nm" },
      { label: "Oil drain plug", value: "30 Nm" },
    ],
    fluids: [
      { label: "Engine oil", value: "6.5 L" },
      { label: "Coolant", value: "10.0 L" },
    ],
    service: [{ label: "Oil + filter", value: "12,000–15,000 km" }],
    wiring: { note: "MVP wiring summary placeholder." },
  },
];