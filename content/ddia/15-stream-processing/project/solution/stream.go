// Package lab implémente le traitement de flux de Tinybase : fenêtres en temps
// de l'événement, watermark, sessions et consommateur idempotent.
package lab

import (
	"math"
	"sort"
)

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

// floorDiv arrondit vers −∞, contrairement à l'opérateur / de Go.
func floorDiv(a, b int64) int64 {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}

// TumblingWindow renvoie l'unique fenêtre de taille size qui contient t.
func TumblingWindow(t, size int64) Window {
	start := floorDiv(t, size) * size
	return Window{Start: start, End: start + size}
}

// HoppingWindows renvoie, par début croissant, toutes les fenêtres de taille
// size alignées sur des multiples de hop qui contiennent t.
func HoppingWindows(t, size, hop int64) []Window {
	if size <= 0 || hop <= 0 {
		return nil
	}
	last := floorDiv(t, hop) * hop
	var ws []Window
	for start := last; start > t-size; start -= hop {
		ws = append(ws, Window{Start: start, End: start + size})
	}
	sort.Slice(ws, func(i, j int) bool { return ws[i].Start < ws[j].Start })
	return ws
}

type winKey struct {
	key string
	w   Window
}

// Aggregator compte et somme les événements par clé et par fenêtre hopping,
// et émet chaque fenêtre quand le watermark dépasse sa fin.
type Aggregator struct {
	size, hop, maxDelay int64
	seen                bool
	maxTime             int64
	late                int
	open                map[winKey]*Result
}

// NewAggregator crée un agrégateur ; maxDelay est le désordre toléré.
func NewAggregator(size, hop, maxDelay int64) *Aggregator {
	return &Aggregator{size: size, hop: hop, maxDelay: maxDelay, open: map[winKey]*Result{}}
}

// Watermark vaut le plus grand horodatage vu − maxDelay, ou math.MinInt64
// tant qu'aucun événement n'a été vu.
func (a *Aggregator) Watermark() int64 {
	if !a.seen {
		return math.MinInt64
	}
	return a.maxTime - a.maxDelay
}

// Late renvoie le nombre d'événements écartés parce que toutes leurs
// fenêtres étaient déjà émises.
func (a *Aggregator) Late() int { return a.late }

// Add ajoute un événement et renvoie les fenêtres devenues complètes.
func (a *Aggregator) Add(e Event) []Result {
	wm := a.Watermark()
	accepted := false
	for _, w := range HoppingWindows(e.Time, a.size, a.hop) {
		if w.End <= wm {
			continue // fenêtre déjà émise
		}
		k := winKey{e.Key, w}
		r, ok := a.open[k]
		if !ok {
			r = &Result{Key: e.Key, Window: w}
			a.open[k] = r
		}
		r.Count++
		r.Sum += e.Value
		accepted = true
	}
	if !accepted {
		a.late++
		return nil
	}
	if !a.seen || e.Time > a.maxTime {
		a.seen, a.maxTime = true, e.Time
	}
	return a.emit(a.Watermark())
}

// Flush émet toutes les fenêtres encore ouvertes (fin du flux).
func (a *Aggregator) Flush() []Result {
	return a.emit(math.MaxInt64)
}

func (a *Aggregator) emit(wm int64) []Result {
	var out []Result
	for k, r := range a.open {
		if r.Window.End <= wm {
			out = append(out, *r)
			delete(a.open, k)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		x, y := out[i], out[j]
		if x.Window.End != y.Window.End {
			return x.Window.End < y.Window.End
		}
		if x.Window.Start != y.Window.Start {
			return x.Window.Start < y.Window.Start
		}
		return x.Key < y.Key
	})
	return out
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
func Sessionize(events []Event, gap int64) []Session {
	sorted := make([]Event, len(events))
	copy(sorted, events)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].Key != sorted[j].Key {
			return sorted[i].Key < sorted[j].Key
		}
		return sorted[i].Time < sorted[j].Time
	})
	var out []Session
	for i, e := range sorted {
		if i > 0 && e.Key == sorted[i-1].Key && e.Time-sorted[i-1].Time < gap {
			s := &out[len(out)-1]
			s.End = e.Time + gap
			s.Count++
			continue
		}
		out = append(out, Session{Key: e.Key, Start: e.Time, End: e.Time + gap, Count: 1})
	}
	return out
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
	offsets map[int]int64
	totals  map[string]int64
}

// NewConsumer crée un consommateur vide.
func NewConsumer() *Consumer {
	return &Consumer{offsets: map[int]int64{}, totals: map[string]int64{}}
}

// Apply applique r s'il n'a pas déjà été appliqué et dit s'il l'a fait.
func (c *Consumer) Apply(r Record) bool {
	if last, ok := c.offsets[r.Partition]; ok && r.Offset <= last {
		return false
	}
	c.totals[r.Event.Key] += r.Event.Value
	c.offsets[r.Partition] = r.Offset
	return true
}

// Total renvoie le total courant d'une clé.
func (c *Consumer) Total(key string) int64 { return c.totals[key] }

// ResumeOffset renvoie le prochain offset à lire dans une partition.
func (c *Consumer) ResumeOffset(partition int) int64 {
	if last, ok := c.offsets[partition]; ok {
		return last + 1
	}
	return 0
}

// Checkpoint renvoie une copie indépendante de l'état.
func (c *Consumer) Checkpoint() Checkpoint {
	return Checkpoint{Offsets: copyMap(c.offsets), Totals: copyMap(c.totals)}
}

// Restore reconstruit un consommateur à partir d'un checkpoint, sans le partager.
func Restore(cp Checkpoint) *Consumer {
	return &Consumer{offsets: copyMap(cp.Offsets), totals: copyMap(cp.Totals)}
}

func copyMap[K comparable, V any](m map[K]V) map[K]V {
	out := make(map[K]V, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
