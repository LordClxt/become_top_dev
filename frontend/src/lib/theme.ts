const KEY = 'btd-theme'

/** Script inline exécuté avant le rendu pour éviter un flash de thème. */
export const themeInitScript = `try{if(localStorage.getItem('${KEY}')==='light')document.documentElement.classList.add('light')}catch(e){}`

export function toggleTheme(): 'light' | 'dark' {
  const light = document.documentElement.classList.toggle('light')
  try {
    localStorage.setItem(KEY, light ? 'light' : 'dark')
  } catch {
    // stockage indisponible : le thème reste valable pour la session
  }
  return light ? 'light' : 'dark'
}
