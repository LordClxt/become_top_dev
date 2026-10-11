---
name: simulation-design
description: Design a video-game-style simulation where the user programs a behavior (bot, agent, scheduler, load balancer, queue, cache, circuit breaker…) and watches the result animate, with levels, score and XP. Use it to propose simulation ideas per chapter or to specify/implement a simulation.
---

# simulation-design

## Architecture principle
```
user code ──► sandbox (deterministic simulation engine) ──► JSON state trace ──► front end animates the trace
```
- The engine runs **in the sandbox** alongside the user code (same language as the course, e.g. Go). The front end runs nothing: it replays the trace.
- Deterministic: fixed random seed per level → reproducible, comparable results.

## Spec to produce (`content/<book>/<chapter>/simulations/<slug>/simulation.yaml` + `README.md`)
1. **Pitch**: one sentence, the concept taught (e.g. "balance load across workers without dropping requests" → goroutines + channels + select).
2. **Player API**: the single function/interface the user implements, e.g.
   ```go
   type Scheduler interface { Next(state State) Action }
   ```
3. **World**: entities, rules, tick.
4. **Levels** (3–5): each introduces **one** new constraint (load ↑, failures, variable latency…).
5. **Score**: measurable metrics (throughput, p99 latency, dropped requests) + 1/2/3-star thresholds → XP.
6. **Trace**: JSON frame format (`{tick, entities:[…], events:[…]}`) consumed by the renderer.
7. **Rendering**: canvas/SVG with the `design-system/` tokens, play/pause/speed/step controls.
8. **Reference solution** that earns 3 stars on every level + a naive solution that fails level 2+ (same principle as `lab-authoring`).

## Good ideas by domain
- Go: goroutine scheduler, worker pipeline, rate limiter, LRU cache under load, graceful shutdown.
- Architecture: load balancer, circuit breaker, event-driven vs request/reply, scaling a microservice, saga.

## Definition of Done
- [ ] Minimal player API (1 function/interface)
- [ ] Progressive levels with star thresholds
- [ ] Reference (3★) and naive (failing) solutions verified in the sandbox
