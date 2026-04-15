# Three-layer model separates text, story, and fabula

Source: Bal 1988, "Narratology", Introduction (pp. 5-7)

Bal builds all of narratology on a three-layer distinction:

- **Text** — the concrete artefact: words, shots, frames. The material sign system. Key question: *who narrates?*
- **Story** — the content of the text, a particular "colouring" of a fabula. How events are ordered, paced, focalized. Key question: *how is the fabula presented?*
- **Fabula** — a series of logically and chronologically related events caused or experienced by actors. The abstract skeleton. Key question: *what happened?*

These layers don't exist independently. The only material we have is the text; story and fabula are theoretical constructs, reconstructed by the reader. The fabula is "a memory trace that remains after the reading is completed" (p. 9).

The same fabula can be told through different stories (different orderings, focalizations) and realized in different texts (novel, film, comic). "Tom Thumb" is the same fabula whether in Perrault's text or a cartoon film.

## Why this matters for tvplotlines

Our current prompts conflate levels. Story DNA (hero-goal-obstacle-stakes) operates at the fabula level. Seven dramatic functions (setup → resolution) are also fabula. But "interactions" (thematic_rhyme, dramatic_irony) are story-level — they describe how events are organized, not what logically happened. And "format" (procedural/serial) is text-level — how the show delivers its material.

Separating levels explicitly would make our pipeline more precise: pass2 extracts fabula (events + actors + causal relations), pass4 describes story (how those events are ordered across the season arc).

## Links

- [[fabula-is-memory-trace-not-authors-plan]]
- [[events-are-transitions-between-states]]
- [[sequential-ordering-separates-fabula-time-from-story-time]]
