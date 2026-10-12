package lab

func RunAll(fns ...func()) {
	done := make(chan struct{})
	for _, fn := range fns {
		go func() {
			defer func() { done <- struct{}{} }()
			fn()
		}()
	}
	for range fns {
		<-done
	}
}

func SquareAll(nums []int) []int {
	out := make([]int, len(nums))
	fns := make([]func(), len(nums))
	for i, n := range nums {
		fns[i] = func() { out[i] = n * n }
	}
	RunAll(fns...)
	return out
}

func SumOfSquares(nums []int, workers int) int {
	if len(nums) == 0 {
		return 0
	}
	if workers <= 0 {
		workers = 1
	}
	if workers > len(nums) {
		workers = len(nums)
	}
	size, extra := len(nums)/workers, len(nums)%workers
	partial := make([]int, workers)
	fns := make([]func(), workers)
	start := 0
	for w := 0; w < workers; w++ {
		end := start + size
		if w < extra {
			end++
		}
		lo, hi := start, end
		fns[w] = func() {
			sum := 0
			for _, n := range nums[lo:hi] {
				sum += n * n
			}
			partial[w] = sum
		}
		start = end
	}
	RunAll(fns...)
	total := 0
	for _, p := range partial {
		total += p
	}
	return total
}
