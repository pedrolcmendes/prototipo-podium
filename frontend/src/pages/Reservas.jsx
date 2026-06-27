import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';
import api from '../services/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const MODALIDADES = [
  { id: 'Beach Tennis', enum: 'beach-tennis', nome: 'Beach Tennis', desc: '4 quadras de areia profissional. Raquetes e bolas disponíveis para locação.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> },
  { id: 'Futevôlei', enum: 'futevolei', nome: 'Futevôlei', desc: '2 quadras com redes regulamentadas. Ideal para grupos e ligas.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg> },
  { id: 'Vôlei', enum: 'volei', nome: 'Vôlei de Praia', desc: 'Estrutura olímpica para treinos e competições na areia.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2v20"/></svg> },
  { id: 'Pickleball', enum: 'pickleball', nome: 'Pickleball', desc: 'Apenas Day Use — R$ 25/pessoa. Acesso à quadra durante o período.', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>, dayuse: true },
];

const QUADRAS = {
  'Beach Tennis': [
    { id: 'BT-1', tipo: 'coberta', nome: 'Quadra BT 1', desc: 'Coberta · Iluminação LED' },
    { id: 'BT-2', tipo: 'coberta', nome: 'Quadra BT 2', desc: 'Coberta · Iluminação LED' },
    { id: 'BT-3', tipo: 'areia', nome: 'Quadra BT 3', desc: 'Ao ar livre · Iluminação LED' },
    { id: 'BT-4', tipo: 'areia', nome: 'Quadra BT 4', desc: 'Ao ar livre · Iluminação LED' },
  ],
  'Futevôlei': [
    { id: 'FV-1', tipo: 'coberta', nome: 'Quadra FV 1', desc: 'Coberta · Rede regulamentada' },
    { id: 'FV-2', tipo: 'areia', nome: 'Quadra FV 2', desc: 'Ao ar livre · Rede regulamentada' },
  ],
  'Vôlei': [
    { id: 'VB-1', tipo: 'coberta', nome: 'Quadra VB 1', desc: 'Coberta · Estrutura olímpica' },
    { id: 'VB-2', tipo: 'areia', nome: 'Quadra VB 2', desc: 'Ao ar livre · Estrutura olímpica' },
  ],
};

const HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
function getPrice(h) {
  if (h < 12) return 60;
  if (h < 18) return 80;
  return 100;
}

function padDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function Calendar({ year, month, onPrev, onNext, selectedDate, onSelect, busyDates }) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = padDate(new Date());
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <div className="cal-title">{MESES[month]} {year}</div>
        <div className="cal-nav">
          <button onClick={onPrev}>&#8249;</button>
          <button onClick={onNext}>&#8250;</button>
        </div>
      </div>
      <div className="cal-days-header">
        {DIAS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cal-cell empty" />;
          const dt = padDate(new Date(year, month, d));
          const isPast = dt < today;
          const isBusy = busyDates?.includes(dt);
          const isSel = dt === selectedDate;
          const isToday = dt === today;
          let cls = 'cal-cell';
          if (isPast) cls += ' past';
          if (isToday) cls += ' today';
          if (isBusy) cls += ' event-day';
          if (isSel) cls += ' selected';
          return (
            <div key={d} className={cls} onClick={() => !isPast && onSelect(dt)}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <div className="legend-item"><div className="legend-dot today" /> Hoje</div>
        <div className="legend-item"><div className="legend-dot event" style={{ background: 'var(--amber)' }} /> Evento</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--gold)' }} /> Selecionado</div>
      </div>
    </div>
  );
}

export default function Reservas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [authOpen, setAuthOpen] = useState(false);

  const [step, setStep] = useState(1);
  const [modalidade, setModalidade] = useState(null);
  const [quadra, setQuadra] = useState(null);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [dayUse, setDayUse] = useState(false);

  const [payMethod, setPayMethod] = useState(null);
  const [cardData, setCardData] = useState({ numero: '', validade: '', cvv: '', nome: '' });
  const [loading, setLoading] = useState(false);

  const [confOpen, setConfOpen] = useState(false);
  const [confData, setConfData] = useState(null);

  useEffect(() => {
    if (!quadra || !selectedDate) return;
    setBusySlots([]);
    setSelectedSlots([]);
    api.get(`/bookings/horarios-ocupados?quadraId=${quadra.id}&date=${selectedDate}`)
      .then(r => setBusySlots(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [quadra, selectedDate]);

  const toggleSlot = (h) => {
    if (busySlots.includes(h)) return;
    setSelectedSlots(prev =>
      prev.includes(h) ? prev.filter(s => s !== h) : [...prev, h]
    );
  };

  const totalPrice = () => {
    let t = selectedSlots.reduce((acc, h) => acc + getPrice(h), 0);
    if (dayUse) t += 25;
    return t;
  };

  const handleConfirm = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!payMethod) { toast('Selecione uma forma de pagamento', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        modalidade: modalidade.enum,
        quadra: quadra.tipo || 'areia',
        quadraId: quadra.id,
        date: selectedDate,
        slots: selectedSlots.sort((a, b) => a - b),
        payment: payMethod,
        dayUse,
        total: totalPrice(),
      });
      setConfData(res.data.data || res.data);
      setConfOpen(true);
    } catch (ex) {
      toast(ex.response?.data?.message || 'Erro ao reservar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1); setModalidade(null); setQuadra(null);
    setSelectedDate(null); setSelectedSlots([]); setDayUse(false);
    setPayMethod(null); setConfOpen(false);
  };

  const stepClass = (n) => {
    if (step === n) return 'bk-step active';
    if (step > n) return 'bk-step done';
    return 'bk-step';
  };
  const lineClass = (n) => step > n ? 'bk-step-line done' : 'bk-step-line';

  const DIAS_FULL = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} (${DIAS_FULL[dt.getDay()]})`;
  };

  return (
    <>
      <style>{`
        .page-hero{padding:3rem 2rem 2rem;max-width:var(--max-w);margin:0 auto}
        .page-hero .section-eyebrow{margin-bottom:.5rem}
        .page-hero h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);letter-spacing:2px;line-height:1;margin-bottom:1rem}
        .page-hero p{color:var(--gray);font-size:1rem;max-width:600px}
        .reservas-container{max-width:var(--max-w);margin:0 auto;padding:0 2rem 5rem}
        .bk-stepper-wrap{margin-bottom:2.5rem}
        .bk-stepper{display:flex;align-items:center;gap:0}
        .bk-step{display:flex;flex-direction:column;align-items:center;gap:.45rem;flex:1;position:relative}
        .bk-step-circle{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--border);background:var(--dark);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:.8rem;font-weight:700;color:var(--gray);transition:all var(--trans-fast);position:relative;z-index:1}
        .bk-step.active .bk-step-circle{border-color:var(--gold);background:var(--gold);color:var(--black);box-shadow:0 0 16px var(--gold-glow)}
        .bk-step.done .bk-step-circle{border-color:var(--gold);background:transparent;color:var(--gold)}
        .bk-step-label{font-family:var(--font-cond);font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray);text-align:center;transition:color var(--trans-fast)}
        .bk-step.active .bk-step-label{color:var(--gold)}
        .bk-step.done .bk-step-label{color:var(--gray-light)}
        .bk-step-line{flex:1;height:1px;background:var(--border);margin-bottom:1.1rem;transition:background var(--trans-med)}
        .bk-step-line.done{background:var(--gold)}
        .bk-card{background:var(--card);border:1px solid var(--border)}
        .bk-card-header{padding:1.5rem 2rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(224,172,107,.05),transparent)}
        .bk-card-header h2{font-family:var(--font-display);font-size:1.6rem;letter-spacing:2px;color:var(--white)}
        .bk-card-header p{font-size:.85rem;color:var(--gray);margin-top:.25rem}
        .bk-card-body{padding:2rem}
        .bk-option-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem}
        .bk-option-card{border:1px solid var(--border);background:var(--dark);padding:1.6rem 1.2rem;cursor:pointer;transition:all var(--trans-fast);position:relative;text-align:center}
        .bk-option-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:transparent;transition:background var(--trans-fast)}
        .bk-option-card:hover{border-color:rgba(224,172,107,.4);background:var(--gold-faint)}
        .bk-option-card:hover::before{background:rgba(224,172,107,.5)}
        .bk-option-card.active{border-color:var(--gold);background:var(--gold-faint);box-shadow:0 0 20px rgba(224,172,107,.1)}
        .bk-option-card.active::before{background:var(--gold)}
        .bk-option-icon{width:42px;height:42px;background:rgba(224,172,107,.08);border:1px solid rgba(224,172,107,.15);border-radius:2px;display:flex;align-items:center;justify-content:center;margin:0 auto .9rem}
        .bk-option-icon svg{width:20px;height:20px;stroke:var(--gold)}
        .bk-option-card.active .bk-option-icon{background:rgba(224,172,107,.18);border-color:rgba(224,172,107,.4)}
        .bk-option-name{font-family:var(--font-cond);font-size:1rem;font-weight:700;letter-spacing:1px;color:var(--white);margin-bottom:.3rem}
        .bk-option-desc{font-size:.78rem;color:var(--gray);line-height:1.4}
        .bk-badge-dayuse{position:absolute;top:-10px;right:12px;font-family:var(--font-cond);font-size:.62rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--amber);color:#000;padding:.15rem .6rem}
        .bk-pickleball-notice{display:flex;align-items:flex-start;gap:.9rem;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-left:3px solid var(--amber);padding:1rem 1.2rem;margin-bottom:1.5rem}
        .bk-pickleball-notice svg{flex-shrink:0;color:var(--amber);margin-top:1px}
        .bk-pickleball-notice p{font-size:.85rem;color:var(--gray);line-height:1.5}
        .bk-pickleball-notice strong{color:var(--amber)}
        .bk-nav{display:flex;justify-content:space-between;align-items:center;margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border)}
        .bk-step3-layout{display:grid;grid-template-columns:1fr 340px;gap:2rem;align-items:start}
        .bk-sidebar{background:var(--dark);border:1px solid var(--border)}
        .bk-sidebar-head{padding:1.2rem 1.5rem;border-bottom:1px solid var(--border)}
        .bk-sidebar-head h4{font-family:var(--font-cond);font-size:1rem;font-weight:700;letter-spacing:2px;text-transform:uppercase}
        .bk-sidebar-head p{font-size:.82rem;color:var(--gray);margin-top:.2rem}
        .bk-sidebar-body{padding:1.5rem}
        .bk-summary-row{display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border)}
        .bk-summary-row:last-of-type{border-bottom:none}
        .bk-summary-label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray)}
        .bk-summary-val{font-family:var(--font-cond);font-size:.9rem;font-weight:600;color:var(--white)}
        .bk-sum-total{display:flex;justify-content:space-between;align-items:center;padding:1rem 0 0;margin-top:.5rem;border-top:2px solid var(--border)}
        .bk-sum-total-label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:3px;text-transform:uppercase;color:var(--gray)}
        .bk-sum-total-val{font-family:var(--font-display);font-size:1.8rem;color:var(--gold)}
        .bk-times-wrap{background:var(--dark);border:1px solid var(--border);padding:1.5rem}
        .bk-times-label{font-family:var(--font-cond);font-size:.75rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gray);margin-bottom:1rem;display:flex;align-items:center;gap:.6rem}
        .bk-times-label::after{content:'';flex:1;height:1px;background:var(--border)}
        .time-slot{display:flex;flex-direction:column;align-items:center;gap:.2rem}
        .ts-hour{font-family:var(--font-cond);font-size:.82rem;font-weight:700;letter-spacing:1px}
        .ts-price{font-family:var(--font-cond);font-size:.65rem;color:var(--gray);letter-spacing:.5px}
        .time-slot.selected .ts-price{color:var(--black)}
        .time-slot.taken .ts-price{color:var(--muted)}
        .bk-dayuse-btn{display:flex;align-items:center;gap:1rem;background:var(--dark);border:1px solid var(--border);padding:1rem 1.2rem;cursor:pointer;transition:all var(--trans-fast);margin-top:1rem;width:100%;text-align:left}
        .bk-dayuse-btn:hover{border-color:rgba(224,172,107,.35);background:var(--gold-faint)}
        .bk-dayuse-btn.active{border-color:var(--gold);background:var(--gold-faint)}
        .bk-dayuse-check{width:20px;height:20px;border:1.5px solid var(--border);background:var(--card);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:transparent;flex-shrink:0;transition:all var(--trans-fast)}
        .bk-dayuse-btn.active .bk-dayuse-check{background:var(--gold);border-color:var(--gold);color:var(--black);font-weight:700}
        .bk-dayuse-info strong{font-family:var(--font-cond);font-size:.9rem;letter-spacing:.5px;color:var(--white);display:block;margin-bottom:.2rem}
        .bk-dayuse-info p{font-size:.78rem;color:var(--gray)}
        .bk-pay-layout{display:grid;grid-template-columns:1fr 340px;gap:2rem;align-items:start}
        .bk-pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1.5rem}
        .bk-pay-method{display:flex;align-items:center;gap:.9rem;border:1px solid var(--border);background:var(--dark);padding:1rem 1.2rem;cursor:pointer;transition:all var(--trans-fast)}
        .bk-pay-method:hover{border-color:rgba(224,172,107,.35);background:var(--gold-faint)}
        .bk-pay-method.active{border-color:var(--gold);background:var(--gold-faint)}
        .bk-pay-icon{font-size:1.3rem}
        .bk-pay-label{font-family:var(--font-cond);font-size:.9rem;font-weight:700;letter-spacing:.5px}
        .bk-pay-sub{font-size:.72rem;color:var(--gray)}
        .bk-pix-block{background:rgba(224,172,107,.04);border:1px solid rgba(224,172,107,.2);padding:1.5rem;text-align:center;margin-bottom:1.5rem}
        .bk-pix-qr{width:120px;height:120px;background:var(--border);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:.75rem;color:var(--gray);letter-spacing:1px}
        .bk-pix-key{font-family:var(--font-cond);font-size:.85rem;letter-spacing:1px;color:var(--gray);margin-bottom:.5rem}
        .bk-pix-note{font-size:.78rem;color:var(--muted);line-height:1.5}
        .bk-card-form{display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem}
        .bk-field{display:flex;flex-direction:column;gap:.4rem}
        .bk-field label{font-family:var(--font-cond);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray)}
        .bk-field input{background:var(--dark);border:1px solid var(--border);color:var(--white);padding:.75rem 1rem;font-family:var(--font-body);font-size:.9rem;outline:none;transition:border-color var(--trans-fast)}
        .bk-field input:focus{border-color:var(--gold)}
        .bk-field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .conf-overlay{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.9);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:1.5rem}
        .conf-modal{background:var(--card);border:1px solid var(--border);padding:2.5rem;max-width:480px;width:100%;text-align:center}
        .conf-check-wrap{width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,.08);border:1.5px solid rgba(34,197,94,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
        .conf-check-wrap svg{width:28px;height:28px;stroke:var(--green)}
        .conf-title{font-family:var(--font-display);font-size:2rem;letter-spacing:3px;margin-bottom:.5rem}
        .conf-sub{color:var(--gray);font-size:.9rem;margin-bottom:1.5rem}
        .conf-id{display:inline-block;font-family:var(--font-cond);font-size:.8rem;letter-spacing:3px;border:1px solid var(--border);padding:.3rem 1rem;color:var(--gold);margin-bottom:1.5rem}
        .conf-details{text-align:left;display:flex;flex-direction:column;gap:.1rem;margin-bottom:2rem}
        .conf-row{display:flex;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid var(--border)}
        .conf-label{font-family:var(--font-cond);font-size:.7rem;letter-spacing:2px;text-transform:uppercase;color:var(--gray)}
        .conf-val{font-family:var(--font-cond);font-size:.85rem;font-weight:600}
        .conf-actions{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .conf-btn-secondary,.conf-btn-primary{padding:1rem;font-family:var(--font-cond);font-size:.8rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;border:none;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:all var(--trans-fast)}
        .conf-btn-secondary{background:var(--dark);border:1px solid var(--border);color:var(--gray)}
        .conf-btn-secondary:hover{border-color:var(--gold);color:var(--gold)}
        .conf-btn-primary{background:var(--gold);color:var(--black)}
        .conf-btn-primary:hover{background:var(--gold-light)}
        @media(max-width:1000px){.bk-step3-layout,.bk-pay-layout{grid-template-columns:1fr}.bk-sidebar{position:static}}
        @media(max-width:768px){.page-hero{padding:2rem 1rem 1.5rem}.reservas-container{padding:0 1rem 3rem}.bk-card-header,.bk-card-body{padding:1.2rem 1rem}.bk-option-grid{grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.6rem}.bk-option-card{padding:1.2rem .9rem}.bk-pay-methods{grid-template-columns:1fr 1fr}.bk-field-row{grid-template-columns:1fr}.times-grid{grid-template-columns:repeat(3,1fr)!important}}
      `}</style>

      <div className="page-hero">
        <p className="section-eyebrow">Podium Arena</p>
        <h1>RESERVE SUA <span style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold),var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>QUADRA</span></h1>
        <p>Escolha a modalidade, quadra e horários disponíveis para sua reserva.</p>
      </div>

      <div className="reservas-container">
        {/* STEPPER */}
        <div className="bk-stepper-wrap">
          <div className="bk-stepper">
            <div className={stepClass(1)}><div className="bk-step-circle">1</div><div className="bk-step-label">Modalidade</div></div>
            <div className={lineClass(1)} />
            <div className={stepClass(2)}><div className="bk-step-circle">2</div><div className="bk-step-label">Quadra</div></div>
            <div className={lineClass(2)} />
            <div className={stepClass(3)}><div className="bk-step-circle">3</div><div className="bk-step-label">Data & Hora</div></div>
            <div className={lineClass(3)} />
            <div className={stepClass(4)}><div className="bk-step-circle">4</div><div className="bk-step-label">Pagamento</div></div>
          </div>
        </div>

        <div className="bk-card">
          {/* ══ ETAPA 1 – MODALIDADE ══ */}
          {step === 1 && (
            <>
              <div className="bk-card-header">
                <h2>ESCOLHA A MODALIDADE</h2>
                <p>Selecione o esporte que deseja praticar</p>
              </div>
              <div className="bk-card-body">
                {modalidade?.dayuse && (
                  <div className="bk-pickleball-notice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    <p>O <strong>Pickleball</strong> funciona apenas no modelo <strong>Day Use</strong> (R$ 25/pessoa). Não é possível reservar quadra avulsa.</p>
                  </div>
                )}
                <div className="bk-option-grid">
                  {MODALIDADES.map(m => (
                    <div key={m.id} className={`bk-option-card${modalidade?.id === m.id ? ' active' : ''}`} onClick={() => setModalidade(m)}>
                      {m.dayuse && <div className="bk-badge-dayuse">Day Use</div>}
                      <div className="bk-option-icon">{m.icon}</div>
                      <div className="bk-option-name">{m.nome}</div>
                      <div className="bk-option-desc">{m.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="bk-nav" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-gold" disabled={!modalidade} onClick={() => setStep(2)}>
                    Continuar
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══ ETAPA 2 – QUADRA ══ */}
          {step === 2 && (
            <>
              <div className="bk-card-header">
                <h2>ESCOLHA A QUADRA</h2>
                <p>Cada quadra tem disponibilidade própria</p>
              </div>
              <div className="bk-card-body">
                <div className="bk-option-grid">
                  {(QUADRAS[modalidade?.id] || []).map(q => (
                    <div key={q.id} className={`bk-option-card${quadra?.id === q.id ? ' active' : ''}`} onClick={() => setQuadra(q)}>
                      <div className="bk-option-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                      </div>
                      <div className="bk-option-name">{q.nome}</div>
                      <div className="bk-option-desc">{q.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="bk-nav">
                  <button className="btn-ghost" onClick={() => setStep(1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Voltar
                  </button>
                  <button className="btn-gold" disabled={!quadra} onClick={() => setStep(3)}>
                    Continuar
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══ ETAPA 3 – DATA & HORA ══ */}
          {step === 3 && (
            <>
              <div className="bk-card-header">
                <h2>DATA E HORÁRIOS</h2>
                <p>Selecione a data no calendário e um ou mais horários consecutivos</p>
              </div>
              <div className="bk-card-body">
                <div className="bk-step3-layout">
                  <div>
                    <Calendar
                      year={calYear} month={calMonth}
                      onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
                      onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
                      selectedDate={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setSelectedSlots([]); }}
                    />

                    {selectedDate && (
                      <>
                        <div className="bk-times-wrap" style={{ marginTop: '1.5rem' }}>
                          <div className="bk-times-label">Horários disponíveis <span>· selecione um ou mais</span></div>
                          <div className="times-grid">
                            {HOURS.map(h => {
                              const taken = busySlots.includes(h);
                              const sel = selectedSlots.includes(h);
                              return (
                                <div key={h} className={`time-slot${taken ? ' taken' : ''}${sel ? ' selected' : ''}`} onClick={() => toggleSlot(h)}>
                                  <div className="ts-hour">{String(h).padStart(2,'0')}h</div>
                                  <div className="ts-price">R${getPrice(h)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <button className={`bk-dayuse-btn${dayUse ? ' active' : ''}`} onClick={() => setDayUse(!dayUse)}>
                          <div className="bk-dayuse-check">{dayUse ? '✓' : ''}</div>
                          <div className="bk-dayuse-info">
                            <strong>Adicionar Day Use — R$ 25/pessoa</strong>
                            <p>Acesso às áreas comuns do arena durante o período da reserva</p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="bk-sidebar">
                    <div className="bk-sidebar-head">
                      <h4>Sua Reserva</h4>
                      <p>Resumo da seleção atual</p>
                    </div>
                    <div className="bk-sidebar-body">
                      <div className="bk-summary-row"><span className="bk-summary-label">Modalidade</span><span className="bk-summary-val">{modalidade?.nome}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Quadra</span><span className="bk-summary-val">{quadra?.nome}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Data</span><span className="bk-summary-val">{fmtDate(selectedDate)}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Horários</span><span className="bk-summary-val">{selectedSlots.length > 0 ? selectedSlots.sort((a,b)=>a-b).map(h=>`${String(h).padStart(2,'0')}h`).join(', ') : '—'}</span></div>
                      <div className="bk-sum-total">
                        <span className="bk-sum-total-label">Total</span>
                        <span className="bk-sum-total-val">R$ {totalPrice()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bk-nav">
                  <button className="btn-ghost" onClick={() => setStep(2)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Voltar
                  </button>
                  <button className="btn-gold" disabled={!selectedDate || selectedSlots.length === 0} onClick={() => setStep(4)}>
                    Ir para Pagamento
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══ ETAPA 4 – PAGAMENTO ══ */}
          {step === 4 && (
            <>
              <div className="bk-card-header">
                <h2>PAGAMENTO</h2>
                <p>Revise sua reserva e escolha como pagar</p>
              </div>
              <div className="bk-card-body">
                <div className="bk-pay-layout">
                  <div>
                    <p style={{ fontFamily: 'var(--font-cond)', fontSize: '.72rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.9rem' }}>Forma de Pagamento</p>
                    <div className="bk-pay-methods">
                      {[
                        { id: 'pix', icon: '📱', label: 'PIX', sub: 'Aprovação imediata' },
                        { id: 'credito', icon: '💳', label: 'Crédito', sub: 'Até 3x sem juros' },
                        { id: 'debito', icon: '🏦', label: 'Débito', sub: 'Aprovação na hora' },
                        { id: 'dinheiro', icon: '💵', label: 'Dinheiro', sub: 'Pague na chegada' },
                      ].map(m => (
                        <div key={m.id} className={`bk-pay-method${payMethod === m.id ? ' active' : ''}`} onClick={() => setPayMethod(m.id)}>
                          <span className="bk-pay-icon">{m.icon}</span>
                          <div><div className="bk-pay-label">{m.label}</div><div className="bk-pay-sub">{m.sub}</div></div>
                        </div>
                      ))}
                    </div>

                    {payMethod === 'pix' && (
                      <div className="bk-pix-block">
                        <div className="bk-pix-qr">QR Code PIX</div>
                        <div className="bk-pix-key">Chave PIX: <strong>podiumarena@pix.com.br</strong></div>
                        <p className="bk-pix-note">Após o pagamento, envie o comprovante via WhatsApp para confirmar.</p>
                      </div>
                    )}

                    {(payMethod === 'credito' || payMethod === 'debito') && (
                      <div className="bk-card-form">
                        <div className="bk-field"><label>Número do cartão</label><input type="tel" placeholder="0000 0000 0000 0000" maxLength={19} value={cardData.numero} onChange={e => setCardData({...cardData, numero: e.target.value})} /></div>
                        <div className="bk-field-row">
                          <div className="bk-field"><label>Validade</label><input type="tel" placeholder="MM/AA" maxLength={5} value={cardData.validade} onChange={e => setCardData({...cardData, validade: e.target.value})} /></div>
                          <div className="bk-field"><label>CVV</label><input type="tel" placeholder="123" maxLength={4} value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} /></div>
                        </div>
                        <div className="bk-field"><label>Nome no cartão</label><input type="text" placeholder="Como aparece no cartão" value={cardData.nome} onChange={e => setCardData({...cardData, nome: e.target.value})} /></div>
                      </div>
                    )}
                  </div>

                  <div className="bk-sidebar">
                    <div className="bk-sidebar-head">
                      <h4>Resumo Final</h4>
                      <p>Sua reserva em detalhes</p>
                    </div>
                    <div className="bk-sidebar-body">
                      <div className="bk-summary-row"><span className="bk-summary-label">Modalidade</span><span className="bk-summary-val">{modalidade?.nome}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Quadra</span><span className="bk-summary-val">{quadra?.nome}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Data</span><span className="bk-summary-val">{fmtDate(selectedDate)}</span></div>
                      <div className="bk-summary-row"><span className="bk-summary-label">Horários</span><span className="bk-summary-val">{selectedSlots.sort((a,b)=>a-b).map(h=>`${String(h).padStart(2,'0')}h`).join(', ')}</span></div>
                      {dayUse && <div className="bk-summary-row"><span className="bk-summary-label">Day Use</span><span className="bk-summary-val">R$ 25</span></div>}
                      <div className="bk-sum-total">
                        <span className="bk-sum-total-label">Total</span>
                        <span className="bk-sum-total-val">R$ {totalPrice()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bk-nav">
                  <button className="btn-ghost" onClick={() => setStep(3)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Voltar
                  </button>
                  <button className="btn-gold" disabled={loading} onClick={handleConfirm}>
                    {loading ? 'Confirmando…' : 'Confirmar Reserva'}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO */}
      {confOpen && (
        <div className="conf-overlay">
          <div className="conf-modal">
            <div className="conf-check-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="conf-title">RESERVADO!</div>
            <p className="conf-sub">Sua quadra está reservada. Nos vemos na arena!</p>
            <div className="conf-id">#{confData?._id?.slice(-6).toUpperCase() || 'PD-000000'}</div>
            <div className="conf-details">
              <div className="conf-row"><span className="conf-label">Modalidade</span><span className="conf-val">{modalidade?.nome}</span></div>
              <div className="conf-row"><span className="conf-label">Data</span><span className="conf-val">{fmtDate(selectedDate)}</span></div>
              <div className="conf-row"><span className="conf-label">Horários</span><span className="conf-val">{selectedSlots.sort((a,b)=>a-b).map(h=>`${String(h).padStart(2,'0')}h`).join(', ')}</span></div>
              <div className="conf-row"><span className="conf-label">Quadra</span><span className="conf-val">{quadra?.nome}</span></div>
              <div className="conf-row"><span className="conf-label">Pagamento</span><span className="conf-val">{payMethod}</span></div>
              <div className="conf-row"><span className="conf-label">Valor</span><span className="conf-val">R$ {totalPrice()}</span></div>
            </div>
            <div className="conf-actions">
              <button className="conf-btn-secondary" onClick={resetBooking}>Nova reserva</button>
              <Link to="/painel" className="conf-btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                Minhas Reservas
              </Link>
            </div>
          </div>
        </div>
      )}

      {authOpen && <AuthModal initialTab="login" onClose={() => setAuthOpen(false)} />}

      <Footer />
    </>
  );
}
