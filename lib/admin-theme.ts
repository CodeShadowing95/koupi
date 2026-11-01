// Clé et script de démarrage du thème clair / sombre du back-office (voir components/admin-theme.tsx).
export const ADMIN_THEME_KEY = 'koupi-admin-theme';

// Lancé avant l'affichage : applique le choix enregistré sans flash de la mauvaise couleur.
export const themeBootScript = `try{var t=localStorage.getItem('${ADMIN_THEME_KEY}');if(t==='light'||t==='dark')document.currentScript.parentElement.setAttribute('data-theme',t)}catch(e){}`;
