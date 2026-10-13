// Command go-stdlib génère src/lib/completion/go-stdlib.gen.ts : les identifiants
// exportés des paquets standard utilisés par les TP, pour l'autocomplétion de l'éditeur.
//
//	cd frontend && go run scripts/go-stdlib/main.go > src/lib/completion/go-stdlib.gen.ts
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/doc"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

var packages = []string{
	"bufio", "bytes", "cmp", "container/heap", "container/list", "context",
	"encoding/binary", "encoding/json", "errors", "fmt", "hash/fnv", "io",
	"iter", "log", "maps", "math", "math/bits", "math/rand/v2", "net/http",
	"os", "path/filepath", "reflect", "regexp", "slices", "sort", "strconv",
	"strings", "sync", "sync/atomic", "testing", "time", "unicode", "unicode/utf8",
}

// Entry = [nom, genre, détail] ; genre ∈ function|type|constant|variable|method.
type Entry [3]string

type Pkg struct {
	Path    string  `json:"path"`
	Members []Entry `json:"members"`
	Methods []Entry `json:"methods"`
}

func main() {
	fset := token.NewFileSet()
	var out []Pkg
	for _, path := range packages {
		dir := filepath.Join(runtime.GOROOT(), "src", path)
		pkgs, err := parser.ParseDir(fset, dir, func(fi os.FileInfo) bool {
			return !strings.HasSuffix(fi.Name(), "_test.go")
		}, parser.ParseComments)
		if err != nil {
			fmt.Fprintln(os.Stderr, path, err)
			os.Exit(1)
		}
		name := filepath.Base(path)
		if name == "v2" {
			name = "rand"
		}
		astPkg, ok := pkgs[name]
		if !ok {
			fmt.Fprintln(os.Stderr, "package not found:", path)
			os.Exit(1)
		}
		files := make([]*ast.File, 0, len(astPkg.Files))
		for _, f := range astPkg.Files {
			files = append(files, f)
		}
		d, err := doc.NewFromFiles(fset, files, path)
		if err != nil {
			fmt.Fprintln(os.Stderr, path, err)
			os.Exit(1)
		}
		p := Pkg{Path: path, Members: []Entry{}, Methods: []Entry{}}
		values := func(vs []*doc.Value, kind string) {
			for _, v := range vs {
				for _, n := range v.Names {
					if ast.IsExported(n) {
						p.Members = append(p.Members, Entry{n, kind, ""})
					}
				}
			}
		}
		funcs := func(fs []*doc.Func) {
			for _, f := range fs {
				p.Members = append(p.Members, Entry{f.Name, "function", signature(fset, f.Decl)})
			}
		}
		values(d.Consts, "constant")
		values(d.Vars, "variable")
		funcs(d.Funcs)
		for _, t := range d.Types {
			p.Members = append(p.Members, Entry{t.Name, "type", ""})
			values(t.Consts, "constant")
			values(t.Vars, "variable")
			funcs(t.Funcs)
			for _, m := range t.Methods {
				p.Methods = append(p.Methods, Entry{m.Name, "method", name + "." + t.Name + " " + signature(fset, m.Decl)})
			}
		}
		sort.Slice(p.Members, func(i, j int) bool { return p.Members[i][0] < p.Members[j][0] })
		sort.Slice(p.Methods, func(i, j int) bool { return p.Methods[i][0] < p.Methods[j][0] })
		out = append(out, p)
	}
	data, err := json.Marshal(out)
	if err != nil {
		panic(err)
	}
	fmt.Printf("// Généré par scripts/go-stdlib (Go %s) — ne pas modifier à la main.\n", runtime.Version())
	fmt.Println("export type GoEntry = [name: string, kind: string, detail: string]")
	fmt.Println("export type GoPkg = { path: string; members: GoEntry[]; methods: GoEntry[] }")
	fmt.Printf("export const GO_STDLIB: GoPkg[] = %s\n", data)
}

// signature rend `(params) results` sans le nom ni le récepteur.
func signature(fset *token.FileSet, decl *ast.FuncDecl) string {
	var b bytes.Buffer
	ft := *decl.Type
	ft.Func = token.NoPos
	_ = printer.Fprint(&b, fset, &ft)
	return strings.TrimPrefix(b.String(), "func")
}
