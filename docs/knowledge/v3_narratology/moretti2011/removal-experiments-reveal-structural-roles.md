# Removal experiments reveal structural roles of characters

Source: Moretti 2011, "Network Theory, Plot Analysis"

Once you have a character network, you can **intervene** on the model: remove a character and observe what happens to the remaining structure. This is the most powerful analytical technique Moretti demonstrates.

The procedure:
1. Build the full network
2. Remove a character (delete vertex and all its edges)
3. Measure: does the network fragment? Into how many components? How does average distance change?

Results for *Hamlet*:
- Remove Hamlet → network nearly splits in half (court vs. Ghost+Fortinbras)
- Remove Claudius → minor peripheral effects, network stays intact
- Remove Hamlet + Horatio → complete fragmentation, beginning and ending severed from rest
- Remove Hamlet + Claudius → less dramatic than removing Hamlet + Horatio

This reveals that **quantitative centrality and structural importance diverge**: Claudius is almost as central as Hamlet by degree metrics, but structurally dispensable. Horatio is less central than Claudius but far more important structurally.

## The method as tool

This is essentially a computational thought experiment — "what if this character didn't exist?" — that can be automated. For any network, you can rank characters by the fragmentation their removal causes.

## Links

- [[protagonist-defined-by-network-stability-not-centrality]]
- [[clustering-explains-structural-importance-of-characters]]
- [[character-networks-model-plot-as-space-not-time]]
