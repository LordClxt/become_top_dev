package lab

import (
	"context"
	"time"
)

type result struct {
	v   int
	err error
}

func Gather(ctx context.Context, fa, fb func(context.Context) (int, error)) (int, int, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	ca, cb := make(chan result, 1), make(chan result, 1)
	go func() {
		v, err := fa(ctx)
		ca <- result{v, err}
	}()
	go func() {
		v, err := fb(ctx)
		cb <- result{v, err}
	}()

	var a, b int
	var first error
	record := func(r result) {
		if r.err != nil && first == nil {
			first = r.err
			cancel()
		}
	}
	for i := 0; i < 2; i++ {
		select {
		case r := <-ca:
			a = r.v
			record(r)
		case r := <-cb:
			b = r.v
			record(r)
		}
	}
	return a, b, first
}

func GatherAndProcess(ctx context.Context, limit time.Duration, fa, fb func(context.Context) (int, error), fc func(context.Context, int, int) (int, error)) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()

	a, b, err := Gather(ctx, fa, fb)
	if err != nil {
		return 0, err
	}
	if err := ctx.Err(); err != nil {
		return 0, err
	}
	return fc(ctx, a, b)
}
