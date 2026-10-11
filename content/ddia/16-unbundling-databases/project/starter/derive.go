package lab

import "errors"

// Event est un changement lu dans le log de la base de référence. (fourni)
// Offset est strictement croissant dans le log ; Deleted signale la suppression du document Key.
type Event struct {
	Offset  int64
	Key     string
	Deleted bool
	Doc     map[string]string
}

// View est une donnée dérivée maintenue à partir du log. (fourni)
type View interface {
	// Apply applique un événement. Un événement dont l'offset est déjà appliqué est ignoré (idempotence).
	Apply(ev Event) error
	// Offset renvoie l'offset du dernier événement appliqué (0 si aucun).
	Offset() int64
}

// KeyFunc extrait d'un document la valeur de regroupement ; ok vaut false si le document n'a pas de groupe. (fourni)
type KeyFunc func(doc map[string]string) (group string, ok bool)

// Erreurs à renvoyer. (fournies)
var (
	ErrBadOffset   = errors.New("offset invalide : il doit être strictement positif")
	ErrEmptyKey    = errors.New("clé de document vide")
	ErrOutOfOrder  = errors.New("log non ordonné : les offsets doivent être strictement croissants")
	ErrNotCaughtUp = errors.New("la nouvelle vue n'a pas rattrapé l'ancienne")
	ErrNotSwitched = errors.New("la bascule n'a pas encore eu lieu")
	ErrRetired     = errors.New("l'ancienne vue n'est plus maintenue")
)

// Field renvoie une KeyFunc qui regroupe selon la valeur d'un champ (absent ou vide : pas de groupe). (fourni)
func Field(name string) KeyFunc {
	return func(doc map[string]string) (string, bool) {
		v, ok := doc[name]
		return v, ok && v != ""
	}
}

// ---------- Jalon 1 : l'index secondaire ----------

// Index est un index secondaire : valeur d'un champ → clés des documents qui la portent.
type Index struct {
	// TODO: la KeyFunc du champ, l'offset appliqué, clé → valeur indexée, valeur → ensemble de clés
}

// NewIndex crée un index vide sur le champ field.
func NewIndex(field string) *Index {
	// TODO
	return &Index{}
}

// Offset renvoie l'offset du dernier événement appliqué.
func (ix *Index) Offset() int64 {
	// TODO
	return 0
}

// Apply met l'index à jour : retire l'ancienne entrée du document, puis ajoute la nouvelle s'il y en a une.
// Offset <= 0 : ErrBadOffset. Clé vide : ErrEmptyKey. Offset déjà appliqué : ignoré, nil.
func (ix *Index) Apply(ev Event) error {
	// TODO
	return errors.New("à implémenter")
}

// Lookup renvoie les clés des documents dont le champ vaut value, triées (slice vide si aucune).
func (ix *Index) Lookup(value string) []string {
	// TODO
	return nil
}

// ---------- Jalon 2 : la vue de compteurs et la reconstruction ----------

// Counter compte les documents vivants par groupe.
type Counter struct {
	// TODO: la KeyFunc, l'offset appliqué, clé → groupe actuel, groupe → nombre
}

// NewCounter crée une vue de compteurs vide qui regroupe selon key.
func NewCounter(key KeyFunc) *Counter {
	// TODO
	return &Counter{}
}

// Offset renvoie l'offset du dernier événement appliqué.
func (c *Counter) Offset() int64 {
	// TODO
	return 0
}

// Apply décrémente l'ancien groupe du document puis incrémente le nouveau. Mêmes erreurs et même idempotence que Index.
func (c *Counter) Apply(ev Event) error {
	// TODO
	return errors.New("à implémenter")
}

// Count renvoie le nombre de documents du groupe.
func (c *Counter) Count(group string) int {
	// TODO
	return 0
}

// Counts renvoie une copie des compteurs non nuls.
func (c *Counter) Counts() map[string]int {
	// TODO
	return nil
}

// CatchUp applique à v, dans l'ordre, les événements du log plus récents que v.Offset(), et renvoie leur nombre.
// Un log dont les offsets ne sont pas strictement croissants est refusé (ErrOutOfOrder) avant toute application.
func CatchUp(v View, log []Event) (int, error) {
	// TODO
	return 0, errors.New("à implémenter")
}

// ---------- Jalon 3 : deux vues en parallèle, puis bascule ----------

// Migration maintient une ancienne et une nouvelle vue dérivées du même log, et choisit celle qu'on lit.
type Migration struct {
	// TODO: les deux vues, bascule faite ?, ancienne retirée ?
}

// NewMigration démarre une migration : les lectures vont à old tant que la bascule n'a pas eu lieu.
func NewMigration(old, next View) *Migration {
	// TODO
	return &Migration{}
}

// Apply applique un événement en direct. L'ancienne vue le reçoit tant qu'elle n'est pas retirée. La nouvelle ne le
// reçoit que si elle a rattrapé l'ancienne : sinon, elle sauterait les offsets manquants, qu'elle relira par Backfill.
func (m *Migration) Apply(ev Event) error {
	// TODO
	return errors.New("à implémenter")
}

// Backfill fait rattraper l'historique à la nouvelle vue, sans toucher à l'ancienne.
func (m *Migration) Backfill(log []Event) error {
	// TODO
	return errors.New("à implémenter")
}

// Ready indique si la nouvelle vue a au moins rattrapé l'ancienne.
func (m *Migration) Ready() bool {
	// TODO
	return false
}

// Switch envoie les lectures vers la nouvelle vue ; refusé tant qu'elle est en retard (ErrNotCaughtUp).
func (m *Migration) Switch() error {
	// TODO
	return errors.New("à implémenter")
}

// Rollback renvoie les lectures vers l'ancienne vue, tant qu'elle est encore maintenue (sinon ErrRetired).
func (m *Migration) Rollback() error {
	// TODO
	return errors.New("à implémenter")
}

// Retire arrête de maintenir l'ancienne vue ; possible seulement après la bascule (sinon ErrNotSwitched).
func (m *Migration) Retire() error {
	// TODO
	return errors.New("à implémenter")
}

// Current renvoie la vue à laquelle les lectures doivent s'adresser.
func (m *Migration) Current() View {
	// TODO
	return nil
}
