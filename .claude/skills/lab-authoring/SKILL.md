---
name: lab-authoring
description: Create, modify or fix a lab, assignment or boss fight with starter code, automated tests, a reference solution and progressive hints, then validate it in the Docker sandbox. Use it for every coding or design exercise in content/.
---

# lab-authoring

Absolute rule: **a lab ships only if the solution passes its tests AND the starter fails them.**

## Coding exercise (`kind: code`)
1. **Design**: a precise objective tied to 1–3 of the lesson's `concepts`. One lab = 10–30 min. Prefer realistic problems (parser, cache, API, worker) over textbook exercises.
2. **`solution/`**: idiomatic reference code, what a senior would write. For Go: `go.mod` (module `lab`, no external dependency — the sandbox has no network), `gofmt`-ed.
3. **`tests/`**: files copied next to the code before running (`*_test.go`, same package).
   - Test behavior, not implementation. Include edge cases and error cases.
   - Teaching failure messages in French: `t.Errorf("Sum(%v) = %d, attendu %d — pense au cas de la slice vide", ...)`.
   - Table-driven tests in Go; `-race` for concurrency (requires an image with cgo).
4. **`starter/`**: same structure as `solution/`, signatures present, bodies to fill in (`// TODO: …` + `panic("à implémenter")` or zero value). Must **compile**.
5. **`hints.md`**: `## Hint 1` (direction), `## Hint 2` (approach), `## Hint 3` (near-solution, without complete code).
6. **`instructions.md`** (FR): context, task, input/output examples, constraints.
7. **Verify**:
   ```bash
   .claude/skills/lab-authoring/scripts/verify_lab.sh content/<book>/<chapter>/<lesson>/labs/<lab>
   ```
   If ✅, write `verified: { at: <date>, solution: pass, starter: fail }` in `lab.yaml`. Otherwise fix and rerun — never ship a failing lab.

## Groovy, Spring Boot and Grails labs (`language: groovy`)
One image (`sandbox/images/groovy`), three test commands:
- `groovy Test.groovy` — Groovy only, `Spec.groovy` harness (modules 00-05 of `grails`).
- `spock-boot [+security] [prefix…]` — real Spring Boot 3.5.16 (web/MVC, validation, JDBC, Data JPA + Hibernate 6.6, AOP, Actuator, test, H2). `+security` adds Spring Security: its mere presence secures every route (401), so only the security labs use it.
- `spock-grails [prefix…]` — real Grails 7.2.4 (controllers, URL mappings, interceptors, services, GORM Hibernate 5.6, JSON views, Spring Security plugin, `grails-testing-support`, H2).
Both `spock-*` compile every `.groovy`/`.java` (with `--parameters`), copy root `*.yml|*.properties|*.sql` onto the classpath, and run the Spock 2.4 specs; each feature = one test, a `where:` iteration = `feature/iteration`. Prefixes filter spec classes by simple name (`M1` for a project milestone). ~6-8 s per run at 1 CPU / 512 MB: set `timeout_s: 90`.
Pitfalls found while building the image:
- Put every class in a **package** (`package app`): a `@SpringBootApplication` in the default package scans the whole classpath and fails (`io/r2dbc/spi/ValidationDepth not found`).
- Assert on plain values (`res.status == 200`), never on MockMvc objects: Spock prints their huge `toString()`.
- A GORM `where { }` query inside a Spock condition (`expect:`/`then:`) is not transformed (`Cannot compare DetachedCriteria`): compute it in `when:` first.
- Grails artefacts outside `grails-app/` need `@Artefact('Controller')` (etc.) to get the AST transforms (`allowedMethods`, actions as methods).
- `HibernateDatastore` for a GORM spec: `new HibernateDatastore(['dataSource.dbCreate': 'create-drop', 'dataSource.url': 'jdbc:h2:mem:x;DB_CLOSE_DELAY=-1'], Book)`.

## Spring Boot labs (`course: spring`, `language: java`)
Same image as Java (`sandbox/images/java`), two test commands:
- `jtest [prefix…]` — plain Java, `Spec.java` harness (Java efficace, Minispring).
- `jboot [+data] [+flyway] [+security] [+actuator] [prefix…]` — real Spring Boot 4.1.3 (Framework 7.0.11), JUnit Jupiter 6 + AssertJ + Mockito. Base set: context, web MVC, validation, AspectJ, cache, RestClient, test slices. `+data` adds JDBC, Data JPA (Hibernate 7.4) and H2; `+flyway` adds Flyway (implies `+data`); `+security` adds Spring Security 7 (its presence alone secures every route); `+actuator` adds Actuator + Micrometer.
`jboot` compiles every `.java` with `-parameters`, copies root `*.yml|*.yaml|*.properties|*.sql|*.xml` and `META-INF/ db/ static/ templates/` onto the classpath, then runs `btd.RunTests` (output in `go test -json` format). Test name = `@DisplayName`; a parameterized invocation = `test/invocation`. Prefixes filter test classes by simple name (`M1WiringTest` → `jboot M1`). Logs are WARN by default and attached only to failing tests. A context that fails to start is reported once, with the bean in cause and the root cause, instead of the stack trace.
Measured at 1 CPU / 512 MB: 2–3.5 s per run, ~80 MiB peak for container-only labs; ~5–7 s and ~200 MiB with `+data` (JPA). Set `timeout_s: 90` (labs) or `120` (boss, project).
Rules and pitfalls:
- Put every class in a **package** (`package app;`); tests in the same package.
- Fail messages: `assertThat(x).as("description en français, qui guide").isEqualTo(…)`.
- Quizzes: `quiz_classpath` in `course.yaml` puts Spring on the classpath of `code-output` questions, logs off. They run with `java Main.java`, **without `-parameters`**: never rely on parameter names to disambiguate beans in a quiz (use `@Qualifier`).
- An exception thrown by a `BeanRegistrar` reaches the caller unwrapped (no `rootCause()` in assertions).
- Spring 7 only generates the CGLIB subclass of a `@Configuration` class that has `@Bean` methods.

## Design exercise (`kind: diagram` or `kind: worksheet`, no code)
For every conceptual book, and for practical courses whose lesson is a **decision** (choose a model, size a system, compare), the lab is not code. Two tools, graded deterministically by the backend (no Docker): formats in `content-format/reference/schemas.md`.
- **`diagram`**: the learner draws an architecture or a structure (catalog components, typed arrows, zones, trees); graph rules highlight the mistakes.
- **`worksheet`**: a sheet of blocks (`number`, `choice`, `multi`, `order`, `match`, `table`, `tuner`) graded field by field.
Formula: **predict → check → debrief**. A small numeric or judgment scenario, never a recall question; every wrong answer has its explanation (`feedback.yaml`), and `debrief.md` gives the why once solved.
Verify: `verify_lab.sh <dir>` (solution passes, starter fails), then write `verified`. No fake tests, no AI review.

## "What does this program print?" quizzes
Every `code-output` question is actually run:
```bash
python3 .claude/skills/lab-authoring/scripts/verify_quiz.py content/<book>/<chapter>
```
A wrong answer blocks the chapter from shipping, just like a failing lab.

## Boss fight
Same format as a lab, in `boss/`, difficulty 4–5, combines the whole chapter, larger `timeout_s`, high XP.

## Definition of Done
- [ ] `verify_lab.sh` ✅ (code, diagram or worksheet)
- [ ] The starter compiles (code); failure messages guide without giving away the answer
- [ ] 3 hint levels
- [ ] Idiomatic solution, no network dependency
- [ ] `verify_quiz.py` ✅ on the chapter
