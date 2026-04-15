# Character attribute inference and relation detection are distinct tasks

Source: Piper, So, Bamman 2021, "Narrative Theory for Computational Narrative Understanding" (pp. 300-301)

The paper distinguishes three NLP tasks related to narrative agents:

**1. Agent detection** — recognizing characters in text, including non-named entities ("the coachman," "the frog"). NLP has focused on NER, but narrative requires broader "animacy detection" (Vala et al. 2015, Karsdorp et al. 2015).

**2. Character attribute inference** — inferring properties of characters: gender, ethnicity, religion, emotion, function, power. Propp (2010/1968) theorized character as a limited set of narrative "functions." Forster (1985) introduced round/flat distinction. Recent NLP work includes: desire fulfillment (Chaturvedi et al. 2016), psychology (Rashkin et al. 2018), representations of gender (Underwood et al. 2018), power (Sap et al. 2017).

**3. Relation detection** — how characters are "connected" or "interacting." Methods range from co-occurrence to supervised models. The challenge: identifying character *pairs* (siblings, parent-child) is extremely difficult, especially when information is expressed across multiple statements or left implicit.

The paper notes that Propp (2010) used "character schemas" — fixed sets of relations (protagonist/antagonist/helper) — but supervised models that presume these fixed sets may miss the complexity of real narratives.

## What this means for tvplotlines

Our pipeline does agent detection (cast identification in pass1) and implicitly captures relations through plotline structure (who is in which plotline implies their narrative role). But we don't do explicit **character attribute inference** — we don't tag characters with traits, competences, or power dynamics.

Bal's actant model (Subject/Object/Power/Receiver/Helper/Opponent) is essentially a structured approach to relation detection. If we adopt it, we'd be doing what Piper et al. describe as the intersection of attribute inference (what role does this character play?) and relation detection (how do characters relate to each other within the plotline structure?).

The paper also flags **truth value** as a challenge: characters' apparent roles can differ from real ones. This aligns with Bal's truth value concept.

## Links

- [[actant-model-has-six-roles-not-four]]
- [[anti-subject-signals-a-separate-storyline]]
- [[truth-value-reveals-apparent-vs-real-roles]]
- [[ten-elements-define-degrees-of-narrativity]]
