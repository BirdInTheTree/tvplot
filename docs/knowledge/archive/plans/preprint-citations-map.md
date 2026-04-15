---
type: ref
project: preprint
status: active
---

# Карта цитат: теоретическая поддержка архитектуры tvplotlines

Справочник: какие цитаты из прочитанных статей поддерживают какие элементы tvplotlines. Для использования при написании препринта.

## Pass 0: franchise type detection

**Что делает:** Определяет тип сериала (procedural / serial / hybrid / ensemble) и переключает стратегию анализа для всех последующих пассов.

**Теоретическое обоснование:** Это cognitive control system — фильтр, который определяет, какие паттерны ожидать и какие инференсы делать.

> "for each (frequently encountered) text type, proficient readers have developed a particular *cognitive control system*, which guides their comprehension efforts. That is, the control system is in charge of regulating the basic operations of text comprehension. It can do this by emphasizing some processes and de-emphasizing others."
> — Zwaan 1993, p. 2

> "Genre signals trigger the LCCS to set some parameters for truth values in accordance with the conventions for that genre; these parameters then constrain the construction of situation models for texts of that genre."
> — Zwaan 1993, p. 126

## Pass 1: Story DNA (driver / goal / obstacle / stakes)

**Что делает:** Извлекает для каждой сюжетной линии — кто движет (driver), чего хочет (goal), что мешает (obstacle), что на кону (stakes).

**Теоретическое обоснование:** Story DNA — scaffold для goal-based inference, который переключает LLM с уровня textbase (что произошло) на уровень situation model (зачем персонаж так поступил).

### На goal:

> "Narratives are about people acting in a setting, and the happenings that befall them must be relevant to their intentional states while so engaged — to their beliefs, desires, theories, values, and so on."
> — Bruner 1991, p. 7

> "the statement of a goal carries considerable weight during text comprehension... a goal statement is an effective foregrounding device"
> — Zwaan & Radvansky 1998, p. 173

> "comprehenders also rely on inferential processes about human intentions. Just as in other forms of comprehension, inferred intentions provide structural information about action sequences."
> — Zwaan 2025, p. 291

### На obstacle (canonicity and breach):

> "For to be worth telling, a tale must be about how an implicit canonical script has been breached, violated, or deviated from."
> — Bruner 1991, p. 11

> "It is Trouble that provides the engine of drama."
> — Bruner 1991, p. 16

> "Stories are about problems of one sort or another, so it makes sense to link storytelling to a problem solver."
> — Meehan 1977, p. 96

### На stakes и незавершённые цели:

> "When people are probed for information from a story, failed goal information is more available than completed goal information."
> — Zwaan & Radvansky 1998, p. 173

### На Story DNA в целом как scaffold для intentionality:

> "the motivational and causal dimensions form the backbone of situations constructed during narrative comprehension... humans read texts to understand *why* things happened."
> — Zwaan & Radvansky 1998, p. 178

> "Comprehension is an 'effort after meaning.' It is not enough to know that TWA Flight 800 crashed or when or where it crashed. We want to know *why* it crashed."
> — Graesser et al. 1994, cited in Zwaan & Radvansky 1998, p. 178

## Pass 2: event assignment + functions + interactions

**Что делает:** Для каждого эпизода извлекает события, привязывает к линиям, назначает функции (setup / escalation / turning_point / climax / resolution), определяет interactions между линиями (thematic_rhyme, dramatic_irony, convergence).

**Теоретическое обоснование:** Event functions — это индексирование по каузальности и интенциональности (event-indexing model). Interactions — элементы pragmatic model (авторские стратегии).

### На event functions:

> "the motivational and causal dimensions form the backbone of situations constructed during narrative comprehension"
> — Zwaan & Radvansky 1998, p. 178

> "the events themselves need to be *constituted* in the light of the overall narrative — in Propp's terms, to be made 'functions' of the story."
> — Bruner 1991, p. 8

### На interactions (pragmatic model):

