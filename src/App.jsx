import React, { useState } from 'react';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  Sparkles, 
  Trash2, 
  Filter, 
  ShieldCheck, 
  Star, 
  X,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare
} from 'lucide-react';

// --- GEMINI API YARDIMCI FONKSİYONU ---
const apiKey = ""; // Runtime ortamı tarafından otomatik sağlanır

async function callGeminiAPI(prompt, systemInstruction = "") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  // Üstel geri çekilme (exponential backoff) ile 5 defaya kadar yeniden deneme
  const maxRetries = 5;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

// --- MOCK VERİLER ---
const INITIAL_SERVICES = [
  { id: '1', name: 'Saç Kesimi & Yıkama', price: 250, duration: 30, icon: '✂️', desc: 'Klasik veya modern saç kesimi, yıkama ve fön' },
  { id: '2', name: 'Sakal Tıraşı & Bakım', price: 150, duration: 20, icon: '🪒', desc: 'Sıcak havlu eşliğinde sakal şekillendirme veya sinekkaydı' },
  { id: '3', name: 'Saç & Sakal Kombin', price: 350, duration: 45, icon: '👑', desc: 'VIP Saç ve sakal kesimi, yıkama, fön ve esans uygulaması' },
  { id: '4', name: 'Cilt Bakımı & Maske', price: 200, duration: 30, icon: '🧴', desc: 'Buhar maskesi, siyah nokta temizleme ve nemlendirme' },
  { id: '5', name: 'Saç Boyama / Beyaz Kapatma', price: 400, duration: 60, icon: '🎨', desc: 'Doğal görünümlü saç veya sakal renklendirme' }
];

