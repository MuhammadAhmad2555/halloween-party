/* Shared Halloween customer helpers (email authorization + Firestore).
   Used by dashboard/ and the invitation site. No secrets here.
   Access is granted only when the email exists in authorizedEmails. */
(function (global) {
  const SESSION_EMAIL_KEY = 'hp_auth_email';
  const PUBLIC_ID_KEY = 'hp_publicId';
  const HOST_STUDIO_KEY = 'hp_host_studio';

  function ensureApp() {
    if (!global.firebase || !global.FIREBASE_CONFIG) {
      throw new Error('Firebase SDK or firebase-config.js is missing.');
    }
    if (!global.firebase.apps.length) {
      global.firebase.initializeApp(global.FIREBASE_CONFIG);
    }
    return { db: global.firebase.firestore() };
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function newPublicId() {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += (b % 36).toString(36);
    return s;
  }

  function toWhatsappDigits(phoneShown) {
    let d = String(phoneShown || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    return d;
  }

  function validatePhone(phoneShown) {
    const raw = String(phoneShown || '').trim();
    if (raw.length < 7 || raw.length > 32) return 'Enter a phone number between 7 and 32 characters.';
    if (!/^[+0-9() .\-]+$/.test(raw)) return 'Phone number may only contain digits, spaces, +, (), and dashes.';
    const digits = toWhatsappDigits(raw);
    if (digits.length < 8 || digits.length > 16) return 'Include country code so WhatsApp RSVP links work (e.g. +44 7700 900123).';
    if (!/^[1-9][0-9]+$/.test(digits)) return 'Phone number looks invalid after removing formatting.';
    return '';
  }

  function validateLocationName(name) {
    const v = String(name || '').trim();
    if (v.length < 2 || v.length > 80) return 'Location name must be between 2 and 80 characters.';
    return '';
  }

  function validateMapsLocation(maps) {
    const v = String(maps || '').trim();
    if (v.length < 3 || v.length > 500) return 'Maps location must be between 3 and 500 characters.';
    return '';
  }

  function validateTimeText(timeText) {
    const v = String(timeText || '').trim();
    if (v.length < 3 || v.length > 80) return 'Party time must be between 3 and 80 characters.';
    return '';
  }

  function validateCustomerFields({ phoneShown, locationName, mapsLocation, timeText }) {
    return validatePhone(phoneShown)
      || validateLocationName(locationName)
      || validateMapsLocation(mapsLocation)
      || validateTimeText(timeText)
      || '';
  }

  function isMapsUrl(value) {
    try {
      const u = new URL(String(value || '').trim());
      return /^https?:$/i.test(u.protocol);
    } catch (e) {
      return false;
    }
  }

  function mapsHref(mapsLocation) {
    const v = String(mapsLocation || '').trim();
    if (!v) return 'https://www.google.com/maps';
    if (isMapsUrl(v)) return v;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(v);
  }

  function addressFromMaps(mapsLocation) {
    const v = String(mapsLocation || '').trim();
    if (!v || isMapsUrl(v)) return '';
    return v;
  }

  function applyInviteData(PARTY, data) {
    if (!PARTY || !data) return PARTY;
    if (data.phoneShown) {
      PARTY.phoneShown = data.phoneShown;
      PARTY.whatsapp = data.whatsapp || toWhatsappDigits(data.phoneShown);
    }
    if (data.locationName) PARTY.venue = data.locationName;
    if (data.timeText) PARTY.timeText = data.timeText;
    if (data.mapsLocation) {
      PARTY.mapsQuery = data.mapsLocation;
      // Replace the site default address ("13 Raven Lane") with the customer's
      // maps text, or clear it when they pasted a Maps URL.
      PARTY.address = addressFromMaps(data.mapsLocation);
    } else if (data.locationName) {
      PARTY.address = '';
    }
    return PARTY;
  }

  async function fetchPublicInvite(publicId) {
    const id = String(publicId || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{8,32}$/.test(id)) return null;
    const { db } = ensureApp();
    const snap = await db.collection('publicInvites').doc(id).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  async function applyPublicInvite(PARTY, publicId) {
    const data = await fetchPublicInvite(publicId);
    if (!data) return false;
    applyInviteData(PARTY, data);
    try { sessionStorage.setItem(PUBLIC_ID_KEY, publicId); } catch (e) {}
    return true;
  }

  async function isEmailAuthorized(email) {
    const key = normalizeEmail(email);
    if (!key || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return false;
    const { db } = ensureApp();
    const snap = await db.collection('authorizedEmails').doc(key).get();
    return snap.exists && snap.data().active === true;
  }

  function getSessionEmail() {
    try { return normalizeEmail(sessionStorage.getItem(SESSION_EMAIL_KEY) || ''); } catch (e) { return ''; }
  }

  function setSessionEmail(email) {
    try { sessionStorage.setItem(SESSION_EMAIL_KEY, normalizeEmail(email)); } catch (e) {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_EMAIL_KEY);
      sessionStorage.removeItem(HOST_STUDIO_KEY);
    } catch (e) {}
  }

  function markHostStudio() {
    try { sessionStorage.setItem(HOST_STUDIO_KEY, '1'); } catch (e) {}
  }

  function isHostStudioUnlock() {
    try {
      return sessionStorage.getItem(HOST_STUDIO_KEY) === '1'
        || !!normalizeEmail(sessionStorage.getItem(SESSION_EMAIL_KEY) || '');
    } catch (e) {
      return false;
    }
  }

  /** Email-only login: succeed only if Firestore authorizedEmails allows it. */
  async function signInWithEmail(email) {
    const key = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      throw new Error('Enter a valid email address.');
    }
    const ok = await isEmailAuthorized(key);
    if (!ok) {
      const err = new Error('Access denied. This email has not been authorized.');
      err.code = 'auth/unauthorized-email';
      throw err;
    }
    setSessionEmail(key);
    return { email: key };
  }

  function signOut() {
    clearSession();
    return Promise.resolve();
  }

  async function loadCustomer(email) {
    const key = normalizeEmail(email);
    if (!key) return null;
    const { db } = ensureApp();
    const snap = await db.collection('customers').doc(key).get();
    return snap.exists ? snap.data() : null;
  }

  async function saveCustomer(email, fields) {
    const key = normalizeEmail(email);
    const err = validateCustomerFields(fields);
    if (err) throw new Error(err);
    if (!(await isEmailAuthorized(key))) {
      throw new Error('This email is not authorized.');
    }

    const { db } = ensureApp();
    const ref = db.collection('customers').doc(key);
    const existing = await ref.get();
    const publicId = existing.exists && existing.data().publicId
      ? existing.data().publicId
      : newPublicId();

    const phoneShown = String(fields.phoneShown).trim();
    const locationName = String(fields.locationName).trim();
    const mapsLocation = String(fields.mapsLocation).trim();
    const timeText = String(fields.timeText).trim();
    const whatsapp = toWhatsappDigits(phoneShown);
    const updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    const customerDoc = {
      email: key,
      publicId,
      phoneShown,
      whatsapp,
      locationName,
      mapsLocation,
      timeText,
      updatedAt,
    };

    const publicDoc = {
      ownerEmail: key,
      phoneShown,
      whatsapp,
      locationName,
      mapsLocation,
      timeText,
      updatedAt,
    };

    await ref.set(customerDoc, { merge: false });
    await db.collection('publicInvites').doc(publicId).set(publicDoc, { merge: false });

    try { sessionStorage.setItem(PUBLIC_ID_KEY, publicId); } catch (e) {}
    return customerDoc;
  }

  function studioUrl(publicId) {
    const base = new URL('../', location.href);
    if (publicId) base.searchParams.set('c', publicId);
    return base.toString();
  }

  function rememberPublicId(publicId) {
    try { if (publicId) sessionStorage.setItem(PUBLIC_ID_KEY, publicId); } catch (e) {}
  }

  function readStoredPublicId() {
    try { return sessionStorage.getItem(PUBLIC_ID_KEY) || ''; } catch (e) { return ''; }
  }

  global.HalloweenCustomer = {
    ensureApp,
    normalizeEmail,
    newPublicId,
    toWhatsappDigits,
    validatePhone,
    validateLocationName,
    validateMapsLocation,
    validateTimeText,
    validateCustomerFields,
    isMapsUrl,
    mapsHref,
    addressFromMaps,
    applyInviteData,
    fetchPublicInvite,
    applyPublicInvite,
    isEmailAuthorized,
    getSessionEmail,
    signInWithEmail,
    signOut,
    loadCustomer,
    saveCustomer,
    studioUrl,
    rememberPublicId,
    readStoredPublicId,
    markHostStudio,
    isHostStudioUnlock,
    PUBLIC_ID_KEY,
    SESSION_EMAIL_KEY,
    HOST_STUDIO_KEY,
  };
})(window);
