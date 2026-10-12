package lab

import (
	"context"
	"errors"
	"time"
)

var ErrTimeout = errors.New("délai dépassé")

var ErrBusy = errors.New("trop de requêtes")

func CountTo(ctx context.Context, max int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for i := 1; i <= max; i++ {
			select {
			case ch <- i:
			case <-ctx.Done():
				return
			}
		}
	}()
	return ch
}

func TimeLimit[T any](work func() T, limit time.Duration) (T, error) {
	out := make(chan T, 1)
	go func() { out <- work() }()
	select {
	case v := <-out:
		return v, nil
	case <-time.After(limit):
		var zero T
		return zero, ErrTimeout
	}
}

type PressureGauge struct {
	tickets chan struct{}
}

func NewPressureGauge(limit int) *PressureGauge {
	return &PressureGauge{tickets: make(chan struct{}, limit)}
}

func (p *PressureGauge) Do(f func()) error {
	select {
	case p.tickets <- struct{}{}:
		defer func() { <-p.tickets }()
		f()
		return nil
	default:
		return ErrBusy
	}
}
