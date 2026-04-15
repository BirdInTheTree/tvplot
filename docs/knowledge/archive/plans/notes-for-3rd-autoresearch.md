# Замечания к промптам 
## PASS 0 
1. check if pass0 is nessesary or it works as good when this infor we get at first stage of pass1 - it seems by our experiments it might be, it saves us money on tokens (again it seems)
2. see if Franchise type definitions that we have in glossary work better to differentiate between procedural and hybrid 
3.  If each episode has its own focal character — ensemble. - this we have in pass0 which is not a correct statement and  definition in glossary is more accurate - need to replace 
4. > [Hero] [transformation], testing how far they'll go for [goal] эта формулировка с testing несколько ограничивает передачу сути нудно найти точнее 
5.   "season": 1, а откуда сейчас ьеертся номер сезона?
6. - `format`: enum — `"ongoing"` | `"limited"` | `"anthology"` | null (if unclear) не вижу нигде объяснения в промпте для этого поля, но в глоссари кажется оно есть 
7. After validation, the result is shown to the human for confirmation or editing. - это не так, зачем это написано в промпте?
8. Я посмотрела что используется в контракте на входе в Пасс 1 и не вижу где используются все поля которые мы собираем на Пасс 0 - есть такое ощущение что мы из собираем а потом нигде не используем - зачем тогда собираем?

## PASS 1
1. **Input**: Pass 0 output (`show`, `season`, `franchise_type`, `story_engine`) + all season synopses а ниже : ## Input
- **show**: show title (from Pass 0)
- **season**: season number (from Pass 0)
- **franchise_type**: procedural / serial / hybrid / ensemble (from Pass 0)
- **story_engine**: one sentence (from Pass 0)
- **format**: ongoing / limited / anthology / null (from Pass 0)
- **synopses**: all season synopses (text) Зачем дважды и при этом еще по разному определяется что на входе?
1. If `prior_season` is present in the input, it contains cast and storylines from the previous season. - откуда вдруг берется это поле? И весь этот пункт про предыдущий сезон - это мы добавили уже после калибровки, проверяли на берйкин бед впроде качество извлечения линий не изменилось но мне кажется сейчас тут не оч понятно : это вот что и где берется `prior_season.plotlines`, **TRANSFORMED** — same driver, but goal fundamentally changed. Keep the `id`, rewrite Story DNA. - это я не уверена вообще что из какой-то теории или в реальности так бывает. **ENDED** — the storyline resolved or disappeared. - это что у нее пометка или ты помечаешь? но что ты помечаешь если ее нет?
2. Так оптимально добавлено то что сказано выше еще раз но в TAsk?
3. ### Storyline = Story DNA A storyline = hero + goal + obstacle + stakes. Missing any component — not a storyline, but an event within another storyline. - не ясно если это едиственно место где мы используем Story DNA то нужно вообще тогда этот термин выбросить или же дать ему определение как у нас в словаре и использовать тогда везде как шортхэнд. 
4. В словаер еще отлично обхясняется связь между франщизой мотором и дна. если это полезно нужно включать в промпт 
5. Additionally: a storyline has a three-act structure, conflict, and a causal chain of events. это плохое объяснение мне кажется нужно про арку писать чтобы подвести к функциям в Пасс 2. Это и словаре сейчас слабо 
6. Мне кажется что в словаре лучше дано определение storyline 
7. Если мы все меняем я бы протестировала и замеенила если не испорти везде storyline на plotline - это более точные термин и у нас в названии есть 
8. Типы episodic это какое-то сочинение ЛЛМ такого нет в ощепринятх делениях нужно понять чему это помогает и кажется в словаре мы нашли решение. 
9. нужно давать точное название линии в которой будут все case of the week чтобы сразу было понятно а то она сейчас называется содержательно например у house - investigation вообще не ясно о чем 
10. **A** — protagonist's storyline or franchise engine, most screen time, plot-led conflict. хочу убедиться что где-то утверждается что линия а однощначно и всегда плот-лед и где вообзе объясняется что это такое в промпте? плот или карактер лед? в словаре однако у нас есть но я хочу убедиться что это уточнение нужно и правильное и мы испольущем 
11. - **runner** — incomplete Story DNA, no obstacle/resolution отпять же если можно обойти без Story DNA обойтись
12. нужно синхронихировать glossary с промптами и хочется глоссари сделать граунд труз если авторесеч проверит что не ухудшится качество извлечения 
13. а вот определение **Plot-led** — external goal vs antagonist.- **Character-led** — internal conflict, protagonist = their own antagonist. во первых сначала "вызывается функция" а потом определяется во вторых в глоссари точнее в третьих хочу понять где взялось и зачем собираем 
14. Seed and wraparound — not storyline types это вообще убрать опять какие то термины не опеределенные используются и смысла нет в этом конктрейне 
15.  Test: if you can't write a logline (hero + goal + obstacle)  у тебя есть строи дна там 4 части почему здесь их только три? 
16. What is NOT a storyline плозие примеры кроме "John and Mike's friendship" и "Investigation" (procedural, ep.5)
17. Story DNA is reconstructed from the aggregate of mentions across the season. Don't invent — mark confidence. вообще не поняла что за инструкция?
18. Episodic storyline (franchise engine): по прежнему не нравится термин Episodic storyline - вот это все кажется не выполняется - проверить на сериях по которым есть результаты
19. вот же объяснение как называть и вроде операциональное зачем два предыдущих абзаца? Always use `Driver: Theme` format for storyline names (e.g. "House: Authority", "Cameron: Ethics", "Jon: Honor"). This makes it clear who drives each storyline and prevents confusion during event assignment.
20. Narrative devices - не уверена вообще что это нужно не уверена что полный список не понятно как будет использоваться после ... нужно понять нужно ли это собирать и назначать 
21. про формат тоже не понимаю зачем чему помогает франшизы достаточно 
22. про уверенность кстати я вообще не оняла где объясняется что за уверенность и как работает вообще в примере стоит драматик айрони про линии ББ меня слильно смушает я бы убрала эти деввайсы 
23. see naming convention) при этом раздел называтеся нейминг 
24. `obstacle`: string  `stakes`: string почему не лист интересно 
25. Language of `goal`, `obstacle`, `stakes` fields — in the language of the synopsis. я бы это подчеркнула еще раньще а не в конце вот это стоит сформулировать дважды 
26. - For procedural/hybrid: exactly one storyline with `type: "episodic"` ну вот название не нравится 
27. If code detects an error — re-request from LLM with specific indication of what's wrong. как это сейчас выглядит?

