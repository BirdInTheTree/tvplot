# Protagonist is defined by network stability, not centrality

Source: Moretti 2011, "Network Theory, Plot Analysis"

Moretti's key finding: the protagonist is not simply the most central character (highest degree, most connections). The protagonist is the character whose **removal most destabilizes the network**.

In *Hamlet*, Claudius is almost as central as Hamlet (average distance 1.62 vs 1.45). Removing Claudius barely affects the network. But removing Hamlet splits the network almost in half — the court on one side, Ghost and Fortinbras on the other. Removing Hamlet and then Horatio completely fragments the play.

This is the "removal experiment": take the network, delete a character, and observe what happens to the remaining structure. The protagonist is the one whose absence causes maximum fragmentation.

This redefines the protagonist in structural terms: not "who is in the most scenes" or "who talks the most," but "who holds the network together." The protagonist's function is **stability** — they are the connective tissue of the plot.

## Implications for tvplotlines

- Protagonist detection could be formalized as: find the character whose removal maximizes network fragmentation (measured by number of connected components, or increase in average path length).
- This is computationally tractable — it's essentially computing vertex connectivity.

## Links

- [[character-networks-model-plot-as-space-not-time]]
- [[network-regions-reveal-plot-subsystems]]
- [[removal-experiments-reveal-structural-roles]]
- [[power-law-distribution-in-character-networks]]
