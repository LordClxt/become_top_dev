package lab

import "fmt"

func Generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

func Collect(ch <-chan int) []int {
	got := []int{}
	for v := range ch {
		got = append(got, v)
	}
	return got
}

func Map(in <-chan int, f func(int) int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for v := range in {
			out <- f(v)
		}
	}()
	return out
}

func PingPong(n int) []string {
	log := []string{}
	if n <= 0 {
		return log
	}
	ping, pong := make(chan string), make(chan string)
	go func() {
		defer close(pong)
		for msg := range ping {
			var i int
			fmt.Sscanf(msg, "ping %d", &i)
			pong <- fmt.Sprintf("pong %d", i)
		}
	}()
	for i := 1; i <= n; i++ {
		ping <- fmt.Sprintf("ping %d", i)
		log = append(log, fmt.Sprintf("ping %d", i), <-pong)
	}
	close(ping)
	return log
}
