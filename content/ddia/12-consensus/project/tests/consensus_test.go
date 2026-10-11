package lab

import (
	"errors"
	"reflect"
	"testing"
)

// ---------- Jalon 1 : 2PC ----------

// fake est un participant simulé qui note les appels reçus.
type fake struct {
	voteNo, down bool
	failCommit   int    // nombre de Commit qui échouent avant de réussir
	log          *TxLog // pour vérifier que la décision est journalisée AVANT d'être envoyée
	calls        []string
	early        bool
}

func (f *fake) Prepare(tx string) error {
	if f.down {
		return errors.New("injoignable")
	}
	f.calls = append(f.calls, "prepare")
	if f.voteNo {
		return errors.New("vote non")
	}
	return nil
}

func (f *fake) decided(tx, kind string) bool {
	for _, r := range f.log.Records {
		if r.Tx == tx && r.Kind == kind {
			return true
		}
	}
	return false
}

func (f *fake) Commit(tx string) error {
	f.calls = append(f.calls, "commit")
	if !f.decided(tx, "commit") {
		f.early = true
	}
	if f.failCommit > 0 {
		f.failCommit--
		return errors.New("réseau coupé")
	}
	return nil
}

func (f *fake) Abort(tx string) error {
	f.calls = append(f.calls, "abort")
	if !f.decided(tx, "abort") {
		f.early = true
	}
	return nil
}

func setup(fs ...*fake) (*Coordinator, *TxLog) {
	log := &TxLog{}
	c := &Coordinator{Log: log}
	for _, f := range fs {
		f.log = log
		c.Participants = append(c.Participants, f)
	}
	return c, log
}

func kinds(log *TxLog, tx string) []string {
	var out []string
	for _, r := range log.Records {
		if r.Tx == tx {
			out = append(out, r.Kind)
		}
	}
	return out
}

func has(calls []string, s string) bool {
	for _, c := range calls {
		if c == s {
			return true
		}
	}
	return false
}

func TestM1Outcomes(t *testing.T) {
	cases := []struct {
		name  string
		parts []*fake
		want  Decision
	}{
		{"tous votent oui", []*fake{{}, {}, {}}, Commit},
		{"un vote non", []*fake{{}, {voteNo: true}, {}}, Abort},
		{"un participant injoignable", []*fake{{}, {}, {down: true}}, Abort},
	}
	for _, c := range cases {
		coord, log := setup(c.parts...)
		d, err := coord.Run("tx1")
		if err != nil || d != c.want {
			t.Errorf("%s : Run = %q, %v ; attendu %q", c.name, d, err, c.want)
			continue
		}
		if got := kinds(log, "tx1"); !reflect.DeepEqual(got, []string{"begin", string(c.want), "end"}) {
			t.Errorf("%s : journal = %v, attendu [begin %s end]", c.name, got, c.want)
		}
		for i, p := range c.parts {
			if p.early {
				t.Errorf("%s : le participant %d a reçu la décision AVANT qu'elle soit journalisée — point de non-retour violé", c.name, i)
			}
			if c.want == Abort && has(p.calls, "commit") {
				t.Errorf("%s : le participant %d a reçu commit alors que la transaction est annulée", c.name, i)
			}
			if c.want == Abort && !p.down && has(p.calls, "prepare") && !has(p.calls, "abort") {
				t.Errorf("%s : le participant %d a préparé mais n'a pas reçu abort — il resterait en doute", c.name, i)
			}
			if c.want == Commit && !has(p.calls, "commit") {
				t.Errorf("%s : le participant %d n'a pas reçu commit", c.name, i)
			}
		}
	}
}

func TestM1DuplicateTx(t *testing.T) {
	coord, _ := setup(&fake{})
	coord.Run("tx1")
	if _, err := coord.Run("tx1"); !errors.Is(err, ErrDuplicate) {
		t.Errorf("relancer tx1 : err = %v, attendu ErrDuplicate", err)
	}
}

