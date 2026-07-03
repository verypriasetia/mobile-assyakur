/* ==========================================================================
   COMBINED.JS - ENGINE SIGNAGE MASJID ASSYAKUR V2.8 (RESTORED 1 BARIS KAS)
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1: SISTEM DATABASE JADWAL SHOLAT INTERNAL & ALARM (AUDIO MP3)
   ========================================================================== */
function ambilJadwalHariIni(dateObj) {
    // Mengunci string pencarian tahun ke "2026" agar database jadwal berlaku abadi
    const tahun = "2026";
    const bulan = String(dateObj.getMonth() + 1).padStart(2, '0');
    const tanggal = String(dateObj.getDate()).padStart(2, '0');
    const keyTanggal = `${tahun}-${bulan}-${tanggal}`; 

    if (typeof DATABASE_JADWAL_TAHUNAN !== 'undefined' && DATABASE_JADWAL_TAHUNAN[keyTanggal]) {
        return DATABASE_JADWAL_TAHUNAN[keyTanggal];
    }
    return { imsak: "04:44", fajr: "04:54", dhuhr: "12:18", asr: "15:43", magrib: "18:21", isya: "19:35" };
}

let isAlarmAdzanPlay = false;
let isAlarmIqamahPlay = false;

function pancingIzinAudioBrowser() {
    console.log("Izin audio berhasil dipancing melalui interaksi pengguna.");
    const dummyAudio = new Audio('BEEP PENDEK.mp3');
    dummyAudio.volume = 0; 
    dummyAudio.play().catch(() => {});
}

function putarAudioMp3(fileUtama, fileSambungan = null) {
    const audio = new Audio(`${fileUtama}`);
    audio.play().then(() => {
        console.log(`Berhasil memutar audio: ${fileUtama}`);
        if (fileSambungan) {
            audio.onended = () => {
                const audioSambungan = new Audio(`${fileSambungan}`);
                audioSambungan.play().catch(e => console.error(e));
            };
        }
    }).catch(e => console.error(e));
}

function triggerAlarm(tipe) {
    if (tipe === 'adzan') {
        console.log("Memicu jalannya alarm 7 detik sebelum Adzan...");
        putarAudioMp3('BEEP PENDEK.mp3', 'BEEP PANJANG.mp3');
    } else if (tipe === 'iqamah') {
        console.log("Memicu jalannya alarm 7 detik sebelum Iqamah...");
        putarAudioMp3('BEEP PENDEK.mp3');
    }
}

/* ==========================================================================
   SISTEM ALGORITMA PERHITUNGAN TANGGAL HIJRIYAH DINAMIS (PASCA MAGHRIB)
   ========================================================================== */
function hitungHijriyahOtomatis(dateObj) {
    let kustomSore = new Date(dateObj.getTime());
    const jadwalHariIni = ambilJadwalHariIni(dateObj);
    
    if (jadwalHariIni && jadwalHariIni.magrib) {
        let partsMagrib = jadwalHariIni.magrib.split(':');
        let jamMagrib = parseInt(partsMagrib[0], 10);
        let menitMagrib = parseInt(partsMagrib[1], 10);
        
        let detikMagribHariIni = (jamMagrib * 3600) + (menitMagrib * 60);
        let detikSekarang = (dateObj.getHours() * 3600) + (dateObj.getMinutes() * 60) + dateObj.getSeconds();
        
        if (detikSekarang >= detikMagribHariIni) {
            kustomSore.setDate(kustomSore.getDate() + 1);
        }
    }

    let jd = Math.floor(kustomSore.getTime() / 86400000) + 2440589;
    let l = jd - 1948440 + 10632;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    let j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    
    let m = Math.floor((24 * l) / 709);
    let d = l - Math.floor((709 * m) / 24);
    let y = 30 * n + j - 30;

    const namaBulanHijriyah = [
        "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir", 
        "Jumadil Awwal", "Jumadil Akhir", "Rajab", "Sya'ban", 
        "Ramadhan", "Syawwal", "Dzulqa'dah", "Dzulhijjah"
    ];

    // Proteksi indeks batas bawah 0 dan batas atas 11 agar terhindar dari error 'undefined'
    let indeksBulan = Math.max(0, Math.min(11, m - 1));

    return `${d} ${namaBulanHijriyah[indeksBulan]} ${y} H`;
}

/* ==========================================================================
   BAGIAN 2: ENGINE REFRESH CLOCK & COUNTDOWN (REAL-TIME JADWAL)
   ========================================================================== */
const SPREADSHEET_ID = '1Jene5qNwgCTYkPAZhlbeRIEVnZvJl6Ktze0pp1upbsk'; 
const API_KEY = 'AIzaSyA8jJH40UHIUsfSmnR6vWPP0mqnN3S5QuY'; 

let dataSlides = [];
let currentSlideIndex = 0;
let slideTimeout;
let scrollInterval;
let isJedaManual = false;

let dataMasjidJeda = { SUBUH: 12, DZUHUR: 10, ASHAR: 10, MAGHRIB: 7, ISYA: 10 }; 
let isModeSholatBerlangsung = false;
let isModeMenungguIqamah = false;

let DAFTAR_GAMBAR_LOKAL = [];

let globalImageIndex = 0;      
let globalTextIndex = 0;       
let menggunakanSlideA = true;

setInterval(() => {
    const sekarang = new Date();
    const jam = sekarang.getHours();     
    const menit = sekarang.getMinutes(); 
    const detik = sekarang.getSeconds(); 
    const sekarangDetik = (jam * 3600) + (menit * 60) + detik;
    
    if (document.getElementById('clock-time')) {
        document.getElementById('clock-time').innerText = `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
    }

    if (document.getElementById('clock-date')) {
        document.getElementById('clock-date').innerText = sekarang.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    if (document.getElementById('clock-hijri')) {
        document.getElementById('clock-hijri').innerText = hitungHijriyahOtomatis(sekarang);
    }

    const jadwalHariIni = ambilJadwalHariIni(sekarang);
    const besok = new Date();
    besok.setDate(sekarang.getDate() + 1);
    const jadwalBesok = ambilJadwalHariIni(besok);

    const daftarSholat = [
        { nama: 'SUBUH', waktu: jadwalHariIni.fajr },
        { nama: 'DZUHUR', waktu: jadwalHariIni.dhuhr },
        { nama: 'ASHAR', waktu: jadwalHariIni.asr },
        { nama: 'MAGHRIB', waktu: jadwalHariIni.magrib },
        { nama: 'ISYA', waktu: jadwalHariIni.isya }
    ];

    let sholatBerikutnya = null;
    for (let i = 0; i < daftarSholat.length; i++) {
        let tParts = daftarSholat[i].waktu.split(':');
        let targetDetik = (parseInt(tParts[0]) * 3600) + (parseInt(tParts[1]) * 60);
        if (targetDetik > sekarangDetik) {
            sholatBerikutnya = { nama: daftarSholat[i].nama, waktuStr: daftarSholat[i].waktu, targetDetik: targetDetik, isBesok: false };
            break;
        }
    }
    if (!sholatBerikutnya) {
        let tParts = jadwalBesok.fajr.split(':');
        sholatBerikutnya = { nama: 'SUBUH', waktuStr: jadwalBesok.fajr, targetDetik: (parseInt(tParts[0]) * 3600) + (parseInt(tParts[1]) * 60) + 86400
