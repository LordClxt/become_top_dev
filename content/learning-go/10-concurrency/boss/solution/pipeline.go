package lab

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"
)

func Source(ctx context.Context, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			select {
			case out <- n:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}

type Stage func(ctx context.Context, in <-chan int) <-chan int

func FanOut(ctx context.Context, in <-chan int, workers int, f func(int) int) <-chan int {
	if workers <= 0 {
		workers = 1
	}
	out := make(chan int)
	var wg sync.WaitGroup
	wg.Add(workers)
	for w := 0; w < workers; w++ {
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case v, ok := <-in:
					if !ok {
						return
					}
					select {
					case out <- f(v):
					case <-ctx.Done():
						return
					}
				}
			}
		}()
	}
	go func() {
		wg.Wait()
		close(out)
	}()
	return out
}

func Chain(ctx context.Context, src <-chan int, stages ...Stage) <-chan int {
	cur := src
	for _, st := range stages {
		cur = st(ctx, cur)
	}
	return cur
}

func First[T any](ctx context.Context, fs ...func(context.Context) (T, error)) (T, error) {
	var zero T
	if len(fs) == 0 {
		return zero, errors.New("aucune fonction")
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	type res struct {
		v   T
		err error
	}
	results := make(chan res, len(fs))
	var wg sync.WaitGroup
	wg.Add(len(fs))
	for _, f := range fs {
		go func() {
			defer wg.Done()
			v, err := f(ctx)
			results <- res{v, err}
		}()
	}

	var errs []error
	var winner *res
	for i := 0; i < len(fs); i++ {
		r := <-results
		if r.err == nil && winner == nil {
			rr := r
			winner = &rr
			cancel()
		} else if r.err != nil {
			errs = append(errs, r.err)
		}
	}
	wg.Wait()
	if winner != nil {
		return winner.v, nil
	}
	return zero, errors.Join(errs...)
}

func Run(ctx context.Context, nums []int, workers int, f func(int) int, limit time.Duration) ([]int, error) {
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()

	out := FanOut(ctx, Source(ctx, nums...), workers, f)
	results := []int{}
	for v := range out {
		results = append(results, v)
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	sort.Ints(results)
	return results, nil
}
