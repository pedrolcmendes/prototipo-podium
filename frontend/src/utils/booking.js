export const BOOKING_COURTS = [
  { id: 'coberta-1', tipo: 'coberta', nome: 'Quadra 1', desc: 'Coberta' },
  { id: 'coberta-2', tipo: 'coberta', nome: 'Quadra 2', desc: 'Coberta' },
  { id: 'areia-1', tipo: 'descoberta', nome: 'Quadra 3', desc: 'Descoberta' },
  { id: 'areia-2', tipo: 'descoberta', nome: 'Quadra 4', desc: 'Descoberta' },
  { id: 'areia-3', tipo: 'descoberta', nome: 'Quadra 5', desc: 'Descoberta' },
  { id: 'teste-1', tipo: 'teste', nome: 'TESTE R$0,01', desc: '[Admin] Pagamento de R$0,01 para testes' },
];

export const PICKLEBALL_DAY_USE_PRICE = 25;

export function getBookingPrice(hour, courtType, isWeekend) {
  if (courtType === 'teste') return 0.01;
  const covered = courtType === 'coberta';
  if (isWeekend) {
    if (hour < 11) return covered ? 80 : 60;
    if (hour < 14) return covered ? 60 : 50;
    return covered ? 100 : 80;
  }
  if (hour < 16) return covered ? 60 : 50;
  if (hour < 18) return covered ? 80 : 60;
  if (hour < 21) return covered ? 100 : 80;
  return covered ? 80 : 60;
}

export function buildBookingHours(open, close) {
  const hours = [];
  for (let hour = open; hour < close; hour += 1) hours.push(hour);
  return hours;
}

export function isWeekendDate(date) {
  if (!date) return false;
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6;
}
