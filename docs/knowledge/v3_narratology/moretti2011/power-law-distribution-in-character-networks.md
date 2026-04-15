# Character networks follow power-law distribution

Source: Moretti 2011, "Network Theory, Plot Analysis"

The degree distribution of character networks (how many connections each character has) follows a power-law: very few characters have many edges, and very many characters have just one or two.

This holds across Shakespeare's tragedies — *Hamlet*, *Macbeth*, *Lear*, *Othello* all show the same pattern. There is no "average" or "typical" character. The distribution has no central tendency.

This is the opposite of a Gaussian curve: "there is no central tendency in the distribution, no 'average'; that is to say, there is no 'typical' vertex in the network, and *no typical character in the plays*."

Moretti argues this invalidates speaking of "Shakespeare's characters in general" — at least in the tragedies — because the power-law means characters exist on a continuum from hyper-connected to barely present, with no natural grouping point.

## Implications for tvplotlines

Степенное распределение связей означает, что в сети есть несколько хабов (hyper-connected characters) и много периферийных персонажей. Каждый хаб — центр своей подсети (региона). Эти подсети могут соответствовать сюжетным линиям: A-story — подсеть вокруг главного хаба, B-story — вокруг второго, и т.д. Персонажи на пересечении подсетей (как Гертруда между Hamlet-space и Claudius-space) участвуют в нескольких сюжетных линиях. Removal experiment [[moc-pipeline-ideas]] может верифицировать: если удаление хаба разрушает подсеть — это реальная сюжетная линия с ядром.

## Links

- [[protagonist-defined-by-network-stability-not-centrality]]
- [[character-networks-model-plot-as-space-not-time]]
- [[network-regions-reveal-plot-subsystems]]
- [[removal-experiments-reveal-structural-roles]]
