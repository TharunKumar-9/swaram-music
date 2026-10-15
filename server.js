// Retro Music Player - Tollywood Edition Backend Server
// Zero external dependencies - pure Node.js HTTP/HTTPS/Crypto

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- Helper Functions ---

// Unescape HTML entities
function unescapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&copy;/g, '©');
}

// Format duration in seconds to mm:ss
function formatDuration(sec) {
  const s = parseInt(sec, 10) || 0;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

// Decrypt JioSaavn DES-ECB encrypted media URL using native 3DES-ECB equivalence
function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key8 = Buffer.from('38346591', 'utf8');
    const key24 = Buffer.concat([key8, key8, key8]);
    const decipher = crypto.createDecipheriv('des-ede3-ecb', key24, null);
    let dec = decipher.update(encryptedUrl, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (err) {
    console.error('Decryption failed for URL:', err.message);
    return null;
  }
}

// Format language string to display name
function formatLanguageName(lang) {
  if (!lang) return 'Pan-India';
  const l = lang.toLowerCase();
  if (l.includes('telugu')) return 'Telugu';
  if (l.includes('hindi')) return 'Hindi';
  if (l.includes('tamil')) return 'Tamil';
  if (l.includes('kannada')) return 'Kannada';
  if (l.includes('malayalam')) return 'Malayalam';
  if (l.includes('punjabi')) return 'Punjabi';
  if (l.includes('bengali')) return 'Bengali';
  if (l.includes('marathi')) return 'Marathi';
  if (l.includes('bhojpuri')) return 'Bhojpuri';
  if (l.includes('gujarati')) return 'Gujarati';
  if (l.includes('english')) return 'English';
  return l.charAt(0).toUpperCase() + l.slice(1);
}

// Generate normalized unique song key to eliminate duplicate releases/remixes
function getCleanSongKey(song) {
  if (!song) return '';
  const title = (song.title || '')
    .toLowerCase()
    .replace(/&quot;/g, '')
    .replace(/&#039;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/telugu|hindi|tamil|kannada|malayalam|punjabi/gi, '')
    .replace(/lyrical|audio|video|remix|lofi|reprise|version|full song|from/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  
  if (title.length < 3) {
    const movie = (song.movie || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    return `${title}_${movie}`;
  }
  return title;
}

// Strict song deduplication helper (by ID and clean title key)
function dedupeSongs(songs, seenKeysSet = null) {
  const seenIds = new Set();
  const seenKeys = seenKeysSet || new Set();
  const unique = [];

  for (const song of songs) {
    if (!song || !song.id || !song.audio_320) continue;
    if (seenIds.has(song.id)) continue;
    const key = getCleanSongKey(song);
    if (key && seenKeys.has(key)) continue;

    seenIds.add(song.id);
    if (key) seenKeys.add(key);
    unique.push(song);
  }
  return unique;
}

// Convert JioSaavn song object to normalized format
function formatSong(item) {
  if (!item) return null;
  const info = item.more_info || {};
  const encrypted = info.encrypted_media_url;
  const rawUrl = decryptMediaUrl(encrypted);
  
  let audio_96 = rawUrl;
  let audio_160 = rawUrl ? rawUrl.replace('_96.mp4', '_160.mp4') : null;
  let audio_320 = rawUrl ? rawUrl.replace('_96.mp4', '_320.mp4') : null;

  let image = item.image || info.image || '';
  if (image) {
    image = image.replace('150x150.jpg', '500x500.jpg').replace('50x50.jpg', '500x500.jpg');
    if (image.startsWith('http://')) image = image.replace('http://', 'https://');
  }

  const title = unescapeHtml(item.title || info.song || 'Unknown Song');
  const movie = unescapeHtml(info.album || item.album || item.subtitle || 'Indian Cinema Single');
  const singers = unescapeHtml(info.singers || info.artistMap?.primary_artists?.map(a => a.name).join(', ') || item.subtitle || 'Various Artists');
  const music = unescapeHtml(info.music || 'Original Soundtrack');
  const duration = parseInt(info.duration || item.duration || 0, 10);
  const rawLang = (item.language || info.language || '').toLowerCase().trim();
  const lang = rawLang || 'telugu';

  return {
    id: item.id,
    title,
    movie,
    singers,
    music,
    year: info.year || item.year || '2024',
    duration,
    durationFormatted: formatDuration(duration),
    image,
    imageSmall: image.replace('500x500.jpg', '150x150.jpg'),
    audio_96,
    audio_160,
    audio_320,
    has_lyrics: info.has_lyrics === 'true' || info.has_lyrics === true,
    language: lang,
    languageName: formatLanguageName(lang),
    youtubeQuery: `${title} ${movie} official video song`
  };
}

// Helper to fetch JSON from JioSaavn
async function fetchSaavn(endpointParams) {
  const base = 'https://www.jiosaavn.com/api.php?_format=json&_marker=0&ctx=web6dot0&api_version=4&';
  const fullUrl = base + endpointParams;
  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Clean response if wrapped
    const cleanText = text.trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error(`Saavn fetch failed (${endpointParams}):`, err.message);
    return null;
  }
}

// Real-time YouTube Pan-India Search scraper
async function searchYouTube(query) {
  try {
    const cleanQ = encodeURIComponent(query || 'pan india hit songs 2024');
    const ytUrl = `https://www.youtube.com/results?search_query=${cleanQ}`;
    const res = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    
    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    const videos = [];
    for (const item of contents) {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const id = v.videoId;
        const title = v.title?.runs?.map(r => r.text).join('') || '';
        const channel = v.ownerText?.runs?.[0]?.text || '';
        const length = v.lengthText?.simpleText || '3:30';
        const views = v.viewCountText?.simpleText || '';
        
        videos.push({
          id,
          title,
          channel,
          length,
          views,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          type: 'youtube'
        });
        if (videos.length >= 24) break;
      }
    }
    return videos;
  } catch (err) {
    console.error('YouTube search error:', err.message);
    return [];
  }
}

// Curated Top Tollywood Songs Catalog (Loaded dynamically & cached)
const CURATED_QUERIES = [
  'Pushpa 2 The Rule Telugu',
  'Devara Telugu Songs',
  'Kalki 2898 AD Telugu',
  'RRR Telugu Songs',
  'Ala Vaikunthapurramuloo',
  'Guntur Kaaram',
  'Hi Nanna Songs',
  'Sita Ramam Telugu',
  'Geetha Govindam',
  'Waltair Veerayya',
  'Saripodhaa Sanivaaram',
  'Lucky Baskhar Telugu',
  'Rangasthalam',
  'Magadheera Songs',
  'Baahubali 2 Telugu',
  'Orange Telugu Songs',
  'Attarintiki Daredi',
  'Arya 2 Telugu',
  'Kushi Pawan Kalyan',
  'Pokiri Songs'
];

const INDUSTRIES = [
  { id: 'all', title: '🌐 All India (Pan-India)', desc: 'Mega chartbusters across Bollywood, Tollywood, Kollywood & Sandalwood' },
  { id: 'hindi', title: '👑 Bollywood (Hindi)', desc: 'Stree 2, Animal, Jawan, Arijit Singh, Pritam' },
  { id: 'tamil', title: '⚡ Kollywood (Tamil)', desc: 'Leo, Jailer, Vikram, Anirudh, AR Rahman' },
  { id: 'telugu', title: '🦁 Tollywood (Telugu)', desc: 'Pushpa 2, Devara, RRR, Kalki 2898 AD, Guntur Kaaram' },
  { id: 'kannada', title: '🌲 Sandalwood (Kannada)', desc: 'KGF 1 & 2, Kantara, Salaar, Ravi Basrur, Sanjith Hegde' },
  { id: 'malayalam', title: '🌊 Mollywood (Malayalam)', desc: 'Aavesham, Manjummel Boys, Premalu, Sushin Shyam' },
  { id: 'punjabi', title: '🚀 Punjabi & Pop Hits', desc: 'Diljit Dosanjh, Karan Aujla, AP Dhillon' }
];

const INDUSTRY_QUERIES = {
  all: [
    'Pushpa 2 The Rule', 'Aayi Nai Stree 2', 'Badass Leo Tamil', 'Singara Siriye Kantara',
    'Devara Telugu', 'Tauba Tauba Bad Newz', 'Illuminati Aavesham', 'KGF 2 Toofan Kannada',
    'Hukum Jailer Tamil', 'Animal Hindi Songs', 'Kalki 2898 AD', 'Lover Diljit Dosanjh',
    'Suttamla Soosi Gangs Of Godavari', 'Chaleya Jawan Hindi', 'Naa Ready Leo Tamil',
    'Dwapara Krishnam Pranaya Sakhi', 'Armadham Aavesham', 'Winning Speech Karan Aujla'
  ],
  telugu: [
    'Pushpa 2 The Rule', 'Devara Telugu Songs', 'Kalki 2898 AD Telugu', 'Guntur Kaaram Telugu',
    'Saripodhaa Sanivaaram Telugu', 'Lucky Baskhar Telugu', 'Tillu Square Telugu', 'HanuMan Telugu',
    'Hi Nanna Telugu Songs', 'Salaar Telugu Songs', 'RRR Telugu Songs', 'Ala Vaikunthapurramuloo Telugu',
    'Sita Ramam Telugu Songs', 'Rangasthalam Telugu', 'Geetha Govindam Songs', 'Waltair Veerayya Telugu',
    'Sarkaru Raa Daaku Maharaaj', 'Samajavaragamana', 'Butta Bomma Telugu', 'Inkem Inkem Inkem Kaavaale',
    'Kushi Pawan Kalyan', 'Arya 2 Telugu Songs', 'Orange Telugu Songs', 'Athadu Telugu Songs'
  ],
  hindi: [
    'Stree 2 Songs', 'Animal Songs Hindi', 'Jawan Hindi Songs', 'Pathaan Songs',
    'Bad Newz Hindi Songs', 'Dunki Hindi Songs', 'Brahmastra Kesariya', 'Kabir Singh Songs',
    'Bhool Bhulaiyaa 3 Songs', 'Fighter Hindi Songs', 'Rocky Aur Rani Songs', 'Arijit Singh Romantic Hits',
    'Pritam Hindi Hits', 'Chaleya Jawan', 'Apna Bana Le Hindi', 'O Maahi Dunki', 'Heeriye Arijit Singh',
    'Pehle Bhi Main Animal', 'Tere Hawaale Laal Singh', 'Kesariya Brahmastra'
  ],
  tamil: [
    'Leo Tamil Songs', 'Jailer Tamil Songs', 'The Greatest Of All Time Tamil', 'Amaran Tamil Songs',
    'Vikram Tamil Songs', 'Master Tamil Songs', 'Ponniyin Selvan Tamil Songs', 'Vettaiyan Tamil Songs',
    'Raayan Tamil Songs', 'Captain Miller Tamil Songs', 'Katchi Sera Tamil', 'Aasa Kooda Tamil',
    'Anirudh Tamil Hits', 'AR Rahman Tamil Hits', 'Kaavaalaa Jailer', 'Hukum Jailer', 'Naa Ready Leo',
    'Dheema Love Insurance Kompany', 'Coolie Disco Tamil'
  ],
  kannada: [
    'KGF Chapter 2 Kannada', 'Kantara Songs Kannada', 'Martin Kannada Songs', 'Bagheera Kannada Songs',
    '777 Charlie Kannada', 'Vikrant Rona Kannada', 'Roberrt Kannada Songs', 'Krishnam Pranaya Sakhi',
    'Yuva Kannada Songs', 'Ravi Basrur Kannada', 'Sanjith Hegde Kannada Hits', 'Dwapara Kannada',
    'Singara Siriye Kantara', 'Toofan KGF 2', 'Sulthana KGF 2', 'Tagaru Kannada Hits'
  ],
  malayalam: [
    'Aavesham Malayalam Songs', 'Manjummel Boys Malayalam', 'Premalu Malayalam Songs', 'ARM Malayalam Songs',
    'RDX Malayalam Songs', 'Bramayugam Malayalam', 'Turbo Malayalam Songs', 'Romancham Malayalam Songs',
    'Hridayam Malayalam Songs', 'Sushin Shyam Malayalam Hits', 'Hesham Abdul Wahab Malayalam',
    'Illuminati Aavesham', 'Armadham Aavesham', 'Kuthanthram Manjummel Boys', 'Nee Singam Dhaane'
  ],
  punjabi: [
    'Tauba Tauba Karan Aujla', 'Winning Speech Karan Aujla', 'Diljit Dosanjh Hits', 'AP Dhillon Hits',
    'Shubh Punjabi Songs', 'Sidhu Moose Wala Hits', 'Suniyan Suniyan Punjabi', 'Lover Diljit Dosanjh',
    'Softly Karan Aujla', 'With You AP Dhillon', 'Excuses AP Dhillon', 'Hass Hass Diljit Dosanjh',
    'Naina Diljit Dosanjh', 'Born to Shine Diljit', '52 Bars Karan Aujla'
  ]
};

const cachedTrendingByIndustry = {};
const lastTrendingFetchByIndustry = {};

async function getTrendingSongs(industry = 'all') {
  const indKey = INDUSTRY_QUERIES[industry] ? industry : 'all';
  const now = Date.now();
  if (cachedTrendingByIndustry[indKey] && now - (lastTrendingFetchByIndustry[indKey] || 0) < 1000 * 60 * 30) {
    return cachedTrendingByIndustry[indKey];
  }

  const rawList = [];
  const targetQueries = INDUSTRY_QUERIES[indKey] || INDUSTRY_QUERIES.all;
  
  for (const q of targetQueries) {
    const data = await fetchSaavn(`__call=search.getResults&p=1&n=6&q=${encodeURIComponent(q)}`);
    if (data && data.results) {
      for (const item of data.results) {
        const formatted = formatSong(item);
        if (!formatted || !formatted.audio_320) continue;

        // Strict language check if a specific regional industry is requested
        if (indKey !== 'all') {
          const sLang = (formatted.language || '').toLowerCase();
          if (sLang && !sLang.includes(indKey)) {
            continue;
          }
        }
        rawList.push(formatted);
      }
    }
  }

  // Deduplicate strictly by ID and clean title key
  const results = dedupeSongs(rawList);

  if (results.length > 0) {
    cachedTrendingByIndustry[indKey] = results;
    lastTrendingFetchByIndustry[indKey] = now;
  }
  return cachedTrendingByIndustry[indKey] || [];
}

// Pre-fill categories, moods, and singer collections
const MOODS = [
  { id: 'melody', title: '💖 Melody Magic', desc: 'Soulful & calming melodies across languages', icon: '💖', queries: ['Telugu Melody Hits', 'Arijit Singh Melodies', 'Anirudh Melodies Tamil', 'Singara Siriye'] },
  { id: 'energetic', title: '⚡ High Energy & Mass', desc: 'High-voltage dance & party anthems', icon: '⚡', queries: ['Telugu Mass Songs', 'Aayi Nai Stree 2', 'Naa Ready Leo', 'Tauba Tauba', 'Kurchi Madathapetti'] },
  { id: 'anger', title: '🔥 Anger & Fierce Action', desc: 'Roaring action, fury & intense hero themes', icon: '🔥', queries: ['Fear Song Telugu', 'Animal Arjan Vailly', 'Hukum Jailer', 'KGF 2 Toofan', 'Akhanda'] },
  { id: 'gym', title: '💪 Gym & Workout Pump', desc: 'Adrenaline pumping workout & heavy bass motivation', icon: '💪', queries: ['Telugu Workout Songs', 'Beast Mode Anirudh', 'Sultan KGF', 'Zinda Bhaag Milkha', 'Baahubali Dheevara'] },
  { id: 'motivation', title: '🎯 Motivation & Rise', desc: 'Inspirational anthems to conquer all odds', icon: '🎯', queries: ['Kar Har Maidaan Fateh', 'Chalore Chalore Chal', 'Aaluma Doluma', 'Srimanthudu Jaago', 'Believer'] },
  { id: 'love', title: '🌹 Love & Romance', desc: 'Magical love duets and sweet romantic tunes', icon: '🌹', queries: ['Kesariya Brahmastra', 'Chuttamalle Devara', 'Chaleya Jawan', 'Anbenum Leo', 'Pehle Bhi Main'] },
  { id: 'breakup', title: '💔 Breakup & Pain', desc: 'Heart-touching melancholy & emotional depth', icon: '💔', queries: ['Channa Mereya', 'Telugu Breakup Songs', 'My Love Is Gone', 'Agar Tum Saath Ho', 'Kanave Kanave'] }
];

const SINGERS = [
  // Bollywood & Pan-India
  { id: 'arijit', name: 'Arijit Singh', title: '👑 Arijit Singh Anthems', role: 'King of Soul', desc: 'Kesariya, Channa Mereya, Chaleya, Heeriye', queries: ['Arijit Singh Hits', 'Arijit Singh Romantic Songs', 'Chaleya Jawan'] },
  { id: 'pritam', name: 'Pritam', title: '🎸 Pritam Musical Magic', role: 'Bollywood Hit Machine', desc: 'Brahmastra, Yeh Jawaani Hai Deewani, Ae Dil Hai Mushkil', queries: ['Pritam Hindi Hits', 'Pritam Blockbusters'] },
  { id: 'ar_rahman', name: 'A. R. Rahman', title: '🏆 A. R. Rahman Epics', role: 'The Mozart of Madras', desc: 'Roja, Rockstar, Ponniyin Selvan, Dil Se', queries: ['AR Rahman Hits', 'AR Rahman Tamil Hits', 'AR Rahman Hindi Hits'] },
  { id: 'shreya', name: 'Shreya Ghoshal', title: '🌸 Shreya Ghoshal', role: 'Queen of Melody', desc: 'Ami Je Tomar, Sooseki, Deewani Mastani, Ghal Ghal', queries: ['Shreya Ghoshal Hits', 'Shreya Ghoshal Hindi', 'Shreya Ghoshal Telugu'] },
  { id: 'diljit', name: 'Diljit Dosanjh', title: '🔥 Diljit Dosanjh Vibe', role: 'Global Icon', desc: 'Lover, Born to Shine, Naina (Crew), Hass Hass', queries: ['Diljit Dosanjh Hits', 'Lover Diljit Dosanjh', 'Naina Crew'] },
  { id: 'karan_aujla', name: 'Karan Aujla', title: '🚀 Karan Aujla Fire', role: 'Pop & Rap Sensation', desc: 'Tauba Tauba, Softly, Winning Speech', queries: ['Tauba Tauba Karan Aujla', 'Karan Aujla Hits'] },
  
  // Kollywood
  { id: 'anirudh', name: 'Anirudh Ravichander', title: '🎧 Anirudh Rockstar', role: 'Pan-Indian Phenomenon', desc: 'Leo, Jailer, Devara, Vikram, Master, Jawan', queries: ['Anirudh Tamil Hits', 'Devara Telugu Anirudh', 'Leo Badass', 'Hukum Jailer'] },
  { id: 'yuvan', name: 'Yuvan Shankar Raja', title: '⚡ Yuvan Drugs', role: 'Youth Icon', desc: 'Mankatha, Paiyaa, GOAT, Pudhupettai', queries: ['Yuvan Shankar Raja Hits', 'Yuvan Shankar Raja Tamil'] },

  // Sandalwood
  { id: 'ravi_basrur', name: 'Ravi Basrur', title: '🌲 Ravi Basrur Roar', role: 'Sandalwood Kingpin', desc: 'KGF Chapter 1 & 2, Salaar, Kabzaa', queries: ['Ravi Basrur KGF', 'KGF Toofan', 'Salaar Ravi Basrur'] },
  { id: 'sanjith_hegde', name: 'Sanjith Hegde', title: '✨ Sanjith Hegde Melodies', role: 'Sensational Voice', desc: 'Kannada, Tamil & Telugu hit songs', queries: ['Sanjith Hegde Hits', 'Sanjith Hegde Kannada'] },

  // Mollywood
  { id: 'sushin_shyam', name: 'Sushin Shyam', title: '🌊 Sushin Shyam Wave', role: 'Mollywood Trailblazer', desc: 'Aavesham (Illuminati), Manjummel Boys, Romancham', queries: ['Sushin Shyam Hits', 'Aavesham Illuminati', 'Manjummel Boys'] },

  // Tollywood
  { id: 'thaman', name: 'Thaman S', title: '👑 Thaman Musical Storm', role: 'Chartbuster Maestro', desc: 'Ala Vaikunthapurramuloo, Guntur Kaaram, Akhanda', queries: ['Thaman Telugu Songs', 'Thaman S Hits', 'Ala Vaikunthapurramuloo'] },
  { id: 'dsp', name: 'Devi Sri Prasad (DSP)', title: '⚡ Rockstar DSP', role: 'High Energy King', desc: 'Pushpa 2, Waltair Veerayya, Arya 2, Rangasthalam', queries: ['Devi Sri Prasad Telugu Hits', 'Pushpa 2 Telugu', 'Waltair Veerayya'] },
  { id: 'sid_sriram', name: 'Sid Sriram', title: '🎤 Sid Sriram Melodies', role: 'Soulful Vocalist', desc: 'Inkem Inkem, Samajavaragamana, Srivalli, Kadhaippoma', queries: ['Sid Sriram Hits', 'Inkem Inkem', 'Samajavaragamana'] },
  { id: 'sai_abhyankkar', name: 'Sai Abhyankkar', title: '✨ Sai Abhyankkar Hits', role: 'Viral Sensation', desc: 'Katchi Sera, Aasa Kooda & indie pop hits', queries: ['Sai Abhyankkar', 'Katchi Sera', 'Aasa Kooda'] },
  { id: 'spb', name: 'S. P. Balasubrahmanyam', title: '🎙️ SPB Immortal Hits', role: 'Legendary Maestro', desc: 'Timeless classics across all Indian languages', queries: ['SP Balasubrahmanyam Golden Hits', 'SPB Evergreen Hits'] }
];

const STAR_HEROES = [
  { id: 'srk', name: 'Shah Rukh Khan', role: 'King Khan Collection (Bollywood)', query: 'Shah Rukh Khan Hit Songs Jawan Pathaan' },
  { id: 'salman', name: 'Salman Khan', role: 'Bhaijaan Collection (Bollywood)', query: 'Salman Khan Hit Songs Tiger' },
  { id: 'vijay', name: 'Thalapathy Vijay', role: 'Thalapathy Collection (Kollywood)', query: 'Thalapathy Vijay Hit Songs Leo Master' },
  { id: 'rajinikanth', name: 'Superstar Rajinikanth', role: 'Thalaivar Collection (Kollywood)', query: 'Rajinikanth Hit Songs Jailer' },
  { id: 'yash', name: 'Rocking Star Yash', role: 'Rocky Bhai Collection (Sandalwood)', query: 'Yash KGF Hit Songs' },
  { id: 'rishab_shetty', name: 'Rishab Shetty', role: 'Kantara Collection (Sandalwood)', query: 'Kantara Songs Kannada' },
  { id: 'fahadh_faasil', name: 'Fahadh Faasil', role: 'FaFa Anthems (Mollywood)', query: 'Aavesham Fahadh Faasil Songs' },
  { id: 'allu_arjun', name: 'Allu Arjun', role: 'Icon Star Collection (Tollywood)', query: 'Allu Arjun Hit Songs Pushpa' },
  { id: 'prabhas', name: 'Prabhas', role: 'Rebel Star Collection (Pan-India)', query: 'Prabhas Telugu Hits Kalki Baahubali Salaar' },
  { id: 'mahesh_babu', name: 'Mahesh Babu', role: 'Superstar Collection (Tollywood)', query: 'Mahesh Babu Hit Songs Guntur Kaaram' },
  { id: 'jr_ntr', name: 'Jr. NTR', role: 'Man of Masses Collection (Tollywood)', query: 'Jr NTR Telugu Hits Devara RRR' },
  { id: 'ram_charan', name: 'Ram Charan', role: 'Mega Powerstar Collection (Tollywood)', query: 'Ram Charan Hit Songs RRR Game Changer' }
];

const ALL_CATEGORIES = [
  ...MOODS,
  ...INDUSTRIES.map(ind => ({ id: `ind_${ind.id}`, title: ind.title, desc: ind.desc, queries: INDUSTRY_QUERIES[ind.id] || INDUSTRY_QUERIES.all })),
  ...SINGERS.map(s => ({ id: s.id, title: s.title, desc: s.desc, queries: s.queries })),
  { id: 'trending', title: '🔥 Pan-India Trending', desc: 'Hottest songs across India right now', queries: INDUSTRY_QUERIES.all },
  { id: 'telugu_hits', title: '🦁 Tollywood Chartbusters (Telugu)', desc: 'Top Telugu movie soundtracks', queries: INDUSTRY_QUERIES.telugu },
  { id: 'bollywood_hits', title: '👑 Bollywood Blockbusters (Hindi)', desc: 'Top Hindi movie soundtracks', queries: INDUSTRY_QUERIES.hindi },
  { id: 'kollywood_hits', title: '⚡ Kollywood Explosions (Tamil)', desc: 'Top Tamil movie soundtracks', queries: INDUSTRY_QUERIES.tamil },
  { id: 'sandalwood_hits', title: '🌲 Sandalwood Fire (Kannada)', desc: 'KGF, Kantara & Kannada hits', queries: INDUSTRY_QUERIES.kannada },
  { id: 'mollywood_hits', title: '🌊 Mollywood Vibes (Malayalam)', desc: 'Aavesham, Manjummel Boys & Malayalam magic', queries: INDUSTRY_QUERIES.malayalam },
  { id: 'punjabi_hits', title: '🚀 Punjabi Pop & Beats', desc: 'Diljit, Karan Aujla & Punjabi fire', queries: INDUSTRY_QUERIES.punjabi }
];

const CATEGORIES = ALL_CATEGORIES;
const ARTISTS = [...SINGERS, ...STAR_HEROES];

// --- User Accounts & Privacy Data Store ---
const ACCOUNTS_FILE = path.join(__dirname, 'data', 'accounts.json');

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      let raw = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
      if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
      }
      raw = raw.trim();
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error loading accounts:', err.message);
  }
  return [];
}

