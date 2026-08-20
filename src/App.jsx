import React, { useState, useEffect } from 'react';
import { Scissors, Calendar, User, Clock, Phone, Lock, LogOut, CheckCircle, XCircle, Edit2, Trash2, Plus, Settings, Check, Type, Loader } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// 1. FIREBASE VERİTABANI YAPILANDIRMASI
// ==========================================
const isCanvas = typeof __firebase_config !== 'undefined';
const firebaseConfig = {
  apiKey: "AIzaSyAGvFYyThJjVpJ_PSyMhcX_sQLfOskmo6k",
  authDomain: "berber-randevu-1805e.firebaseapp.com",
  projectId: "berber-randevu-1805e",
  storageBucket: "berber-randevu-1805e.firebasestorage.app",
  messagingSenderId: "167217512964",
  appId: "1:167217512964:web:d99125394ebe49f6886b51"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'berber-vercel-app';

// Varsayılan İlk Veriler (Eğer veritabanı tamamen boşsa bunlar yüklenir)
const DEFAULT_SETTINGS = {
  shopName: "BarberShop",
  shopNameHighlight: "Shop",
  mainTitle: "Tarzınızı",
  mainTitleHighlight: "Yenileyin",
  description: "Sıra beklemeden, size en uygun saatte randevunuzu alın. İşleminizi seçin ve koltuğa oturun."
};

const DEFAULT_SERVICES = [
  { id: 1, name: "Saç Kesimi", price: 250 },
  { id: 2, name: "Sakal Tıraşı", price: 150 },
  { id: 3, name: "Saç & Sakal Kesimi", price: 350 },
  { id: 4, name: "Cilt Bakımı & Maske", price: 200 }
];

export default function App() {
  // --- UYGULAMA DURUMLARI (STATE) ---
  const [view, setView] = useState('customer'); 
  const [loginError, setLoginError] = useState('');
  
  // Veritabanı ve Kullanıcı Durumları
  const [user, setUser] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Uygulama Verileri (Artık veritabanından gelecek)
  const [shopSettings, setShopSettings] = useState(DEFAULT_SETTINGS);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // --- VERİTABANI BAĞLANTILARI (EFFECTS) ---
  // 1. Kullanıcı Girişi (Veritabanına erişim izni)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { console.error("Yetki hatası:", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Verileri Buluttan Canlı Çekme
  useEffect(() => {
    if (!user) return;
    
    // Verilerin tutulduğu belgenin adresi
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'store_data', 'main_document');
    
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setShopSettings(data.shopSettings || DEFAULT_SETTINGS);
        setServices(data.services || DEFAULT_SERVICES);
        setAppointments(data.appointments || []);
      } else {
        // Eğer ilk defa açılıyorsa, varsayılan verileri veritabanına yaz
        setDoc(docRef, {
          shopSettings: DEFAULT_SETTINGS,
          services: DEFAULT_SERVICES,
          appointments: []
        });
      }
      setLoadingData(false);
    }, (error) => {
      console.error("Veri çekme hatası:", error);
      setLoadingData(false);
    });

    return () => unsub();
  }, [user]);

  // Veritabanı Güncelleme Yardımcı Fonksiyonu
  const updateDatabase = async (newData) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'store_data', 'main_document');
      await setDoc(docRef, newData, { merge: true });
    } catch(e) {
      console.error("Veri kaydetme hatası:", e);
      alert("Değişiklikler kaydedilirken bir hata oluştu!");
    }
  };

  // --- MÜŞTERİ EKRANI İŞLEMLERİ ---
  const [bookingModal, setBookingModal] = useState({ isOpen: false, service: null });
  const [formData, setFormData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBook = async (e) => {
    e.preventDefault();
    const newApt = {
      id: Date.now(),
      serviceName: bookingModal.service.name,
      price: bookingModal.service.price,
      customerName: formData.name,
      customerPhone: formData.phone,
      date: formData.date,
      time: formData.time,
      status: 'Bekliyor',
      createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute:'2-digit' })
    };
    
    // Sadece geçici state'e değil, kalıcı Veritabanına da yazıyoruz!
    const newAppointments = [newApt, ...appointments];
    await updateDatabase({ appointments: newAppointments });
    
    setIsSuccess(true);
    setTimeout(() => {
      setBookingModal({ isOpen: false, service: null });
      setIsSuccess(false);
      setFormData({ name: '', phone: '', date: '', time: '' });
    }, 3000);
  };

  // --- YÖNETİCİ İŞLEMLERİ ---
  const handleLogin = (e) => {
    e.preventDefault();
    const pass = e.target.password.value;
    if (pass === '1234') { // Şifreyi buradan değiştirebilirsiniz
      setView('admin_panel');
      setLoginError('');
    } else {
      setLoginError('Hatalı şifre girdiniz.');
    }
  };

  const [adminTab, setAdminTab] = useState('appointments');
  const [editingService, setEditingService] = useState(null);
  const [editingSettings, setEditingSettings] = useState(shopSettings);

  // Randevu onaylama/iptal etme
  const handleUpdateStatus = async (id, newStatus) => {
    const newAppointments = appointments.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    );
    await updateDatabase({ appointments: newAppointments });
  };

  // Hizmet düzenleme
  const handleSaveService = async (e) => {
    e.preventDefault();
    const newServices = services.map(s => s.id === editingService.id ? editingService : s);
    await updateDatabase({ services: newServices });
    setEditingService(null);
  };

  // Yeni hizmet ekleme
  const handleAddService = async () => {
    const newId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;
    const newService = { id: newId, name: "Yeni İşlem", price: 0 };
    await updateDatabase({ services: [...services, newService] });
    setEditingService(newService); // Ekler eklemez düzenleme moduna al
  };

  // Hizmet silme
  const handleDeleteService = async (id) => {
    if(window.confirm("Bu hizmeti silmek istediğinize emin misiniz?")) {
      const newServices = services.filter(s => s.id !== id);
      await updateDatabase({ services: newServices });
    }
  };

  // Dükkan ayarlarını kaydetme
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await updateDatabase({ shopSettings: editingSettings });
    alert("Dükkan ayarları başarıyla kaydedildi!");
  };

  // ==========================================
  // EKRANLAR (RENDER)
  // ==========================================

  // Yüklenme Ekranı (Veriler buluttan gelirken görünür)
  if (loadingData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-amber-500 font-sans">
        <Loader className="animate-spin mb-4" size={48} />
        <p className="text-neutral-400 text-sm tracking-widest uppercase">Veriler Yükleniyor...</p>
      </div>
    );
  }

  // 1. MÜŞTERİ EKRANI
  if (view === 'customer') {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-900">
        <header className="border-b border-neutral-800 bg-neutral-950/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-neutral-900 p-2 rounded-lg">
                <Scissors size={24} className="transform -rotate-45" />
              </div>
              <h1 className="text-xl font-bold tracking-wider uppercase text-amber-500">
                {shopSettings.shopName.replace(shopSettings.shopNameHighlight, '')}
                <span className="text-white">{shopSettings.shopNameHighlight}</span>
              </h1>
            </div>
            
            <button onClick={() => setView('admin_login')} className="text-neutral-500 hover:text-amber-500 transition-colors flex items-center gap-1 text-xs uppercase tracking-widest" title="Personel Girişi">
              <Lock size={14} />
              <span className="hidden sm:inline">Yönetim</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white uppercase tracking-tight">
              {shopSettings.mainTitle} <span className="text-amber-500">{shopSettings.mainTitleHighlight}</span>
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              {shopSettings.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">{service.name}</h3>
                  <span className="bg-neutral-950 text-amber-500 font-bold px-3 py-1 rounded-lg border border-neutral-800">
                    {service.price} ₺
                  </span>
                </div>
                <button onClick={() => setBookingModal({ isOpen: true, service })} className="w-full bg-neutral-700 hover:bg-amber-500 hover:text-neutral-900 text-white font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2">
                  <Calendar size={18} /> Randevu Al
                </button>
              </div>
            ))}
          </div>
        </main>

        {bookingModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              {isSuccess ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={48} className="text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Randevunuz Alındı!</h2>
                  <p className="text-neutral-400 mb-6">{formData.date} günü saat {formData.time} için talebiniz bize ulaştı.</p>
                </div>
              ) : (
                <>
                  <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-amber-500">Randevu Oluştur</h2>
                      <p className="text-sm text-neutral-400 mt-1">{bookingModal.service.name} - {bookingModal.service.price} ₺</p>
                    </div>
                    <button onClick={() => setBookingModal({ isOpen: false, service: null })} className="text-neutral-500 hover:text-white">
                      <XCircle size={24} />
                    </button>
                  </div>
                  <form onSubmit={handleBook} className="p-6 space-y-4">
                     <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Adınız Soyadınız</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input type="text" required className="w-full bg-neutral-950 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Telefon Numaranız</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 text-neutral-500" size={18} />
                        <input type="tel" required className="w-full bg-neutral-950 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Tarih</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 text-neutral-500" size={18} />
                          <input type="date" required className="w-full bg-neutral-950 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none [color-scheme:dark]" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Saat</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 text-neutral-500" size={18} />
                          <input type="time" required className="w-full bg-neutral-950 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none [color-scheme:dark]" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-4 rounded-xl transition-colors mt-4 text-lg">
                      Randevuyu Tamamla
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. YÖNETİCİ GİRİŞ EKRANI
  if (view === 'admin_login') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-neutral-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-neutral-800">
          <div className="text-center mb-8">
            <div className="bg-neutral-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-700"><Lock className="text-amber-500" size={28} /></div>
            <h2 className="text-2xl font-bold text-white">Yönetici Girişi</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <input name="password" type="password" placeholder="Şifre (1234)" className="w-full px-4 py-4 bg-neutral-950 border border-neutral-800 text-white rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-center tracking-widest text-lg" required />
              {loginError && <p className="text-red-400 text-sm mt-3 text-center">{loginError}</p>}
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3.5 rounded-xl transition-colors">Giriş Yap</button>
          </form>
          <button onClick={() => setView('customer')} className="w-full mt-4 text-neutral-500 hover:text-white text-sm py-2">İptal Et ve Geri Dön</button>
        </div>
      </div>
    );
  }

  // 3. YÖNETİCİ PANELİ
  if (view === 'admin_panel') {
    const pendingCount = appointments.filter(a => a.status === 'Bekliyor').length;

    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row font-sans">
        
        {/* Sol Menü */}
        <div className="w-full md:w-64 bg-neutral-900 text-white flex flex-col border-r border-neutral-800">
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xl mb-1"><Scissors size={20} className="-rotate-45" /> {shopSettings.shopName}</div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setAdminTab('appointments')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${adminTab === 'appointments' ? 'bg-amber-500 text-neutral-900 font-bold' : 'hover:bg-neutral-800 text-neutral-300'}`}>
              <div className="flex items-center gap-3"><Calendar size={18} /> Randevular</div>
              {pendingCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
            <button onClick={() => setAdminTab('services')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'services' ? 'bg-amber-500 text-neutral-900 font-bold' : 'hover:bg-neutral-800 text-neutral-300'}`}>
              <Settings size={18} /> Fiyatlar & Hizmetler
            </button>
            <button onClick={() => { setAdminTab('shop_settings'); setEditingSettings(shopSettings); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${adminTab === 'shop_settings' ? 'bg-amber-500 text-neutral-900 font-bold' : 'hover:bg-neutral-800 text-neutral-300'}`}>
              <Type size={18} /> Dükkan Ayarları
            </button>
          </nav>
          
          <div className="p-4 border-t border-neutral-800">
            <button onClick={() => setView('customer')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors text-sm"><LogOut size={16} /> Dükkana Geri Dön</button>
          </div>
        </div>

        {/* Panel İçeriği */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-neutral-100 text-neutral-900">
          
          {adminTab === 'appointments' && (
             <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-black text-neutral-800 mb-6 flex items-center gap-2"><Calendar className="text-amber-500" /> Gelen Randevular</h2>
              {appointments.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-sm">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="text-neutral-400" size={24} /></div>
                  <h3 className="text-lg font-bold text-neutral-700 mb-1">Henüz Randevu Yok</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(app => (
                    <div key={app.id} className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg">{app.customerName}</span>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${app.status === 'Bekliyor' ? 'bg-amber-100 text-amber-700' : app.status === 'Onaylandı' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{app.status}</span>
                        </div>
                        <div className="grid grid-cols-2 md:flex md:gap-6 text-sm text-neutral-600">
                          <div className="flex items-center gap-1.5"><Scissors size={14}/> {app.serviceName} ({app.price}₺)</div>
                          <div className="flex items-center gap-1.5"><Calendar size={14}/> {app.date}</div>
                          <div className="flex items-center gap-1.5"><Clock size={14}/> {app.time}</div>
                          <div className="flex items-center gap-1.5"><Phone size={14}/> {app.customerPhone}</div>
                        </div>
                      </div>
                      
                      {app.status === 'Bekliyor' && (
                        <div className="flex gap-2 border-t md:border-t-0 border-neutral-100 pt-4 md:pt-0">
                          <button onClick={() => handleUpdateStatus(app.id, 'Onaylandı')} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"><Check size={16} /> Onayla</button>
                          <button onClick={() => handleUpdateStatus(app.id, 'İptal')} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl font-medium text-sm transition-colors"><XCircle size={16} /> İptal</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {adminTab === 'services' && (
             <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-neutral-800 flex items-center gap-2"><Settings className="text-amber-500" /> Fiyat Listesi Yönetimi</h2>
                <button onClick={handleAddService} className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Hizmet Ekle</button>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Hizmet Adı</th>
                      <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Fiyat (₺)</th>
                      <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Düzenle / Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {services.map(service => (
                      <tr key={service.id} className="hover:bg-neutral-50 transition-colors">
                        {editingService?.id === service.id ? (
                          <td colSpan="3" className="p-3">
                            <form onSubmit={handleSaveService} className="flex flex-col md:flex-row gap-3 items-center bg-amber-50 p-4 rounded-xl border border-amber-100">
                              <input type="text" value={editingService.name} onChange={(e) => setEditingService({...editingService, name: e.target.value})} className="flex-1 w-full px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-amber-500 bg-white" required />
                              <input type="number" value={editingService.price} onChange={(e) => setEditingService({...editingService, price: Number(e.target.value)})} className="w-full md:w-32 px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-amber-500 bg-white" required />
                              <div className="flex gap-2 w-full md:w-auto">
                                <button type="submit" className="flex-1 bg-amber-500 text-neutral-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-400">Kaydet</button>
                                <button type="button" onClick={() => setEditingService(null)} className="flex-1 bg-white border border-neutral-200 text-neutral-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-100">İptal</button>
                              </div>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td className="p-4 font-medium text-neutral-800">{service.name}</td>
                            <td className="p-4 font-bold text-neutral-900">{service.price} ₺</td>
                            <td className="p-4 text-right">
                              <button onClick={() => setEditingService(service)} className="text-neutral-400 hover:text-amber-500 p-2 transition-colors inline-block"><Edit2 size={18} /></button>
                              <button onClick={() => handleDeleteService(service.id)} className="text-neutral-400 hover:text-red-500 p-2 transition-colors inline-block ml-2"><Trash2 size={18} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'shop_settings' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-black text-neutral-800 mb-6 flex items-center gap-2"><Type className="text-amber-500" /> Dükkan Ayarları</h2>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Dükkan İsmi (Örn: Erkek Kuaförü)</label>
                      <input type="text" value={editingSettings.shopName} onChange={(e) => setEditingSettings({...editingSettings, shopName: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:border-amber-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Vurgulanan İsim (Sarı renkte görünür)</label>
                      <input type="text" value={editingSettings.shopNameHighlight} onChange={(e) => setEditingSettings({...editingSettings, shopNameHighlight: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                     <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Ana Başlık (Örn: Tarzınızı)</label>
                      <input type="text" value={editingSettings.mainTitle} onChange={(e) => setEditingSettings({...editingSettings, mainTitle: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:border-amber-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Vurgulanan Başlık (Örn: Yenileyin)</label>
                      <input type="text" value={editingSettings.mainTitleHighlight} onChange={(e) => setEditingSettings({...editingSettings, mainTitleHighlight: e.target.value})} className="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Açıklama Metni</label>
                    <textarea value={editingSettings.description} onChange={(e) => setEditingSettings({...editingSettings, description: e.target.value})} className="w-full px-4 py-3 border border-neutral-300 rounded-lg outline-none focus:border-amber-500 min-h-[100px]" required ></textarea>
                  </div>
                  <div className="pt-4 border-t border-neutral-200">
                    <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-neutral-900 font-bold py-3 px-8 rounded-xl transition-colors w-full md:w-auto">Değişiklikleri Kaydet</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}