## PASS 2

1.  **Self-contained document.** Compiled from `storyline-extraction-reference.md`, but fed to the LLM as-is. When reference is updated — recompile. это нужно в промпте? если мы относимся к промпт как к программе то зачем тут это например?
2. **Input**: Pass 1 output (`show`, `season`, `cast`, `storylines`)  - шоу в смысле title? season в смысле номер? 
3. опять же я не пойму в раздле контракт одно напино а потом инпут и другое 
4.  Two actions by different characters = two events. это не очевидно из первого определения? не понимаю зачем здесь 
5.  Step 3: Identify interactions between storylines а потом Assignment rules - мне кажется про разное я вообще не уверена чот это нужно Step 3: Identify interactions between storylines но мы нашли способ даже это как-то показывать вроде в аналитике - короче вопрос ро взаимодействие линий нужено понять но правила тут все не про взаимодействия а стояь после 
6. вот функции это то что мы переделываем это мы нахватали в список что попало а сейчас нашли более принятые функции и хотим добавить их описав поточнее и там есть еще констрейны и особенности по нима какие после каких не могу быть какие могут повторяться 
7. и мы та и не решеили все ли ивент имеют функцию - должны иметь все но бывает всякое 
8. опять девайсы они уже были в предыдущем пас не помню объяснялись и эти же ли нужно убедиться что одинаковые понять зачем и там и там и вообще оставлять ли их где они нужны на чот влиятют 
9. опять раздел про взаимодействие - опять мне не понятно почему опять раздел и вообще зачем это взаимодетсви 
10. **Emotional counterpoint**: if all storylines are rising or all falling — something is missed or functions are wrong вообще не поняла чего?
11. Weight (`primary` / `background` / `glimpse`) is computed by code from event counts — do NOT include in JSON. это вообще гле взялосб? оперделений не было я помню было оюъяснение чем отличается от А Б С но не уверена что поняли и вот это нужно тут 
12. patches вижу в коде не понимаю что делают 
13. **summary.interactions[].**: что это где испольщуется
14. **summary.patches[].**: что это где используется 
15. If code detects an error — re-request from LLM with specific indication of what's wrong. какое правило вызова? 
16. опять Patches to Pass 1 - функцию сначала заявили потом описали - плохой подход
17. вообще если относиться к промптам как к программах то выглядит бледно стыдно такое показывать 

## PASS 3
1.  При обновлении — пересобрать из ADR-005 и reference. это все вообще актуально? должно быть в промте который идет в библиотеку?
2. но без возможности исправить список линий - точнее изменить потому что патчи то он делает 
3. plotlines тут вдруг уже плотлайнс а было до этого вроде сторилайнс 
4. > "Story DNA has four parts: Hero, Goal, Obstacle, Stakes." — Nash, p.34 зачем читаты и страницы в промпте 
5. **Но сериалы бывают плохо написаны.** Линия может существовать в сериале без чёткой цели, с номинальным конфликтом, или быть заброшенной на полпути. Это не значит, что её нет — это значит, что она слабая. **Не выбрасывай такие линии — помечай через confidence:** это вообще ужасный текст в промпте №для всех"
6. Для каждой линии посмотри на function событий через весь сезон.  это вообще что сказано? я переключилась случайно на русскую версию но в целом даже по англйиски это что?
7. "In a multi-stranded narrative, each strand usually has its own dramatic three-act structure." — Oberg, p.60 опять цитата и страница 
8. короче даже дочитывать не хочу - все претенации не последовательно не системно не основано на теории избыточно неточно вообще не соотсветсует заявлением что мы делаем "программу" для ЛЛМ 