> "the situation model is a representation of a state of affairs referred to by the text, whereas the pragmatic model is the model of the situation in which the text is processed"
> — Zwaan 1993, p. 152

> "in news comprehension the pragmatic model is *retrieved* from LTM, whereas in literary comprehension it has to be *constructed* as the reader goes along"
> — Zwaan 1993, p. 153

## Multi-pass pipeline (Pass 2 → post-processing → Pass 3)

**Что делает:** Ранние пассы собирают данные по эпизодам (loosely organized), поздние пересматривают целое. Финальная интерпретация откладывается до полной картины.

**Теоретическое обоснование:** Герменевтический круг (части ↔ целое) и indeterminacy hypothesis (откладывание интерпретации).

### Герменевтический круг:

> "we are trying to establish a reading for the whole text, and for this we appeal to readings of its partial expressions; and yet because we are dealing with meaning... the readings of the partial expressions depend on those of others, and ultimately of the whole."
> — Charles Taylor, cited in Bruner 1991, p. 8

> "In Vladimir Propp's terms, the parts of a narrative serve as 'functions' of the narrative structure as a whole. But that whole cannot be constructed without reference to such appropriate parts."
> — Bruner 1991, p. 8

### Откладывание интерпретации:

> "Literary comprehension does not lead to a *stronger* textbase representation, but to a more *loosely organized* textbase. A loosely organized textbase contains seemingly irrelevant or contradictory information... the *connections* between these propositions will be *weaker*."
> — Zwaan 1993, p. 149

> "The indeterminacy hypothesis suggests that readers do not *immediately* commit themselves to one situational representation."
> — Zwaan 1993, p. 150

## Зачем LLM нужен scaffold (tvplotlines как cognitive control system)

**Что делает:** tvplotlines для LLM — то же, что литературное образование для человека. Не даёт новых данных, а учит задавать правильные вопросы.

### LLM без scaffold — shortcut learning:

> "the performance of such learning systems might rely on spurious correlations in the data, a phenomenon known as *shortcut learning*"
> — Zwaan 2025, p. 289

### LLM = orrery (отслеживают динамику, не понимают причинность):

> "'Situation models'—that is, the ability of LLMs to track who is doing what in story texts—might be classified as orrery-like models; they track some dynamics but don't represent causal knowledge about the wider world."
> — Mitchell 2025, Part 1

tvplotlines + Story DNA scaffold поднимает LLM **выше оррери**: заставляет моделировать не только «кто что делает», но и «зачем, что мешает, что на кону».

### LLM без scaffold — simulation без comprehension:

> "erratic behaviors caused by misclassification of what is considered proper behavior, especially when the physical norms of certain locations that are hard to convey in natural language did not percolate to the agents"
> — Park et al. 2023, p. 18

> "instruction tuning... seemed to guide the behavior of the agents to be more polite and cooperative overall... Despite these ideas not aligning with her own interests and characteristics, she rarely said no"
> — Park et al. 2023, p. 18

### Comprehension ≠ extraction:

> "the comprehension of a text is more than the rather mechanistic construction of a textbase... the important role that fact relationships play in comprehension is neglected"
> — Zwaan 1993, p. 28

## Работа с синопсисами (текст о визуальном медиуме)

**Что делает:** tvplotlines анализирует сериал через текстовые синопсисы, а не через сам видеоматериал.

> "situation model construction is an overarching skill despite the fact that the front-end processes... differ widely across media"
> — Zwaan 2025, p. 291

## ТЗ для tvplotlines (написанное в 1998)

> "several capabilities must be added to 'smarten up' the current class [of models]... such a module would have to (a) represent connections among situational nodes on different dimensions, such as time, space, causation, intentionality, and agency; and (b) capture the construction, foregrounding, updating, integration, and retrieval of situational information"
> — Zwaan & Radvansky 1998, p. 181

## tvplotlines как distributed intelligence

> "An individual's working intelligence is never 'solo.' It cannot be understood without taking into account his or her reference books, notes, computer programs and data bases, or most important of all, the network of friends, colleagues, or mentors on whom one leans for help and advice."
> — Bruner 1991, p. 3

