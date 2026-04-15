---
type: note
project: tvplotlines
status: active
---

# Task: tvplotlines autoresearch v2

You are an autonomous prompt optimization agent. Your job is to improve tvplotlines's storyline extraction quality on procedural TV shows (House, CSI, ER) without degrading quality on other show types.

## Step 1: Read the program

Read `/Users/nvashko/Projects/tvplotlines-app/research/autoresearch/program-v2.md` — it contains the full protocol: dataset, metric, constraints, experiment loop, cost limits.

## Step 2: Read all in-scope files listed in the program's Setup section

Read every file listed there. Do not skip any.

Also read the previous experiment results:
- `/Users/nvashko/Projects/tvplotlines-app/research/autoresearch/results.tsv` — 40 previous experiments from v1.
- `/Users/nvashko/Projects/tvplotlines-app/research/autoresearch/prompt-experiment-ideas.md` — hypotheses H1–H14.

Study what was already tried and what worked. Do NOT repeat experiments that were already run. Build on top of what worked (voting, single-word naming, orphan assignment, temperature=0, max_tokens=6144).

## Step 3: Establish baseline

Run the fast set (BB, SP, House, Lost) with current prompts. Compute embedding metrics using `python3 /Users/nvashko/Projects/tvplotlines-app/research/compute_embedding_metrics.py`. Record baseline in `results-v2.tsv`.

## Step 4: Run the experiment loop

Follow the loop described in program-v2.md. Key rules:
- One change per experiment — isolate variables.
- Use `--pass2-mode batch` for all runs to save cost.
- Track cumulative cost. HARD LIMIT: $30 total. Stop at $28.
- Source .env before every run: `set -a && source /Users/nvashko/Projects/tvplotlines/.env && set +a`
- Run shows in parallel (background jobs) when possible.
- Focus on Pass 1 prompt changes that help procedurals without hurting serials.
- Prompts exist in TWO languages. Every prompt change must be applied to BOTH:
  - Russian: `src/tvplotlines/prompts/pass{0,1,2,3}.md`
  - English: `src/tvplotlines/prompts_en/pass{0,1,2,3}.md`
  Russian shows (SP, GDR, Метод, Мажор) use Russian prompts, English shows use English prompts. If you change only one language, half the dataset won't see the change.
- git commit each experiment before running.
- Revert with `git reset --hard HEAD~1` if score drops.

## Step 5: When done

When you hit the cost limit or run out of ideas:
1. Summarize all experiments and findings in `results-v2.tsv`.
2. Write a short summary to `/Users/nvashko/Projects/tvplotlines-app/research/autoresearch/summary-v2.md`: what worked, what didn't, best score achieved, recommended next steps.
3. Do NOT push to remote. Leave changes on the branch.

## Important

- NEVER modify `compute_embedding_metrics.py` or synopsis files.
- NEVER ask the human for input. Work autonomously until the cost limit.
- NEVER stop early. If you plateau, try radical changes, combinations, or different passes.
- The working directory is `/Users/nvashko/Projects/tvplotlines`.
- Synopsis and result files are in `/Users/nvashko/Projects/tvplotlines-app/research/`.
