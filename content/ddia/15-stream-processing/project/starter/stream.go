// Package lab implémente le traitement de flux de Tinybase : fenêtres en temps
// de l'événement, watermark, sessions et consommateur idempotent.
package lab

// Event est un événement horodaté par sa source (temps de l'événement).
type Event struct {
	Key   string
	Time  int64
	Value int64
}

// Window est l'intervalle semi-ouvert [Start, End).
type Window struct {
	Start, End int64
}

// Result est l'agrégat d'une clé sur une fenêtre complète.
type Result struct {
	Key    string
	Window Window
	Count  int
	Sum    int64
}

// TumblingWindow renvoie l'unique fenêtre de taille size qui contient t.
// Attention aux temps négatifs : en Go, -30/60 vaut 0.
func TumblingWindow(t, size int64) Window {
	// TODO: jalon 1
	return Window{}
}

// HoppingWindows renvoie, par début croissant, toutes les fenêtres de taille
// size alignées sur des multiples de hop qui contiennent t (nil si size ou hop ≤ 0).
func HoppingWindows(t, size, hop int64) []Window {
	// TODO: jalon 1
	return nil
}

// Aggregator compte et somme les événements par clé et par fenêtre hopping,
// et émet chaque fenêtre quand le watermark dépasse sa fin.
type Aggregator struct {
	// TODO: jalon 2 — paramètres, plus grand horodatage vu, retardataires, fenêtres ouvertes
}

// NewAggregator crée un agrégateur ; maxDelay est le désordre toléré.
func NewAggregator(size, hop, maxDelay int64) *Aggregator {
	// TODO: jalon 2
	return &Aggregator{}
}

// Watermark vaut le plus grand horodatage vu − maxDelay, ou math.MinInt64
// tant qu'aucun événement n'a été vu.
func (a *Aggregator) Watermark() int64 {
	// TODO: jalon 2
	return 0
}

// Late renvoie le nombre d'événements écartés parce que toutes leurs
// fenêtres étaient déjà émises.
func (a *Aggregator) Late() int {
	// TODO: jalon 2
	return 0
}

// Add ajoute un événement et renvoie les fenêtres devenues complètes
// (fin ≤ watermark), triées par fin, puis début, puis clé.
func (a *Aggregator) Add(e Event) []Result {
	// TODO: jalon 2
	return nil
}

// Flush émet toutes les fenêtres encore ouvertes (fin du flux), dans le même ordre.
func (a *Aggregator) Flush() []Result {
	// TODO: jalon 2
	return nil
}

// Session regroupe les événements rapprochés d'une même clé.
// End vaut le dernier horodatage + gap.
type Session struct {
	Key   string
	Start int64
	End   int64
	Count int
}

// Sessionize découpe les événements en sessions : un écart supérieur ou égal
// à gap entre deux événements consécutifs d'une clé ouvre une nouvelle session.
// Résultat trié par clé puis par début ; l'entrée n'est pas modifiée.
func Sessionize(events []Event, gap int64) []Session {
	// TODO: jalon 3
	return nil
}

// Record est un message lu dans une partition du log.
type Record struct {
	Partition int
	Offset    int64
	Event     Event
}

// Checkpoint capture l'état et les offsets appliqués, ensemble.
type Checkpoint struct {
	Offsets map[int]int64
	Totals  map[string]int64
}

// Consumer additionne les valeurs par clé en ignorant les messages rejoués.
type Consumer struct {
	// TODO: jalon 3 — dernier offset appliqué par partition, totaux par clé
}

// NewConsumer crée un consommateur vide.
func NewConsumer() *Consumer {
	// TODO: jalon 3
	return &Consumer{}
}

// Apply applique r s'il n'a pas déjà été appliqué et dit s'il l'a fait.
func (c *Consumer) Apply(r Record) bool {
	// TODO: jalon 3
	return false
}

// Total renvoie le total courant d'une clé.
func (c *Consumer) Total(key string) int64 {
	// TODO: jalon 3
	return 0
}

// ResumeOffset renvoie le prochain offset à lire dans une partition (0 si rien n'a été appliqué).
func (c *Consumer) ResumeOffset(partition int) int64 {
	// TODO: jalon 3
	return 0
}

// Checkpoint renvoie une copie indépendante de l'état.
func (c *Consumer) Checkpoint() Checkpoint {
	// TODO: jalon 3
	return Checkpoint{}
}

// Restore reconstruit un consommateur à partir d'un checkpoint, sans le partager.
func Restore(cp Checkpoint) *Consumer {
	// TODO: jalon 3
	return &Consumer{}
}