## Нарратив как способ мышления (не текстовая форма)

> "The central concern is not how narrative as text is constructed, but rather how it operates as an instrument of mind in the construction of reality."
> — Bruner 1991, p. 5-6

> "we organize our experience and our memory of human happenings mainly in the form of narrative — stories, excuses, myths, reasons for doing and not doing, and so on."
> — Bruner 1991, p. 4

> "Narrative 'truth' is judged by its verisimilitude rather than its verifiability."
> — Bruner 1991, p. 13

## Story DNA scaffold как «правильный вопрос» (Winston)

> Genesis не видит связь между убийством и индивидуализмом — пока её не спросят. Тогда предустановка активируется и связь появляется.
> — Winston 2014, Figure 13, p. 7

Тот же механизм: LLM «знает» про intentional states, но не активирует это знание без Story DNA scaffold. Scaffold = правильный вопрос.

## Story understanding как ключевое отличие человеческого интеллекта

> "I focus on story understanding, which I believe is the key difference between us and all other primates, living and extinct."
> — Winston 2014, p. 1

## Genesis как прямой предшественник tvplotlines

> "No language system has the common sense required to understand what it is reading and the implications that flow from common sense understanding."
> — Winston 2014, p. 1

Genesis (2014) и tvplotlines (2025) делают одно: читают нарратив → строят structured representation → находят паттерны → отвечают на «почему». Genesis — на ручных правилах, 20-100 предложений. tvplotlines — на LLM со scaffold, полные сезоны сериалов.

## Structured representation лучше unstructured (аргумент за Story DNA как JSON)

> "providing agents with structured memory in the form of knowledge graphs... is critical in enabling them to operate in and model these worlds"
> — Ammanabrolu & Riedl 2021, p. 1

Worldformer показывает: knowledge graph (structured) значительно превосходит текст (unstructured) для world modeling. Аналогично: Story DNA (structured JSON с driver/goal/obstacle/stakes) ценнее, чем свободный текстовый «анализ» от LLM.

## World model для comprehension, не только для action

> "the ability to predict how the world will change in response to one's actions will help you better plan what actions to take"
> — Ammanabrolu & Riedl 2021, p. 1

Worldformer строит world model для агента (чтобы действовать). tvplotlines строит world model для аналитика (чтобы понимать). Обе задачи требуют structured representation, обе обновляются инкрементально, обе выходят за пределы эксплицитного текста.

## Inference за пределами наблюдаемого (аргумент за Story DNA obstacle/stakes)

> "by inferring that a locked chest is likely to contain treasure before it is actually revealed provides an agent with a form of look-ahead"
> — Ammanabrolu & Riedl 2021, p. 2

Story DNA obstacle и stakes часто не эксплицитны в синопсисе — LLM их *выводит* (infers), как Worldformer выводит содержимое запертого сундука. Scaffold заставляет делать этот вывод.

## tvplotlines как human-centered AI (обе стороны)

> "human-centered artificial intelligence can be broken down into two critical capacities: (1) understanding humans, and (2) being able to help humans understand the AI systems."
> — Riedl 2019, p. 3

tvplotlines: сторона 1 — Story DNA scaffold учит LLM моделировать intentional states (enculturation). Сторона 2 — TVPlotlinesResult = structured, interpretable JSON, который человек может проверить и оспорить (transparency).

## AI как инопланетянин (мотивация для enculturation)

> "the way intelligent systems solve problems—especially when using machine learning—is fundamentally *alien* to humans"
> — Riedl 2019, p. 2

> "our theory of mind breaks down when interacting with intelligent systems, which do not solve problems the way we do"
> — Riedl 2019, p. 2

## Истории как источник социальных норм

> "Stories and writing can be particularly powerful sources of common knowledge; people write what they know and social and cultural biases and assumptions can come out"
> — Riedl 2019, p. 4

## Нарратив как содержание странного, не его разрешение

> "Narrative, I believe, is designed to contain uncanniness rather than to resolve it."
> — Bruner 1991, p. 16