func TestM1CommitRetriedAfterFailure(t *testing.T) {
	flaky := &fake{failCommit: 1}
	coord, log := setup(&fake{}, flaky)
	d, err := coord.Run("tx1")
	if err != nil || d != Commit {
		t.Fatalf("Run = %q, %v — la décision est définitive même si un commit échoue", d, err)
	}
	if got := kinds(log, "tx1"); !reflect.DeepEqual(got, []string{"begin", "commit"}) {
		t.Errorf("journal = %v : pas de « end » tant qu'un participant n'a pas acquitté", got)
	}
	got := coord.Recover()
	if !reflect.DeepEqual(got, map[string]Decision{"tx1": Commit}) {
		t.Errorf("Recover = %v, attendu tx1 → commit (on renvoie la décision)", got)
	}
	if k := kinds(log, "tx1"); k[len(k)-1] != "end" {
		t.Errorf("après la reprise, le journal doit finir par « end » : %v", k)
	}
	if again := coord.Recover(); len(again) != 0 {
		t.Errorf("seconde reprise : %v, attendu rien à faire", again)
	}
}

func TestM1CrashBeforeDecisionAborts(t *testing.T) {
	a, b := &fake{}, &fake{}
	coord, log := setup(a, b)
	coord.CrashAfter = "prepare"
	if _, err := coord.Run("tx9"); !errors.Is(err, ErrCrashed) {
		t.Fatalf("err = %v, attendu ErrCrashed", err)
	}
	if has(a.calls, "commit") || has(a.calls, "abort") {
		t.Fatal("le coordinateur a planté : il ne doit rien avoir diffusé, A est en doute")
	}
	restarted := &Coordinator{Log: log, Participants: coord.Participants}
	if got := restarted.Recover(); got["tx9"] != Abort {
		t.Errorf("Recover = %v : sans décision écrite, la transaction doit être annulée", got)
	}
	if !has(a.calls, "abort") || !has(b.calls, "abort") || a.early || b.early {
		t.Error("les participants en doute doivent recevoir abort, APRÈS l'écriture de « abort » au journal")
	}
}

func TestM1CrashAfterDecisionCommits(t *testing.T) {
	a, b := &fake{}, &fake{}
	coord, log := setup(a, b)
	coord.CrashAfter = "decision"
	coord.Run("tx7")
	if has(a.calls, "commit") {
		t.Fatal("crash juste après la journalisation : rien ne doit encore être diffusé")
	}
	restarted := &Coordinator{Log: log, Participants: coord.Participants}
	if got := restarted.Recover(); got["tx7"] != Commit {
		t.Errorf("Recover = %v : la décision commit écrite avant le crash doit être honorée", got)
	}
	if !has(a.calls, "commit") || !has(b.calls, "commit") {
		t.Error("après la reprise, tous les participants doivent recevoir commit")
	}
}

// ---------- Jalon 2 : élection Raft ----------

func cluster(n int) []*Node {
	nodes := make([]*Node, n)
	for i := range nodes {
		var peers []int
		for j := 1; j <= n; j++ {
			if j != i+1 {
				peers = append(peers, j)
			}
		}
		nodes[i] = NewNode(i+1, peers)
	}
	return nodes
}

func withLog(n *Node, terms ...int) *Node {
	for _, t := range terms {
		n.Log = append(n.Log, Entry{Term: t})
	}
	if len(terms) > 0 && n.CurrentTerm < terms[len(terms)-1] {
		n.CurrentTerm = terms[len(terms)-1]
	}
	return n
}

func TestM2VoteRule(t *testing.T) {
	cases := []struct {
		name  string
		voter []int // termes du log du votant
		req   VoteRequest
		want  bool
	}{
		{"logs identiques", []int{1, 3}, VoteRequest{Term: 4, CandidateID: 2, LastLogIndex: 2, LastLogTerm: 3}, true},
		{"candidat plus long, même dernier terme", []int{1, 3}, VoteRequest{Term: 4, CandidateID: 2, LastLogIndex: 5, LastLogTerm: 3}, true},
		{"candidat plus court, même dernier terme", []int{1, 3, 3}, VoteRequest{Term: 4, CandidateID: 2, LastLogIndex: 2, LastLogTerm: 3}, false},
		{"candidat plus long mais dernier terme plus ancien", []int{1, 3}, VoteRequest{Term: 4, CandidateID: 2, LastLogIndex: 9, LastLogTerm: 2}, false},
		{"candidat plus court mais dernier terme plus récent", []int{1, 1, 1, 1}, VoteRequest{Term: 4, CandidateID: 2, LastLogIndex: 1, LastLogTerm: 3}, true},
		{"terme du candidat périmé", []int{1, 3}, VoteRequest{Term: 2, CandidateID: 2, LastLogIndex: 5, LastLogTerm: 3}, false},
	}
	for _, c := range cases {
		v := withLog(NewNode(1, []int{2, 3}), c.voter...)
		if got := v.HandleVote(c.req); got.Granted != c.want {
			t.Errorf("%s : Granted = %v, attendu %v — compare d'abord le dernier terme, puis la longueur", c.name, got.Granted, c.want)
		}
	}
}

