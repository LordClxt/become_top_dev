package lab

import (
	"context"
	"errors"
	"sync"
)

var (
	ErrFull      = errors.New("file pleine")
	ErrClosed    = errors.New("relay arrêté")
	ErrDuplicate = errors.New("identifiant déjà utilisé")
)

type Job struct {
	ID  string
	Run func(ctx context.Context) error
}

type Status string

const (
	Queued  Status = "queued"
	Running Status = "running"
	Done    Status = "done"
	Failed  Status = "failed"
)

type Stats struct {
	Submitted int
	Rejected  int
	Completed int
	Failed    int
	InFlight  int
}

type record struct {
	status Status
	err    error
}

type Relay struct {
	mu      sync.Mutex
	jobs    chan Job
	records map[string]*record
	stats   Stats
	closed  bool

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
	idle   chan struct{} // fermé quand tous les workers ont terminé
}

func New(workers, capacity int) *Relay {
	if workers < 1 {
		workers = 1
	}
	if capacity < 1 {
		capacity = 1
	}
	ctx, cancel := context.WithCancel(context.Background())
	r := &Relay{
		jobs:    make(chan Job, capacity),
		records: map[string]*record{},
		ctx:     ctx,
		cancel:  cancel,
		idle:    make(chan struct{}),
	}
	r.wg.Add(workers)
	for i := 0; i < workers; i++ {
		go r.work()
	}
	go func() {
		r.wg.Wait()
		close(r.idle)
	}()
	return r
}

func (r *Relay) work() {
	defer r.wg.Done()
	for j := range r.jobs {
		r.mu.Lock()
		r.records[j.ID].status = Running
		r.stats.InFlight++
		r.mu.Unlock()

		err := j.Run(r.ctx)

		r.mu.Lock()
		rec := r.records[j.ID]
		rec.err = err
		if err != nil {
			rec.status = Failed
			r.stats.Failed++
		} else {
			rec.status = Done
			r.stats.Completed++
		}
		r.stats.InFlight--
		r.mu.Unlock()
	}
}

func (r *Relay) Submit(j Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return ErrClosed
	}
	if _, dup := r.records[j.ID]; dup {
		return ErrDuplicate
	}
	select {
	case r.jobs <- j:
		r.records[j.ID] = &record{status: Queued}
		r.stats.Submitted++
		return nil
	default:
		r.stats.Rejected++
		return ErrFull
	}
}

func (r *Relay) Result(id string) (Status, error, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	rec, ok := r.records[id]
	if !ok {
		return "", nil, false
	}
	return rec.status, rec.err, true
}

func (r *Relay) Stats() Stats {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.stats
}

func (r *Relay) Shutdown(ctx context.Context) error {
	r.mu.Lock()
	if !r.closed {
		r.closed = true
		close(r.jobs)
	}
	r.mu.Unlock()

	select {
	case <-r.idle:
		return nil
	case <-ctx.Done():
		r.cancel()
		return ctx.Err()
	}
}
