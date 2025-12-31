wwwkage main

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"sort"
	"strconv"
	"strings"
)

type parsedLine struct {
	lineNo int
	raw    string
	nums   []int
}

func main() {
	apostasPath := flag.String("apostas", "", "caminho para o arquivo com as apostas (uma aposta por linha)")
	resultadoPath := flag.String("resultado", "", "caminho para o arquivo com o resultado oficial do sorteio (uma linha)")
	flag.Parse()

	if strings.TrimSpace(*apostasPath) == "" || strings.TrimSpace(*resultadoPath) == "" {
		fmt.Fprintln(os.Stderr, "Erro: você precisa informar --apostas e --resultado.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Exemplo:")
		fmt.Fprintln(os.Stderr, "  go run main.go --apostas=apostas.txt --resultado=resultado.txt")
		os.Exit(2)
	}

	apostasFile, err := os.Open(*apostasPath)
	if err != nil {
		exitErr(fmt.Errorf("não foi possível abrir o arquivo de apostas %q: %w", *apostasPath, err))
	}
	defer apostasFile.Close()

	resultadoFile, err := os.Open(*resultadoPath)
	if err != nil {
		exitErr(fmt.Errorf("não foi possível abrir o arquivo de resultado %q: %w", *resultadoPath, err))
	}
	defer resultadoFile.Close()

	apostas, err := readApostas(apostasFile)
	if err != nil {
		exitErr(fmt.Errorf("erro ao ler apostas: %w", err))
	}
	if len(apostas) == 0 {
		exitErr(errors.New("arquivo de apostas não contém apostas válidas (linhas vazias/comentários não contam)"))
	}

	resultado, err := readResultado(resultadoFile)
	if err != nil {
		exitErr(fmt.Errorf("erro ao ler resultado: %w", err))
	}

	acertos := compareAll(apostas, resultado)
	printReport(os.Stdout, apostas, resultado, acertos)
}

func exitErr(err error) {
	fmt.Fprintln(os.Stderr, "Erro:", err)
	os.Exit(1)
}

func readApostas(r io.Reader) ([]parsedLine, error) {
	sc := bufio.NewScanner(r)
	// permite linhas maiores do que o padrão (64K)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var out []parsedLine
	lineNo := 0
	for sc.Scan() {
		lineNo++
		raw := sc.Text()
		trim := strings.TrimSpace(raw)
		if trim == "" || strings.HasPrefix(trim, "#") {
			continue
		}

		nums, err := parseNumbers(trim)
		if err != nil {
			return nil, fmt.Errorf("linha %d inválida: %w (conteúdo: %q)", lineNo, err, raw)
		}
		if len(nums) == 0 {
			return nil, fmt.Errorf("linha %d inválida: nenhum número encontrado (conteúdo: %q)", lineNo, raw)
		}
		if err := validateUniquePositive(nums); err != nil {
			return nil, fmt.Errorf("linha %d inválida: %w (conteúdo: %q)", lineNo, err, raw)
		}

		out = append(out, parsedLine{lineNo: lineNo, raw: raw, nums: nums})
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func readResultado(r io.Reader) ([]int, error) {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var lines []string
	lineNo := 0
	for sc.Scan() {
		lineNo++
		raw := strings.TrimSpace(sc.Text())
		if raw == "" || strings.HasPrefix(raw, "#") {
			continue
		}
		lines = append(lines, raw)
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}

	if len(lines) == 0 {
		return nil, errors.New("arquivo de resultado não contém números válidos (linhas vazias/comentários não contam)")
	}
	if len(lines) > 1 {
		return nil, fmt.Errorf("arquivo de resultado possui %d linhas válidas; esperado apenas 1", len(lines))
	}

	nums, err := parseNumbers(lines[0])
	if err != nil {
		return nil, fmt.Errorf("resultado inválido: %w (conteúdo: %q)", err, lines[0])
	}
	if len(nums) == 0 {
		return nil, errors.New("resultado inválido: nenhum número encontrado")
	}
	if err := validateUniquePositive(nums); err != nil {
		return nil, fmt.Errorf("resultado inválido: %w", err)
	}
	return nums, nil
}

func parseNumbers(s string) ([]int, error) {
	parts := splitOnDelims(s)
	nums := make([]int, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		n, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("número %q não é um inteiro válido", p)
		}
		nums = append(nums, n)
	}
	return nums, nil
}

func splitOnDelims(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool {
		switch r {
		case ' ', '\t', ',', ';':
			return true
		default:
			return false
		}
	})
}

func validateUniquePositive(nums []int) error {
	seen := make(map[int]struct{}, len(nums))
	for _, n := range nums {
		if n <= 0 {
			return fmt.Errorf("número %d inválido (esperado > 0)", n)
		}
		if _, ok := seen[n]; ok {
			return fmt.Errorf("número %d repetido", n)
		}
		seen[n] = struct{}{}
	}
	return nil
}

func compareAll(apostas []parsedLine, resultado []int) []int {
	resSet := make(map[int]struct{}, len(resultado))
	for _, n := range resultado {
		resSet[n] = struct{}{}
	}

	acertos := make([]int, 0, len(apostas))
	for _, a := range apostas {
		count := 0
		for _, n := range a.nums {
			if _, ok := resSet[n]; ok {
				count++
			}
		}
		acertos = append(acertos, count)
	}
	return acertos
}

func printReport(w io.Writer, apostas []parsedLine, resultado []int, acertos []int) {
	resultadoFmt := formatNums(resultado)
	fmt.Fprintf(w, "Resultado: %s\n\n", resultadoFmt)

	for i := range apostas {
		fmt.Fprintf(w, "Aposta %d: %s\n", i+1, formatAcertos(acertos[i]))
	}
}

func formatNums(nums []int) string {
	cp := append([]int(nil), nums...)
	sort.Ints(cp)
	parts := make([]string, 0, len(cp))
	for _, n := range cp {
		parts = append(parts, fmt.Sprintf("%02d", n))
	}
	return strings.Join(parts, " ")
}

func formatAcertos(n int) string {
	if n == 1 {
		return "1 acerto"
	}
	return fmt.Sprintf("%d acertos", n)
}