const INITIAL_BARBERS = [
  { id: 'b1', name: 'Ahmet Usta', title: 'Baş Berber / Master Stylist', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialties: ['Fade Kesim', 'Sakal Tasarımı'] },
  { id: 'b2', name: 'Mehmet Yılmaz', title: 'Senior Berber', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialties: ['Klasik Kesim', 'Cilt Bakımı'] },
  { id: 'b3', name: 'Caner Demir', title: 'Stil Uzmanı', rating: 4.7, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialties: ['Trend Modeller', 'Çocuk Tıraşı'] }
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

export default function App() {
  // --- STATE YÖNETİMİ ---
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'admin', 'ai-advisor'
  
  // Randevu Alma Form State'leri
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(INITIAL_SERVICES[0]);
  const [selectedBarber, setSelectedBarber] = useState(INITIAL_BARBERS[0]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', note: '' });

  // Randevu Listesi (Sanal Depolama)
  const [appointments, setAppointments] = useState([
    {
      id: 'apt-101',
      customerName: 'Kaan Kaya',
      phone: '0555 123 4567',
      service: INITIAL_SERVICES[2],
      barber: INITIAL_BARBERS[0],
      date: new Date().toISOString().split('T')[0],
      time: '11:00',
      status: 'Onaylandı',
      note: 'Yanlar sıfır olsun'
    },
    {
      id: 'apt-102',
      customerName: 'Burak Tan',
      phone: '0532 987 6543',
      service: INITIAL_SERVICES[0],
      barber: INITIAL_BARBERS[1],
      date: new Date().toISOString().split('T')[0],
      time: '14:30',
      status: 'Bekliyor',
      note: ''
    }
  ]);

  // Bildirim Toast State
  const [toast, setToast] = useState(null);

  // AI Danışman State'leri
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Admin Filtre State'i
  const [adminDateFilter, setAdminDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [adminBarberFilter, setAdminBarberFilter] = useState('ALL');

  // Bildirim gösterme fonksiyonu
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Seçilen tarih ve berbere göre dolu saatler
  const getBookedTimes = (date, barberId) => {
    return appointments
      .filter(a => a.date === date && a.barber.id === barberId && a.status !== 'İptal')
      .map(a => a.time);
  };

  const bookedTimes = getBookedTimes(selectedDate, selectedBarber.id);

  // Randevu Tamamlama
  const handleConfirmBooking = (e) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.phone || !selectedTime) {
      showToast('Lütfen tüm zorunlu alanları doldurun!', 'error');
      return;
    }

    const newAppointment = {
      id: `apt-${Date.now()}`,
      customerName: customerInfo.name,
      phone: customerInfo.phone,
      service: selectedService,
      barber: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      status: 'Onaylandı',
      note: customerInfo.note
    };

    setAppointments([newAppointment, ...appointments]);
    setStep(5); // Başarı adımı
    showToast('Randevunuz başarıyla oluşturuldu!');
  };

  // Randevu Durumu Güncelleme (Admin)
  const updateAppointmentStatus = (id, newStatus) => {
    setAppointments(prev =>
      prev.map(apt => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
    showToast(`Randevu durumu '${newStatus}' olarak güncellendi.`);
  };

  // Randevu Silme (Admin)
  const deleteAppointment = (id) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
    showToast('Randevu silindi.', 'error');
  };

  // AI Danışman Sorusu Sor
  const handleAskAI = async (customPrompt = null) => {
    const promptToUse = customPrompt || aiQuery;
    if (!promptToUse.trim()) return;

    setAiLoading(true);
    setAiResponse('');

    const systemPrompt = `Sen "Gentleman Barbershop" isimli lüks bir berber salonunun uzman saç/sakal ve erkek bakım danışmanısın. 
Müşterinin yüz şekline, saç yapısına ve sorularına göre nazik, samimi, şık ve profesyonel tavsiyeler ver. Yanıtlarını düzenli, okunması kolay maddeler halinde sun. Türkçe konuş.`;

    try {
      const res = await callGeminiAPI(promptToUse, systemPrompt);
      setAiResponse(res);
    } catch (err) {
      setAiResponse('Üzgünüz, yapay zeka danışmanımıza şu anda ulaşılamıyor. Lütfen tekrar deneyiniz.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-black">
      
      {/* --- TOAST BİLDİRİMİ --- */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-bounce ${
          toast.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
        }`}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* --- ÜST BİLGİ / HEADER --- */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Scissors className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                GENTLEMAN BARBER
              </h1>
              <p className="text-xs text-slate-400">Lüks Erkek Kuaförü & Bakım Salonu</p>
            </div>
          </div>

          {/* TAB SEÇİMİ */}
          <nav className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-sm">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                activeTab === 'book'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Randevu Al</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Yönetici Paneli</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-advisor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                activeTab === 'ai-advisor'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Stil Danışmanı</span>
              <span className="sm:hidden">AI</span>
            </button>
          </nav>
        </div>
      </header>

      {/* --- ANA İÇERİK --- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        
        {/* ========================================================= */}
        {/* TAB 1: MÜŞTERİ RANDEVU ALMA MODÜLÜ                       */}
        {/* ========================================================= */}
        {activeTab === 'book' && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* ADIM GÖSTERGESİ (STEPPER) */}
            {step < 5 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  {[
                    { num: 1, label: 'Hizmet' },
                    { num: 2, label: 'Berber' },
                    { num: 3, label: 'Tarih & Saat' },
                    { num: 4, label: 'Bilgiler' }
                  ].map((s, idx) => (
                    <React.Fragment key={s.num}>
                      <div className="flex flex-col items-center gap-1 z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          step === s.num
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-lg'
                            : step > s.num
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                        </div>
                        <span className={`text-xs font-medium ${step === s.num ? 'text-amber-400' : 'text-slate-400'}`}>
                          {s.label}
                        </span>
                      </div>
                      {idx < 3 && (
                        <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-all ${
                          step > idx + 1 ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* --- ADIM 1: HİZMET SEÇİMİ --- */}
            {step === 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-amber-500" />
                    Hizmet Seçiniz
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Almak istediğiniz bakımı listeden işaretleyin.</p>
                </div>

                <div className="grid gap-3">
                  {INITIAL_SERVICES.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedService.id === srv.id
                          ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{srv.icon}</span>
                        <div>
                          <h3 className="font-semibold text-slate-100">{srv.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{srv.desc}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-amber-400/80 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {srv.duration} dakika
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-amber-400">₺{srv.price}</span>
                        <div className="mt-2">
                          <input
                            type="radio"
                            name="service"
                            checked={selectedService.id === srv.id}
                            onChange={() => setSelectedService(srv)}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span>Devam Et: Berber Seçimi</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* --- ADIM 2: BERBER SEÇİMİ --- */}
            {step === 2 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-500" />
                      Berberinizi Seçin
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Hizmeti almak istediğiniz uzmanı belirleyin.</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-amber-400 underline">
                    Geri
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {INITIAL_BARBERS.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center relative ${
                        selectedBarber.id === barber.id
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-amber-500/50 shadow-md"
                      />
                      <h3 className="font-semibold text-slate-100">{barber.name}</h3>
                      <p className="text-xs text-amber-400/80 mt-0.5">{barber.title}</p>
                      
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="font-bold">{barber.rating}</span>
                      </div>

                      <div className="mt-3 w-full border-t border-slate-800/80 pt-2">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {barber.specialties.map((spec, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 rounded-xl transition-all"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="w-2/3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Devam Et: Tarih ve Saat</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* --- ADIM 3: TARİH VE SAAT SEÇİMİ --- */}
            {step === 3 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />
                      Tarih ve Saat Seçimi
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Uygun olduğunuz gün ve saati belirleyin.</p>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-amber-400 underline">
                    Geri
                  </button>
                </div>

                {/* Tarih Seçimi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Randevu Tarihi
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime(''); // Tarih değişince seçili saati sıfırla
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Saat Dilimleri Grid */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Uygun Saatler ({selectedDate})
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></span> Dolu
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Seçili
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedTimes.includes(slot);
                      const isSelected = selectedTime === slot;

                      return (
                        <button
                          key={slot}
                          disabled={isBooked}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            isBooked
                              ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                              : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800'
                          }`}
                        >
                          <Clock className="w-3 h-3 opacity-70" />
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 rounded-xl transition-all"
                  >
                    Geri
                  </button>
                  <button
                    disabled={!selectedTime}
                    onClick={() => setStep(4)}
                    className={`w-2/3 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedTime
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Devam Et: İletişim Bilgileri</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* --- ADIM 4: MÜŞTERİ BİLGİLERİ VE ONAY --- */}
            {step === 4 && (
              <form onSubmit={handleConfirmBooking} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-500" />
                      Müşteri Bilgileri
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Randevunuzu tamamlamak için bilgilerinizi giriniz.</p>
                  </div>
                  <button type="button" onClick={() => setStep(3)} className="text-xs text-slate-400 hover:text-amber-400 underline">
                    Geri
                  </button>
                </div>

                {/* ÖZET KARTI */}
                <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Randevu Özeti</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-400">Hizmet:</span> <span className="font-semibold text-slate-200">{selectedService.name}</span></div>
                    <div><span className="text-slate-400">Tutar:</span> <span className="font-bold text-amber-400">₺{selectedService.price}</span></div>
                    <div><span className="text-slate-400">Berber:</span> <span className="font-semibold text-slate-200">{selectedBarber.name}</span></div>
                    <div><span className="text-slate-400">Süre:</span> <span className="font-semibold text-slate-200">{selectedService.duration} dk</span></div>
                    <div><span className="text-slate-400">Tarih:</span> <span className="font-semibold text-slate-200">{selectedDate}</span></div>
                    <div><span className="text-slate-400">Saat:</span> <span className="font-semibold text-amber-400">{selectedTime}</span></div>
                  </div>
                </div>

                {/* FORM ALANLARI */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Ad Soyad *</label>
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ahmet Yılmaz"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Telefon Numarası *</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="05XX XXX XX XX"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Özel Not (Opsiyonel)</label>
                    <textarea
                      rows="2"
                      placeholder="Eklemek istediğiniz bir not var mı?"
                      value={customerInfo.note}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, note: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 rounded-xl transition-all"
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Randevuyu Onayla</span>
                  </button>
                </div>
              </form>
            )}

            {/* --- ADIM 5: BAŞARILI RANDEVU BİLETİ --- */}
            {step === 5 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-100">Randevunuz Onaylandı!</h2>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Sayın <strong className="text-slate-200">{customerInfo.name}</strong>, randevu detaylarınız aşağıda yer almaktadır. Sizi ağırlamaktan mutluluk duyacağız.
                  </p>
                </div>

                {/* BİLET ŞABLONU */}
                <div className="bg-slate-950 border border-dashed border-slate-700 rounded-2xl p-6 text-left max-w-md mx-auto relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    ONAYLANDI
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <span className="text-2xl">{selectedService.icon}</span>
                      <div>
                        <div className="font-bold text-slate-200">{selectedService.name}</div>
                        <div className="text-xs text-amber-400">₺{selectedService.price} • {selectedService.duration} dk</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Uzman Berber:</span>
                        <span className="font-semibold text-slate-200">{selectedBarber.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tarih & Saat:</span>
                        <span className="font-semibold text-amber-400">{selectedDate} / {selectedTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Telefon:</span>
                        <span className="font-semibold text-slate-200">{customerInfo.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Salon:</span>
                        <span className="font-semibold text-slate-200">Gentleman Barbershop</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      setStep(1);
                      setCustomerInfo({ name: '', phone: '', note: '' });
                      setSelectedTime('');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md"
                  >
                    Yeni Randevu Al
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all border border-slate-700"
                  >
                    Yönetici Panelinde Gör
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: YÖNETİCİ / BERBER PANELİ                           */}
        {/* ========================================================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            
            {/* ÜST İSTATİSTİK KARTLARI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Randevu</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1">{appointments.length}</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tahmini Ciro</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    ₺{appointments.reduce((sum, a) => a.status !== 'İptal' ? sum + a.service.price : sum, 0)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bugünkü Randevular</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1">
                    {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* FİLTRELEME ÇUBUĞU */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-200 text-sm">Randevu Filtreleri:</h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Tarih Filtresi */}
                <input
                  type="date"
                  value={adminDateFilter}
                  onChange={(e) => setAdminDateFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />

                {/* Berber Filtresi */}
                <select
                  value={adminBarberFilter}
                  onChange={(e) => setAdminBarberFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Tüm Berberler</option>
                  {INITIAL_BARBERS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                {(adminDateFilter || adminBarberFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setAdminDateFilter('');
                      setAdminBarberFilter('ALL');
                    }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            </div>

            {/* RANDEVULAR LİSTESİ / TABLOSU */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  Randevu Kayıtları
                </h3>
                <span className="text-xs text-slate-400">
                  Toplam {appointments.length} kayıttan filtrelenenler
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Müşteri</th>
                      <th className="p-3.5">Hizmet</th>
                      <th className="p-3.5">Berber</th>
                      <th className="p-3.5">Tarih / Saat</th>
                      <th className="p-3.5">Ücret</th>
                      <th className="p-3.5">Durum</th>
                      <th className="p-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {appointments
                      .filter(apt => {
                        const dateMatch = !adminDateFilter || apt.date === adminDateFilter;
                        const barberMatch = adminBarberFilter === 'ALL' || apt.barber.id === adminBarberFilter;
                        return dateMatch && barberMatch;
                      })
                      .map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-100">{apt.customerName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {apt.phone}
                            </div>
                            {apt.note && (
                              <div className="text-[10px] text-amber-400/90 italic mt-0.5">"{apt.note}"</div>
                            )}
                          </td>
                          <td className="p-3.5 font-medium text-slate-200">
                            {apt.service.icon} {apt.service.name}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                              {apt.barber.name}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-200">{apt.date}</div>
                            <div className="text-amber-400 font-semibold">{apt.time}</div>
                          </td>
                          <td className="p-3.5 font-bold text-amber-400">
                            ₺{apt.service.price}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                              apt.status === 'Onaylandı'
                                ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                                : apt.status === 'Tamamlandı'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-950 text-red-300 border-red-500/40'
                            }`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {apt.status !== 'Tamamlandı' && (
                                <button
                                  title="Tamamlandı İşaretle"
                                  onClick={() => updateAppointmentStatus(apt.id, 'Tamamlandı')}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {apt.status !== 'İptal' && (
                                <button
                                  title="İptal Et"
                                  onClick={() => updateAppointmentStatus(apt.id, 'İptal')}
                                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                title="Sil"
                                onClick={() => deleteAppointment(apt.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {appointments.filter(apt => (!adminDateFilter || apt.date === adminDateFilter) && (adminBarberFilter === 'ALL' || apt.barber.id === adminBarberFilter)).length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-slate-500">
                          Seçilen kriterlere uygun randevu bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: YAPAY ZEKA SAÇ & SAKAL DANIŞMANI (GEMINI API)      */}
        {/* ========================================================= */}
        {activeTab === 'ai-advisor' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-3 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl text-slate-950 font-bold">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-400">Yapay Zeka Stil Danışmanı</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hangi modelin size yakışacağından emin değil misiniz? Yüz tipinizi veya merak ettiklerinizi yapay zekaya sorun!
                  </p>
                </div>
              </div>

              {/* HAZIR SORU BUTONLARI */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Örnek Sorular:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Yuvarlak yüz tipim var, bana hangi saç modeli yakışır?',
                    'Sakal bakımında en sık yapılan hatalar nelerdir?',
                    'Seyrek saçlar için dolgun gösteren kesim önerileri nelerdir?',
                    'Sakal uzatırken kaşıntı ve kepeği önlemek için ne yapmalıyım?'
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiQuery(q);
                        handleAskAI(q);
                      }}
                      className="text-xs bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 px-3 py-2 rounded-xl transition-all text-left"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* METİN GİRDİ ALANI */}
              <div className="space-y-3 pt-2">
                <textarea
                  rows="3"
                  placeholder="Saç tipinizi, yüz şeklinizi veya aklınızdaki modeli tarif edin..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                ></textarea>

                <button
                  disabled={aiLoading || !aiQuery.trim()}
                  onClick={() => handleAskAI()}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    aiLoading || !aiQuery.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  }`}
                >
                  {aiLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Stil Danışmanı Düşünüyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Tavsiye Al</span>
                    </>
                  )}
                </button>
              </div>

              {/* DANIŞMAN YANITI */}
              {aiResponse && (
                <div className="mt-6 p-5 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>Uzman Danışman Yanıtı:</span>
                  </div>
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* --- ALT BİLGİ / FOOTER --- */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 Gentleman Barbershop • Tüm Hakları Saklıdır.</span>
          <span>Çalışma Saatleri: Pazartesi - Cumartesi (09:00 - 20:00)</span>
        </div>
      </footer>

    </div>
  );
}

