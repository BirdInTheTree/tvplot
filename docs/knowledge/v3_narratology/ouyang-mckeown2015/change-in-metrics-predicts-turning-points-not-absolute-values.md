# Change in metrics predicts turning points, not absolute values

Source: Ouyang & McKeown 2015, "Modeling Reportable Events as Turning Points in Narrative" (pp. 4-6)

The paper's central empirical finding: **it's the change (slope) in narrative metrics that predicts MREs, not the metric values themselves.** Using change-based features alone significantly outperforms all baselines; adding absolute metric values barely improves results.

## Three dimensions of change

The authors track sentence-level metrics across the narrative:

**1. Syntactic change** — formality and complexity. MRE sentences tend to be long (complex structure) but with short, informal words. There's a drop in formality near the MRE — Labov observed that people speak less formally as they relive the climax of their stories.

**2. Semantic change** — similarity to surrounding sentences. Expected: MRE should be dissimilar (shocking). Found: MRE sentences are actually *similar* to adjacent sentences, because MREs tend to be described across multiple consecutive sentences rather than in a single shocking line.

**3. Affective change** — pleasantness, activeness, imagery (using the Dictionary of Affect in Language). The MRE is:
- Global maximum in **activation** (excitement/intensity)
- Global minimum in **pleasantness** (most negative emotional valence)
- Peak in **imagery** (vivid, concrete language)

The overall shape of activeness scores reflects Prince's minimal story: low initial activation (starting state) → high final activation (ending state) → peak at the MRE (change of state).

## Top predictive features

1. **Incoming imagery change** (sharp increase in vivid language at MRE)
2. **Distance from formality minimum** (MRE near the least formal point)
3. **Cosine similarity to adjacent sentences** (MRE described over multiple sentences)
4. **Distance from activeness minimum** (MRE far from the stative orientation)
5. **Sentence depth** (MRE sentences are syntactically complex)

## What this means for tvplotlines

We don't have access to linguistic features in synopses (they're written by summarizers, not narrators). But the principle transfers: **turning points are identified by change, not by absolute position.** Our current function assignment is positional (climax = near the end, setup = near the beginning). A change-based approach would instead ask: where do the stakes shift most dramatically? Where does the direction change?

This also connects to Bremond's model: the transition from improvement to deterioration (or vice versa) is a *change in direction* — exactly the kind of slope change that predicts MREs.

## Links

- [[most-reportable-event-is-the-point-of-the-story]]
- [[narrative-cycle-has-three-phases-not-seven]]
- [[labov-narrative-structure-maps-to-six-components]]
