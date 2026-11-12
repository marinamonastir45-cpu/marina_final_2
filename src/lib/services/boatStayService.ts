import { getSupabaseOrNull } from "@/lib/supabase/serviceHelpers";
import { tr } from "@/lib/i18n/locale";

export type BoatStay = {
  id: string;
  reservationNumber: string;
  boatName: string;
  boatRegistration?: string | null;
  flag: string;
  boatType: string;
  length: number;
  width: number;
  draught: number;
  arrivalDate: string;
  departureDate: string;
  depositAmount: number;
  depositCurrency: string;
  status: string;
  specialRequirements?: string | null;
  newsletter?: boolean;
  ownerFullName: string;
  ownerPhone: string;
  ownerEmail: string;
  nationality?: string | null;
  createdAt: string;
};

async function requireSupabaseClient() {
  const supabase = await getSupabaseOrNull();
  if (!supabase) {
    throw new Error(
      tr("Connexion Supabase indisponible.", "Supabase connection unavailable."),
    );
  }
  return supabase;
}

export async function listBoatStays(): Promise<BoatStay[]> {
  const supabase = await requireSupabaseClient();
  const { data, error } = await supabase
    .from("boat_stays")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    reservationNumber: row.reservation_number || `PORT-${row.id.slice(0, 8)}`,
    boatName: row.boat_name,
    boatRegistration: row.boat_registration,
    flag: row.flag || "TN",
    boatType: row.boat_type || "Bateau",
    length: Number(row.boat_length || row.length || 0),
    width: Number(row.boat_width || row.width || 0),
    draught: Number(row.boat_draught || row.draught || 0),
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    depositAmount: Number(row.deposit_amount || 0),
    depositCurrency: row.deposit_currency || "EUR",
    status: row.status || "expected",
    specialRequirements: row.special_requirements,
    newsletter: Boolean(row.newsletter),
    ownerFullName: row.owner_full_name || "—",
    ownerPhone: row.owner_phone || "—",
    ownerEmail: row.owner_email || "—",
    nationality: row.nationality || "—",
    createdAt: row.created_at,
  }));
}
