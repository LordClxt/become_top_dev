package lab

import (
	"context"
	"errors"
)

var (
	// ErrFull : la file d'attente est pleine, le job est refusé tout de suite.
	ErrFull = errors.New("file pleine")
	// ErrClosed : Relay est arrêté (ou en cours d'arrêt) et n'accepte plus de job.
	ErrClosed = errors.New("relay arrêté")
	// ErrDuplicate : un job avec le même identifiant a déjà été accepté.
	ErrDuplicate = errors.New("identifiant déjà utilisé")
)

// Job est une unité de travail. Run reçoit un contexte annulé quand Relay s'arrête de force.
type Job struct {
	ID  string
	Run func(ctx context.Context) error
}

// Status est l'état d'un job.
type Status string

const (
	Queued  Status = "queued"
	Running Status = "running"
	Done    Status = "done"
	Failed  Status = "failed"
)

// Stats résume l'activité de Relay.
type Stats struct {
	Submitted int // jobs acceptés
	Rejected  int // jobs refusés avec ErrFull
	Completed int // jobs terminés sans erreur
	Failed    int // jobs terminés avec une erreur
	InFlight  int // jobs en cours d'exécution
}

// Relay exécute des jobs avec un nombre borné de workers.
type Relay struct {
	// TODO
}

// ---------- Jalon 1 : des workers qui travaillent ----------

// New démarre `workers` goroutines (au moins 1) qui consomment une file d'attente de `capacity` jobs (au moins 1).
func New(workers, capacity int) *Relay {
	// TODO
	panic("à implémenter")
}

// Submit met le job en file et renvoie nil. Il ne bloque JAMAIS (voir jalon 2 pour les refus).
// Le job passe Queued → Running → Done (Run a renvoyé nil) ou Failed (Run a renvoyé une erreur).
func (r *Relay) Submit(j Job) error {
	// TODO
	panic("à implémenter")
}

// Result renvoie l'état d'un job et l'erreur de son exécution (non nil seulement pour Failed).
// ok vaut false si l'identifiant est inconnu.
func (r *Relay) Result(id string) (status Status, err error, ok bool) {
	// TODO
	panic("à implémenter")
}

// ---------- Jalon 2 : dire non plutôt qu'attendre ----------

// (Complète Submit : ErrFull quand la file est pleine, ErrDuplicate pour un identifiant déjà accepté,
// et Stats qui compte tout.)

// Stats renvoie un instantané des compteurs.
func (r *Relay) Stats() Stats {
	// TODO
	panic("à implémenter")
}

// ---------- Jalon 3 : s'arrêter proprement ----------

// Shutdown refuse désormais tout nouveau job (ErrClosed), laisse finir les jobs en file et en cours, puis rend la main.
// Si ctx expire avant la fin, il annule le contexte donné aux jobs en cours et renvoie ctx.Err() sans attendre davantage.
// Il peut être appelé plusieurs fois (et depuis plusieurs goroutines) sans paniquer.
func (r *Relay) Shutdown(ctx context.Context) error {
	// TODO
	panic("à implémenter")
}
