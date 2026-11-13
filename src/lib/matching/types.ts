// Shared domain types for PopUp Detroit. Pure data — no React, no IO.

export type TriState = "yes" | "no" | "unknown";

export const CATEGORIES = [
  "Fashion and apparel",
  "General retail",
  "Art and exhibitions",
  "Beauty and cosmetics",
  "Workshops and education",
  "Food and beverage",
  "Private events",
  "Professional services",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const NEIGHBORHOODS = [
  "Downtown",
  "Midtown",
  "Corktown",
  "Eastern Market",
  "New Center",
  "Southwest Detroit",
  "West Village",
  "Other Detroit neighborhoods",
] as const;

export const DURATIONS = [
  { value: "one_day", label: "One day", days: 1 },
  { value: "weekend", label: "Weekend", days: 2 },
  { value: "one_week", label: "One week", days: 7 },
  { value: "several_weeks", label: "Several weeks", days: 21 },
  { value: "one_month", label: "One month", days: 30 },
  { value: "recurring_weekends", label: "Recurring weekends", days: 2 },
] as const;
export type Duration = (typeof DURATIONS)[number]["value"];

export const AMENITIES = [
  { value: "electricity", label: "Electricity" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "restroom", label: "Restroom" },
  { value: "parking", label: "Parking" },
  { value: "accessible_entrance", label: "Accessible entrance" },
  { value: "storage", label: "Storage" },
  { value: "furniture", label: "Furniture" },
  { value: "display_fixtures", label: "Display fixtures" },
  { value: "food_prep", label: "Food preparation" },
] as const;
export type Amenity = (typeof AMENITIES)[number]["value"];

export const REGULATED = [
  { value: "alcohol", label: "Alcohol service or sales" },
  { value: "food", label: "Food preparation or sales" },
  { value: "live_music", label: "Live music" },
  { value: "amplified_sound", label: "Amplified sound" },
  { value: "minors", label: "Attendance by minors" },
  { value: "tobacco", label: "Tobacco-related activities" },
  { value: "cannabis", label: "Cannabis-related activities" },
] as const;
export type RegulatedActivity = (typeof REGULATED)[number]["value"];

export interface Requirements {
  businessName: string | null;
  category: Category | null;
  description: string;
  activities: string | null;
  expectedAttendance: number | null;
  operatesPhysically: TriState;
  recurring: TriState;
  neighborhoods: string[];
  alternativeNeighborhoods: string[];
  radiusMiles: number | null;
  locationFlexible: TriState;
  maxBudget: number | null;
  dailyBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  datesFlexible: TriState;
  duration: Duration | null;
  minSqft: number | null;
  capacity: number | null;
  amenitiesRequired: Amenity[];
  amenitiesPreferred: Amenity[];
  regulated: Record<RegulatedActivity, TriState>;
  operatingHours: string | null;
  hasInsurance: TriState;
  hasLicenses: TriState;
  hasPermits: TriState;
}

export const emptyRequirements = (): Requirements => ({
  businessName: null,
  category: null,
  description: "",
  activities: null,
  expectedAttendance: null,
  operatesPhysically: "unknown",
  recurring: "unknown",
  neighborhoods: [],
  alternativeNeighborhoods: [],
  radiusMiles: null,
  locationFlexible: "unknown",
  maxBudget: null,
  dailyBudget: null,
  startDate: null,
  endDate: null,
  datesFlexible: "unknown",
  duration: null,
  minSqft: null,
  capacity: null,
  amenitiesRequired: [],
  amenitiesPreferred: [],
  regulated: {
    alcohol: "unknown",
    food: "unknown",
    live_music: "unknown",
    amplified_sound: "unknown",
    minors: "unknown",
    tobacco: "unknown",
    cannabis: "unknown",
  },
  operatingHours: null,
  hasInsurance: "unknown",
  hasLicenses: "unknown",
  hasPermits: "unknown",
});

export type VerificationStatus =
  | "verified_short_term"
  | "advertised_for_lease"
  | "potential_opportunity";

export type PricePeriod =
  | "per_day"
  | "per_weekend"
  | "per_week"
  | "per_month"
  | "per_sf_year"
  | null;

export interface Property {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  coord_precision: string;
  property_type: string | null;
  sqft_min: number | null;
  sqft_max: number | null;
  capacity: number | null;
  amenities: string[];
  amenities_unavailable: string[];
  permitted_uses: string[];
  prohibited_uses: string[];
  price_amount: number | null;
  price_period: string | null;
  price_notes: string | null;
  available_from: string | null;
  available_to: string | null;
  available_notes: string | null;
  min_duration_days: number | null;
  landlord_requirements: string[];
  description: string | null;
  source_name: string;
  source_url: string;
  last_verified: string;
  verification_status: string;
  short_term_confirmed: boolean;
  flexible_negotiable: boolean | null;
  owner_contact_authorized: boolean;
  photo_url: string | null;
}

export type CheckResult = "pass" | "fail" | "unknown";
export interface Check {
  key: string;
  label: string;
  result: CheckResult;
  detail: string;
}

export type MatchStatus = "bookable" | "inquiry" | "excluded";

export interface ScoreComponent {
  key: "location" | "price" | "amenities" | "business" | "flexibility";
  label: string;
  weight: number;
  value: number; // 0..1
  points: number; // weight * value * 100
  reason: string;
}

export interface MatchResult {
  propertyId: string;
  status: MatchStatus;
  checks: Check[];
  score: number; // 0..100
  components: ScoreComponent[];
  completeness: number; // 0..100
  outstanding: string[];
  estimatedCost: number | null;
}
