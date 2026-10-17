import { eq, run, test } from './spec.ts';
import { getTooltip, login, logout, setTooltip, tooltipCount, whoAmI } from './session.ts';

test('session globale', () => {
  eq(whoAmI(), 'anonyme', 'avant connexion');
  login({ name: 'Ada' });
  eq(whoAmI(), 'Ada', 'connectée');
  logout();
  eq(whoAmI(), 'anonyme', 'après déconnexion');
});

test('infobulles sans monkey patching', () => {
  const button = { id: 'send' };
  const link = { id: 'help' };
  setTooltip(button, 'Envoyer');
  eq(getTooltip(button), 'Envoyer', 'getTooltip');
  eq(getTooltip(link), undefined, 'sans infobulle');
  eq(Object.keys(button), ['id'], "l'objet n'est pas modifié");
  eq(Object.getOwnPropertyNames(button), ['id'], 'aucune propriété cachée');
  eq(tooltipCount([button, link, {}]), 1, 'tooltipCount');
});

await run();
