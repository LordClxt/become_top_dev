package lab

// Tree est un B+tree dont les pages vivent sur un Disk, protégé par un journal (WAL) : chaque Put est d'abord écrit
// en entier dans le WAL, puis appliqué aux pages ; au redémarrage, Open rejoue le journal.
type Tree struct {
	d       *Disk
	maxKeys int
}

// Open ouvre l'arbre. Elle commence par la reprise sur crash : chaque batch du WAL est (ré)appliqué aux pages
// (WritePage par identifiant croissant, puis WriteRoot si Root != 0), dans l'ordre, puis le journal est effacé.
// Si le disque n'a pas encore d'arbre (Root() == 0), elle crée une racine feuille vide, journalisée comme n'importe
// quelle modification. maxKeys est ramené à 3 au minimum. Toute erreur du disque (ErrCrash) est renvoyée.
func Open(d *Disk, maxKeys int) (*Tree, error) {
	// TODO
	panic("à implémenter")
}

// Put insère ou remplace une clé. Toutes les pages modifiées (feuille, pages éclatées, parents, éventuelle nouvelle
// racine) forment UN batch qui est journalisé (AppendWAL) AVANT la moindre écriture de page ; puis les pages sont
// écrites, puis le journal est effacé (TruncateWAL). Renvoie l'erreur du disque (ErrCrash) si une écriture échoue :
// le journal contient alors le batch et Open le rejouera.
//
// Les pages ont au plus maxKeys clés : une feuille qui déborde éclate en deux moitiés (la plus petite clé de la moitié
// droite monte dans le parent), une page interne qui déborde éclate en faisant monter sa clé du milieu ; si la racine
// éclate, une nouvelle racine est créée (AllocPageID).
func (t *Tree) Put(key, value string) error {
	// TODO
	panic("à implémenter")
}

// Get cherche une clé en lisant les pages du disque, de la racine à une feuille. ErrCrash si le disque est en panne.
func (t *Tree) Get(key string) (string, bool, error) {
	// TODO
	panic("à implémenter")
}

// Range renvoie, triées, les clés k avec lo <= k < hi (hi == "" : sans borne haute).
func (t *Tree) Range(lo, hi string) ([]string, error) {
	// TODO
	panic("à implémenter")
}

// Height renvoie le nombre de niveaux (1 pour une racine feuille).
func (t *Tree) Height() (int, error) {
	// TODO
	panic("à implémenter")
}
