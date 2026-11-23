import logoUrl from "@/assets/marina-logo.png";
import heroUrl from "@/assets/hero-marina.jpg";

const ROOM_IMAGES = {
  studio: "/images/rooms/studio.jpg",
  economique: "/images/rooms/appartement-economique-s1.jpg",
  standard: "/images/rooms/appartement-standard-s1.jpg",
  s2: "/images/rooms/appartement-s2.jpg",
} as const;

export type DateRange = { from: string; to: string };

export type RoomStatus = "active" | "inactive" | "maintenance" | "occupied" | "cleaning_required";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";
export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "refunded";
export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "online"
  | "booking_com_payout"
  | "airbnb_payout"
  | "expedia_payout";
export type ChannelSource =
  | "admin"
  | "direct"
  | "booking_com"
  | "airbnb"
  | "expedia"
  | "phone"
  | "walk_in";
export type ChannelStatus = "connected" | "not_connected";

export type Room = {
  id: string;
  slug?: string;
  name: string;
  type: "Studio" | "Appartement" | "Suite" | "Chambre";
  description: string;
  pricePerNight: number;
  capacityAdults: number;
  capacityChildren: number;
  beds: string;
  bathrooms: number;
  totalUnits: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  bookings: DateRange[];
};

export type Guest = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  identityNumber: string;
};

export type Reservation = {
  id: string;
  reservationNumber: string;
  roomId: string;
  guest: Guest;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  source: ChannelSource;
  specialRequests?: string;
  createdAt: string;
  nights: number;
  roomPrice: number;
  taxesAndFees: number;
  deposit: number;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
};

export type Payment = {
  id: string;
  reservationId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  updatedAt: string;
  /** Day the money was received (YYYY-MM-DD). */
  paidAt?: string;
};

export type Invoice = {
  id: string;
  reservationId: string;
  invoiceNumber: string;
  issuedAt: string;
  status: "draft" | "issued" | "paid" | "void";
  amount: number;
};

export type ChannelConnection = {
  id: ChannelSource;
  name: string;
  status: ChannelStatus;
  lastSync?: string;
  commissionRate?: number;
  importedReservationsCount?: number;
  pushedAvailabilityCount?: number;
  pushedPricesCount?: number;
  errors?: string[];
  warnings?: string[];
};

export type HotelSettings = {
  hotelName: string;
  logoUrl: string;
  heroUrl: string;
  phone: string;
  fax: string;
  email: string;
  marketingEmail: string;
  capitainerieEmail: string;
  capitaineriePhones: string[];
  address: string;
  taxRegistration: string;
  invoicePrefix: string;
  defaultCurrency: "TND" | "EUR";
  checkInTime: string;
  checkOutTime: string;
  taxRate: number;
  depositPercentage: number;
};

export type PriceBreakdown = {
  nights: number;
  roomPrice: number;
  taxesAndFees: number;
  deposit: number;
  total: number;
  remainingAmount: number;
};

export type CreateReservationInput = {
  roomId: string;
  guest: Omit<Guest, "id">;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  source?: ChannelSource;
  specialRequests?: string;
  paymentStatus?: PaymentStatus;
};

export const hotelSettings: HotelSettings = {
  hotelName: "Marina Cap Monastir",
  logoUrl,
  heroUrl,
  phone: "(+216) 73 46 23 05",
  fax: "(+216) 73 46 49 97",
  email: "reservation@marinamonastir.tn",
  marketingEmail: "marketing@marinamonastir.tn",
  capitainerieEmail: "capitainerie@marinamonastir.tn",
  capitaineriePhones: ["(+216) 73 46 23 05", "(+216) 73 46 20 66"],
  address: "BP.N°60 - 5000 Monastir - Tunisie",
  taxRegistration: "MF 0000000/A/M/000",
  invoicePrefix: "MCM",
  defaultCurrency: "TND",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  taxRate: 0.12,
  depositPercentage: 0.3,
};