func TestM2OneVotePerTerm(t *testing.T) {
	v := NewNode(1, []int{2, 3})
	if !v.HandleVote(VoteRequest{Term: 1, CandidateID: 2}).Granted {
		t.Fatal("premier candidat du terme 1 : la voix doit être accordée")
	}
	if v.HandleVote(VoteRequest{Term: 1, CandidateID: 3}).Granted {
		t.Error("une seule voix par terme : le nœud 3 ne doit pas l'obtenir")
	}
	if !v.HandleVote(VoteRequest{Term: 1, CandidateID: 2}).Granted {
		t.Error("le même candidat redemande (message dupliqué) : on peut lui redonner sa voix")
	}
	if r := v.HandleVote(VoteRequest{Term: 2, CandidateID: 3}); !r.Granted || v.CurrentTerm != 2 {
		t.Errorf("nouveau terme 2 : la voix est de nouveau libre (Granted=%v, terme=%d)", r.Granted, v.CurrentTerm)
	}
}

func TestM2Election(t *testing.T) {
	n := cluster(5)
	if !Elect(n[0], n[1:3]) || n[0].Role != Leader || n[0].CurrentTerm != 1 {
		t.Fatalf("3 voix sur 5 (dont la sienne) : le nœud 1 doit être leader du terme 1 (rôle=%v, terme=%d)", n[0].Role, n[0].CurrentTerm)
	}
	if n[0].NextIndex[5] != 1 {
		t.Errorf("NextIndex[5] = %d, attendu dernier index + 1 = 1", n[0].NextIndex[5])
	}
	m := cluster(5)
	if Elect(m[0], m[1:2]) || m[0].Role == Leader {
		t.Error("2 voix sur 5 ne font pas une majorité : pas de leader dans la minorité")
	}
	old := cluster(3)
	old[1].CurrentTerm = 7
	if Elect(old[0], old[1:]) || old[0].Role != Follower || old[0].CurrentTerm != 7 {
		t.Errorf("un votant au terme 7 : le candidat doit adopter le terme 7 et redevenir follower (rôle=%v, terme=%d)", old[0].Role, old[0].CurrentTerm)
	}
}

// ---------- Jalon 3 : réplication et validation ----------

func TestM3AppendConsistencyCheck(t *testing.T) {
	f := withLog(NewNode(2, []int{1, 3}), 1, 1, 2)
	if r := f.HandleAppend(AppendRequest{Term: 3, PrevLogIndex: 3, PrevLogTerm: 3}); r.Success {
		t.Error("l'entrée 3 du follower est de terme 2, pas 3 : refus attendu")
	}
	if r := f.HandleAppend(AppendRequest{Term: 3, PrevLogIndex: 5, PrevLogTerm: 3}); r.Success {
		t.Error("le follower n'a pas d'entrée 5 : refus attendu")
	}
	r := f.HandleAppend(AppendRequest{Term: 3, PrevLogIndex: 2, PrevLogTerm: 1, Entries: []Entry{{Term: 3, Cmd: "x"}}, LeaderCommit: 3})
	want := []Entry{{Term: 1}, {Term: 1}, {Term: 3, Cmd: "x"}}
	if !r.Success || r.MatchIndex != 3 || !reflect.DeepEqual(f.Log, want) {
		t.Errorf("conflit à l'index 3 : log = %v, réponse %+v ; attendu %v, MatchIndex 3", f.Log, r, want)
	}
	if f.CommitIndex != 3 {
		t.Errorf("CommitIndex = %d, attendu min(LeaderCommit, dernier index reçu) = 3", f.CommitIndex)
	}
	f.HandleAppend(AppendRequest{Term: 3, PrevLogIndex: 1, PrevLogTerm: 1, Entries: []Entry{{Term: 1}}})
	if len(f.Log) != 3 {
		t.Errorf("un vieux message qui concorde ne doit rien tronquer : log = %v", f.Log)
	}
	if r := f.HandleAppend(AppendRequest{Term: 2}); r.Success || r.Term != 3 {
		t.Errorf("un leader au terme 2 est périmé : refus avec le terme 3 attendu, obtenu %+v", r)
	}
}

