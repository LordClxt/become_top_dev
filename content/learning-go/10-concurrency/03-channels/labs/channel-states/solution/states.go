package lab

import "sync"

func SafeSend(ch chan int, v int) (sent bool) {
	defer func() {
		if recover() != nil {
			sent = false
		}
	}()
	ch <- v
	return true
}

func SafeClose(ch chan int) (closed bool) {
	defer func() {
		if recover() != nil {
			closed = false
		}
	}()
	close(ch)
	return true
}

func Drain(ch <-chan int) []int {
	rest := []int{}
	for {
		v, ok := <-ch
		if !ok {
			return rest
		}
		rest = append(rest, v)
	}
}

func StartTogether(n int, f func(i int)) (release func(), wait func()) {
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			<-start
			f(i)
		}()
	}
	return func() { close(start) }, wg.Wait
}