const defaultRooms: Room[] = [
  {
    id: "ae47c5a0-5915-4e45-a355-bcda4a85bb5a",
    slug: "studio",
    name: "Studio",
    type: "Studio",
    description:
      "Studio fonctionnel pour deux personnes au coeur de Marina Cap Monastir, avec terrasse, kitchenette et confort essentiel pour un séjour en bord de Méditerranée.",
    pricePerNight: 85,
    capacityAdults: 2,
    capacityChildren: 0,
    bathrooms: 1,
    totalUnits: 10,
    amenities: [
      "Terrasse",
      "Télévision à écran plat",
      "Climatisation",
      "Baignoire",
      "Kitchenette",
      "Wi-Fi gratuit",
    ],
    images: [ROOM_IMAGES.studio, ROOM_IMAGES.economique, ROOM_IMAGES.standard],
    status: "active",
    bookings: [],
  },
  {
    id: "be47c5a0-5915-4e45-a355-bcda4a85bb5b",
    slug: "appartement-economique-s1",
    name: "Appartement Économique S+1",
    type: "Appartement",
    description:
      "Appartement S+1 simple et pratique pour quatre personnes, idéal pour profiter du port avec kitchenette, climatisation et vue ou entrée côté port.",
    pricePerNight: 95,
    capacityAdults: 4,
    capacityChildren: 0,
    beds: "2 lits simples + 1 canapé-lit",
    bathrooms: 1,
    totalUnits: 5,
    amenities: [
      "Télévision à écran plat",
      "Climatisation",
      "Entrée port / Vue port",
      "Kitchenette",
      "Wi-Fi gratuit",
    ],
    images: [ROOM_IMAGES.economique, ROOM_IMAGES.studio, ROOM_IMAGES.s2],
    status: "active",
    bookings: [],
  },
  {
    id: "ce47c5a0-5915-4e45-a355-bcda4a85bb5c",
    slug: "appartement-standard-s1",
    name: "Appartement Standard S+1",
    type: "Appartement",
    description:
      "Appartement S+1 confortable avec terrasse et vue sur le port, pensé pour les séjours en famille ou entre amis à Marina Cap Monastir.",
    pricePerNight: 110,
    capacityAdults: 4,
    capacityChildren: 0,
    beds: "1 lit double ou 2 lits simples + 1 canapé-lit",
    bathrooms: 1,
    totalUnits: 5,
    amenities: [
      "Télévision à écran plat",
      "Climatisation",
      "Vue port",
      "Kitchenette",
      "Wi-Fi gratuit",
      "Terrasse",
    ],
    images: [ROOM_IMAGES.standard, ROOM_IMAGES.studio, ROOM_IMAGES.economique],
    status: "active",
    bookings: [],
  },
  {
    id: "de47c5a0-5915-4e45-a355-bcda4a85bb5d",
    slug: "appartement-s2",
    name: "Appartement S+2",
    type: "Appartement",
    description:
      "Appartement spacieux pour six personnes avec deux espaces nuit, kitchenette et terrasse, adapté aux familles qui souhaitent séjourner directement sur la marina.",
    pricePerNight: 140,
    capacityAdults: 6,
    capacityChildren: 0,
    beds: "2 lits simples + 1 lit double + 1 canapé-lit",
    bathrooms: 1,
    totalUnits: 5,
    amenities: [
      "Télévision à écran plat",
      "Climatisation",
      "Kitchenette",
      "Wi-Fi gratuit",
      "Terrasse",
    ],
    images: [ROOM_IMAGES.s2, ROOM_IMAGES.standard, ROOM_IMAGES.economique],
    status: "active",
    bookings: [],
  },
];

export const rooms: Room[] = getDefaultRooms();

export function getDefaultRooms() {
  return defaultRooms.map(cloneRoom);
}

const today = new Date();
const offset = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const makeGuest = (
  id: string,
  fullName: string,
  email: string,
  phone: string,
  country: string,
  identityNumber: string,
): Guest => ({ id, fullName, email, phone, country, identityNumber });

