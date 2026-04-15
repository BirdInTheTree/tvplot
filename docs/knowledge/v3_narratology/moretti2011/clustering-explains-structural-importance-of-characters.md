# Clustering coefficient explains why some characters are structurally important

Source: Moretti 2011, "Network Theory, Plot Analysis"

Clustering is a network metric: if A is connected to B and B to C, what's the probability that A and C are also connected? High clustering means tightly knit groups where "the friend of your friend is also your friend."

In *Hamlet*, the Court hexagon (Hamlet, Claudius, Gertrude, Polonius, Ophelia, Laertes) has 100% clustering — everyone is connected to everyone. This explains **why removing Claudius has little effect**: he belongs to an already hyper-connected region. The redundancy of connections means no single node is structurally critical within this cluster.

Horatio is the opposite: he inhabits a region of very low clustering, connecting otherwise-disconnected parts of the network. Removing Horatio disintegrates the network because there's no redundancy — he's the only bridge.

## The principle

- Characters in **high-clustering regions** are individually replaceable (structurally)
- Characters in **low-clustering regions** are bridges — "weak ties" in Granovetter's sense — and their removal causes fragmentation
- Structural importance ≠ number of connections. It's about whether your connections are redundant.

## Links

- [[protagonist-defined-by-network-stability-not-centrality]]
- [[weak-ties-connect-narrative-regions]]
- [[network-regions-reveal-plot-subsystems]]