function saveAccounts(accounts) {
  try {
    const dir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving accounts:', err.message);
    return false;
  }
}

// Helper to parse JSON body for POST requests
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

// --- HTTP Request Handler ---

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Routes ---
  
  // 0. Privacy Accounts & Multi-User Profiles API
  if (pathname === '/api/accounts' && req.method === 'GET') {
    const accounts = loadAccounts();
    const list = accounts.map(a => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar || '🎧',
      hasPin: !!(a.pin && String(a.pin).trim()),
      theme: a.theme || 'amoled',
      likedCount: (a.likedSongs || []).length,
      playlistCount: (a.customPlaylists || []).length,
      historyCount: (a.history || []).length,
      createdAt: a.createdAt,
      lastActive: a.lastActive
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, accounts: list }));
    return;
  }

  if (pathname === '/api/accounts/create' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.name || !body.name.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account name is required' }));
      return;
    }
    const accounts = loadAccounts();
    const cleanName = body.name.trim().slice(0, 30);
    const pin = body.pin ? String(body.pin).trim() : null;
    const newAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      avatar: body.avatar || '🎧',
      pin: pin,
      theme: body.theme || 'amoled',
      likedSongs: Array.isArray(body.likedSongs) ? body.likedSongs : [],
      customPlaylists: Array.isArray(body.customPlaylists) ? body.customPlaylists : [],
      history: Array.isArray(body.history) ? body.history.slice(0, 20) : [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    accounts.push(newAccount);
    saveAccounts(accounts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      account: {
        id: newAccount.id,
        name: newAccount.name,
        avatar: newAccount.avatar,
        hasPin: !!newAccount.pin,
        theme: newAccount.theme,
        likedSongs: newAccount.likedSongs,
        customPlaylists: newAccount.customPlaylists,
        history: newAccount.history
      }
    }));
    return;
  }

  if (pathname === '/api/accounts/unlock' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account ID required' }));
      return;
    }
    const accounts = loadAccounts();
    const account = accounts.find(a => a.id === body.id);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account not found' }));
      return;
    }
    if (account.pin && String(account.pin).trim()) {
      if (String(body.pin || '').trim() !== String(account.pin).trim()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Incorrect PIN. Access denied.' }));
        return;
      }
    }
    account.lastActive = Date.now();
    saveAccounts(accounts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        avatar: account.avatar || '🎧',
        hasPin: !!(account.pin && String(account.pin).trim()),
        theme: account.theme || 'amoled',
        likedSongs: account.likedSongs || [],
        customPlaylists: account.customPlaylists || [],
        history: account.history || []
      }
    }));
    return;
  }

  if (pathname === '/api/accounts/sync' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account ID required' }));
      return;
    }
    const accounts = loadAccounts();
    const account = accounts.find(a => a.id === body.id);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account not found' }));
      return;
    }
    if (account.pin && String(account.pin).trim()) {
      if (String(body.pin || '').trim() !== String(account.pin).trim()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid PIN' }));
        return;
      }
    }
    if (Array.isArray(body.likedSongs)) account.likedSongs = body.likedSongs;
    if (Array.isArray(body.customPlaylists)) account.customPlaylists = body.customPlaylists;
    if (Array.isArray(body.history)) account.history = body.history.slice(0, 20);
    if (body.theme) account.theme = body.theme;
    if (body.name) account.name = String(body.name).trim().slice(0, 30);
    if (body.avatar) account.avatar = body.avatar;
    account.lastActive = Date.now();
    saveAccounts(accounts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/accounts/change-pin' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account ID required' }));
      return;
    }
    const accounts = loadAccounts();
    const account = accounts.find(a => a.id === body.id);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account not found' }));
      return;
    }
    if (account.pin && String(account.pin).trim()) {
      if (String(body.currentPin || '').trim() !== String(account.pin).trim()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Current PIN is incorrect.' }));
        return;
      }
    }
    const newPin = body.newPin ? String(body.newPin).trim() : null;
    account.pin = newPin;
    saveAccounts(accounts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, hasPin: !!newPin }));
    return;
  }

  if (pathname === '/api/accounts/delete' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body || !body.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account ID required' }));
      return;
    }
    let accounts = loadAccounts();
    const account = accounts.find(a => a.id === body.id);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Account not found' }));
      return;
    }
    if (account.pin && String(account.pin).trim()) {
      if (String(body.pin || '').trim() !== String(account.pin).trim()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'PIN incorrect. Cannot delete account.' }));
        return;
      }
    }
    accounts = accounts.filter(a => a.id !== body.id);
    saveAccounts(accounts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 1. Trending Pan-Indian & Industry songs
  if (pathname === '/api/trending') {
    const industry = parsedUrl.query.industry || parsedUrl.query.lang || 'all';
    const songs = await getTrendingSongs(industry);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, industry, count: songs.length, songs }));
    return;
  }

  // 2. Search songs & albums across all Indian languages
  if (pathname === '/api/search') {
    const query = parsedUrl.query.q || '';
    if (!query.trim()) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, songs: [], albums: [] }));
      return;
    }

    const lang = (parsedUrl.query.lang || '').toLowerCase().trim();
    let searchQuery = query.trim();
    if (lang && lang !== 'all' && !searchQuery.toLowerCase().includes(lang)) {
      searchQuery = `${searchQuery} ${lang}`;
    }

    const data = await fetchSaavn(`__call=search.getResults&p=1&n=40&q=${encodeURIComponent(searchQuery)}`);
    let rawSongs = (data?.results || []).map(formatSong).filter(s => s && s.audio_320);
    if (lang && lang !== 'all') {
      rawSongs = rawSongs.filter(s => {
        const sl = (s.language || '').toLowerCase();
        return !sl || sl.includes(lang);
      });
    }
    const songs = dedupeSongs(rawSongs);

    // Also fetch albums
    const albumData = await fetchSaavn(`__call=search.getAlbumResults&p=1&n=10&q=${encodeURIComponent(searchQuery)}`);
    const albums = (albumData?.results || []).map(a => ({
      id: a.id,
      title: unescapeHtml(a.title || a.name),
      subtitle: unescapeHtml(a.subtitle || a.artist || 'Indian Cinema'),
      image: (a.image || '').replace('150x150.jpg', '500x500.jpg'),
      year: a.year || '2024',
      song_count: a.more_info?.song_count || 0
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, query: searchQuery, songs, albums }));
    return;
  }

  // 3. YouTube live search
  if (pathname === '/api/youtube/search') {
    const query = parsedUrl.query.q || 'pan india hit songs 2024';
    const videos = await searchYouTube(query);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: videos.length, videos }));
    return;
  }

  // 4. Categories list
  if (pathname === '/api/categories') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      industries: INDUSTRIES,
      categories: ALL_CATEGORIES,
      moods: MOODS,
      singers: SINGERS,
      heroes: STAR_HEROES 
    }));
    return;
  }

  // 5. Category playlist details
  if (pathname === '/api/category') {
    const catId = parsedUrl.query.id;
    const cat = ALL_CATEGORIES.find(c => c.id === catId);
    if (!cat) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Category not found' }));
      return;
    }

    let targetLang = null;
    if (catId.startsWith('ind_')) {
      targetLang = catId.replace('ind_', '');
    } else if (catId === 'telugu_hits') {
      targetLang = 'telugu';
    } else if (catId === 'bollywood_hits') {
      targetLang = 'hindi';
    } else if (catId === 'kollywood_hits') {
      targetLang = 'tamil';
    } else if (catId === 'sandalwood_hits') {
      targetLang = 'kannada';
    } else if (catId === 'mollywood_hits') {
      targetLang = 'malayalam';
    } else if (catId === 'punjabi_hits') {
      targetLang = 'punjabi';
    }

    const queries = cat.queries || [cat.query];
    const rawSongs = [];
    for (const q of queries) {
      const data = await fetchSaavn(`__call=search.getResults&p=1&n=12&q=${encodeURIComponent(q)}`);
      if (data?.results) {
        for (const item of data.results) {
          const formatted = formatSong(item);
          if (!formatted || !formatted.audio_320) continue;
          if (targetLang && targetLang !== 'all') {
            const sLang = (formatted.language || '').toLowerCase();
            if (sLang && !sLang.includes(targetLang)) continue;
          }
          rawSongs.push(formatted);
        }
      }
      if (rawSongs.length >= 45) break;
    }

    const songs = dedupeSongs(rawSongs).slice(0, 35);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, category: cat, songs }));
    return;
  }

  // 6. Artists list
  if (pathname === '/api/artists') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, artists: ARTISTS }));
    return;
  }

  // 7. Artist / Hero songs
  if (pathname === '/api/artist') {
    const artistId = parsedUrl.query.id;
    const artist = ARTISTS.find(a => a.id === artistId);
    if (!artist) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Artist not found' }));
      return;
    }
    const data = await fetchSaavn(`__call=search.getResults&p=1&n=30&q=${encodeURIComponent(artist.query)}`);
    const songs = (data?.results || []).map(formatSong).filter(s => s && s.audio_320);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, artist, songs }));
    return;
  }

  // 8. Album details
  if (pathname === '/api/album') {
    const albumId = parsedUrl.query.id;
    if (!albumId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing album id' }));
      return;
    }
    const data = await fetchSaavn(`__call=content.getAlbumDetails&albumid=${albumId}`);
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Album not found' }));
      return;
    }
    const songs = (data.list || []).map(formatSong).filter(s => s && s.audio_320);
    const album = {
      id: data.id,
      title: unescapeHtml(data.title || data.name),
      subtitle: unescapeHtml(data.subtitle || data.primary_artists || 'Tollywood'),
      image: (data.image || '').replace('150x150.jpg', '500x500.jpg'),
      year: data.year || '2024',
      songs
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, album }));
    return;
  }

  // 9. Lyrics endpoint
  if (pathname === '/api/lyrics') {
    const songId = parsedUrl.query.id;
    if (!songId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing song id' }));
      return;
    }
    const data = await fetchSaavn(`__call=lyrics.getLyrics&lyrics_id=${songId}`);
    if (data && data.lyrics) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, lyrics: data.lyrics }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, lyrics: null, message: 'Lyrics not available for this track' }));
    }
    return;
  }

  // 10. Audio streaming proxy with Range support
  if (pathname === '/api/stream') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400);
      res.end('Missing url');
      return;
    }

    try {
      const headers = {};
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const audioReq = https.get(targetUrl, { headers }, (audioRes) => {
        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': audioRes.headers['content-type'] || 'audio/mp4',
          'Accept-Ranges': 'bytes'
        };

        if (audioRes.headers['content-length']) {
          responseHeaders['Content-Length'] = audioRes.headers['content-length'];
        }
        if (audioRes.headers['content-range']) {
          responseHeaders['Content-Range'] = audioRes.headers['content-range'];
        }

        res.writeHead(audioRes.statusCode, responseHeaders);
        audioRes.pipe(res);
      });

      audioReq.on('error', (err) => {
        console.error('Audio stream proxy error:', err.message);
        if (!res.headersSent) res.writeHead(502);
        res.end();
      });
    } catch (err) {
      console.error('Audio request error:', err.message);
      res.writeHead(500);
      res.end();
    }
    return;
  }

  // 11. Direct audio file download endpoint
  if (pathname === '/api/download') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400);
      res.end('Missing url');
      return;
    }

    const title = (parsedUrl.query.title || 'song').replace(/[\\/:*?"<>|]/g, '').trim();
    const movie = (parsedUrl.query.movie || '').replace(/[\\/:*?"<>|]/g, '').trim();
    const filename = movie ? `${title} - ${movie}.m4a` : `${title}.m4a`;

    try {
      const audioReq = https.get(targetUrl, (audioRes) => {
        if (audioRes.statusCode >= 400) {
          res.writeHead(audioRes.statusCode);
          res.end('Failed to download audio file');
          return;
        }

        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'audio/mp4',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        };

        if (audioRes.headers['content-length']) {
          responseHeaders['Content-Length'] = audioRes.headers['content-length'];
        }

        res.writeHead(200, responseHeaders);
        audioRes.pipe(res);
      });

      audioReq.on('error', (err) => {
        console.error('Audio download error:', err.message);
        if (!res.headersSent) res.writeHead(502);
        res.end();
      });
    } catch (err) {
      console.error('Audio download request error:', err.message);
      res.writeHead(500);
      res.end();
    }
    return;
  }

  // --- Static File Serving ---

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Security check to avoid path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.mp4': 'audio/mp4'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (ext === '.html' || ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

// Warm up trending cache
getTrendingSongs().catch(err => console.error('Cache warm up error:', err.message));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use by another instance of Swaram.`);
    console.log(`🌐 If Swaram is already running, open http://localhost:${PORT} in your browser.`);
    console.log(`💡 Or close the other terminal window and run run.bat again.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎵 Retro Music Player - Tollywood Edition`);
  console.log(`🚀 Running at: http://localhost:${PORT}`);
  console.log(`🎧 Audio Engine: 320 kbps High-Fidelity Streaming`);
  console.log(`📺 Video Engine: Official YouTube Integration`);
  console.log(`=======================================================`);
});