export const reservations: Reservation[] = [
  {
    id: "res-001",
    reservationNumber: "MCM-2026-001",
    roomId: "appartement-economique-s1",
    guest: makeGuest(
      "guest-001",
      "Sophie Martin",
      "sophie.martin@example.com",
      "+33 6 10 20 30 40",
      "France",
      "FR123456",
    ),
    checkIn: offset(6),
    checkOut: offset(12),
    adults: 2,
    children: 0,
    status: "confirmed",
    paymentStatus: "deposit_paid",
    source: "booking_com",
    specialRequests: "Arrivée prévue vers 18h.",
    createdAt: offset(-14),
    ...buildReservationTotals("appartement-economique-s1", offset(6), offset(12)),
  },
  {
    id: "res-002",
    reservationNumber: "MCM-2026-002",
    roomId: "appartement-standard-s1",
    guest: makeGuest(
      "guest-002",
      "Karim Ben Ali",
      "karim.benali@example.com",
      "+216 22 111 222",
      "Tunisie",
      "TN987654",
    ),
    checkIn: offset(1),
    checkOut: offset(6),
    adults: 2,
    children: 2,
    status: "pending",
    paymentStatus: "unpaid",
    source: "direct",
    createdAt: offset(-4),
    ...buildReservationTotals("appartement-standard-s1", offset(1), offset(6)),
  },
  {
    id: "res-003",
    reservationNumber: "MCM-2026-003",
    roomId: "appartement-s2",
    guest: makeGuest(
      "guest-003",
      "Giulia Rossi",
      "giulia.rossi@example.com",
      "+39 320 555 0180",
      "Italie",
      "IT445566",
    ),
    checkIn: offset(-1),
    checkOut: offset(2),
    adults: 4,
    children: 1,
    status: "checked_in",
    paymentStatus: "paid",
    source: "expedia",
    createdAt: offset(-20),
    ...buildReservationTotals("appartement-s2", offset(-1), offset(2)),
  },
  {
    id: "res-004",
    reservationNumber: "MCM-2026-004",
    roomId: "appartement-economique-s1",
    guest: makeGuest(
      "guest-004",
      "Nadia Trabelsi",
      "nadia.trabelsi@example.com",
      "+216 98 222 333",
      "Tunisie",
      "TN223344",
    ),
    checkIn: offset(6),
    checkOut: offset(12),
    adults: 3,
    children: 0,
    status: "confirmed",
    paymentStatus: "deposit_paid",
    source: "phone",
    specialRequests: "Prévoir une arrivée tardive.",
    createdAt: offset(-2),
    ...buildReservationTotals("appartement-economique-s1", offset(7), offset(12)),
  },
  {
    id: "res-005",
    reservationNumber: "MCM-2026-005",
    roomId: "studio",
    guest: makeGuest(
      "guest-005",
      "Marc Dubois",
      "marc.dubois@example.com",
      "+33 7 44 55 66 77",
      "France",
      "FR889900",
    ),
    checkIn: offset(-10),
    checkOut: offset(-9),
    adults: 1,
    children: 0,
    status: "confirmed",
    paymentStatus: "paid",
    source: "walk_in",
    createdAt: offset(0),
    ...buildReservationTotals("studio", offset(0), offset(1)),
  },
];

export const payments: Payment[] = reservations.map((reservation) => ({
  id: `pay-${reservation.id}`,
  reservationId: reservation.id,
  amount:
    reservation.paymentStatus === "paid"
      ? reservation.total
      : reservation.paymentStatus === "deposit_paid"
        ? reservation.deposit
        : 0,
  status: reservation.paymentStatus,
  method:
    reservation.source === "walk_in"
      ? "cash"
      : reservation.source === "direct" || reservation.source === "phone"
        ? "bank_transfer"
        : reservation.source === "booking_com"
          ? "booking_com_payout"
          : reservation.source === "airbnb"
            ? "airbnb_payout"
            : "expedia_payout",
  updatedAt: reservation.createdAt,
}));

