package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadRealContent(t *testing.T) {
	idx, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	if idx.Chapters["grails-ch01"] == nil || len(idx.Chapters["grails-ch01"].LessonIDs) != 4 {
		t.Fatal("grails-ch01 et ses 4 leçons attendus")
	}
	if idx.Chapters["grails-ch01"].BossID != "grails-ch01-boss" {
		t.Errorf("boss = %q", idx.Chapters["grails-ch01"].BossID)
	}
	if len(idx.Sandbox) == 0 || idx.Exercises[idx.Sandbox[0]].CourseID == "" {
		t.Error("les exercices de l'atelier doivent connaître leur cours")
	}
	kata := idx.Exercises["arch-sandbox-ggg-bid-flow"]
	if kata == nil || len(kata.DiagramChecks) != 8 {
		t.Fatal("kata diagram avec 8 règles attendu")
	}
	lab := idx.Exercises["grails-ch01-l01-lab-callbacks"]
	if lab.LessonID != "grails-ch01-l01" || len(lab.Hints) != 3 {
		t.Errorf("TP callbacks : lesson %q, %d indices", lab.LessonID, len(lab.Hints))
	}
}

// Une copie minimale de content/ que chaque test casse à sa façon.
func writeTree(t *testing.T, files map[string]string) string {
	t.Helper()
	root := t.TempDir()
	for name, body := range files {
		p := filepath.Join(root, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return root
}

func minimal() map[string]string {
	return map[string]string{
		"b/course.yaml": "id: b\ntitle: B\nkind: practical\nbook: {title: T, authors: [A], slug: b}\nsummary: S\n" +
			"tracks: [{id: t, title: T, chapters: [01-c]}]\n",
		"b/01-c/chapter.yaml": "id: b-ch01\ntitle: C\nsource: {chapter: 1, pages: \"1-2\"}\nobjectives: [o]\n" +
			"mastery_threshold: 0.8\nlessons: [01-l]\n",
		"b/01-c/01-l/lesson.md": "---\nid: b-ch01-l01\ntitle: L\nsource: {chapter: 1, pages: \"1\"}\n" +
			"concepts: [{id: k, label: K}]\nxp: 10\nlabs: [b-lab]\n---\nCorps\n",
		"b/01-c/01-l/labs/x/lab.yaml": "id: b-lab\ntitle: X\nkind: code\nlanguage: go\nxp: 50\ntest_command: go test ./...\n" +
			"files_editable: [x.go]\nconcepts: [k]\nverified: { at: 2026-10-10, solution: pass, starter: fail }\n",
		"b/01-c/01-l/labs/x/starter/x.go":    "package x\n",
		"b/01-c/01-l/labs/x/starter/go.mod":  "module x\n",
		"b/01-c/01-l/labs/x/solution/x.go":   "package x\n",
		"b/01-c/01-l/labs/x/tests/x_test.go": "package x\n",
		"b/01-c/01-l/labs/x/hints.md":        "## Hint 1\nun\n\n## Hint 2\ndeux\n",
	}
}

func TestMinimalTreeLoads(t *testing.T) {
	idx, err := Load(writeTree(t, minimal()))
	if err != nil {
		t.Fatal(err)
	}
	lab := idx.Exercises["b-lab"]
	if lab.Difficulty != 1 || lab.TimeoutS != 30 || strings.Join(lab.Hints, "|") != "un|deux" {
		t.Errorf("valeurs par défaut ou indices inattendus : %+v", lab)
	}
	if idx.Lessons["b-ch01-l01"].DurationMin != 15 || *idx.Courses["b"].Order != 100 {
		t.Error("valeurs par défaut de la leçon ou du cours")
	}
}

// withCheckpoints ajoute deux points de contrôle au front-matter de la leçon minimale, et le corps donné.
func withCheckpoints(f map[string]string, body string) {
	f["b/01-c/01-l/lesson.md"] = "---\nid: b-ch01-l01\ntitle: L\nsource: {chapter: 1, pages: \"1\"}\n" +
		"concepts: [{id: k, label: K}]\nxp: 10\nlabs: [b-lab]\ncheckpoints:\n" +
		"  - {id: c1, type: single, prompt: P, choices: [a, b], answer: 1, explanation: E}\n" +
		"  - {id: c2, type: code-output, prompt: P, code: \"x\", answer: \"42\", explanation: E, concept: k}\n---\n" + body
}

func TestCheckpointsLoad(t *testing.T) {
	files := minimal()
	withCheckpoints(files, "Intro\n\n::checkpoint{id=\"c1\"}\n\nSuite\n::checkpoint{id=\"c2\"}\n")
	idx, err := Load(writeTree(t, files))
	if err != nil {
		t.Fatal(err)
	}
	cps := idx.Lessons["b-ch01-l01"].Checkpoints
	if len(cps) != 2 || cps[0].Answer != float64(1) || cps[1].Answer != "42" || cps[0].Difficulty != 1 {
		t.Errorf("checkpoints inattendus : %+v", cps)
	}
	idx, err = Load(writeTree(t, minimal()))
	if err != nil || idx.Lessons["b-ch01-l01"].Checkpoints == nil {
		t.Error("sans checkpoints, la liste doit être vide et non nil")
	}
}

func TestCheckpointsFailLoudly(t *testing.T) {
	both := "::checkpoint{id=\"c1\"}\n::checkpoint{id=\"c2\"}\n"
	cases := map[string]struct {
		edit func(map[string]string)
		want string
	}{
		"unknown ref":  {func(f map[string]string) { withCheckpoints(f, both+"::checkpoint{id=\"c9\"}\n") }, `id="c9"} ne correspond`},
		"not placed":   {func(f map[string]string) { withCheckpoints(f, "::checkpoint{id=\"c1\"}\n") }, "c2 déclaré mais jamais placé"},
		"placed twice": {func(f map[string]string) { withCheckpoints(f, both+"::checkpoint{id=\"c1\"}\n") }, "c1 placé 2 fois"},
		"duplicate id": {func(f map[string]string) {
			withCheckpoints(f, both)
			f["b/01-c/01-l/lesson.md"] = strings.Replace(f["b/01-c/01-l/lesson.md"], "id: c2,", "id: c1,", 1)
		}, "c1 déclaré deux fois"},
		"bad type": {func(f map[string]string) {
			withCheckpoints(f, both)
			f["b/01-c/01-l/lesson.md"] = strings.Replace(f["b/01-c/01-l/lesson.md"], "type: single", "type: free", 1)
		}, `type = "free"`},
		"missing answer": {func(f map[string]string) {
			withCheckpoints(f, both)
			f["b/01-c/01-l/lesson.md"] = strings.Replace(f["b/01-c/01-l/lesson.md"], "answer: 1, ", "", 1)
		}, "answer"},
		"unknown concept": {func(f map[string]string) {
			withCheckpoints(f, both)
			f["b/01-c/01-l/lesson.md"] = strings.Replace(f["b/01-c/01-l/lesson.md"], "concept: k}", "concept: z}", 1)
		}, "concept z inconnu"},
	}
	for name, c := range cases {
		files := minimal()
		c.edit(files)
		_, err := Load(writeTree(t, files))
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s : erreur %v, attendu %q", name, err, c.want)
		}
	}
}

func TestLoadFailsLoudly(t *testing.T) {
	cases := map[string]struct {
		edit func(map[string]string)
		want string
	}{
		"unverified lab": {func(f map[string]string) {
			f["b/01-c/01-l/labs/x/lab.yaml"] = strings.Replace(f["b/01-c/01-l/labs/x/lab.yaml"], "verified", "# verified", 1)
		}, "non vérifié"},
		"missing starter file": {func(f map[string]string) { delete(f, "b/01-c/01-l/labs/x/starter/x.go") }, "absent de starter"},
		"unknown lab ref": {func(f map[string]string) {
			f["b/01-c/01-l/lesson.md"] = strings.Replace(f["b/01-c/01-l/lesson.md"], "labs: [b-lab]", "labs: [nope]", 1)
		}, "TP nope introuvable"},
		"unknown concept": {func(f map[string]string) {
			f["b/01-c/01-l/labs/x/lab.yaml"] = strings.Replace(f["b/01-c/01-l/labs/x/lab.yaml"], "concepts: [k]", "concepts: [z]", 1)
		}, "concept z inconnu"},
		"unknown visual": {func(f map[string]string) {
			f["b/01-c/01-l/lesson.md"] += `::visual{id="ghost"}`
		}, "visuel ghost introuvable"},
		"bad kind": {func(f map[string]string) {
			f["b/01-c/01-l/labs/x/lab.yaml"] = strings.Replace(f["b/01-c/01-l/labs/x/lab.yaml"], "kind: code", "kind: magic", 1)
		}, "kind"},
		"missing lesson dir": {func(f map[string]string) {
			f["b/01-c/chapter.yaml"] = strings.Replace(f["b/01-c/chapter.yaml"], "[01-l]", "[01-l, 02-l]", 1)
		}, "leçon 02-l déclarée mais absente"},
		"no front matter": {func(f map[string]string) { f["b/01-c/01-l/lesson.md"] = "pas de front-matter" }, "front-matter"},
		"bad yaml":        {func(f map[string]string) { f["b/01-c/chapter.yaml"] = "id: [" }, "YAML invalide"},
	}
	for name, c := range cases {
		files := minimal()
		c.edit(files)
		_, err := Load(writeTree(t, files))
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s : erreur %v, attendu %q", name, err, c.want)
		}
	}
}