func TestM3ReplicateAndCommit(t *testing.T) {
	n := cluster(5)
	Elect(n[0], n[1:])
	if _, err := n[1].Propose("x"); !errors.Is(err, ErrNotLeader) {
		t.Errorf("Propose sur un follower : err = %v, attendu ErrNotLeader", err)
	}
	idx, _ := n[0].Propose("set a 1")
	Replicate(n[0], n[1:2])
	if n[0].CommitIndex != 0 {
		t.Errorf("entrée sur 2 nœuds sur 5 : CommitIndex = %d, attendu 0", n[0].CommitIndex)
	}
	Replicate(n[0], n[2:3])
	if n[0].CommitIndex != idx {
		t.Errorf("entrée sur 3 nœuds sur 5 : CommitIndex = %d, attendu %d", n[0].CommitIndex, idx)
	}
	Replicate(n[0], n[1:])
	for _, f := range n[1:] {
		if f.CommitIndex != idx || len(f.Log) != 1 {
			t.Errorf("nœud %d : log %v, CommitIndex %d — le tour suivant propage leaderCommit", f.ID, f.Log, f.CommitIndex)
		}
	}
}

func TestM3LeaderRepairsDivergentFollower(t *testing.T) {
	n := cluster(3)
	l, f := withLog(n[0], 1, 1, 2, 2), withLog(n[1], 1, 1, 3, 3, 3)
	l.CurrentTerm = 3
	Elect(l, n[2:]) // le nœud 3, log vide, vote : leader au terme 4 ; f n'est pas joignable
	if l.Role != Leader {
		t.Fatal("le nœud 1 devrait être élu avec la voix du nœud 3")
	}
	l.Propose("y")
	Replicate(l, n[1:2])
	if !reflect.DeepEqual(f.Log, l.Log) {
		t.Errorf("le follower doit recevoir le log du leader, divergences effacées :\nfollower %v\nleader   %v", f.Log, l.Log)
	}
	if l.MatchIndex[2] != 5 || l.NextIndex[2] != 6 {
		t.Errorf("MatchIndex[2]=%d NextIndex[2]=%d, attendu 5 et 6", l.MatchIndex[2], l.NextIndex[2])
	}
}

func TestM3OnlyCurrentTermCommitsByCounting(t *testing.T) {
	n := cluster(3)
	l := withLog(n[0], 1, 2)
	f := withLog(n[1], 1, 2)
	l.CurrentTerm, f.CurrentTerm = 2, 2
	Elect(l, n[2:]) // terme 3
	Replicate(l, n[1:2])
	if l.CommitIndex != 0 {
		t.Errorf("les entrées 1-2 (termes 1, 2) sont sur 2 nœuds sur 3 mais pas du terme 3 : CommitIndex = %d, attendu 0", l.CommitIndex)
	}
	l.Propose("noop")
	Replicate(l, n[1:2])
	if l.CommitIndex != 3 {
		t.Errorf("l'entrée 3 du terme courant est sur une majorité : CommitIndex = %d, attendu 3 (et les précédentes par ricochet)", l.CommitIndex)
	}
}

func TestM3StaleLeaderStepsDown(t *testing.T) {
	n := cluster(3)
	Elect(n[0], n[1:])
	n[2].CurrentTerm = 9
	n[0].Propose("z")
	Replicate(n[0], n[2:])
	if n[0].Role != Follower || n[0].CurrentTerm != 9 {
		t.Errorf("une réponse au terme 9 doit destituer le leader du terme 1 (rôle=%v, terme=%d)", n[0].Role, n[0].CurrentTerm)
	}
}