export const invoices: Invoice[] = reservations.map((reservation, index) => ({
  id: `inv-${reservation.id}`,
  reservationId: reservation.id,
  invoiceNumber: generateInvoiceNumber(index + 1),
  issuedAt: reservation.createdAt,
  status: reservation.paymentStatus === "paid" ? "paid" : "issued",
  amount: reservation.total,
}));

export const channelConnections: ChannelConnection[] = [
  {
    id: "booking_com",
    name: "Booking.com",
    status: "connected",
    lastSync: offset(0),
    commissionRate: 15,
    importedReservationsCount: 18,
    pushedAvailabilityCount: 120,
    pushedPricesCount: 4,
    warnings: ["Vérifier la parité tarifaire sur les appartements S+1."],
  },
  {
    id: "airbnb",
    name: "Airbnb",
    status: "not_connected",
    commissionRate: 14,
    importedReservationsCount: 0,
    pushedAvailabilityCount: 0,
    pushedPricesCount: 0,
    warnings: ["Connexion API partenaire requise."],
  },
  {
    id: "expedia",
    name: "Expedia",
    status: "not_connected",
    commissionRate: 17,
    importedReservationsCount: 4,
    pushedAvailabilityCount: 0,
    pushedPricesCount: 0,
    errors: ["Dernière synchronisation non configurée."],
  },
  {
    id: "direct",
    name: "Site direct",
    status: "connected",
    lastSync: offset(0),
    commissionRate: 0,
  },
  { id: "phone", name: "Téléphone", status: "connected", lastSync: offset(0), commissionRate: 0 },
  { id: "walk_in", name: "Walk-in", status: "connected", lastSync: offset(0), commissionRate: 0 },
];

export function getRoom(id: string) {
  return rooms.find((room) => room.id === id || room.slug === id);
}

export function getRoomCapacity(room: Room) {
  return Math.max(room.capacityAdults + room.capacityChildren, room.capacityAdults);
}

export function calculateNights(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);
  const start = Date.UTC(inYear, inMonth - 1, inDay);
  const end = Date.UTC(outYear, outMonth - 1, outDay);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function calculateTotal(room: Room, checkIn?: string, checkOut?: string): PriceBreakdown {
  const nights = calculateNights(checkIn, checkOut);
  const roomPrice = nights * room.pricePerNight;
  const taxesAndFees = Math.round(roomPrice * hotelSettings.taxRate);
  const total = roomPrice + taxesAndFees;
  const deposit = Math.round(total * hotelSettings.depositPercentage);
  const remainingAmount = Math.max(0, total - deposit);
  return { nights, roomPrice, taxesAndFees, deposit, total, remainingAmount };
}

export function roomsAvailable(room: Room, checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut || checkIn >= checkOut || room.status !== "active") {
    return room.status === "active" ? room.totalUnits : 0;
  }

  const existingRoomBlocks = room.bookings.filter((booking) =>
    rangesOverlap(booking, { from: checkIn, to: checkOut }),
  ).length;

  const existingReservations = reservations.filter(
    (reservation) =>
      reservation.roomId === room.id &&
      ["pending", "confirmed", "checked_in"].includes(reservation.status) &&
      rangesOverlap(
        { from: reservation.checkIn, to: reservation.checkOut },
        { from: checkIn, to: checkOut },
      ),
  ).length;

  return Math.max(0, room.totalUnits - existingRoomBlocks - existingReservations);
}

