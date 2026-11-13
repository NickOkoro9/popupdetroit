CREATE TABLE public.properties (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  neighborhood text,
  lat double precision,
  lng double precision,
  coord_precision text NOT NULL DEFAULT 'unknown',
  property_type text,
  sqft_min integer,
  sqft_max integer,
  capacity integer,
  amenities text[] NOT NULL DEFAULT '{}',
  amenities_unavailable text[] NOT NULL DEFAULT '{}',
  permitted_uses text[] NOT NULL DEFAULT '{}',
  prohibited_uses text[] NOT NULL DEFAULT '{}',
  price_amount numeric,
  price_period text,
  price_notes text,
  available_from date,
  available_to date,
  available_notes text,
  min_duration_days integer,
  landlord_requirements text[] NOT NULL DEFAULT '{}',
  description text,
  source_name text NOT NULL,
  source_url text NOT NULL,
  last_verified date NOT NULL,
  verification_status text NOT NULL DEFAULT 'potential_opportunity',
  short_term_confirmed boolean NOT NULL DEFAULT false,
  flexible_negotiable boolean,
  owner_contact_authorized boolean NOT NULL DEFAULT false,
  photo_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published properties are public" ON public.properties FOR SELECT TO anon, authenticated USING (published = true);

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inquiry_type text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  proposed_start date,
  proposed_end date,
  proposed_budget numeric,
  expected_attendance integer,
  intended_use text,
  message text NOT NULL,
  requirements jsonb,
  match_snapshot jsonb,
  delivery_status text NOT NULL DEFAULT 'saved_not_sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inquiries TO service_role;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.owner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.owner_submissions TO service_role;
ALTER TABLE public.owner_submissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.properties (id,name,address,neighborhood,lat,lng,coord_precision,property_type,sqft_min,sqft_max,amenities,permitted_uses,price_amount,price_period,price_notes,available_notes,description,source_name,source_url,last_verified,verification_status,flexible_negotiable) VALUES
('woodward-5520','5520-5564 Woodward Ave','5520-5564 Woodward Ave, Detroit, MI 48202','Midtown',42.3607,-83.0667,'approximate','Freestanding retail',1303,1303,ARRAY['parking'],ARRAY['restaurant'],33,'per_sf_year','$33/SF/yr NNN (about $3,583/mo listed). Long-term lease pricing; no short-term rate published.','Listed as available now; short-term occupancy not confirmed.','Restaurant lease opportunity inside a gas station property with a smoothie shop. Listing reports 33 parking spaces, zoning B4.','Showcase.com (RE/MAX Team 2000 listing)','https://www.showcase.com/5520-5564-woodward-ave-detroit-mi-48202/40330523/','2026-11-13','advertised_for_lease',true),
('woodward-3613','3613 Woodward Avenue','3613 Woodward Ave, Detroit, MI 48201','Midtown',42.347606,-83.0582773,'geocoded','Retail',1674,5204,ARRAY[]::text[],ARRAY['retail'],25,'per_sf_year','$25/SF NNN, direct lease. No short-term rate published.','Listing states available February 2026; short-term occupancy not confirmed.','Retail space for lease on Woodward, 1,674–5,204 SF available.','CBRE','https://www.cbre.com/properties/properties-for-lease/retail/details/US-SMPL-196365/3613-woodward-avenue-detroit-mi-48201','2026-11-13','advertised_for_lease',NULL),
('woodward-6540','6538-6540 Woodward Ave','6538-6540 Woodward Ave, Detroit, MI 48202','New Center',42.3699275,-83.0725173,'geocoded','Storefront retail / office',2000,7400,ARRAY['parking'],ARRAY['retail','office'],16,'per_sf_year','$16–$25/SF/yr NNN (from about $2,667/mo). No short-term rate published.','Availability date not stated; short-term occupancy not confirmed.','Two storefronts on Woodward in the New Center corridor near the QLine, plus a rear space with its own entrance. Listing reports 26 parking spaces.','Showcase.com (O''Connor Real Estate listing)','https://www.showcase.com/6538-6540-woodward-ave-detroit-mi-48202/34560002/','2026-11-13','advertised_for_lease',true),
('woodward-5700','5700 Woodward Ave','5700 Woodward Ave, Detroit, MI 48202','Midtown',42.362271,-83.067775,'geocoded','Retail',1750,1750,ARRAY['restroom'],ARRAY['retail','restaurant','office'],25,'per_sf_year','$25/SF NNN (NNN $5/SF). No short-term rate published.','Listed as available immediately; short-term occupancy not confirmed.','Renovated building with new common restrooms, two blocks north of the DIA. Space suits retail, restaurant or office.','CommercialSearch (Colliers listing)','https://www.commercialsearch.com/commercial-property/us/mi/detroit/for-lease-freestanding-retail-building-1/','2026-11-13','advertised_for_lease',NULL),
('woodward-4501','Studio One Retail Center, Suite D','4501 Woodward Ave, Detroit, MI 48201','Midtown',42.3535509,-83.0625077,'geocoded','Storefront retail',2121,4243,ARRAY['parking'],ARRAY['retail'],15,'per_sf_year','$15/SF/yr listed for Suite D; listing also says price negotiable.','Short-term occupancy not confirmed.','Storefront suite in a retail center with Walgreens and other tenants. Listing reports 950 parking spaces for the center.','Crexi (Keystone Commercial Real Estate listing)','https://www.crexi.com/lease/properties/332206/michigan-studio-one-retail-center','2026-11-13','advertised_for_lease',true),
('woodward-3603','Orchestra Place – First Floor Retail','3603 Woodward Ave, Detroit, MI 48201','Midtown',42.3476134,-83.058156,'geocoded','Shopping center retail',3556,3556,ARRAY['parking'],ARRAY['retail'],30,'per_sf_year','$30/SF NNN plus $9/SF NNN expenses. No short-term rate published.','Listed as available immediately; short-term occupancy not confirmed.','First-floor corner retail on Woodward with a covered public parking garage directly behind.','Landmark Commercial Real Estate (listing PDF)','https://landmarkcres.com/wp-content/uploads/2025/06/959-Orchestra-Place-First-Floor-Retail-3603-Woodward-Ave-Detroit-MI-48201_Package-1.pdf','2026-11-13','advertised_for_lease',NULL);