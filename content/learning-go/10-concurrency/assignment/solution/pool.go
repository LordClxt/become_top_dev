package lab

import (
	"context"
	"sync"
)

type Result struct {
	In  int
	Out int
	Err error
}

func ProcessAll(ctx context.Context, in <-chan int, workers int, f func(context.Context, int) (int, error)) <-chan Result {
	if workers <= 0 {
		workers = 1
	}
	out := make(chan Result)
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
					o, err := f(ctx, v)
					select {
					case out <- Result{In: v, Out: o, Err: err}:
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