export function createReservation(input: CreateReservationInput): Reservation {
  const room = getRoom(input.roomId);
  if (!room) throw new Error("Chambre introuvable.");
  if (input.adults + input.children > getRoomCapacity(room)) {
    throw new Error("La capacité demandée dépasse celle de cet appartement.");
  }
  if (roomsAvailable(room, input.checkIn, input.checkOut) <= 0) {
    throw new Error("Aucune unité disponible pour ces dates.");
  }

  const totals = calculateTotal(room, input.checkIn, input.checkOut);
  const id = makeId("res");
  const guest: Guest = { id: makeId("guest"), ...input.guest };
  const reservation: Reservation = {
    id,
    reservationNumber: generateReservationNumber(reservations.length + 1),
    roomId: room.id,
    guest,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    children: input.children,
    status: "confirmed",
    paymentStatus: input.paymentStatus ?? "deposit_paid",
    source: input.source ?? "direct",
    specialRequests: input.specialRequests,
    createdAt: new Date().toISOString().slice(0, 10),
    ...totals,
  };

  reservations.unshift(reservation);
  payments.unshift({
    id: makeId("pay"),
    reservationId: reservation.id,
    amount: reservation.paymentStatus === "paid" ? reservation.total : reservation.deposit,
    status: reservation.paymentStatus,
    method: "online",
    updatedAt: reservation.createdAt,
  });
  invoices.unshift({
    id: makeId("inv"),
    reservationId: reservation.id,
    invoiceNumber: generateInvoiceNumber(invoices.length + 1),
    issuedAt: reservation.createdAt,
    status: reservation.paymentStatus === "paid" ? "paid" : "draft",
    amount: reservation.total,
  });

  return reservation;
}

export function updateReservationStatus(reservationId: string, status: ReservationStatus) {
  const reservation = reservations.find((item) => item.id === reservationId);
  if (reservation) reservation.status = status;
  return reservation;
}

export function updatePaymentStatus(reservationId: string, status: PaymentStatus) {
  const reservation = reservations.find((item) => item.id === reservationId);
  if (reservation) reservation.paymentStatus = status;
  const payment = payments.find((item) => item.reservationId === reservationId);
  if (payment) {
    payment.status = status;
    payment.amount =
      status === "paid"
        ? (reservation?.total ?? payment.amount)
        : status === "deposit_paid"
          ? (reservation?.deposit ?? payment.amount)
          : 0;
    payment.updatedAt = new Date().toISOString().slice(0, 10);
  }
  return payment;
}

export function generateReservationNumber(sequence = reservations.length + 1) {
  return `MCM-${new Date().getFullYear()}-${String(sequence).padStart(3, "0")}`;
}

export function generateInvoiceNumber(sequence = invoicesSeed + 1) {
  return `${hotelSettings.invoicePrefix}-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
}

export function getAvailableUnits(room: Room, checkIn?: string, checkOut?: string) {
  return roomsAvailable(room, checkIn, checkOut);
}

export function getReservationByNumber(reservationNumber?: string) {
  if (!reservationNumber) return undefined;
  return reservations.find((reservation) => reservation.reservationNumber === reservationNumber);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function roomTypeOptions() {
  return Array.from(new Set(rooms.map((room) => room.type)));
}

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Annulée",
  no_show: "No-show",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Non payé",
  deposit_paid: "Acompte payé",
  paid: "Payé",
  refunded: "Remboursé",
};

export const channelLabels: Record<ChannelSource, string> = {
  admin: "Admin",
  direct: "Direct",
  booking_com: "Booking.com",
  airbnb: "Airbnb",
  expedia: "Expedia",
  phone: "Téléphone",
  walk_in: "Walk-in",
};

function rangesOverlap(a: DateRange, b: DateRange) {
  return a.from < b.to && a.to > b.from;
}

function buildReservationTotals(roomId: string, checkIn: string, checkOut: string): PriceBreakdown {
  const room = rooms.find((item) => item.id === roomId);
  if (!room)
    return { nights: 0, roomPrice: 0, taxesAndFees: 0, deposit: 0, total: 0, remainingAmount: 0 };
  return calculateTotal(room, checkIn, checkOut);
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneRoom(room: Room): Room {
  return {
    ...room,
    amenities: [...room.amenities],
    images: [...room.images],
    bookings: [...room.bookings],
  };
}

const invoicesSeed = 5;
