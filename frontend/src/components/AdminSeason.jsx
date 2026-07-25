import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const COURTS = [
  { id: 'coberta-1', name: 'Quadra 1', type: 'Coberta' },
  { id: 'coberta-2', name: 'Quadra 2', type: 'Coberta' },
  { id: 'areia-1', name: 'Quadra 3', type: 'Descoberta' },
  { id: 'areia-2', name: 'Quadra 4', type: 'Descoberta' },
  { id: 'areia-3', name: 'Quadra 5', type: 'Descoberta' },
  { id: 'PKB-DU', name: 'Pickleball', type: 'Quadra dedicada' },
];
const WEEKDAYS = [
  { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];
const MODALITY_LABELS = {
  'beach-tennis': 'Beach Tennis', futevolei: 'Futevôlei', volei: 'Vôlei', pickleball: 'Pickleball',
};
const PAYMENT_LABELS = { pix: 'PIX', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro' };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const hourLabel = (value) => `${String(value).padStart(2, '0')}h`;

const INITIAL_FORM = {
  userId: '',
  courtId: 'coberta-1',
  modalidade: 'beach-tennis',
  startDate: today(),
  endDate: today(),
  startHour: 18,
  endHour: 19,
  recurrence: { type: 'weekly', dailyInterval: 1, weeklyInterval: 1, weekdays: [1] },
  ignoreHolidays: true,
  payment: 'pix',
  coupon: { code: '', type: 'percent', value: 0 },
  manualDiscount: { type: 'percent', value: 0 },
};

function DiscountFields({ title, value, onChange, withCode = false }) {
  return (
    <div className="season-discount-box">
      <div className="season-subtitle">{title}</div>
      <div className={`season-discount-grid${withCode ? ' has-code' : ''}`}>
        {withCode ? (
          <div className="admin-field">
            <label>Código</label>
            <input value={value.code || ''} onChange={(event) => onChange({ ...value, code: event.target.value })} placeholder="Ex.: VERAO10" />
          </div>
        ) : null}
        <div className="admin-field">
          <label>Tipo</label>
          <select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor fixo (R$)</option>
          </select>
        </div>
        <div className="admin-field">
          <label>Valor</label>
          <input type="number" min="0" max={value.type === 'percent' ? 100 : undefined} step="0.01"
            value={value.value} onChange={(event) => onChange({ ...value, value: Number(event.target.value) })} />
        </div>
      </div>
    </div>
  );
}

export function SeasonCreationModal({ open, users, onClose, onCreated, toast }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setForm((current) => ({ ...INITIAL_FORM, userId: current.userId || users[0]?._id || '' }));
  }, [open, users]);

  const selectedUser = useMemo(() => users.find((user) => user._id === form.userId), [users, form.userId]);
  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setPreview(null);
  };
  const setRecurrence = (field, value) => {
    setForm((current) => ({ ...current, recurrence: { ...current.recurrence, [field]: value } }));
    setPreview(null);
  };
  const toggleWeekday = (day) => {
    const current = form.recurrence.weekdays;
    setRecurrence('weekdays', current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/seasons/preview', form);
      setPreview(data);
    } catch (error) {
      toast(error.response?.data?.message || 'Não foi possível calcular a temporada', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createSeason = async () => {
    setCreating(true);
    try {
      const { data } = await api.post('/seasons', form);
      toast(`Temporada ${data.season.code} criada com ${data.created} reservas`, 'success');
      onCreated(data.season);
      onClose();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao criar temporada';
      toast(message, 'error');
      if (error.response?.data?.preview) setPreview(error.response.data.preview);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;
  return (
    <div className="admin-modal-overlay open season-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="admin-modal season-modal" role="dialog" aria-modal="true" aria-labelledby="season-modal-title">
        <div className="admin-modal-header">
          <div>
            <p className="admin-eyebrow">Exclusivo para administradores</p>
            <h3 id="season-modal-title">RESERVA POR TEMPORADA</h3>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="admin-modal-body">
          {!preview ? (
            <>
              <div className="season-step-title"><span>1</span> Cliente e quadra</div>
              <div className="admin-grid-2">
                <div className="admin-field">
                  <label>Cliente</label>
                  <select value={form.userId} onChange={(event) => setField('userId', event.target.value)}>
                    <option value="">Selecione...</option>
                    {users.filter((user) => !['bloqueado', 'inativo'].includes(user.status)).map((user) => (
                      <option key={user._id} value={user._id}>{user.nome} · {user.email}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Quadra</label>
                  <select value={form.courtId} onChange={(event) => setField('courtId', event.target.value)}>
                    {COURTS.map((court) => <option key={court.id} value={court.id}>{court.name} · {court.type}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Modalidade</label>
                  <select value={form.modalidade} onChange={(event) => setField('modalidade', event.target.value)}>
                    {Object.entries(MODALITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Pagamento</label>
                  <select value={form.payment} onChange={(event) => setField('payment', event.target.value)}>
                    {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className="season-step-title"><span>2</span> Período e horário</div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Data inicial</label><input type="date" value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} /></div>
                <div className="admin-field"><label>Data final</label><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setField('endDate', event.target.value)} /></div>
                <div className="admin-field"><label>Hora inicial</label><input type="number" min="0" max="23" value={form.startHour} onChange={(event) => setField('startHour', Number(event.target.value))} /></div>
                <div className="admin-field"><label>Hora final</label><input type="number" min="1" max="24" value={form.endHour} onChange={(event) => setField('endHour', Number(event.target.value))} /></div>
              </div>

              <div className="season-step-title"><span>3</span> Recorrência</div>
              <div className="season-recurrence-tabs">
                <button className={form.recurrence.type === 'daily' ? 'active' : ''} onClick={() => setRecurrence('type', 'daily')}>Diário</button>
                <button className={form.recurrence.type === 'weekly' ? 'active' : ''} onClick={() => setRecurrence('type', 'weekly')}>Semanal</button>
              </div>
              {form.recurrence.type === 'daily' ? (
                <div className="admin-field season-inline-field">
                  <label>Repetir a cada</label>
                  <div><input type="number" min="1" max="365" value={form.recurrence.dailyInterval} onChange={(event) => setRecurrence('dailyInterval', Number(event.target.value))} /><span>dia(s)</span></div>
                </div>
              ) : (
                <>
                  <div className="season-weekdays">
                    {WEEKDAYS.map((day) => (
                      <button key={day.value} className={form.recurrence.weekdays.includes(day.value) ? 'active' : ''} onClick={() => toggleWeekday(day.value)}>{day.label}</button>
                    ))}
                  </div>
                  <div className="admin-field season-inline-field">
                    <label>Repetir a cada</label>
                    <div><input type="number" min="1" max="52" value={form.recurrence.weeklyInterval} onChange={(event) => setRecurrence('weeklyInterval', Number(event.target.value))} /><span>semana(s)</span></div>
                  </div>
                </>
              )}
              <label className="season-check">
                <input type="checkbox" checked={form.ignoreHolidays} onChange={(event) => setField('ignoreHolidays', event.target.checked)} />
                <span><strong>Ignorar feriados nacionais</strong><small>As datas de feriado não serão reservadas nem cobradas.</small></span>
              </label>

              <div className="season-step-title"><span>4</span> Descontos</div>
              <DiscountFields title="Cupom de desconto" value={form.coupon} withCode onChange={(value) => setField('coupon', value)} />
              <DiscountFields title="Desconto manual do administrador" value={form.manualDiscount} onChange={(value) => setField('manualDiscount', value)} />
            </>
          ) : (
            <SeasonPreview preview={preview} selectedUser={selectedUser} />
          )}
        </div>
        <div className="admin-modal-footer season-footer">
          {preview ? <button className="btn-admin-secondary" onClick={() => setPreview(null)}>← Editar dados</button> : <div />}
          <div className="season-footer-actions">
            <button className="btn-admin-secondary" onClick={onClose}>Cancelar</button>
            {!preview ? (
              <button className="btn-admin-primary" disabled={loading} onClick={loadPreview}>{loading ? 'Calculando...' : 'Revisar temporada →'}</button>
            ) : (
              <button className="btn-admin-primary" disabled={creating || preview.counts.available === 0} onClick={createSeason}>
                {creating ? 'Criando...' : preview.counts.conflicts ? `Criar ${preview.counts.available} disponíveis` : `Criar ${preview.counts.available} reservas`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeasonPreview({ preview }) {
  return (
    <div className="season-preview">
      <div className="season-preview-hero">
        <div><small>Cliente</small><strong>{preview.client.name}</strong><span>{preview.client.email}</span></div>
        <span className="season-ready-badge">{preview.counts.available} reservas válidas</span>
      </div>
      <div className="season-summary-grid">
        <div><small>Quadra</small><strong>{preview.court.name}</strong><span>{preview.court.type}</span></div>
        <div><small>Período</small><strong>{dateBR(preview.period.startDate)} → {dateBR(preview.period.endDate)}</strong><span>{preview.recurrence.type === 'daily' ? 'Recorrência diária' : 'Recorrência semanal'}</span></div>
        <div><small>Horário</small><strong>{hourLabel(preview.hours.startHour)}–{hourLabel(preview.hours.endHour)}</strong><span>{preview.hours.duration}h por reserva</span></div>
        <div><small>Modalidade</small><strong>{MODALITY_LABELS[preview.modalidade]}</strong><span>{PAYMENT_LABELS[preview.payment]}</span></div>
      </div>
      <div className="season-financial">
        <div><span>Valor bruto</span><strong>{money(preview.financial.grossTotal)}</strong></div>
        {preview.financial.coupon.amount > 0 ? <div><span>Cupom {preview.financial.coupon.code || ''}</span><strong className="discount">− {money(preview.financial.coupon.amount)}</strong></div> : null}
        {preview.financial.manualDiscount.amount > 0 ? <div><span>Desconto manual</span><strong className="discount">− {money(preview.financial.manualDiscount.amount)}</strong></div> : null}
        <div className="total"><span>Valor final</span><strong>{money(preview.financial.finalTotal)}</strong></div>
      </div>
      <div className="season-counts">
        <div><strong>{preview.counts.generated}</strong><span>datas calculadas</span></div>
        <div className="ok"><strong>{preview.counts.available}</strong><span>serão criadas</span></div>
        <div className={preview.counts.conflicts ? 'warn' : ''}><strong>{preview.counts.conflicts}</strong><span>conflitos</span></div>
        <div><strong>{preview.counts.holidaysSkipped}</strong><span>feriados ignorados</span></div>
      </div>
      {preview.conflicts.length ? (
        <div className="season-conflicts">
          <div className="season-subtitle">Datas com conflito — não serão criadas</div>
          <div className="season-date-list">
            {preview.conflicts.map((item) => <div key={item.date}><strong>{dateBR(item.date)}</strong><span>{item.reason}</span></div>)}
          </div>
        </div>
      ) : null}
      {preview.holidayDates.length ? (
        <div className="season-holidays">
          <div className="season-subtitle">Feriados ignorados</div>
          <p>{preview.holidayDates.map((item) => `${dateBR(item.date)} · ${item.name}`).join(' • ')}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SeasonDetailsModal({ season, onClose, onChanged, toast }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(Boolean(season));

  useEffect(() => {
    if (!season) return;
    setDetails(null);
    api.get(`/seasons/${season._id}`).then(({ data }) => setDetails(data)).catch(() => toast('Erro ao carregar temporada', 'error'));
  }, [season]);

  const cancelBooking = async (bookingId) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${bookingId}/cancelar`);
      setDetails((current) => ({
        ...current,
        bookingIds: current.bookingIds.map((booking) => booking._id === bookingId ? { ...booking, status: 'cancelada' } : booking),
      }));
      onChanged();
      toast('Reserva da temporada cancelada', 'success');
    } catch (error) {
      toast(error.response?.data?.message || 'Erro ao cancelar reserva', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelSeason = async () => {
    setLoading(true);
    try {
      await api.patch(`/seasons/${season._id}/cancel`);
      toast('Temporada inteira cancelada', 'success');
      onChanged();
      onClose();
    } catch (error) {
      toast(error.response?.data?.message || 'Erro ao cancelar temporada', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!season) return null;
  const bookings = (details?.bookingIds || []).filter(Boolean);
  return (
    <div className="admin-modal-overlay open season-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="admin-modal season-details-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <div><p className="admin-eyebrow">{season.code}</p><h3>DETALHES DA TEMPORADA</h3></div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="admin-modal-body">
          {!details ? <div className="season-loading">Carregando reservas...</div> : (
            <>
              <div className="season-summary-grid">
                <div><small>Cliente</small><strong>{details.userName}</strong><span>{details.userId?.email}</span></div>
                <div><small>Quadra</small><strong>{details.courtName}</strong><span>{MODALITY_LABELS[details.modalidade]}</span></div>
                <div><small>Período</small><strong>{dateBR(details.startDate)} → {dateBR(details.endDate)}</strong><span>{hourLabel(details.startHour)}–{hourLabel(details.endHour)}</span></div>
                <div><small>Valor final</small><strong>{money(details.finalTotal)}</strong><span>Bruto: {money(details.grossTotal)}</span></div>
              </div>
              <div className="season-bookings-title"><strong>Reservas vinculadas</strong><span>{bookings.filter((item) => item.status !== 'cancelada').length} ativas de {bookings.length}</span></div>
              <div className="season-bookings-list">
                {bookings.map((booking) => (
                  <div key={booking._id} className={booking.status === 'cancelada' ? 'cancelled' : ''}>
                    <div><strong>{dateBR(booking.date)}</strong><span>{booking.slots?.map(hourLabel).join(' · ')} · {money(booking.total)}</span></div>
                    <span className={`badge ${booking.status === 'cancelada' ? 'badge-red' : 'badge-green'}`}>{booking.status}</span>
                    <button className="admin-action-btn danger" disabled={loading || booking.status === 'cancelada'} onClick={() => cancelBooking(booking._id)} title="Cancelar somente esta reserva">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="admin-modal-footer">
          {season.status !== 'cancelled' ? <button className="btn-admin-danger" disabled={loading} onClick={cancelSeason}>Cancelar temporada inteira</button> : null}
          <div style={{ flex: 1 }} />
          <button className="btn-admin-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export { MODALITY_LABELS, dateBR, money };
