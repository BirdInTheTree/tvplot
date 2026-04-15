# Edge weight and direction matter for character networks but are hard to operationalize

Source: Moretti 2011, "Network Theory, Plot Analysis"

Moretti identifies two critical limitations of his networks:

**No weight**: When Claudius tells Horatio "I pray thee, good Horatio, wait upon him" — 8 words — this edge has the same visual weight as the thousands of words exchanged between Hamlet and Horatio. "This can't be right."

**No direction**: When Horatio addresses the Ghost, the Ghost doesn't reply. The interaction is one-directional. But the network shows a symmetric edge. Similarly, Hamlet's verbal energy is spread across five Court characters (only 28% of his words), while Claudius concentrates almost all his speech on the Court hexagon (48-60%).

Moretti says he couldn't find "a non-clumsy way to visualize weight and direction" and prioritized "maximizing visibility by minimizing overlap." This is honest but consequential — weight and direction carry important narrative information:

- **Weight** reveals intensity of relationships
- **Direction** reveals power dynamics, initiative, agency
- Together they could "significantly modify the initial X-ray" of a text

## For tvplotlines

- When building character interaction networks from synopses, consider: can we extract directional information (who initiates interaction)?
- Weighted edges (based on co-occurrence frequency or interaction intensity) are more informative than binary presence/absence

## Links

- [[moretti-networks-as-visualization-not-theory]]
- [[character-networks-model-plot-as-space-not-time]]
