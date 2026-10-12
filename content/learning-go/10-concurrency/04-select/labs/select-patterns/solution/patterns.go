package lab

import (
	"errors"
	"time"
)

var ErrTimeout = errors.New("délai dépassé")

func TryReceive(ch <-chan int) (int, bool) {
	select {
	case v := <-ch:
		return v, true
	default:
		return 0, false
	}
}

func FirstOf(a, b <-chan int) int {
	select {
	case v := <-a:
		return v
	case v := <-b:
		return v
	}
}

func WithTimeout(ch <-chan int, d time.Duration) (int, error) {
	select {
	case v := <-ch:
		return v, nil
	case <-time.After(d):
		return 0, ErrTimeout
	}
}

func Join(a, b <-chan int) []int {
	out := []int{}
	for a != nil || b != nil {
		select {
		case v, ok := <-a:
			if !ok {
				a = nil
				continue
			}
			out = append(out, v)
		case v, ok := <-b:
			if !ok {
				b = nil
				continue
			}
			out = append(out, v)
		}
	}
	return out
}
