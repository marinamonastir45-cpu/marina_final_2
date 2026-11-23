import type { Guest, Invoice, Payment, Reservation, Room } from "@/data/hotel";
import type { Tables } from "./types";

type RoomTypeRow = Tables<"room_types">;
type RoomImageRow = Tables<"room_images">;
type RoomAmenityRow = Tables<"room_amenities">;
type GuestRow = Tables<"guests">;
type ReservationRow = Tables<"reservations"> & {
  guest?: GuestRow | null;
  guests?: GuestRow | null;
  room_type?: RoomTypeRow | null;
  room_types?: RoomTypeRow | null;
};
type PaymentRow = Tables<"payments">;
type InvoiceRow = Tables<"invoices">;

export function mapRoomTypeFromDb(
  row: RoomTypeRow,
  images: Array<RoomImageRow | string> = [],
  amenities: Array<RoomAmenityRow | string> = [],
  fallbackImages: string[] = [],
): Room {
  const mappedImages = images
    .map((image) => {
      if (typeof image === "string") return image;
      return image.url || image.image_url || "";
    })
    .filter(Boolean);

  const mappedAmenities = amenities
    .map((amenity) => {
      if (typeof amenity === "string") return amenity;
      return amenity.amenity;
    })
    .filter(Boolean);

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    pricePerNight: Number(row.price_per_night),
    capacityAdults: row.capacity_adults,
    capacityChildren: row.capacity_children,
    beds: row.beds,
    bathrooms: row.bathrooms,
    totalUnits: row.total_units,
    amenities: mappedAmenities,
    images: mappedImages.length ? mappedImages : fallbackImages,
    status: row.status,
    bookings: [],
  };
}

export function mapReservationFromDb(row: ReservationRow, guestOverride?: Guest): Reservation {
  const guest = guestOverride ?? mapGuestFromDb(row.guest ?? row.guests ?? undefined, row.guest_id);

  return {
    id: row.id,
    reservationNumber: row.reservation_number,
    roomId: row.room_type_id,
    guest,
    checkIn: row.check_in,
    checkOut: row.check_out,
    adults: row.adults,
    children: row.children,
    status: row.status,
    paymentStatus: row.payment_status,
    source: row.source,
    specialRequests: row.special_requests ?? undefined,
    createdAt: toDate(row.created_at),
    nights: row.nights,
    roomPrice: Number(row.room_price),
    taxesAndFees: Number(row.taxes_and_fees),
    deposit: Number(row.deposit),
    total: Number(row.total),
    paidAmount: Number(row.paid_amount ?? 0),
    remainingAmount: Number(
      row.remaining_amount ?? Math.max(0, Number(row.total) - Number(row.deposit)),
    ),
  };
}

export function mapGuestFromDb(row?: GuestRow | null, fallbackId = "guest"): Guest {
  return {
    id: row?.id ?? fallbackId,
    fullName: row?.full_name ?? "Client",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    country: row?.country ?? "",
    identityNumber: row?.identity_number ?? "",
  };
}

export function mapPaymentFromDb(row: PaymentRow): Payment {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    updatedAt: toDate(row.updated_at),
    paidAt: row.paid_at ? toDate(row.paid_at) : undefined,
  };
}

export function mapInvoiceFromDb(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    invoiceNumber: row.invoice_number,
    issuedAt: toDate(row.issued_at),
    status: row.status,
    amount: Number(row.amount),
  };
}

function toDate(value: string) {
  return value.slice(0, 10);
}
